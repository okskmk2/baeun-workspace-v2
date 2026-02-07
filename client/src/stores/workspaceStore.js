import { defineStore } from "pinia";
import api from "../lib/axios";

export const useWorkspaceStore = defineStore("workspace", {
  state: () => ({
    workspaces: [],
    workspaceById: {},
    projectsByWorkspace: {},
  }),
  actions: {
    async fetchWorkspaces() {
      const res = await api.get("/workspace/my");
      this.workspaces = res.data?.data || [];
      this.workspaces.forEach((workspace) => {
        this.workspaceById[workspace.id] = workspace;
      });
      return this.workspaces;
    },
    async fetchWorkspace(workspaceId) {
      if (!workspaceId) return null;
      const res = await api.get(`/workspace/${workspaceId}`);
      const workspace = res.data?.data || null;
      if (workspace) {
        this.workspaceById[workspaceId] = workspace;
      }
      return workspace;
    },
    async fetchProjects(workspaceId) {
      if (!workspaceId) return [];
      const res = await api.get(`/workspace/${workspaceId}/projects`);
      const projects = res.data?.data || [];
      this.projectsByWorkspace[workspaceId] = projects;
      return projects;
    },
    getProjects(workspaceId) {
      return this.projectsByWorkspace[workspaceId] || [];
    },
    getWorkspaceName(workspaceId) {
      return this.workspaceById[workspaceId]?.name || "";
    },
    async createWorkspace(payload) {
      const res = await api.post("/workspace", payload);
      const workspace = res.data?.data;
      if (workspace) {
        this.workspaces = [workspace, ...this.workspaces];
        this.workspaceById[workspace.id] = workspace;
      }
      return workspace;
    },
    async deleteWorkspace(workspaceId) {
      if (!workspaceId) return;
      await api.delete(`/workspace/${workspaceId}`);
      this.workspaces = this.workspaces.filter((item) => item.id !== workspaceId);
      delete this.workspaceById[workspaceId];
      delete this.projectsByWorkspace[workspaceId];
    },
    async createProject(workspaceId, name) {
      const res = await api.post("/project", {
        name,
        workspace_id: workspaceId,
      });
      const project = res.data?.data;
      if (project) {
        const current = this.projectsByWorkspace[workspaceId] || [];
        this.projectsByWorkspace[workspaceId] = [...current, project];
      }
      return project;
    },
  },
});
