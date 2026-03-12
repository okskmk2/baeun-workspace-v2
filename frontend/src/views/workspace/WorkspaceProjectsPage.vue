<template>
  <main class="container project-hub">
    <header class="page-header">
      <div>
        <h1>{{ t("workspace.projects.header.title", "내 프로젝트") }}</h1>
        <p class="page-subtitle">
          {{
            t(
              "workspace.projects.header.subtitle",
              "참여 중인 프로젝트의 진행 상태와 최근 업데이트를 한눈에 확인하세요."
            )
          }}
        </p>
      </div>
    </header>

    <section class="overview-grid" v-if="!isLoading && !errorMessage">
      <article class="overview-card">
        <p class="overview-label">{{ t("workspace.projects.overview.joined", "참여 중") }}</p>
        <p class="overview-value">{{ projects.length }}</p>
        <p class="overview-meta">
          {{
            t(
              "workspace.projects.overview.joinedDesc",
              "현재 워크스페이스에서 내가 참여 중인 프로젝트 수"
            )
          }}
        </p>
      </article>

      <article class="overview-card">
        <p class="overview-label">{{ t("workspace.projects.overview.todo", "내 할 일") }}</p>
        <p class="overview-value">{{ totalMyTasks }}</p>
        <p class="overview-meta">
          {{ t("workspace.projects.overview.todoDesc", "프로젝트 전반에 남아 있는 내 작업 개수") }}
        </p>
      </article>

      <article class="overview-card">
        <p class="overview-label">
          {{ t("workspace.projects.overview.updates", "업데이트 있음") }}
        </p>
        <p class="overview-value">{{ projectsWithUpdates }}</p>
        <p class="overview-meta">
          {{
            t(
              "workspace.projects.overview.updatesDesc",
              "최근 변경사항이나 읽지 않은 소식이 있는 프로젝트"
            )
          }}
        </p>
      </article>
    </section>

    <section class="hub-toolbar">
      <div class="search-box">
        <label class="sr-only" for="project-search">
          {{ t("workspace.projects.filters.search", "프로젝트 검색") }}
        </label>
        <input
          id="project-search"
          v-model="searchQuery"
          type="search"
          class="input"
          :placeholder="
            t('workspace.projects.filters.searchPlaceholder', '프로젝트명, 설명, 내 역할로 검색')
          "
        />
      </div>

      <div
        class="filter-chips"
        role="tablist"
        :aria-label="t('workspace.projects.filters.label', '프로젝트 필터')"
      >
        <button
          v-for="filter in filters"
          :key="filter.value"
          type="button"
          class="chip"
          :class="{ 'chip--active': selectedFilter === filter.value }"
          @click="selectedFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>
    </section>

    <section class="content-section">
      <div class="section-head">
        <div>
          <h2>{{ t("workspace.projects.sections.priority", "지금 확인할 프로젝트") }}</h2>
          <p class="section-desc">
            {{
              t(
                "workspace.projects.sections.priorityDesc",
                "내 할 일, 최근 업데이트, 즐겨찾기를 기준으로 우선순위가 높은 프로젝트를 먼저 보여줍니다."
              )
            }}
          </p>
        </div>
        <p class="result-count" v-if="!isLoading && !errorMessage">
          {{
            t(
              "workspace.projects.results",
              { count: filteredProjects.length },
              filteredProjects.length
            ) || `${filteredProjects.length}개`
          }}
        </p>
      </div>

      <p v-if="isLoading" class="state-message">
        {{ t("workspace.home.status.loading") }}
      </p>
      <p v-else-if="errorMessage" class="state-message state-message--error">
        {{ errorMessage }}
      </p>
      <div v-else-if="filteredProjects.length === 0" class="empty-state">
        <h3>{{ t("workspace.projects.empty.title", "표시할 프로젝트가 없어요") }}</h3>
        <p>
          {{
            searchQuery
              ? t(
                  "workspace.projects.empty.search",
                  "검색어나 필터를 바꿔 다른 프로젝트를 찾아보세요."
                )
              : t(
                  "workspace.projects.empty.default",
                  "참여 중인 프로젝트가 아직 없거나 조건에 맞는 프로젝트가 없습니다."
                )
          }}
        </p>
      </div>
      <div v-else class="project-grid">
        <article v-for="project in filteredProjects" :key="project.id" class="project-card">
          <div class="project-card__head">
            <div class="project-title-group">
              <p class="project-title">{{ project.name }}</p>
              <p class="project-description">
                {{
                  project.summary ||
                  t(
                    "workspace.projects.fallback.description",
                    "프로젝트 설명이 아직 등록되지 않았습니다."
                  )
                }}
              </p>
            </div>
            <div class="badge-group">
              <span v-if="project.isFavorite" class="badge badge--highlight">
                {{ t("workspace.projects.badges.favorite", "즐겨찾기") }}
              </span>
              <span v-if="project.hasUpdates" class="badge">
                {{ t("workspace.projects.badges.updated", "업데이트 있음") }}
              </span>
              <span v-if="project.isAtRisk" class="badge badge--warning">
                {{ t("workspace.projects.badges.risk", "확인 필요") }}
              </span>
            </div>
          </div>

          <dl class="project-meta">
            <div>
              <dt>{{ t("workspace.projects.meta.role", "내 역할") }}</dt>
              <dd>
                {{ project.memberRole || t("workspace.projects.fallback.role", "참여 멤버") }}
              </dd>
            </div>
            <div>
              <dt>{{ t("workspace.projects.meta.updated", "최근 업데이트") }}</dt>
              <dd>{{ formatUpdatedAt(project.updatedAt) }}</dd>
            </div>
            <div>
              <dt>{{ t("workspace.projects.meta.progress", "진행 상태") }}</dt>
              <dd>
                {{ project.statusLabel || t("workspace.projects.fallback.status", "진행 중") }}
              </dd>
            </div>
          </dl>

          <div class="project-stats">
            <div class="stat-box">
              <span class="stat-label">{{
                t("workspace.projects.stats.myTasks", "내 할 일")
              }}</span>
              <strong class="stat-value">{{ project.myTaskCount ?? 0 }}</strong>
            </div>
            <div class="stat-box">
              <span class="stat-label">{{ t("workspace.projects.stats.unread", "미확인") }}</span>
              <strong class="stat-value">{{ project.unreadCount ?? 0 }}</strong>
            </div>
            <div class="stat-box">
              <span class="stat-label">{{
                t("workspace.projects.stats.issues", "열린 이슈")
              }}</span>
              <strong class="stat-value">{{ project.openIssueCount ?? 0 }}</strong>
            </div>
          </div>

          <p class="project-note">
            {{ project.highlight || getProjectHighlight(project) }}
          </p>

          <div class="project-actions">
            <router-link :to="`/project/${project.id}`" class="btn project-link">
              {{ t("workspace.projects.actions.open", "프로젝트 열기") }}
            </router-link>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { useWorkspaceStore } from "../../stores/workspaceStore";

