import { defineStore } from "pinia";
import api from "../lib/axios";

const DEFAULT_DEBOUNCE_MS = 500;
const PROTOTYPE_STORAGE_PREFIX = "baeun.data.prototypes";

const buildTableKey = (projectId, tableId) => `${projectId}:${tableId}`;
const buildPrototypeStorageKey = (projectId) => `${PROTOTYPE_STORAGE_PREFIX}.${projectId}`;

const emptyPrototypes = () => ({
  views: [],
  charts: [],
  webhooks: [],
});

const loadPrototypes = (projectId) => {
  if (typeof window === "undefined" || !projectId) return emptyPrototypes();
  try {
    const raw = window.localStorage.getItem(buildPrototypeStorageKey(projectId));
    if (!raw) return emptyPrototypes();
    const parsed = JSON.parse(raw);
    return {
      views: Array.isArray(parsed?.views) ? parsed.views : [],
      charts: Array.isArray(parsed?.charts) ? parsed.charts : [],
      webhooks: Array.isArray(parsed?.webhooks) ? parsed.webhooks : [],
    };
  } catch {
    return emptyPrototypes();
  }
};

const savePrototypes = (projectId, payload) => {
  if (typeof window === "undefined" || !projectId) return;
  window.localStorage.setItem(buildPrototypeStorageKey(projectId), JSON.stringify(payload));
};

