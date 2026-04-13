import { defineStore } from "pinia";
import api from "../lib/axios";

const DEFAULT_DEBOUNCE_MS = 500;

const buildTableKey = (projectId, tableId) => `${projectId}:${tableId}`;

export const useDataStore = defineStore("data", {
  state: () => ({
    tablesByProject: {},
    tableDetailByKey: {},
    rowsByKey: {},
    columnsByKey: {},
    auditLogsByKey: {},
    loadingByKey: {},
    saveTimers: {},
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