const { t } = useI18n();
const route = useRoute();
const workspaceStore = useWorkspaceStore();

const isLoading = ref(false);
const errorMessage = ref("");
const searchQuery = ref("");
const selectedFilter = ref("all");

const workspaceId = computed(() => route.params.workspaceId);
const projects = computed(() => workspaceStore.getProjects(workspaceId.value) || []);

const filters = computed(() => [
  { value: "all", label: t("workspace.projects.filters.all", "전체") },
  { value: "favorites", label: t("workspace.projects.filters.favorites", "즐겨찾기") },
  { value: "updates", label: t("workspace.projects.filters.updates", "업데이트 있음") },
  { value: "myTasks", label: t("workspace.projects.filters.myTasks", "내 할 일 있음") },
]);

const totalMyTasks = computed(() =>
  projects.value.reduce((sum, project) => sum + Number(project.myTaskCount || 0), 0)
);

const projectsWithUpdates = computed(
  () =>
    projects.value.filter(
      (project) => Boolean(project.hasUpdates) || Number(project.unreadCount || 0) > 0
    ).length
);

const filteredProjects = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  let items = [...projects.value];

  if (selectedFilter.value === "favorites") {
    items = items.filter((project) => Boolean(project.isFavorite));
  } else if (selectedFilter.value === "updates") {
    items = items.filter(
      (project) => Boolean(project.hasUpdates) || Number(project.unreadCount || 0) > 0
    );
  } else if (selectedFilter.value === "myTasks") {
    items = items.filter((project) => Number(project.myTaskCount || 0) > 0);
  }

  if (query) {
    items = items.filter((project) => {
      const haystack = [
        project.name,
        project.summary,
        project.description,
        project.memberRole,
        project.statusLabel,
        project.highlight,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }

  return items.sort(sortProjectsForHub);
});

const fetchProjects = async () => {
  if (!workspaceId.value) return;

  isLoading.value = true;
  errorMessage.value = "";

  try {
    await workspaceStore.fetchProjects(workspaceId.value);
  } catch (error) {
    errorMessage.value = t("workspace.home.status.errorLoad");
  } finally {
    isLoading.value = false;
  }
};

const sortProjectsForHub = (a, b) => {
  const score = (project) => {
    let value = 0;

    if (project.isFavorite) value += 50;
    if (project.hasUpdates || Number(project.unreadCount || 0) > 0) value += 40;
    if (Number(project.myTaskCount || 0) > 0) value += 30;
    if (project.isAtRisk) value += 20;

    return value + Number(project.unreadCount || 0) + Number(project.myTaskCount || 0);
  };

  return score(b) - score(a);
};

const formatUpdatedAt = (updatedAt) => {
  if (!updatedAt) {
    return t("workspace.projects.fallback.updated", "업데이트 정보 없음");
  }

  const date = new Date(updatedAt);

  if (Number.isNaN(date.getTime())) {
    return updatedAt;
  }

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    return t("workspace.projects.updated.justNow", "방금 전");
  }

  if (diffHours < 24) {
    return (
      t("workspace.projects.updated.hoursAgo", { count: diffHours }, diffHours) ||
      `${diffHours}시간 전`
    );
  }

  if (diffDays < 7) {
    return (
      t("workspace.projects.updated.daysAgo", { count: diffDays }, diffDays) || `${diffDays}일 전`
    );
  }

  return date.toLocaleDateString();
};

