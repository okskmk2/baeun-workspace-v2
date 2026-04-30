import { defineStore } from "pinia";
import api from "../lib/axios";

export const usePageStore = defineStore("page", {
  state: () => ({
    pagesByProject: {},
  }),
  actions: {
    async fetchPages(projectId) {
      if (!projectId) return;
      try {
        const res = await api.get("/pages", { params: { project_id: projectId } });
        this.pagesByProject[projectId] = res.data || [];
      } catch (e) {
        this.pagesByProject[projectId] = [];
        throw e;
      }
    },
    getPages(projectId) {
      return this.pagesByProject[projectId] || [];
    },
    updatePageTitle(projectId, pageId, title) {
      const pages = this.pagesByProject[projectId];
      if (!Array.isArray(pages) || !pageId) return;

      const walk = (nodes) => {
        for (const node of nodes) {
          if (String(node?.id) === String(pageId)) {
            node.title = title;
            return true;
          }
          if (Array.isArray(node?.children) && node.children.length) {
            const found = walk(node.children);
            if (found) return true;
          }
        }
        return false;
      };

      walk(pages);
    },
  },
});
