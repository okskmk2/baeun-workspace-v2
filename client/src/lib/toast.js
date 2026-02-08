import { reactive } from "vue";

let toastId = 0;

export const toastState = reactive({
  items: [],
});

export const addToast = ({ message, type = "info", duration = 3000 }) => {
  const id = toastId++;
  const toast = { id, message, type };
  toastState.items.push(toast);

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  return id;
};

export const removeToast = (id) => {
  const index = toastState.items.findIndex((item) => item.id === id);
  if (index >= 0) {
    toastState.items.splice(index, 1);
  }
};

export const clearToasts = () => {
  toastState.items.splice(0, toastState.items.length);
};
