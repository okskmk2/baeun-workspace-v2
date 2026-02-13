import { defineStore } from "pinia";
import api from "../lib/axios";

export const useBoardStore = defineStore("board", {
  state: () => ({
    // map of projectId => boards array
    boardsByProject: {},
    loadingProjects: {}, // To track if a project's boards are currently being fetched
  }),
  actions: {
    async fetchBoards(projectId) {
      if (!projectId) return;

      // If already loading, return existing promise to avoid duplicate fetch
      if (this.loadingProjects[projectId]) {
        return this.loadingProjects[projectId];
      }

      // Create a promise for this fetch operation
      const fetchPromise = (async () => {
        try {
          const res = await api.get(`/boards`, { params: { projectId } });
          this.boardsByProject[projectId] = res.data || [];
          return this.boardsByProject[projectId]; // Return fetched data
        } catch (e) {
          this.boardsByProject[projectId] = [];
          throw e;
        } finally {
          delete this.loadingProjects[projectId]; // Clear loading state regardless of outcome
        }
      })();

      this.loadingProjects[projectId] = fetchPromise; // Store the promise
      return fetchPromise;
    },
    getBoards(projectId) {
      return this.boardsByProject[projectId] || [];
    },
    async deleteBoard(boardId, projectId) {
      if (!boardId) return;
      await api.delete(`/boards/${boardId}`);
      if (!projectId) return;
      const current = this.boardsByProject[projectId] || [];
      this.boardsByProject[projectId] = current.filter(
        (board) => String(board.id) !== String(boardId)
      );
    },
    updateBoardDetails(boardId, projectId, updates) {
      if (!boardId || !projectId) return;
      const current = this.boardsByProject[projectId] || [];
      this.boardsByProject[projectId] = current.map((board) => {
        if (String(board.id) !== String(boardId)) return board;
        return {
          ...board,
          ...updates,
        };
      });
    },
  },
});
