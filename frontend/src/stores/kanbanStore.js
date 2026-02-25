import { defineStore } from "pinia";
import api from "../lib/axios";

export const useKanbanStore = defineStore("kanban", {
  state: () => ({
    // map of projectId => kanbans array
    kanbansByProject: {},
    loadingProjects: {}, // To track if a project's kanbans are currently being fetched
  }),
  actions: {
    async fetchKanbans(projectId) {
      if (!projectId) return;

      // If already loading, return existing promise to avoid duplicate fetch
      if (this.loadingProjects[projectId]) {
        return this.loadingProjects[projectId];
      }

      // Create a promise for this fetch operation
      const fetchPromise = (async () => {
        try {
          const res = await api.get(`/kanbans`, { params: { projectId } });
          this.kanbansByProject[projectId] = res.data || [];
          return this.kanbansByProject[projectId]; // Return fetched data
        } catch (e) {
          this.kanbansByProject[projectId] = [];
          throw e;
        } finally {
          delete this.loadingProjects[projectId]; // Clear loading state regardless of outcome
        }
      })();

      this.loadingProjects[projectId] = fetchPromise; // Store the promise
      return fetchPromise;
    },
    getKanbans(projectId) {
      return this.kanbansByProject[projectId] || [];
    },
    async deleteKanban(kanbanId, projectId) {
      if (!kanbanId) return;
      await api.delete(`/kanbans/${kanbanId}`);
      if (!projectId) return;
      const current = this.kanbansByProject[projectId] || [];
      this.kanbansByProject[projectId] = current.filter(
        (kanban) => String(kanban.id) !== String(kanbanId)
      );
    },
    updateKanbanDetails(kanbanId, projectId, updates) {
      if (!kanbanId || !projectId) return;
      const current = this.kanbansByProject[projectId] || [];
      this.kanbansByProject[projectId] = current.map((kanban) => {
        if (String(kanban.id) !== String(kanbanId)) return kanban;
        return {
          ...kanban,
          ...updates,
        };
      });
    },
  },
});
