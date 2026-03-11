import { defineStore } from "pinia";
import api from "../lib/axios";

export const useKanbanStore = defineStore("kanban", {
  state: () => ({
    // map of `${projectId}:active|inactive` => kanbans array
    kanbansByProject: {},
    loadingProjects: {}, // To track if a project's kanbans are currently being fetched
  }),
  actions: {
    async fetchKanbans(projectId, options = {}) {
      if (!projectId) return;

      const isActive = options.isActive !== undefined ? Boolean(options.isActive) : true;
      const cacheKey = `${projectId}:${isActive ? "active" : "inactive"}`;

      // If already loading, return existing promise to avoid duplicate fetch
      if (this.loadingProjects[cacheKey]) {
        return this.loadingProjects[cacheKey];
      }

      // Create a promise for this fetch operation
      const fetchPromise = (async () => {
        try {
          const res = await api.get(`/kanbans`, { params: { projectId, isActive } });
          this.kanbansByProject[cacheKey] = res.data || [];
          if (isActive) {
            this.kanbansByProject[projectId] = this.kanbansByProject[cacheKey] || [];
          }
          return this.kanbansByProject[cacheKey]; // Return fetched data
        } catch (e) {
          this.kanbansByProject[cacheKey] = [];
          if (isActive) {
            this.kanbansByProject[projectId] = [];
          }
          throw e;
        } finally {
          delete this.loadingProjects[cacheKey]; // Clear loading state regardless of outcome
        }
      })();

      this.loadingProjects[cacheKey] = fetchPromise; // Store the promise
      return fetchPromise;
    },
    getKanbans(projectId, options = {}) {
      if (options.isActive === undefined) {
        return this.kanbansByProject[projectId] || [];
      }
      const cacheKey = `${projectId}:${options.isActive ? "active" : "inactive"}`;
      return this.kanbansByProject[cacheKey] || [];
    },
    async deleteKanban(kanbanId, projectId) {
      if (!kanbanId) return;
      await api.delete(`/kanbans/${kanbanId}`);
      if (!projectId) return;
      const activeKey = `${projectId}:active`;
      const inactiveKey = `${projectId}:inactive`;
      const current = this.kanbansByProject[projectId] || [];
      this.kanbansByProject[projectId] = current.filter(
        (kanban) => String(kanban.id) !== String(kanbanId)
      );
      this.kanbansByProject[activeKey] = (this.kanbansByProject[activeKey] || []).filter(
        (kanban) => String(kanban.id) !== String(kanbanId)
      );
      this.kanbansByProject[inactiveKey] = (this.kanbansByProject[inactiveKey] || []).filter(
        (kanban) => String(kanban.id) !== String(kanbanId)
      );
    },
    updateKanbanDetails(kanbanId, projectId, updates) {
      if (!kanbanId || !projectId) return;
      const activeKey = `${projectId}:active`;
      const inactiveKey = `${projectId}:inactive`;
      const current = this.kanbansByProject[projectId] || [];
      this.kanbansByProject[projectId] = current.map((kanban) => {
        if (String(kanban.id) !== String(kanbanId)) return kanban;
        return {
          ...kanban,
          ...updates,
        };
      });
      this.kanbansByProject[activeKey] = (this.kanbansByProject[activeKey] || []).map((kanban) => {
        if (String(kanban.id) !== String(kanbanId)) return kanban;
        return {
          ...kanban,
          ...updates,
        };
      });
      this.kanbansByProject[inactiveKey] = (this.kanbansByProject[inactiveKey] || []).map((kanban) => {
        if (String(kanban.id) !== String(kanbanId)) return kanban;
        return {
          ...kanban,
          ...updates,
        };
      });
    },
  },
});
