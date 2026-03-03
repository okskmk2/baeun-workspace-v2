<template>
  <div class="LnbLayout KanbanLayout">
    <aside>
      <button type="button" class="btn" @click="openModal">
        {{ t("kanban.layout.actions.create") }}
      </button>
      <nav>
        <!-- <span class="lnb-item">
          <MaterialSymbol name="view_kanban" :size="18" alt="" />
          칸반 목록
        </span> -->
        <p v-if="isLoading">{{ t("kanban.layout.status.loading") }}</p>
        <p v-else-if="errorMessage">{{ errorMessage }}</p>
        <p v-else-if="kanbans.length === 0">{{ t("kanban.layout.empty.kanbans") }}</p>
        <template v-else>
          <router-link
            v-for="kanban in kanbans.filter((k) => k.type !== 'BACKLOG')"
            :key="kanban.id"
            :to="`/project/${projectId}/kanban/${kanban.id}`"
            @dragover.prevent
            @drop.prevent.stop="moveTaskToKanban($event, kanban.id)"
          >
            {{ kanban.name }}
          </router-link>
        </template>
        <hr />
        <router-link
          class="lnb-item"
          :to="`/project/${projectId}/kanban/backlog`"
          @dragover.prevent
          @drop.prevent.stop="moveTaskToBacklog"
        >
          <!-- <MaterialSymbol name="low_priority" size="18" /> -->
          {{ t("backlog.page.header.title") }}
        </router-link>
        <router-link class="lnb-item" :to="`/project/${projectId}/kanban/gantt`">
          {{ t("kanban.layout.nav.gantt") }}
        </router-link>
      </nav>
    </aside>
    <main>
      <router-view />
    </main>
  </div>

  <CreateKanbanModal
    :open="isModalOpen"
    :project-id="projectId"
    @close="closeModal"
    @created="onKanbanCreated"
  />
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import api from "../../lib/axios";
import CreateKanbanModal from "../../components/modals/CreateKanbanModal.vue";
import { useKanbanStore } from "../../stores/kanbanStore";
import { useProjectSearchStore } from "../../stores/projectSearchStore";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const kanbanStore = useKanbanStore();
const projectSearchStore = useProjectSearchStore();
const kanbans = computed(() => kanbanStore.getKanbans(projectId.value));
const backlogKanban = computed(() => kanbans.value.find((kanban) => kanban.type === "BACKLOG") || null);
const isLoading = ref(false);
const errorMessage = ref("");
const isModalOpen = ref(false);

const projectId = computed(() => route.params.projectId);

const fetchKanbans = async () => {
  if (!projectId.value) {
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
    await kanbanStore.fetchKanbans(projectId.value);
    projectSearchStore.upsertKanbans(projectId.value, kanbanStore.getKanbans(projectId.value));
  } catch (error) {
    if (error?.response?.status === 404) {
      router.push("/not-found");
      return;
    }
    errorMessage.value = t("kanban.layout.status.errorLoad");
  } finally {
    isLoading.value = false;
  }
};

const openModal = () => {
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const onKanbanCreated = async () => {
  await fetchKanbans();
};

const getDraggedTaskId = (event) => {
  const value = event?.dataTransfer?.getData("text/task-id");
  if (!value) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const getDraggedTaskOrigin = (event) => {
  return event?.dataTransfer?.getData("text/task-origin") || "";
};

const moveTaskToKanban = async (event, targetKanbanId) => {
  const taskId = getDraggedTaskId(event);
  if (!taskId || !targetKanbanId) return;

  const origin = getDraggedTaskOrigin(event);
  const payload = { kanban_id: targetKanbanId };
  if (origin === "backlog") {
    payload.status = "PENDING";
  }

  try {
    await api.patch(`/tasks/${taskId}`, payload);
    await kanbanStore.fetchKanbans(projectId.value);
    window.dispatchEvent(
      new CustomEvent("task:moved", {
        detail: { taskId, kanbanId: targetKanbanId, status: payload.status },
      })
    );
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || t("kanban.layout.status.errorLoad");
  }
};

const moveTaskToBacklog = async (event) => {
  const taskId = getDraggedTaskId(event);
  if (!taskId) return;

  try {
    await api.patch(`/tasks/${taskId}`, { status: "BACKLOG" });
    await kanbanStore.fetchKanbans(projectId.value);
    window.dispatchEvent(
      new CustomEvent("task:moved", {
        detail: { taskId, kanbanId: backlogKanban.value?.id || null, status: "BACKLOG" },
      })
    );
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || t("kanban.layout.status.errorLoad");
  }
};

onMounted(fetchKanbans);
watch(projectId, fetchKanbans);
</script>
<style scoped>
.KanbanLayout aside nav {
  /* font-size: 14px; */
  gap: 4px;
}
.KanbanLayout main {
  padding: 18px 24px 3rem;
}
</style>

