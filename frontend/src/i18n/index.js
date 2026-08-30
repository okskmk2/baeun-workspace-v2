import { createI18n } from "vue-i18n";
import ko from "./locales/ko.json";
import en from "./locales/en.json";
import landingKo from "../locales/ko.json";
import landingEn from "../locales/en.json";

export const supportedLocales = ["ko", "en"];
export const localeStorageKey = "app.locale";

const getInitialLocale = () => {
  if (typeof window === "undefined") return "ko";
  const saved = window.localStorage.getItem(localeStorageKey);
  if (supportedLocales.includes(saved)) return saved;

  const browserLocale = window.navigator.language?.split("-")[0];
  if (supportedLocales.includes(browserLocale)) return browserLocale;

  return "ko";
};

export const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: "en",
  messages: {
    ko: { ...ko, ...landingKo },
    en: { ...en, ...landingEn },
  },
});

export const persistLocale = (value) => {
  if (typeof window === "undefined") return;
  if (!supportedLocales.includes(value)) return;
  window.localStorage.setItem(localeStorageKey, value);
};
