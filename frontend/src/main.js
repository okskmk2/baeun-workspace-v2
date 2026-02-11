import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./assets/styles.css";
import { router } from "./router";
import { i18n } from "./i18n";
import api from "./lib/axios";
import { useAppStore } from "./stores/appStore";

const pinia = createPinia();

const bootstrapAuthState = async () => {
  const appStore = useAppStore(pinia);
  try {
    const res = await api.get("/members/me");
    if (res.data?.success && res.data?.data) {
      appStore.setCurrentUser(res.data.data);
      return;
    }
  } catch (error) {
    // If session is missing/expired, keep user as null.
  }
  appStore.setCurrentUser(null);
};

const startApp = async () => {
  const app = createApp(App);
  app.use(pinia);
  await bootstrapAuthState();
  app.use(router);
  app.use(i18n);
  app.mount("#app");
};

startApp();
