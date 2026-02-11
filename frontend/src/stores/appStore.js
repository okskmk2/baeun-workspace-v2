import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    currentProjectId: null,
    currentWorkspaceId: null,
    currentUser: null,
    gnbPreviewTheme: null
  }),
  actions: {
    setCurrentProjectId(id){ this.currentProjectId = id },
    setCurrentWorkspaceId(id){ this.currentWorkspaceId = id },
    setCurrentUser(user){ this.currentUser = user },
    setGnbPreviewTheme(theme){ this.gnbPreviewTheme = theme },
    clearGnbPreviewTheme(){ this.gnbPreviewTheme = null }
  }
})
