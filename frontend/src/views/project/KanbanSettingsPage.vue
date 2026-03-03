<template>
  <BackLinkButton @click="$router.back()">뒤로</BackLinkButton>

  <hgroup>
    <div>
      <h1>칸반 설정</h1>
      <p class="subtitle">칸반 이름과 설명을 수정하거나 칸반을 삭제할 수 있습니다.</p>
    </div>
  </hgroup>

  <p v-if="isLoading" class="status">불러오는 중...</p>
  <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>

  <form v-else class="settings-form" @submit.prevent="saveKanban">
    <label for="kanban-name">칸반 이름</label>
    <input id="kanban-name" v-model.trim="form.name" type="text" placeholder="칸반 이름" />

    <label for="kanban-summary">설명</label>
    <textarea id="kanban-summary" v-model.trim="form.summary" rows="4" placeholder="칸반 설명" />

    <p v-if="formError" class="status error">{{ formError }}</p>

    <div class="form-actions">
      <button type="submit" class="btn" :disabled="isSaving">
        {{ isSaving ? "저장 중..." : "저장" }}
      </button>
    </div>
  </form>

  <section v-if="!isLoading && !errorMessage && !isBacklog" class="danger-zone">
    <div>
      <h2>위험 영역</h2>
      <p class="danger-desc">칸반을 삭제하면 포함된 작업과 멤버 정보도 함께 삭제됩니다.</p>
    </div>
    <div class="danger-actions">
      <button type="button" class="btn btn--danger" :disabled="isDeleting" @click="deleteKanban">
        {{ isDeleting ? "삭제 중..." : "칸반 삭제" }}
      </button>
      <p v-if="deleteError" class="status error">{{ deleteError }}</p>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../../lib/axios";
import { addToast } from "../../lib/toast";
import BackLinkButton from "../../components/BackLinkButton.vue";

const route = useRoute();
const router = useRouter();

const projectId = computed(() => route.params.projectId);
const kanbanId = computed(() => route.params.kanbanId);

const isLoading = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const errorMessage = ref("");
const formError = ref("");
const deleteError = ref("");
const kanbanType = ref("KANBAN");

const form = ref({
  name: "",
  summary: "",
});

const isBacklog = computed(() => String(kanbanType.value || "").toUpperCase() === "BACKLOG");

const fetchKanban = async () => {
  if (!kanbanId.value) return;

  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get(`/kanbans/${kanbanId.value}`);
    const data = res.data || {};
    form.value.name = data.name || "";
    form.value.summary = data.summary || "";
    kanbanType.value = data.type || "KANBAN";
  } catch (error) {
    if (error?.response?.status === 404) {
      router.push("/not-found");
      return;
    }
    errorMessage.value = error?.response?.data?.message || "칸반 정보를 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

const saveKanban = async () => {
  if (!form.value.name) {
    formError.value = "칸반 이름은 필수입니다.";
    return;
  }

  isSaving.value = true;
  formError.value = "";

  try {
    await api.patch(`/kanbans/${kanbanId.value}`, {
      name: form.value.name,
      summary: form.value.summary || null,
    });
    const updated = res.data;
    if (projectId.value) {
      kanbanStore.updateKanbanDetails(kanbanId.value, projectId.value, {
        name: updated?.name ?? form.value.name,
        summary: updated?.summary ?? form.value.summary,
      });
    }
    addToast({ message: t("kanban.settings.toast.updated"), type: "success" });
  } catch (error) {
    const message = error?.response?.data?.message || t("kanban.settings.status.errorUpdate");
    formError.value = message;
    addToast({ message, type: "error" });
  } finally {
    isSaving.value = false;
  }
};

const deleteKanban = async () => {
  if (!kanbanId.value) return;

  const confirmed = window.confirm("이 칸반을 삭제하시겠습니까?");
  if (!confirmed) return;

  isDeleting.value = true;
  deleteError.value = "";

  try {
    await api.delete(`/kanbans/${kanbanId.value}`);
    router.push(`/project/${projectId.value}/kanban`);
  } catch (error) {
    deleteError.value = error?.response?.data?.message || "칸반 삭제에 실패했습니다.";
  } finally {
    isDeleting.value = false;
  }
};

onMounted(fetchKanban);

watch(kanbanId, (nextId, prevId) => {
  if (nextId && nextId !== prevId) {
    fetchKanban();
  }
});
</script>

<style scoped>
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 480px;
}

.settings-form input,
.settings-form textarea {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--color-input-border);
  font-size: 14px;
  background-color: var(--color-input-bg);
  color: var(--color-text);
}

.settings-form textarea {
  resize: vertical;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.status {
  margin-top: 8px;
}

.status.error {
  color: var(--color-danger);
}

.danger-zone {
  margin-top: 24px;
  border: 1px solid var(--color-danger);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.danger-desc {
  margin: 6px 0 0;
  color: var(--color-text-muted);
}

.danger-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
</style>