const getProjectHighlight = (project) => {
  if (Number(project.myTaskCount || 0) > 0) {
    return (
      t(
        "workspace.projects.highlights.myTasks",
        { count: project.myTaskCount },
        project.myTaskCount
      ) || `내가 확인할 작업 ${project.myTaskCount}건이 남아 있어요.`
    );
  }

  if (Number(project.unreadCount || 0) > 0) {
    return (
      t(
        "workspace.projects.highlights.unread",
        { count: project.unreadCount },
        project.unreadCount
      ) || `놓친 업데이트 ${project.unreadCount}건이 있어요.`
    );
  }

  if (project.hasUpdates) {
    return t("workspace.projects.highlights.updated", "최근 변경사항이 있어 한 번 확인해보세요.");
  }

  return t(
    "workspace.projects.highlights.default",
    "프로젝트 현황을 빠르게 확인하고 이어서 작업할 수 있어요."
  );
};

watch(workspaceId, () => {
  fetchProjects();
});

onMounted(() => {
  fetchProjects();
});
</script>

<style scoped>
.project-hub {
  display: grid;
  gap: 1.25rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 1rem;
}

.page-header h1 {
  margin: 0;
}

.page-subtitle {
  margin: 0.5rem 0 0;
  color: var(--color-text-muted);
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.overview-card {
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
}

.overview-label {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.overview-value {
  margin: 0.5rem 0 0;
  font-size: 1.75rem;
  font-weight: 700;
}

.overview-meta {
  margin: 0.375rem 0 0;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.hub-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 16rem;
}

.input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-text);
}

.filter-chips {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.chip {
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-text-muted);
  padding: 0.5rem 0.875rem;
  cursor: pointer;
}

.chip--active {
  color: var(--color-text);
  border-color: var(--color-accent);
}

.content-section {
  display: grid;
  gap: 1rem;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 1rem;
}

.section-head h2 {
  margin: 0;
}

.section-desc {
  margin: 0.375rem 0 0;
  color: var(--color-text-muted);
}

.result-count {
  margin: 0;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.state-message,
.empty-state {
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
}

.state-message--error {
  color: var(--color-danger, #b42318);
}

.empty-state h3 {
  margin: 0;
}

.empty-state p {
  margin: 0.5rem 0 0;
  color: var(--color-text-muted);
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.project-card {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
}

.project-card__head {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 1rem;
}

.project-title-group {
  min-width: 0;
}

.project-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-text);
}

.project-description {
  margin: 0.375rem 0 0;
  color: var(--color-text-muted);
}

.badge-group {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  background: var(--color-surface-muted, #f3f4f6);
  color: var(--color-text-muted);
  font-size: 0.75rem;
  white-space: nowrap;
}

.badge--highlight {
  color: var(--color-accent);
}

.badge--warning {
  color: #b54708;
}

.project-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin: 0;
}

.project-meta dt {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.project-meta dd {
  margin: 0.25rem 0 0;
  font-weight: 500;
  color: var(--color-text);
}

.project-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.stat-box {
  padding: 0.875rem;
  border-radius: 10px;
  background: var(--color-surface-muted, #f8fafc);
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.stat-value {
  display: block;
  margin-top: 0.375rem;
  font-size: 1.125rem;
}

.project-note {
  margin: 0;
  color: var(--color-text-muted);
}

.project-actions {
  display: flex;
  justify-content: flex-end;
}

.project-link {
  text-decoration: none;
}

.sr-only {
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

@media (max-width: 960px) {
  .overview-grid,
  .project-grid,
  .project-meta,
  .project-stats {
    grid-template-columns: 1fr;
  }

  .page-header,
  .section-head {
    align-items: start;
    flex-direction: column;
  }

  .project-card__head {
    flex-direction: column;
  }

  .badge-group {
    justify-content: flex-start;
  }
}
</style>
