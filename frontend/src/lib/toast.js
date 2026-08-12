import { ref } from "vue";

let toastId = 0;

export const toastState = ref({
  items: [],
});

export const addToast = ({ message, type = "info", duration = 3000 }) => {
  const id = toastId++;
  const toast = { id, message, type };
  toastState.value.items.push(toast);

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  return id;
};

export const removeToast = (id) => {
  const index = toastState.value.items.findIndex((item) => item.id === id);
  if (index >= 0) {
    toastState.value.items.splice(index, 1);
  }
};

export const clearToasts = () => {
  toastState.value.items.splice(0, toastState.value.items.length);
};
