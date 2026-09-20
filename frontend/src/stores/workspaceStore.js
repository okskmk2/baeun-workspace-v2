import { defineStore } from "pinia";
import api from "../lib/axios";
import { useAppStore } from "./appStore";

let fetchWorkspacesInflight = null;
let fetchWorkspacesInflightMemberId = null;
let fetchWorkspaceTreeInflight = null;
let fetchWorkspaceTreeInflightMemberId = null;

const memberIdFromAppStore = (appStore) => {
  const id = appStore.currentUser?.id;
  return id === undefined || id === null ? null : String(id);
};

export const useWorkspaceStore = defineStore("workspace", {
  state: () => ({
    workspaces: [],
    hasFetchedWorkspaces: false,
    workspacesLoadedForMemberId: null,
    workspaceById: {},
    projectsByWorkspace: {},
    pagedProjectsByWorkspace: {},
    projectPaginationByWorkspace: {},
    projectById: {},
  }),
  actions: {
    resetWorkspaceCache() {
      this.workspaces = [];
      this.hasFetchedWorkspaces = false;
      this.workspacesLoadedForMemberId = null;
      this.workspaceById = {};
      this.projectsByWorkspace = {};
      this.pagedProjectsByWorkspace = {};
      this.projectPaginationByWorkspace = {};
      this.projectById = {};
      fetchWorkspacesInflight = null;
      fetchWorkspacesInflightMemberId = null;
      fetchWorkspaceTreeInflight = null;
      fetchWorkspaceTreeInflightMemberId = null;
    },
    async fetchWorkspaces({ force = false } = {}) {
      const appStore = useAppStore();
      const memberId = memberIdFromAppStore(appStore);

      if (
        this.hasFetchedWorkspaces &&
        this.workspacesLoadedForMemberId !== null &&
        this.workspacesLoadedForMemberId !== memberId
      ) {
        this.resetWorkspaceCache();
      }

      const hasValidCache =
        !force &&
        this.hasFetchedWorkspaces &&
        this.workspacesLoadedForMemberId === memberId;
      if (hasValidCache) {
        return this.workspaces;
      }

      if (fetchWorkspacesInflight && fetchWorkspacesInflightMemberId === memberId) {
        return fetchWorkspacesInflight;
      }

      fetchWorkspacesInflightMemberId = memberId;
      fetchWorkspacesInflight = (async () => {
        const res = await api.get("/workspaces/my");
        const currentMemberId = memberIdFromAppStore(appStore);

        if (currentMemberId !== memberId) {
          return this.workspaces;
        }

        this.workspaces = Array.isArray(res.data) ? res.data : [];
        this.workspaceById = {};
        this.workspaces.forEach((workspace) => {
          this.workspaceById[workspace.id] = workspace;
        });
        this.hasFetchedWorkspaces = true;
        this.workspacesLoadedForMemberId = memberId;
        return this.workspaces;
      })();

      try {
        return await fetchWorkspacesInflight;
      } finally {
        if (fetchWorkspacesInflightMemberId === memberId) {
          fetchWorkspacesInflight = null;
          fetchWorkspacesInflightMemberId = null;
        }
      }
    },
    async fetchWorkspaceTree({ force = false } = {}) {
      const appStore = useAppStore();
      const memberId = memberIdFromAppStore(appStore);

      if (
        this.hasFetchedWorkspaces &&
        this.workspacesLoadedForMemberId !== null &&
        this.workspacesLoadedForMemberId !== memberId
      ) {
        this.resetWorkspaceCache();
      }

      const canAssembleFromCache =
        !force &&
        this.hasFetchedWorkspaces &&
        this.workspacesLoadedForMemberId === memberId &&
        this.workspaces.every((workspace) => this.projectsByWorkspace[workspace.id] !== undefined);
      if (canAssembleFromCache) {
        return this.workspaces.map((workspace) => ({
          ...workspace,
          projects: this.projectsByWorkspace[workspace.id] || [],
        }));
      }

      if (fetchWorkspaceTreeInflight && fetchWorkspaceTreeInflightMemberId === memberId) {
        return fetchWorkspaceTreeInflight;
      }

      fetchWorkspaceTreeInflightMemberId = memberId;
      fetchWorkspaceTreeInflight = (async () => {
        const res = await api.get("/workspaces/my/tree");
        const currentMemberId = memberIdFromAppStore(appStore);
        if (currentMemberId !== memberId) {
          return this.workspaces.map((workspace) => ({
            ...workspace,
            projects: this.projectsByWorkspace[workspace.id] || [],
          }));
        }

        const rows = Array.isArray(res.data) ? res.data : [];
        const workspaces = [];
        const tree = rows.map((row) => {
          const projects = Array.isArray(row.projects) ? row.projects : [];
          const workspace = { ...row };
          delete workspace.projects;
          workspaces.push(workspace);
          this.workspaceById[workspace.id] = workspace;
          this.projectsByWorkspace[workspace.id] = projects;
          projects.forEach((project) => {
            this.projectById[project.id] = project;
          });
          return { ...workspace, projects };
        });

        this.workspaces = workspaces;
        this.hasFetchedWorkspaces = true;
        this.workspacesLoadedForMemberId = memberId;
        return tree;
      })();

      try {
        return await fetchWorkspaceTreeInflight;
      } finally {
        if (fetchWorkspaceTreeInflightMemberId === memberId) {
          fetchWorkspaceTreeInflight = null;
          fetchWorkspaceTreeInflightMemberId = null;
        }
      }
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
      const id = String(workspaceId);
      this.workspaces = this.workspaces.filter((item) => String(item.id) !== id);
      delete this.workspaceById[id];
      delete this.projectsByWorkspace[id];
      delete this.pagedProjectsByWorkspace[id];
      delete this.projectPaginationByWorkspace[id];
      Object.keys(this.projectById).forEach((projectId) => {
        if (String(this.projectById[projectId]?.workspace_id) === id) {
          delete this.projectById[projectId];
        }
      });
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
    async transferProject(projectId, targetWorkspaceId) {
      if (!projectId || !targetWorkspaceId) return null;
      const res = await api.post(`/projects/${projectId}/transfer`, {
        target_workspace_id: targetWorkspaceId,
      });

      const sourceWorkspaceId = this.projectById[projectId]?.workspace_id;
      delete this.projectById[projectId];
      [sourceWorkspaceId, targetWorkspaceId].forEach((id) => {
        if (!id) return;
        delete this.projectsByWorkspace[id];
        delete this.pagedProjectsByWorkspace[id];
        delete this.projectPaginationByWorkspace[id];
      });

      return res.data || null;
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
