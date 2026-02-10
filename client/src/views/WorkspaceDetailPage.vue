<template>
  <section class="workspace-detail">
    <hgroup>
      <div>
        <h1>{{ t("workspace.detail.header.title") }}</h1>
        <p class="subtitle">{{ t("workspace.detail.header.subtitle") }}</p>
      </div>
      <div class="actions">
        <router-link class="btn btn--secondary" to="/account/workspaces">
          {{ t("workspace.detail.actions.back") }}
        </router-link>
        <router-link class="btn" :to="`/workspace/${workspaceId}`">
          {{ t("workspace.detail.actions.open") }}
        </router-link>
      </div>
    </hgroup>

    <p v-if="isLoading" class="status">{{ t("workspace.detail.status.loading") }}</p>
    <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>

    <div v-else class="detail-grid">
      <section class="card">
        <div class="card__header">
          <h2>{{ t("workspace.detail.sections.summary") }}</h2>
          <Tag v-if="workspaceRoleLabel" variant="info">{{ workspaceRoleLabel }}</Tag>
        </div>
        <dl class="summary-list">
          <div>
            <dt>{{ t("workspace.detail.fields.name") }}</dt>
            <dd>{{ workspaceName || t("workspace.detail.fallback.name") }}</dd>
          </div>
          <div>
            <dt>{{ t("workspace.detail.fields.owner") }}</dt>
            <dd>{{ workspaceOwner || t("workspace.detail.fallback.owner") }}</dd>
          </div>
          <div>
            <dt>{{ t("workspace.detail.fields.created") }}</dt>
            <dd>{{ formattedCreatedAt }}</dd>
          </div>
        </dl>
      </section>

      <section class="card">
        <div class="card__header">
          <h2>{{ t("workspace.detail.sections.stats") }}</h2>
        </div>
        <div class="stat-grid">
          <div class="stat">
            <p class="stat__value">{{ projectCount }}</p>
            <p class="stat__label">{{ t("workspace.detail.stats.projects") }}</p>
          </div>
          <div class="stat">
            <p class="stat__value">{{ memberCount }}</p>
            <p class="stat__label">{{ t("workspace.detail.stats.members") }}</p>
          </div>
          <div class="stat">
            <p class="stat__value">{{ licenseCount }}</p>
            <p class="stat__label">{{ t("workspace.detail.stats.licenses") }}</p>
          </div>
        </div>
      </section>

      <section class="card card--full">
        <div class="card__header">
          <h2>{{ t("workspace.detail.sections.projects") }}</h2>
        </div>
        <p v-if="!projects.length" class="empty">
          {{ t("workspace.detail.empty.projects") }}
        </p>
        <ul v-else class="project-list">
          <li v-for="project in projects" :key="project.id" class="project-item">
            <router-link :to="`/workspace/${workspaceId}/project/${project.id}`">
              {{ project.name }}
            </router-link>
          </li>
        </ul>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import Tag from "../components/Tag.vue";
import { useRoleLabels } from "../lib/roleLabels";
import { useWorkspaceStore } from "../stores/workspaceStore";

const { t, locale } = useI18n();
const { getRoleLabel } = useRoleLabels();
const route = useRoute();
const workspaceStore = useWorkspaceStore();

const isLoading = ref(false);
const errorMessage = ref("");

const workspaceId = computed(() => route.params.workspaceId);
const workspace = computed(() => workspaceStore.workspaceById[workspaceId.value] || null);
const projects = computed(() => workspaceStore.getProjects(workspaceId.value));

const workspaceName = computed(() => workspace.value?.name || "");
const workspaceRole = computed(() => workspace.value?.role_name || "");
const workspaceRoleLabel = computed(() => getRoleLabel("workspace_member", workspaceRole.value));
const workspaceOwner = computed(() => workspace.value?.owner_name || "");

const formatCount = (value) => (Number.isFinite(value) ? String(value) : t("workspace.detail.fallback.count"));

const projectCount = computed(() => formatCount(projects.value.length));
const memberCount = computed(() => formatCount(workspace.value?.member_count));
const licenseCount = computed(() => formatCount(workspace.value?.license_count));

const formattedCreatedAt = computed(() => {
  const value = workspace.value?.created_at;
  if (!value) return t("workspace.detail.fallback.date");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("workspace.detail.fallback.date");
  const localeMap = {
    ko: "ko-KR",
    en: "en-US",
    id: "id-ID",
  };
  const dateLocale = localeMap[locale.value] || "en-US";
  return date.toLocaleDateString(dateLocale, { year: "numeric", month: "short", day: "2-digit" });
});

const fetchWorkspaceDetail = async () => {
  if (!workspaceId.value) return;
  isLoading.value = true;
  errorMessage.value = "";

  try {
    await workspaceStore.fetchWorkspace(workspaceId.value);
    await workspaceStore.fetchProjects(workspaceId.value);
  } catch (error) {
    errorMessage.value = t("workspace.detail.status.errorLoad");
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchWorkspaceDetail);
watch(() => route.params.workspaceId, fetchWorkspaceDetail);
</script>

<style scoped>
.workspace-detail {
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: var(--dl-text);
}

.status {
  color: var(--dl-text-muted);
  font-size: 14px;
}

.status.error {
  color: var(--color-danger);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.card {
  padding: 18px 20px;
  border-radius: 16px;
  border: 1px solid var(--dl-border);
  background-color: var(--dl-surface);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card--full {
  grid-column: 1 / -1;
}

.card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card__header h2 {
  margin: 0;
  font-size: 16px;
}

.summary-list {
  margin: 0;
  display: grid;
  gap: 10px;
}

.summary-list div {
  display: grid;
  gap: 4px;
}

.summary-list dt {
  font-size: 12px;
  color: var(--dl-text-muted);
}

.summary-list dd {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.stat {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--dl-border);
  background-color: var(--dl-page-bg);
}

.stat__value {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 700;
}

.stat__label {
  margin: 0;
  font-size: 12px;
  color: var(--dl-text-muted);
}

.project-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}

.project-item a {
  color: var(--dl-text);
  text-decoration: none;
  font-weight: 600;
}

.project-item a:hover {
  text-decoration: underline;
}

.empty {
  margin: 0;
  color: var(--dl-text-muted);
  font-size: 14px;
}
</style>
