<template>
  <section class="forbidden">
    <h1>{{ t("forbidden.project.title") }}</h1>
    <p class="subtitle">{{ t("forbidden.project.description") }}</p>
    <div class="actions">
      <router-link class="btn btn--secondary" to="/settings/workspaces">
        {{ t("forbidden.project.actions.workspaces") }}
      </router-link>
      <router-link class="btn" to="/">
        {{ t("forbidden.project.actions.home") }}
      </router-link>
    </div>
  </section>
</template>

<script setup>
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<style scoped>
.forbidden {
  max-width: 640px;
  margin: 2rem auto;
  padding: 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background-color: var(--color-surface);
}

.forbidden h1 {
  margin: 0;
  font-size: 1.375rem;
}

.forbidden .subtitle {
  margin-top: 0.5rem;
  color: var(--color-text-muted);
}

.actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
}
</style>
