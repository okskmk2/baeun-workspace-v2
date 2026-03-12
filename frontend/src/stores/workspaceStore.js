import { defineStore } from "pinia";
import api from "../lib/axios";

export const useWorkspaceStore = defineStore("workspace", {
  state: () => ({
    workspaces: [],
    workspaceById: {},
    projectsByWorkspace: {},
    pagedProjectsByWorkspace: {},
    projectPaginationByWorkspace: {},
    projectById: {},
  }),
  actions: {
    async fetchWorkspaces() {
      const res = await api.get("/workspaces/my");
      this.workspaces = res.data || [];
      this.workspaces.forEach((workspace) => {
        this.workspaceById[workspace.id] = workspace;
      });
      return this.workspaces;
    },
    async fetchWorkspace(workspaceId) {
      if (!workspaceId) return null;
      const res = await api.get(`/workspaces/${workspaceId}`);
      const workspace = res.data || null;
      if (workspace) {
        this.workspaceById[workspaceId] = workspace;
      }
      return workspace;
    },
    async fetchProjects(workspaceId, options = {}) {
      if (!workspaceId) return [];
      const hasPaginationOption =
        options.page !== undefined || options.pageSize !== undefined;
      const params = new URLSearchParams({ workspaceId: String(workspaceId) });
      if (options.page) {
        params.set("page", String(options.page));
      }
      if (options.pageSize) {
        params.set("pageSize", String(options.pageSize));
      }

      const res = await api.get(`/projects?${params.toString()}`);
      if (Array.isArray(res.data)) {
        const projects = res.data || [];
        this.projectsByWorkspace[workspaceId] = projects;
        projects.forEach((project) => {
          this.projectById[project.id] = project;
        });

        if (hasPaginationOption) {
          const page = Number(options.page) > 0 ? Number(options.page) : 1;
          const pageSize = Number(options.pageSize) > 0 ? Number(options.pageSize) : 10;
          const start = (page - 1) * pageSize;
          const end = start + pageSize;
          const pagedItems = projects.slice(start, end);
          this.pagedProjectsByWorkspace[workspaceId] = pagedItems;
          this.projectPaginationByWorkspace[workspaceId] = {
            page,
            pageSize,
            total: projects.length,
            totalPages: Math.max(1, Math.ceil(projects.length / pageSize)),
          };
          pagedItems.forEach((project) => {
            this.projectById[project.id] = project;
          });
          return pagedItems;
        }

        return projects;
      }

      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      const pagination = res.data?.pagination || {};
      this.pagedProjectsByWorkspace[workspaceId] = items;
      this.projectPaginationByWorkspace[workspaceId] = {
        page: Number(pagination.page) > 0 ? Number(pagination.page) : Number(options.page) || 1,
        pageSize:
          Number(pagination.pageSize) > 0
            ? Number(pagination.pageSize)
            : Number(options.pageSize) || 10,
        total: Number(pagination.total) >= 0 ? Number(pagination.total) : items.length,
        totalPages:
          Number(pagination.totalPages) > 0
            ? Number(pagination.totalPages)
            : Math.max(
                1,
                Math.ceil(
                  (Number(pagination.total) >= 0 ? Number(pagination.total) : items.length) /
                    (Number(pagination.pageSize) > 0
                      ? Number(pagination.pageSize)
                      : Number(options.pageSize) || 10)
                )
              ),
      };
      items.forEach((project) => {
        this.projectById[project.id] = project;
      });
      return items;
    },
    getProjects(workspaceId, options = {}) {
      if (options.paginated) {
        return this.pagedProjectsByWorkspace[workspaceId] || [];
      }
      return this.projectsByWorkspace[workspaceId] || [];
    },
    getProjectPagination(workspaceId) {
      return this.projectPaginationByWorkspace[workspaceId] || null;
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
      return res.data || null;
    },
    async deleteWorkspace(workspaceId) {
      if (!workspaceId) return;
      await api.delete(`/workspaces/${workspaceId}`);
      this.workspaces = this.workspaces.filter((item) => item.id !== workspaceId);
      delete this.workspaceById[workspaceId];
      delete this.projectsByWorkspace[workspaceId];
      delete this.pagedProjectsByWorkspace[workspaceId];
      delete this.projectPaginationByWorkspace[workspaceId];
    },
    async createProject(workspaceId, name) {
      const res = await api.post("/projects", {
        name,
        workspace_id: workspaceId,
      });
      return res.data || null;
    },
    async fetchProjectDetail(projectId) {
      if (!projectId) return null;
      const res = await api.get(`/projects/${projectId}`);
      const project = res.data || null;
      if (project) {
        this.projectById[projectId] = project;
      }
      return project;
    },
    async updateWorkspaceSettings(workspaceId, payload = {}) {
      if (!workspaceId) return null;
      const res = await api.put(`/workspaces/${workspaceId}`, payload);
      const updated = res.data || null;
      if (updated) {
        const current = this.workspaceById[workspaceId] || {};
        this.workspaceById[workspaceId] = { ...current, ...updated };
        this.workspaces = this.workspaces.map((item) =>
          String(item.id) === String(workspaceId) ? { ...item, ...updated } : item
        );
      }
      return updated;
    },
    async updateWorkspaceName(workspaceId, name) {
      return this.updateWorkspaceSettings(workspaceId, { name });
    },
    async updateWorkspaceImage(workspaceId, file) {
      if (!workspaceId || !file) return null;
      const formData = new FormData();
      formData.append("image", file);

      const res = await api.post(`/workspaces/${workspaceId}/image`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updated = res.data || null;

      if (updated) {
        const current = this.workspaceById[workspaceId] || {};
        this.workspaceById[workspaceId] = { ...current, ...updated };
        this.workspaces = this.workspaces.map((item) =>
          String(item.id) === String(workspaceId) ? { ...item, ...updated } : item
        );
      }

      return updated;
    },
    async removeWorkspaceImage(workspaceId) {
      if (!workspaceId) return null;
      const res = await api.delete(`/workspaces/${workspaceId}/image`);
      const updated = res.data || null;

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
      return res.data || [];
    },
    async inviteWorkspaceMember(workspaceId, payload) {
      if (!workspaceId) return null;
      const res = await api.post(`/workspaces/${workspaceId}/members`, payload);
      return res.data || null;
    },
    async removeWorkspaceMember(workspaceId, memberId) {
      if (!workspaceId || !memberId) return;
      await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
    },
  },
});
