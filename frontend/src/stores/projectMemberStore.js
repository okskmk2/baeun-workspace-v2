import { defineStore } from "pinia";
import api from "../lib/axios";

export const useProjectMemberStore = defineStore("projectMember", {
  state: () => ({
    membersByProject: {},
  }),
  actions: {
    async fetchProjectMembers(projectId, options = {}) {
      if (!projectId) return [];
      const { force = false } = options;
      if (!force && this.membersByProject[projectId]) {
        return this.membersByProject[projectId];
      }
      try {
        const res = await api.get(`/projects/${projectId}/members`);
        const members = res.data || [];
        this.membersByProject[projectId] = members;
        return members;
      } catch (e) {
        this.membersByProject[projectId] = [];
        throw e;
      }
    },
    setProjectMembers(projectId, members) {
      if (!projectId) return;
      this.membersByProject[projectId] = members || [];
    },
    getProjectMembers(projectId) {
      return this.membersByProject[projectId] || [];
    },
    async updateMemberRole(projectId, memberId, roleName) {
      if (!projectId || !memberId) return;
      await api.patch(`/projects/${projectId}/members/${memberId}`, { role_name: roleName });
      const members = this.membersByProject[projectId];
      if (members) {
        const target = members.find((m) => String(m.id) === String(memberId));
        if (target) target.role_name = roleName;
      }
    },
    clearProjectMembers(projectId) {
      if (!projectId) return;
      delete this.membersByProject[projectId];
    },
  },
});
