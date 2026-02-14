import { defineStore } from "pinia";

const DEFAULT_TYPES = ["board", "page", "channel", "issue"];

const normalizeString = (value) => String(value || "").trim();
const normalizeSearchText = (value) => normalizeString(value).toLowerCase();

const toTimestamp = (value) => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getRouteByType = (projectId, type, id, item = {}) => {
  if (!projectId || !id) return "";
  if (type === "board") return `/project/${projectId}/board/${id}`;
  if (type === "page") return `/project/${projectId}/wiki/${id}`;
  if (type === "channel") return `/project/${projectId}/messenger/${id}`;
  if (type === "issue" && item?.board_id) {
    return `/project/${projectId}/board/${item.board_id}/issue/${id}`;
  }
  return "";
};

const flattenPages = (nodes, bucket = []) => {
  if (!Array.isArray(nodes)) return bucket;
  nodes.forEach((node) => {
    if (!node) return;
    bucket.push(node);
    if (Array.isArray(node.children) && node.children.length) {
      flattenPages(node.children, bucket);
    }
  });
  return bucket;
};

const toSearchItem = (projectId, type, item) => {
  const id = item?.id;
  const name =
    normalizeString(item?.name) ||
    normalizeString(item?.title) ||
    normalizeString(item?.summary) ||
    "";

  return {
    id,
    type,
    name,
    searchText: normalizeSearchText(name),
    route: getRouteByType(projectId, type, id, item),
    updatedAt: toTimestamp(item?.updated_at || item?.updatedAt || item?.created_at),
    status: type === "issue" ? normalizeString(item?.status).toUpperCase() : "",
  };
};

export const useProjectSearchStore = defineStore("projectSearch", {
  state: () => ({
    resourcesByProject: {},
    lastSyncedAtByProject: {},
    refreshPromises: {},
  }),
  actions: {
    ensureProject(projectId) {
      if (!projectId) return;

      if (!this.resourcesByProject[projectId]) {
        this.resourcesByProject[projectId] = {
          board: [],
          page: [],
          channel: [],
          issue: [],
        };
      }

      if (!this.lastSyncedAtByProject[projectId]) {
        this.lastSyncedAtByProject[projectId] = {
          board: 0,
          page: 0,
          channel: 0,
          issue: 0,
        };
      }
    },

    setResources(projectId, type, items, syncedAt = Date.now()) {
      if (!projectId || !type) return;
      this.ensureProject(projectId);

      const list = Array.isArray(items) ? items : [];
      this.resourcesByProject[projectId][type] = list
        .map((item) => toSearchItem(projectId, type, item))
        .filter((item) => item.id && item.name);

      this.lastSyncedAtByProject[projectId][type] = syncedAt;
    },

    upsertBoards(projectId, boards) {
      this.setResources(projectId, "board", boards);
    },

    upsertPages(projectId, pages) {
      this.setResources(projectId, "page", flattenPages(pages));
    },

    upsertChannels(projectId, channels) {
      this.setResources(projectId, "channel", channels);
    },

    upsertIssues(projectId, issues) {
      this.setResources(projectId, "issue", issues);
    },

    isTypeStale(projectId, type, ttlMs, now = Date.now()) {
      if (!projectId || !type) return true;
      this.ensureProject(projectId);

      const lastSyncedAt = this.lastSyncedAtByProject[projectId][type] || 0;
      if (!lastSyncedAt) return true;
      return now - lastSyncedAt >= ttlMs;
    },

    isTypeEmpty(projectId, type) {
      if (!projectId || !type) return true;
      this.ensureProject(projectId);

      const resources = this.resourcesByProject[projectId]?.[type];
      if (!Array.isArray(resources)) return true;
      return resources.length === 0;
    },

    async refreshStaleTypes(projectId, options = {}) {
      if (!projectId) return;
      this.ensureProject(projectId);

      const now = Date.now();
      const ttls = options.ttls || {};
      const fetchers = options.fetchers || {};
      const types = options.types || DEFAULT_TYPES;

      const jobs = types.map((type) => {
        const fetcher = fetchers[type];
        if (typeof fetcher !== "function") return null;

        const ttlMs = Number(ttls[type] || 0);
        const stale = ttlMs > 0 ? this.isTypeStale(projectId, type, ttlMs, now) : false;
        const empty = this.isTypeEmpty(projectId, type);

        if (!stale && !empty) {
          return null;
        }

        const key = `${projectId}:${type}`;
        if (this.refreshPromises[key]) {
          return this.refreshPromises[key];
        }

        const job = Promise.resolve(fetcher())
          .catch(() => undefined)
          .finally(() => {
            delete this.refreshPromises[key];
          });

        this.refreshPromises[key] = job;
        return job;
      });

      await Promise.all(jobs.filter(Boolean));
    },

    search(projectId, query, options = {}) {
      if (!projectId) return [];

      const keyword = normalizeSearchText(query);
      if (!keyword) return [];

      this.ensureProject(projectId);
      const limit = Number(options.limit || 20);
      const types = Array.isArray(options.types) ? options.types : DEFAULT_TYPES;

      const allItems = types.flatMap((type) => this.resourcesByProject[projectId][type] || []);

      const matched = allItems
        .filter((item) => item.searchText.includes(keyword))
        .map((item) => ({
          ...item,
          startsWith: item.searchText.startsWith(keyword),
        }))
        .sort((a, b) => {
          if (a.startsWith !== b.startsWith) return a.startsWith ? -1 : 1;
          if (a.updatedAt !== b.updatedAt) return b.updatedAt - a.updatedAt;
          return a.name.localeCompare(b.name);
        })
        .slice(0, limit)
        .map(({ startsWith, ...item }) => item);

      return matched;
    },
  },
});
