<template>
  <main class="open-projects container">
    <header class="open-projects-header">
      <h1 class="open-projects-header__title">{{ t("openProjects.header.title") }}</h1>
      <p class="open-projects-header__sub">{{ t("openProjects.header.subtitle") }}</p>
    </header>

    <section class="open-projects-section" aria-labelledby="open-projects-workspaces-title">
      <h2 id="open-projects-workspaces-title" class="section-title">
        {{ t("openProjects.workspaces.title") }}
      </h2>
      <p v-if="isWorkspacesLoading" class="status-text">{{ t("openProjects.status.loading") }}</p>
      <p v-else-if="workspacesError" class="status-text status-error">{{ workspacesError }}</p>
      <p v-else-if="workspaces.length === 0" class="status-text">
        {{ t("openProjects.workspaces.empty") }}
      </p>
      <div v-else class="card-grid">
        <article v-for="workspace in workspaces" :key="workspace.id" class="open-card">
          <Avatar
            :text="getInitials(workspace.name)"
            :label="workspace.name || 'Workspace'"
            :image-url="workspace.img_url || ''"
            :size="48"
          />
          <h3 class="open-card__name">{{ workspace.name }}</h3>
          <p class="open-card__summary">{{ workspace.summary || "" }}</p>
          <dl class="open-card__meta">
            <div>
              <dt>{{ t("openProjects.card.members") }}</dt>
              <dd>{{ workspace.member_count ?? 0 }}</dd>
            </div>
            <div>
              <dt>{{ t("openProjects.card.projects") }}</dt>
              <dd>{{ workspace.project_count ?? 0 }}</dd>
            </div>
          </dl>
          <router-link :to="`/workspace/${workspace.id}`" class="open-card__link">
            {{ t("openProjects.card.goTo") }}
            <MaterialSymbol name="arrow_forward" :size="16" alt="" />
          </router-link>
        </article>
      </div>
    </section>

    <section class="open-projects-section" aria-labelledby="open-projects-projects-title">
      <h2 id="open-projects-projects-title" class="section-title">
        {{ t("openProjects.projects.title") }}
      </h2>
      <p v-if="isProjectsLoading" class="status-text">{{ t("openProjects.status.loading") }}</p>
      <p v-else-if="projectsError" class="status-text status-error">{{ projectsError }}</p>
      <p v-else-if="projects.length === 0" class="status-text">
        {{ t("openProjects.projects.empty") }}
      </p>
      <div v-else class="card-grid">
        <article v-for="project in projects" :key="project.id" class="open-card">
          <Avatar
            :text="getInitials(project.name)"
            :label="project.name || 'Project'"
            :image-url="project.img_url || ''"
            :size="48"
          />
          <h3 class="open-card__name">{{ project.name }}</h3>
          <p class="open-card__summary">{{ project.summary || "" }}</p>
          <p class="open-card__workspace">{{ project.workspace_name }}</p>
          <dl class="open-card__meta">
            <div>
              <dt>{{ t("openProjects.card.members") }}</dt>
              <dd>{{ project.member_count ?? 0 }}</dd>
            </div>
          </dl>
          <router-link :to="`/project/${project.id}`" class="open-card__link">
            {{ t("openProjects.card.goTo") }}
            <MaterialSymbol name="arrow_forward" :size="16" alt="" />
          </router-link>
        </article>
      </div>
    </section>
  </main>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import api from "../../lib/axios";
import Avatar from "../../components/Avatar.vue";
import MaterialSymbol from "../../components/MaterialSymbol.vue";

const { t } = useI18n();

const workspaces = ref([]);
const isWorkspacesLoading = ref(true);
const workspacesError = ref("");

const projects = ref([]);
const isProjectsLoading = ref(true);
const projectsError = ref("");

const getInitials = (name) =>
  String(name || "?")
    .trim()
    .charAt(0)
    .toUpperCase() || "?";

const loadWorkspaces = async () => {
  isWorkspacesLoading.value = true;
  workspacesError.value = "";
  try {
    const { data } = await api.get("/public/workspaces");
    workspaces.value = data.items || [];
  } catch (error) {
    workspacesError.value = t("openProjects.status.error");
  } finally {
    isWorkspacesLoading.value = false;
  }
};

const loadProjects = async () => {
  isProjectsLoading.value = true;
  projectsError.value = "";
  try {
    const { data } = await api.get("/public/projects");
    projects.value = data.items || [];
  } catch (error) {
    projectsError.value = t("openProjects.status.error");
  } finally {
    isProjectsLoading.value = false;
  }
};

onMounted(() => {
  loadWorkspaces();
  loadProjects();
});
</script>

<style scoped>
.open-projects {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  padding-block: var(--space-8);
}

.open-projects-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  text-align: center;
}

.open-projects-header__title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: var(--text-h1);
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--color-text);
}

.open-projects-header__sub {
  margin: 0;
  font-size: var(--text-body);
  line-height: 1.6;
  color: var(--color-text-muted);
}

.open-projects-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.section-title {
  margin: 0;
  font-size: var(--text-h2, 1.25rem);
  font-weight: 600;
  color: var(--color-text);
}

.status-text {
  margin: 0;
  color: var(--color-text-muted);
}

.status-error {
  color: var(--color-danger, #d33);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-5);
}

.open-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease-in-out;
}

.open-card:hover {
  border-color: var(--color-accent);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.open-card__name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.open-card__summary {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

.open-card__workspace {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted);
}

.open-card__meta {
  display: flex;
  gap: 16px;
  margin: 0;
  width: 100%;
}

.open-card__meta div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.open-card__meta dt {
  font-size: 11px;
  color: var(--color-text-muted);
}

.open-card__meta dd {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.open-card__link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-accent);
  text-decoration: none;
}

.open-card__link:hover {
  text-decoration: underline;
}
</style>
