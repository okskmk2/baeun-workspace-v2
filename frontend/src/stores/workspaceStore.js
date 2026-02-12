import { defineStore } from "pinia";
import api from "../lib/axios";

export const useWorkspaceStore = defineStore("workspace", {
  state: () => ({
    workspaces: [],
    workspaceById: {},
    projectsByWorkspace: {},
    projectById: {},
  }),
  actions: {
    async fetchWorkspaces() {
      const res = await api.get("/workspaces/my");
      this.workspaces = res.data?.data || [];
      this.workspaces.forEach((workspace) => {
        this.workspaceById[workspace.id] = workspace;
      });
      return this.workspaces;
    },
    async fetchWorkspace(workspaceId) {
      if (!workspaceId) return null;
      const res = await api.get(`/workspaces/${workspaceId}`);
      const workspace = res.data?.data || null;
      if (workspace) {
        this.workspaceById[workspaceId] = workspace;
      }
      return workspace;
    },
    async fetchProjects(workspaceId) {
      if (!workspaceId) return [];
      const res = await api.get(`/projects?workspaceId=${workspaceId}`);
      const projects = res.data?.data || [];
      this.projectsByWorkspace[workspaceId] = projects;
      projects.forEach((project) => {
        this.projectById[project.id] = project;
      });
      return projects;
    },
    getProjects(workspaceId) {
      return this.projectsByWorkspace[workspaceId] || [];
    },
    getProject(projectId) {
      if (!projectId) return null;
      return this.projectById[projectId] || null;
    },
    getWorkspaceName(workspaceId) {
      return this.workspaceById[workspaceId]?.name || "";
    },
    async createWorkspace(payload) {
      const res = await api.post("/workspaces", payload);
      const workspace = res.data?.data;
      if (workspace) {
        this.workspaces = [workspace, ...this.workspaces];
        this.workspaceById[workspace.id] = workspace;
      }
      return workspace;
    },
    async deleteWorkspace(workspaceId) {
      if (!workspaceId) return;
      await api.delete(`/workspaces/${workspaceId}`);
      this.workspaces = this.workspaces.filter((item) => item.id !== workspaceId);
      delete this.workspaceById[workspaceId];
      delete this.projectsByWorkspace[workspaceId];
    },
    async createProject(workspaceId, name) {
      const res = await api.post("/projects", {
        name,
        workspace_id: workspaceId,
      });
      const project = res.data?.data;
      if (project) {
        const current = this.projectsByWorkspace[workspaceId] || [];
        this.projectsByWorkspace[workspaceId] = [...current, project];
        this.projectById[project.id] = project;
      }
      return project;
    },
    async fetchProjectDetail(projectId) {
      if (!projectId) return null;
      const res = await api.get(`/projects/${projectId}`);
      const project = res.data?.data || null;
      if (project) {
        this.projectById[projectId] = project;
      }
      return project;
    },
    async updateWorkspaceName(workspaceId, name) {
      if (!workspaceId) return null;
      const res = await api.put(`/workspaces/${workspaceId}`, { name });
      const updated = res.data?.data || null;
      if (updated) {
        const current = this.workspaceById[workspaceId] || {};
        this.workspaceById[workspaceId] = { ...current, ...updated };
        this.workspaces = this.workspaces.map((item) =>
          String(item.id) === String(workspaceId) ? { ...item, ...updated } : item
        );
      }
      return updated;
    },
    async fetchWorkspaceMembers(workspaceId) {
      if (!workspaceId) return [];
      const res = await api.get(`/workspaces/${workspaceId}/members`);
      return res.data?.data || [];
    },
    async inviteWorkspaceMember(workspaceId, payload) {
      if (!workspaceId) return null;
      const res = await api.post(`/workspaces/${workspaceId}/members`, payload);
      return res.data?.data || null;
    },
    async removeWorkspaceMember(workspaceId, memberId) {
      if (!workspaceId || !memberId) return;
      await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
    },
  },
});
