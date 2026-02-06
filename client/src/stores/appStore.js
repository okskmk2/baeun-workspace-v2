import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    currentProjectId: null,
    currentWorkspaceId: null,
    currentUser: null
  }),
  actions: {
    setCurrentProjectId(id){ this.currentProjectId = id },
    setCurrentWorkspaceId(id){ this.currentWorkspaceId = id },
    setCurrentUser(user){ this.currentUser = user }
  }
})
