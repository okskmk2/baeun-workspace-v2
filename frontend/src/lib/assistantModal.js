import { useAssistantModalStore } from "../stores/assistantModalStore";

export const openAssistantModal = () => {
  useAssistantModalStore().open();
};

export const closeAssistantModal = () => {
  useAssistantModalStore().close();
};

export const toggleAssistantModal = () => {
  useAssistantModalStore().toggle();
};