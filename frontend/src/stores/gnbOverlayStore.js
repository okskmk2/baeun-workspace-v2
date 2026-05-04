import { defineStore } from "pinia";

export const GNB_OVERLAYS = {
  ASSISTANT: "assistant",
  CONTEXT_SWITCHER: "context-switcher",
  PROJECT_NOTIFICATIONS: "project-notifications",
};

export const useGnbOverlayStore = defineStore("gnbOverlay", {
  state: () => ({
    activeOverlay: null,
  }),
  getters: {
    isAssistantOpen: (state) => state.activeOverlay === GNB_OVERLAYS.ASSISTANT,
    isContextSwitcherOpen: (state) => state.activeOverlay === GNB_OVERLAYS.CONTEXT_SWITCHER,
    isProjectNotificationsOpen: (state) =>
      state.activeOverlay === GNB_OVERLAYS.PROJECT_NOTIFICATIONS,
  },
  actions: {
    open(overlayKey) {
      this.activeOverlay = overlayKey;
    },
    close(overlayKey) {
      if (this.activeOverlay !== overlayKey) return;
      this.activeOverlay = null;
    },
    toggle(overlayKey) {
      this.activeOverlay = this.activeOverlay === overlayKey ? null : overlayKey;
    },
    closeAll() {
      this.activeOverlay = null;
    },
  },
});