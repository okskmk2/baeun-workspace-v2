import { defineStore } from "pinia";
import { connectDB } from "yosie";

const DEFAULT_TYPES = ["kanban", "page", "channel", "task"];
const CACHE_DB_NAME = "baeun_workspace_cache";
const CACHE_STORE_NAME = "project_search";

let cacheStorePromise = null;

const getCacheStore = async () => {
  if (!cacheStorePromise) {
    cacheStorePromise = connectDB(CACHE_DB_NAME)
      .then((db) => db.connectStore(CACHE_STORE_NAME))
      .catch((error) => {
        cacheStorePromise = null;
        throw error;
      });
  }
  return cacheStorePromise;
};

const normalizeString = (value) => String(value || "").trim();
const normalizeSearchText = (value) => normalizeString(value).toLowerCase();
const toPlainObject = (value) => {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return null;
  }
};

const toTimestamp = (value) => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getRouteByType = (projectId, type, id, item = {}) => {
  if (!projectId || !id) return "";
  if (type === "kanban") return `/project/${projectId}/kanban/${id}`;
  if (type === "page") return `/project/${projectId}/wiki/${id}`;
  if (type === "channel") return `/project/${projectId}/channel/${id}`;
  if (type === "task" && item?.kanban_id) {
    return `/project/${projectId}/kanban/${item.kanban_id}/task/${id}`;
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
    status: type === "task" ? normalizeString(item?.status).toUpperCase() : "",
  };
};

export const useProjectSearchStore = defineStore("projectSearch", {
  state: () => ({
    resourcesByProject: {},
    lastSyncedAtByProject: {},
    refreshPromises: {},
    isHydrated: false,
    hydrationPromise: null,
    persistPromise: null,
  }),
  actions: {
    async hydrateFromCache() {
      if (this.isHydrated) return;
      if (this.hydrationPromise) {
        await this.hydrationPromise;
        return;
      }

      this.hydrationPromise = (async () => {
        try {
          const store = await getCacheStore();
          const cachedResources = await store.get("resourcesByProject");
          const cachedSynced = await store.get("lastSyncedAtByProject");

          if (cachedResources && typeof cachedResources === "object") {
            this.resourcesByProject = cachedResources;
          }

          if (cachedSynced && typeof cachedSynced === "object") {
            this.lastSyncedAtByProject = cachedSynced;
          }
        } catch (error) {
          console.warn("[projectSearchStore] hydrateFromCache failed", error);
        } finally {
          this.isHydrated = true;
          this.hydrationPromise = null;
        }
      })();

      await this.hydrationPromise;
    },

    schedulePersistSnapshot() {
      if (this.persistPromise) return;

      this.persistPromise = Promise.resolve()
        .then(async () => {
          try {
            const store = await getCacheStore();
            const resourcesSnapshot = toPlainObject(this.resourcesByProject);
            const syncedSnapshot = toPlainObject(this.lastSyncedAtByProject);

            if (!resourcesSnapshot || !syncedSnapshot) {
              throw new Error("Failed to serialize search cache snapshot");
            }

            await store.set("resourcesByProject", resourcesSnapshot);
            await store.set("lastSyncedAtByProject", syncedSnapshot);
          } catch (error) {
            console.warn("[projectSearchStore] persistSnapshot failed", error);
          }
        })
        .finally(() => {
          this.persistPromise = null;
        });
    },

    ensureProject(projectId) {
      if (!projectId) return;

      if (!this.resourcesByProject[projectId]) {
        this.resourcesByProject[projectId] = {
          kanban: [],
          page: [],
          channel: [],
          task: [],
        };
      }

      if (!this.lastSyncedAtByProject[projectId]) {
        this.lastSyncedAtByProject[projectId] = {
          kanban: 0,
          page: 0,
          channel: 0,
          task: 0,
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
      this.schedulePersistSnapshot();
    },

    upsertKanbans(projectId, kanbans) {
      this.setResources(projectId, "kanban", kanbans);
    },

    upsertPages(projectId, pages) {
      this.setResources(projectId, "page", flattenPages(pages));
    },

    upsertChannels(projectId, channels) {
      this.setResources(projectId, "channel", channels);
    },

    replaceTasks(projectId, tasks, syncedAt = Date.now()) {
      this.setResources(projectId, "task", tasks, syncedAt);
    },

    upsertTasks(projectId, tasks) {
      this.replaceTasks(projectId, tasks);
    },

    upsertTasksPartial(projectId, tasks) {
      if (!projectId) return;
      this.ensureProject(projectId);

      const incoming = Array.isArray(tasks) ? tasks : [];
      if (incoming.length === 0) return;

      const current = this.resourcesByProject[projectId].task || [];
      const byId = new Map(current.map((item) => [String(item.id), item]));

      incoming.forEach((item) => {
        const normalized = toSearchItem(projectId, "task", item);
        if (!normalized.id || !normalized.name) return;

        const key = String(normalized.id);
        const prev = byId.get(key);
        if (!prev) {
          byId.set(key, normalized);
          return;
        }

        byId.set(key, {
          ...prev,
          ...normalized,
          updatedAt: Math.max(Number(prev.updatedAt || 0), Number(normalized.updatedAt || 0)),
        });
      });

      this.resourcesByProject[projectId].task = Array.from(byId.values());
      this.schedulePersistSnapshot();
    },

    removeTask(projectId, taskId) {
      if (!projectId || !taskId) return;
      this.ensureProject(projectId);

      const prev = this.resourcesByProject[projectId].task || [];
      const next = prev.filter((item) => String(item.id) !== String(taskId));
      if (next.length === prev.length) return;

      this.resourcesByProject[projectId].task = next;
      this.schedulePersistSnapshot();
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
      await this.hydrateFromCache();
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
