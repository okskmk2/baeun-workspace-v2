import { defineStore } from "pinia";
import { GNB_OVERLAYS, useGnbOverlayStore } from "./gnbOverlayStore";

export const useAssistantModalStore = defineStore("assistantModal", {
  getters: {
    isOpen() {
      return useGnbOverlayStore().isAssistantOpen;
    },
  },
  actions: {
    open() {
      useGnbOverlayStore().open(GNB_OVERLAYS.ASSISTANT);
    },
    close() {
      useGnbOverlayStore().close(GNB_OVERLAYS.ASSISTANT);
    },
    toggle() {
      useGnbOverlayStore().toggle(GNB_OVERLAYS.ASSISTANT);
    },
  },
});