import { defineStore } from "pinia";
import { useRealtimeStore } from "./realtimeStore";

export const useAppStore = defineStore("app", {
  state: () => ({
    currentProjectId: null,
    currentWorkspaceId: null,
    currentUser: null,
    gnbPreviewTheme: null,
  }),
  actions: {
    setCurrentProjectId(id) {
      this.currentProjectId = id;
    },
    setCurrentWorkspaceId(id) {
      this.currentWorkspaceId = id;
    },
    setCurrentUser(user) {
      this.currentUser = user;
      const realtimeStore = useRealtimeStore();
      if (user?.id) {
        realtimeStore.connect();
      } else {
        realtimeStore.disconnect();
      }
    },
    setGnbPreviewTheme(theme) {
      this.gnbPreviewTheme = theme;
    },
    clearGnbPreviewTheme() {
      this.gnbPreviewTheme = null;
    },
  },
});