const makePrototypeId = (prefix) => {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${rand}`;
};

const sourceKey = (kind, id) => `${kind}:${id}`;

const collectLineageKeys = (store, projectId, kind, id, seen = new Set()) => {
  if (!kind || id === undefined || id === null || id === "") return seen;
  const key = sourceKey(kind, id);
  if (seen.has(key)) return seen;
  seen.add(key);
  if (kind !== "view") return seen;
  const view = store.getView(projectId, id);
  if (view?.left?.kind) collectLineageKeys(store, projectId, view.left.kind, view.left.id, seen);
  if (view?.right?.kind) collectLineageKeys(store, projectId, view.right.kind, view.right.id, seen);
  return seen;
};

const snapshotSource = (source) => {
  if (!source?.kind || source.id === undefined || source.id === null || source.id === "") return null;
  return {
    kind: source.kind === "view" ? "view" : "table",
    id: source.id,
    name: String(source.name || "").trim(),
  };
};

const snapshotColumn = (column) => {
  if (!column) return null;
  return {
    id: column.id ?? "",
    name: String(column.name || "").trim(),
    type: String(column.type || "TEXT").toUpperCase(),
  };
};

const ensurePrototypes = (store, projectId) => {
  const key = String(projectId || "");
  if (!key) return emptyPrototypes();
  if (!store.prototypesByProject[key]) {
    store.prototypesByProject[key] = loadPrototypes(key);
  }
  return store.prototypesByProject[key];
};

const setPrototypes = (store, projectId, next) => {
  const key = String(projectId || "");
  if (!key) return;
  store.prototypesByProject[key] = next;
  savePrototypes(key, next);
};

const syncColumnsToDetail = (store, key, columns) => {
  if (!store.tableDetailByKey[key]) return;
  store.tableDetailByKey[key] = {
    ...store.tableDetailByKey[key],
    columns,
  };
};

export const useDataStore = defineStore("data", {
  state: () => ({
    tablesByProject: {},
    tableDetailByKey: {},
    rowsByKey: {},
    columnsByKey: {},
    auditLogsByKey: {},
    loadingByKey: {},
    saveTimers: {},
    prototypesByProject: {},
  }),
  actions: {
    setLoading(key, value) {
      this.loadingByKey[key] = Boolean(value);
    },
    isLoading(key) {
      return Boolean(this.loadingByKey[key]);
    },
    getTables(projectId) {
      return this.tablesByProject[projectId] || { assets: [], locals: [], project: null };
    },
    getAllTables(projectId) {
      const tables = this.getTables(projectId);
      return [...(tables.assets || []), ...(tables.locals || [])];
    },
    getTableById(projectId, tableId) {
      if (!tableId) return null;
      return (
        this.getAllTables(projectId).find((table) => String(table.id) === String(tableId)) || null
      );
    },
    hydratePrototypes(projectId) {
      return ensurePrototypes(this, projectId);
    },
    getViews(projectId) {
      const key = String(projectId || "");
      return this.prototypesByProject[key]?.views || [];
    },
    getCharts(projectId) {
      const key = String(projectId || "");
      return this.prototypesByProject[key]?.charts || [];
    },
    getWebhooks(projectId) {
      const key = String(projectId || "");
      return this.prototypesByProject[key]?.webhooks || [];
    },
    getView(projectId, viewId) {
      return this.getViews(projectId).find((item) => String(item.id) === String(viewId)) || null;
    },
    getChart(projectId, chartId) {
      return this.getCharts(projectId).find((item) => String(item.id) === String(chartId)) || null;
    },
    getWebhook(projectId, webhookId) {
      return this.getWebhooks(projectId).find((item) => String(item.id) === String(webhookId)) || null;
    },
    isJoinView(view) {
      return Boolean(view?.left?.kind && view?.right?.kind);
    },
    getJoinViews(projectId) {
      return this.getViews(projectId).filter((view) => this.isJoinView(view));
    },
    getSourceLineageKeys(projectId, kind, id) {
      return [...collectLineageKeys(this, projectId, kind, id)];
    },
    sourcesOverlap(projectId, left, right) {
      if (!left?.kind || !right?.kind) return false;
      if (String(left.kind) === String(right.kind) && String(left.id) === String(right.id)) return true;
      const leftKeys = new Set(this.getSourceLineageKeys(projectId, left.kind, left.id));
      const rightKeys = this.getSourceLineageKeys(projectId, right.kind, right.id);
      return rightKeys.some((key) => leftKeys.has(key));
    },
    getSourceColumns(projectId, kind, id) {
      if (kind === "table") {
        return (this.getColumns(projectId, id) || []).map((column) => ({
          id: column.id,
          name: column.name,
          type: String(column.type || "TEXT").toUpperCase(),
        }));
      }
      const view = this.getView(projectId, id);
      if (!view || !Array.isArray(view.result_columns)) return [];
      return view.result_columns.map((column, index) => ({
        id: column.id || `${column.source || "col"}:${column.name}:${index}`,
        name: column.name,
        type: String(column.type || "TEXT").toUpperCase(),
        label: column.label || column.name,
      }));
    },
    async ensureSourceColumns(projectId, kind, id) {
      if (kind === "table") {
        try {
          await this.fetchTableDetail(projectId, id);
        } catch {
          return [];
        }
      }
      return this.getSourceColumns(projectId, kind, id);
    },
    createView(projectId, payload = {}) {
      const current = ensurePrototypes(this, projectId);
      const joinType = payload.join_type === "keep_base" ? "keep_base" : "matching";
      const item = {
        id: makePrototypeId("view"),
        name: String(payload.name || "").trim(),
        description: String(payload.description || "").trim(),
        join_type: joinType,
        left: snapshotSource(payload.left),
        right: snapshotSource(payload.right),
        match: {
          left_column: snapshotColumn(payload.match?.left_column),
          right_column: snapshotColumn(payload.match?.right_column),
        },
        result_columns: Array.isArray(payload.result_columns)
          ? payload.result_columns.map((column) => ({
              source: column.source === "right" ? "right" : "left",
              id: column.id ?? "",
              name: String(column.name || "").trim(),
              type: String(column.type || "TEXT").toUpperCase(),
              label: String(column.label || column.name || "").trim(),
            }))
          : [],
        created_at: new Date().toISOString(),
      };
      setPrototypes(this, projectId, {
        ...current,
        views: [item, ...current.views],
      });
      return item;
    },
    createChart(projectId, payload = {}) {
      const current = ensurePrototypes(this, projectId);
      const chartType = ["bar", "line", "pie"].includes(payload.chart_type)
        ? payload.chart_type
        : "bar";
      const item = {
        id: makePrototypeId("chart"),
        name: String(payload.name || "").trim(),
        table_id: payload.table_id ?? "",
        table_name: String(payload.table_name || "").trim(),
        chart_type: chartType,
        x_column: String(payload.x_column || "").trim(),
        y_column: String(payload.y_column || "").trim(),
        created_at: new Date().toISOString(),
      };
      setPrototypes(this, projectId, {
        ...current,
        charts: [item, ...current.charts],
      });
      return item;
    },
    createWebhook(projectId, payload = {}) {
      const current = ensurePrototypes(this, projectId);
      const events = payload.events || {};
      const item = {
        id: makePrototypeId("webhook"),
        name: String(payload.name || "").trim(),
        table_id: payload.table_id ?? "",
        table_name: String(payload.table_name || "").trim(),
        url: String(payload.url || "").trim(),
        secret: String(payload.secret || "").trim(),
        events: {
          addOrDelete: events.addOrDelete === true,
          dataUpdated: events.dataUpdated === true,
          tableRenamed: events.tableRenamed === true,
          tableDeleted: events.tableDeleted === true,
        },
        created_at: new Date().toISOString(),
      };
      setPrototypes(this, projectId, {
        ...current,
        webhooks: [item, ...current.webhooks],
      });
      return item;
    },
    getTableDetail(projectId, tableId) {
      return this.tableDetailByKey[buildTableKey(projectId, tableId)] || null;
    },
    getRows(projectId, tableId) {
      return this.rowsByKey[buildTableKey(projectId, tableId)] || [];
    },
    getColumns(projectId, tableId) {
      return this.columnsByKey[buildTableKey(projectId, tableId)] || [];
    },
    getAuditLogs(projectId, tableId) {
      return this.auditLogsByKey[buildTableKey(projectId, tableId)] || [];
    },
    async fetchTables(projectId) {
      if (!projectId) return { assets: [], locals: [], project: null };
      const key = `tables:${projectId}`;
      this.setLoading(key, true);
      try {
        const res = await api.get(`/data/projects/${projectId}/tables`);
        const payload = {
          assets: Array.isArray(res.data?.assets) ? res.data.assets : [],
          locals: Array.isArray(res.data?.locals) ? res.data.locals : [],
          project: res.data?.project || null,
        };
        this.tablesByProject[projectId] = payload;
        return payload;
      } finally {
        this.setLoading(key, false);
      }
    },
    async fetchTableDetail(projectId, tableId) {
      if (!projectId || !tableId) return null;
      const key = buildTableKey(projectId, tableId);
      this.setLoading(`table:${key}`, true);
      try {
        const res = await api.get(`/data/projects/${projectId}/tables/${tableId}`);
        this.tableDetailByKey[key] = res.data || null;
        this.columnsByKey[key] = Array.isArray(res.data?.columns) ? res.data.columns : [];
        return this.tableDetailByKey[key];
      } finally {
        this.setLoading(`table:${key}`, false);
      }
    },
    async fetchRows(projectId, tableId) {
      if (!projectId || !tableId) return [];
      const key = buildTableKey(projectId, tableId);
      this.setLoading(`rows:${key}`, true);
      try {
        const res = await api.get(`/data/projects/${projectId}/tables/${tableId}/rows`);
        this.rowsByKey[key] = Array.isArray(res.data?.rows) ? res.data.rows : [];
        this.columnsByKey[key] = Array.isArray(res.data?.columns)
          ? res.data.columns
          : this.columnsByKey[key] || [];
        return this.rowsByKey[key];
      } finally {
        this.setLoading(`rows:${key}`, false);
      }
    },
    async createAdhocTable(projectId, payload) {
      const res = await api.post(`/data/projects/${projectId}/tables`, payload);
      await this.fetchTables(projectId);
      return res.data;
    },
    async createRow(projectId, tableId, jsonData = {}) {
      const res = await api.post(`/data/projects/${projectId}/tables/${tableId}/rows`, {
        json_data: jsonData,
      });
      const key = buildTableKey(projectId, tableId);
      this.rowsByKey[key] = [res.data, ...(this.rowsByKey[key] || [])];
      return res.data;
    },
    async patchRow(projectId, tableId, rowId, jsonData = {}) {
      const res = await api.patch(`/data/projects/${projectId}/tables/${tableId}/rows/${rowId}`, {
        json_data: jsonData,
      });
      const key = buildTableKey(projectId, tableId);
      const rows = this.rowsByKey[key] || [];
      this.rowsByKey[key] = rows.map((row) => (String(row.id) === String(rowId) ? res.data : row));
      return res.data;
    },
    scheduleCellSave(projectId, tableId, rowId, fieldName, fieldValue, debounceMs = DEFAULT_DEBOUNCE_MS) {
      const key = `${projectId}:${tableId}:${rowId}`;
      if (this.saveTimers[key]?.timerId) {
        clearTimeout(this.saveTimers[key].timerId);
      }

      const pendingPatch = {
        ...(this.saveTimers[key]?.payload || {}),
        [fieldName]: fieldValue,
      };

      this.saveTimers[key] = {
        payload: pendingPatch,
        timerId: setTimeout(async () => {
          const payload = this.saveTimers[key]?.payload || {};
          this.saveTimers[key] = null;
          await this.patchRow(projectId, tableId, rowId, payload);
        }, debounceMs),
      };
    },
    async requestPromotion(projectId, tableId) {
      const res = await api.post(`/data/projects/${projectId}/tables/${tableId}/promotion-requests`);
      return res.data;
    },
    async createSnapshot(projectId, tableId, label = "") {
      const res = await api.post(`/data/projects/${projectId}/tables/${tableId}/snapshots`, { label });
      return res.data;
    },
    async renameTable(projectId, tableId, name) {
      const res = await api.patch(`/data/projects/${projectId}/tables/${tableId}`, { name });
      await Promise.all([this.fetchTables(projectId), this.fetchTableDetail(projectId, tableId)]);
      return res.data;
    },
    async addTableColumn(projectId, tableId, payload = {}) {
      const res = await api.post(`/data/projects/${projectId}/tables/${tableId}/columns`, payload);
      const key = buildTableKey(projectId, tableId);
      const nextColumns = [...(this.columnsByKey[key] || []), res.data];
      this.columnsByKey[key] = nextColumns;
      syncColumnsToDetail(this, key, nextColumns);
      return res.data;
    },
    async renameTableColumn(projectId, tableId, columnId, name) {
      const res = await api.patch(`/data/projects/${projectId}/tables/${tableId}/columns/${columnId}`, {
        name,
      });
      const key = buildTableKey(projectId, tableId);
      const nextColumns = (this.columnsByKey[key] || []).map((column) =>
        String(column.id) === String(columnId)
          ? { ...column, ...res.data, can_edit: column.can_edit }
          : column
      );
      this.columnsByKey[key] = nextColumns;
      syncColumnsToDetail(this, key, nextColumns);
      return res.data;
    },
    async deleteTableColumn(projectId, tableId, columnId) {
      const res = await api.delete(`/data/projects/${projectId}/tables/${tableId}/columns/${columnId}`);
      const key = buildTableKey(projectId, tableId);
      const nextColumns = (this.columnsByKey[key] || []).filter(
        (column) => String(column.id) !== String(columnId)
      );
      this.columnsByKey[key] = nextColumns;
      syncColumnsToDetail(this, key, nextColumns);
      return res.data;
    },
    async reorderTableColumns(projectId, tableId, orderedColumnIds = []) {
      const res = await api.post(`/data/projects/${projectId}/tables/${tableId}/columns/reorder`, {
        orderedColumnIds,
      });
      const key = buildTableKey(projectId, tableId);
      const columns = Array.isArray(res.data?.columns) ? res.data.columns : [];
      const existingById = new Map((this.columnsByKey[key] || []).map((column) => [String(column.id), column]));
      const nextColumns = columns.map((column) => {
        const existing = existingById.get(String(column.id));
        return existing ? { ...column, can_edit: existing.can_edit } : column;
      });
      this.columnsByKey[key] = nextColumns;
      syncColumnsToDetail(this, key, nextColumns);
      return res.data;
    },
    async deleteTable(projectId, tableId) {
      await api.delete(`/data/projects/${projectId}/tables/${tableId}`);
      await this.fetchTables(projectId);
      const key = buildTableKey(projectId, tableId);
      delete this.tableDetailByKey[key];
      delete this.rowsByKey[key];
      delete this.columnsByKey[key];
      delete this.auditLogsByKey[key];
    },
    async fetchAuditLogs(projectId, tableId) {
      const key = buildTableKey(projectId, tableId);
      const res = await api.get(`/data/projects/${projectId}/tables/${tableId}/audit-logs`);
      this.auditLogsByKey[key] = Array.isArray(res.data) ? res.data : [];
      return this.auditLogsByKey[key];
    },
  },
});
