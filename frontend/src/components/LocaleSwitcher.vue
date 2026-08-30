<template>
  <div
    class="locale-switcher"
    :class="`locale-switcher--${variant}`"
    role="group"
    :aria-label="t('layout.default.util.language')"
  >
    <span class="locale-switcher__label">
      <MaterialSymbol
        name="translate"
        type="rounded"
        :size="iconSize"
        :alt="variant === 'footer' ? '' : t('layout.default.util.language')"
      />
      <span class="locale-switcher__label-text">{{ t("layout.default.util.language") }}</span>
    </span>
    <select
      v-model="locale"
      class="locale-switcher__select"
      :aria-label="t('layout.default.util.language')"
    >
      <option value="ko">{{ t("layout.default.util.languageKo") }}</option>
      <option value="en">{{ t("layout.default.util.languageEn") }}</option>
    </select>
  </div>
</template>

<script setup>
import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { persistLocale, supportedLocales } from "../i18n";
import MaterialSymbol from "./MaterialSymbol.vue";

const props = defineProps({
  variant: { type: String, default: "menu" },
});

const { t, locale } = useI18n();
const iconSize = computed(() => (props.variant === "footer" ? 14 : 16));

watch(locale, (value) => {
  if (!supportedLocales.includes(value)) return;
  persistLocale(value);
});
</script>

<style scoped>
.locale-switcher {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.locale-switcher__label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-muted);
}

.locale-switcher__select {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
}

.locale-switcher__select:focus {
  outline: none;
  border-color: var(--color-accent);
}

.locale-switcher--footer {
  justify-content: flex-start;
  gap: 6px;
}

.locale-switcher--footer .locale-switcher__label {
  font-size: 12px;
}

.locale-switcher--footer .locale-switcher__label-text {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.locale-switcher--footer .locale-switcher__select {
  border: 0;
  background: transparent;
  color: var(--color-text-muted);
  border-radius: 0;
  padding: 0;
  font-size: 12px;
  cursor: pointer;
}

.locale-switcher--footer .locale-switcher__select:hover {
  color: var(--color-text);
}

.locale-switcher--footer .locale-switcher__select:focus {
  border-color: transparent;
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
