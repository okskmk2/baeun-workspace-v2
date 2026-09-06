<template>
  <section class="workspace-license-settings">
    <hgroup>
      <h1>{{ t("workspace.license.header.title") }}</h1>
      <p class="subtitle">
        {{ t("workspace.license.header.subtitle") }}
      </p>
    </hgroup>

    <p v-if="isLoading" class="status">{{ t("workspace.license.status.loading") }}</p>
    <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>

    <template v-else>
      <section class="card compact-license-card" :aria-label="t('workspace.license.sections.purchaseAria')">
        <div class="card__header card__header--stack">
          <h2>{{ t("workspace.license.compact.title") }}</h2>
          <p class="purchase-subtitle">{{ t("workspace.license.compact.subtitle") }}</p>
        </div>

        <div class="table-wrap">
          <table class="compact-table">
            <thead>
              <tr>
                <th scope="col">{{ t("workspace.license.compact.columns.type") }}</th>
                <th scope="col">{{ t("workspace.license.compact.columns.total") }}</th>
                <th scope="col">{{ t("workspace.license.compact.columns.used") }}</th>
                <th scope="col">{{ t("workspace.license.compact.columns.remaining") }}</th>
                <th scope="col">{{ t("workspace.license.compact.columns.status") }}</th>
                <th scope="col">{{ t("workspace.license.compact.columns.action") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{{ t("workspace.license.compact.types.project") }}</td>
                <td>{{ totalSlots }}</td>
                <td>{{ usedSlots }}</td>
                <td>{{ remainingSlots }}</td>
                <td>
                  <span :class="['status-pill', isOverLimit ? 'danger' : 'ok']">
                    {{
                      isOverLimit
                        ? t("workspace.license.compact.status.shortage", { count: missingSlots })
                        : t("workspace.license.compact.status.ok")
                    }}
                  </span>
                </td>
                <td>
                  <router-link class="btn btn--sm" :to="projectPurchaseTo">
                    {{ t("workspace.license.purchase.projectButton") }}
                  </router-link>
                </td>
              </tr>
              <tr>
                <td>{{ t("workspace.license.compact.types.member") }}</td>
                <td>{{ totalMemberSlots }}</td>
                <td>{{ usedMemberSlots }}</td>
                <td>{{ remainingMemberSlots }}</td>
                <td>
                  <span :class="['status-pill', isOverMemberLimit ? 'danger' : 'ok']">
                    {{
                      isOverMemberLimit
                        ? t("workspace.license.compact.status.shortage", { count: missingMemberSlots })
                        : t("workspace.license.compact.status.ok")
                    }}
                  </span>
                </td>
                <td>
                  <router-link class="btn btn--sm btn--secondary" :to="workspaceMemberPurchaseTo">
                    {{ t("workspace.license.purchase.memberButton") }}
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="card guide-card" :aria-label="t('workspace.license.sections.guideAria')">
        <h2>{{ t("workspace.license.guide.title") }}</h2>
        <ul>
          <li>{{ t("workspace.license.guide.items.0") }}</li>
          <li>{{ t("workspace.license.guide.items.1") }}</li>
          <li>{{ t("workspace.license.guide.items.2") }}</li>
        </ul>
      </section>

      <section class="card allocation-card">
        <div class="card__header">
          <h2>{{ t("workspace.license.project.table.title") }}</h2>
          <span class="count-badge">{{ t("workspace.license.project.table.count", { count: projects.length }) }}</span>
        </div>

        <p v-if="!projects.length" class="status muted">{{ t("workspace.license.project.table.empty") }}</p>

        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">{{ t("workspace.license.project.table.columns.project") }}</th>
                <th scope="col">{{ t("workspace.license.project.table.columns.coverage") }}</th>
                <th scope="col">{{ t("workspace.license.project.table.columns.action") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="allocation in projectAllocations" :key="allocation.id">
                <td>
                  <div class="project-cell">
                    <p class="project-name">
                      {{ allocation.name || t("workspace.license.project.table.fallbackName", { id: allocation.id }) }}
                    </p>
                    <p v-if="allocation.summary" class="project-summary">{{ allocation.summary }}</p>
                  </div>
                </td>
                <td>
                  <span :class="['status-pill', allocation.isCovered ? 'ok' : 'danger']">
                    {{
                      allocation.isCovered
                        ? t("workspace.license.project.table.states.inUse")
                        : t("workspace.license.project.table.states.overflow")
                    }}
                  </span>
                </td>
                <td>
                  <button
                    v-if="!allocation.isCovered"
                    type="button"
                    class="btn btn--sm"
                    @click="openResolveModal(allocation)"
                  >
                    {{ t("workspace.license.project.table.actions.resolve") }}
                  </button>
                  <span v-else class="status muted">{{ t("workspace.license.project.table.actions.none") }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <BaseModal
        :open="isResolveModalOpen"
        :title="t('workspace.license.project.table.modal.title')"
        max-width="520px"
        @close="closeResolveModal"
      >
        <div v-if="selectedOverflowProject" class="resolve-modal-body">
          <p class="status muted">
            {{
              t("workspace.license.project.table.modal.summary", {
                count: missingSlots,
              })
            }}
          </p>
          <dl>
            <div>
              <dt>{{ t("workspace.license.project.table.modal.projectLabel") }}</dt>
              <dd>{{ selectedOverflowProject.name }}</dd>
            </div>
            <div>
              <dt>{{ t("workspace.license.project.table.modal.priorityLabel") }}</dt>
              <dd>
                {{
                  t("workspace.license.project.table.modal.priorityValue", {
                    order: selectedOverflowProject.coverOrder,
                    covered: totalSlots,
                  })
                }}
              </dd>
            </div>
          </dl>

          <p class="status muted">{{ t("workspace.license.project.table.modal.description") }}</p>

          <div class="resolve-modal-actions">
            <router-link class="btn" :to="projectPurchaseTo" @click="closeResolveModal">
              {{ t("workspace.license.project.table.modal.primaryAction") }}
            </router-link>
            <button type="button" class="btn btn--secondary" @click="closeResolveModal">
              {{ t("workspace.license.project.table.modal.secondaryAction") }}
            </button>
          </div>
        </div>
      </BaseModal>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import BaseModal from "../../components/BaseModal.vue";
import { useWorkspaceStore } from "../../stores/workspaceStore";

const { t } = useI18n();
const route = useRoute();
const workspaceStore = useWorkspaceStore();

const isLoading = ref(false);
const errorMessage = ref("");
const selectedOverflowProject = ref(null);

const workspaceId = computed(() => route.params.workspaceId);
const workspace = computed(() => workspaceStore.workspaceById[workspaceId.value] || null);
const projects = computed(() => workspaceStore.getProjects(workspaceId.value) || []);
const usedSlots = computed(() =>
  parseNonNegativeInt(workspace.value?.project_slot_used, projects.value.length)
);
const usedMemberSlots = computed(() =>
  parseNonNegativeInt(
    workspace.value?.member_slot_used ?? workspace.value?.member_count,
    0
  )
);

const projectPurchaseTo = computed(() => ({
  path: "/store/cart",
  query: {
    productCode: `PROJECT_MONTHLY_${new Date().getFullYear()}`,
    source: "workspace-settings-license",
    workspaceId: String(workspaceId.value || ""),
  },
}));

const workspaceMemberPurchaseTo = computed(() => ({
  path: "/store/cart",
  query: {
    productCode: `WORKSPACEMEMBER_MONTHLY_${new Date().getFullYear()}`,
    source: "workspace-settings-license",
    workspaceId: String(workspaceId.value || ""),
  },
}));

const parseNonNegativeInt = (value, fallback = 0) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  if (number < 0) return fallback;
  return Math.floor(number);
};

const totalSlots = computed(() => parseNonNegativeInt(workspace.value?.project_slot_total, 0));

const totalMemberSlots = computed(() => parseNonNegativeInt(workspace.value?.member_slot_total, 0));

const remainingSlots = computed(() => totalSlots.value - usedSlots.value);
const isOverLimit = computed(() => remainingSlots.value < 1);
const missingSlots = computed(() =>
  remainingSlots.value < 0 ? Math.abs(remainingSlots.value) : remainingSlots.value < 1 ? 1 : 0
);
const remainingMemberSlots = computed(() => totalMemberSlots.value - usedMemberSlots.value);
const isOverMemberLimit = computed(() => remainingMemberSlots.value < 1);
const missingMemberSlots = computed(() =>
  remainingMemberSlots.value < 0
    ? Math.abs(remainingMemberSlots.value)
    : remainingMemberSlots.value < 1
      ? 1
      : 0
);

const projectAllocations = computed(() => {
  const normalized = [...projects.value].sort((a, b) => {
    const aTime = new Date(a?.created_at || 0).getTime();
    const bTime = new Date(b?.created_at || 0).getTime();
    return aTime - bTime;
  });

  return normalized.map((project, index) => ({
    ...project,
    coverOrder: index + 1,
    isCovered: index < totalSlots.value,
  }));
});

const isResolveModalOpen = computed(() => Boolean(selectedOverflowProject.value));

const openResolveModal = (allocation) => {
  selectedOverflowProject.value = {
    id: allocation.id,
    name: allocation.name || t("workspace.license.project.table.fallbackName", { id: allocation.id }),
    coverOrder: allocation.coverOrder,
  };
};

const closeResolveModal = () => {
  selectedOverflowProject.value = null;
};

const fetchData = async () => {
  if (!workspaceId.value) return;
  isLoading.value = true;
  errorMessage.value = "";

  try {
    await Promise.all([
      workspaceStore.fetchWorkspace(workspaceId.value),
      workspaceStore.fetchProjects(workspaceId.value),
    ]);
  } catch (error) {
    errorMessage.value =
      error?.response?.data?.message || t("workspace.license.status.errorLoad");
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchData);
watch(() => route.params.workspaceId, () => {
  closeResolveModal();
  fetchData();
});
</script>

<style scoped>
.workspace-license-settings {
  display: grid;
  gap: 16px;
}

hgroup {
  margin: 0;
}

h1 {
  margin: 0;
}

.subtitle {
  margin: 8px 0 0;
  color: var(--color-text-muted);
}

.card {
  display: grid;
  gap: 10px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  padding: 18px;
}

.card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.card__header--stack {
  flex-direction: column;
  align-items: flex-start;
}

.card h2 {
  margin: 0;
  font-size: 1rem;
}

.compact-license-card {
  gap: 14px;
}

.purchase-subtitle {
  margin: 0;
  color: var(--color-text-muted);
}

.compact-table {
  min-width: 760px;
}

.compact-table td:nth-child(2),
.compact-table td:nth-child(3),
.compact-table td:nth-child(4) {
  font-weight: 700;
}

.guide-card ul {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
}

.guide-card li {
  color: var(--color-text-muted);
}

.count-badge {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.status {
  margin: 0;
  color: var(--color-text-muted);
}

.status.error {
  color: var(--color-danger);
}

.status.success {
  color: var(--color-success);
}

.status.muted {
  color: var(--color-text-muted);
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 620px;
}

th,
td {
  text-align: left;
  padding: 10px 8px;
  border-bottom: 1px solid var(--color-border);
  vertical-align: top;
}

th {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.project-cell {
  display: grid;
  gap: 4px;
}

.project-name {
  margin: 0;
  font-weight: 600;
}

.project-summary {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.resolve-modal-body {
  display: grid;
  gap: 10px;
}

.resolve-modal-body dl {
  margin: 0;
  display: grid;
  gap: 8px;
}

.resolve-modal-body dl div {
  display: grid;
  gap: 2px;
}

.resolve-modal-body dt {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.resolve-modal-body dd {
  margin: 0;
  font-weight: 600;
}

.resolve-modal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.8rem;
  border: 1px solid var(--color-border);
}

.status-pill.ok {
  color: var(--color-success);
  border-color: color-mix(in srgb, var(--color-success) 45%, var(--color-border));
}

.status-pill.pending {
  color: var(--color-warning);
  border-color: color-mix(in srgb, var(--color-warning) 45%, var(--color-border));
}

.status-pill.danger {
  color: var(--color-danger);
  border-color: color-mix(in srgb, var(--color-danger) 45%, var(--color-border));
}

@media (max-width: 980px) {
  .compact-table {
    min-width: 640px;
  }
}
</style>
