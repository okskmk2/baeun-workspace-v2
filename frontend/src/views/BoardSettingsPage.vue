<template>
  <BackLinkButton @click="$router.back()">
    {{ t("board.settings.actions.back") }}
  </BackLinkButton>
  <hgroup>
    <div>
      <h1>{{ t("board.settings.header.title") }}</h1>
      <p class="subtitle">{{ t("board.settings.header.subtitle") }}</p>
    </div>
  </hgroup>

  <p v-if="isLoading" class="status">{{ t("board.settings.status.loading") }}</p>
  <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>

  <form v-else class="settings-form" @submit.prevent="saveBoard">
    <label for="board-name">{{ t("board.settings.form.nameLabel") }}</label>
    <input
      id="board-name"
      v-model.trim="form.name"
      type="text"
      :placeholder="t('board.settings.form.namePlaceholder')"
    />
    <label for="board-summary">{{ t("board.settings.form.summaryLabel") }}</label>
    <input
      id="board-summary"
      v-model.trim="form.summary"
      type="text"
      maxlength="80"
      :placeholder="t('board.settings.form.summaryPlaceholder')"
    />

    <p v-if="formError" class="status error">{{ formError }}</p>

    <div class="form-actions">
      <button type="submit" class="btn" :disabled="isSaving">
        {{ isSaving ? t("board.settings.actions.saving") : t("board.settings.actions.save") }}
      </button>
    </div>
  </form>

  <section class="danger-zone">
    <div>
      <h2>{{ t("board.settings.danger.title") }}</h2>
      <p class="danger-desc">{{ t("board.settings.danger.description") }}</p>
    </div>
    <div class="danger-actions">
      <button type="button" class="btn btn--danger" :disabled="isDeleting" @click="deleteBoard">
        {{ isDeleting ? t("board.settings.actions.deleting") : t("board.settings.actions.delete") }}
      </button>
      <p v-if="deleteError" class="status error">{{ deleteError }}</p>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import api from "../lib/axios";
import BackLinkButton from "../components/BackLinkButton.vue";
import { useBoardStore } from "../stores/boardStore";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const boardStore = useBoardStore();

const projectId = computed(() => route.params.projectId);
const boardId = computed(() => route.params.boardId);

const isLoading = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const errorMessage = ref("");
const formError = ref("");
const deleteError = ref("");
const form = ref({
  name: "",
  summary: "",
});

const fetchBoard = async () => {
  if (!boardId.value) return;
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get(`/boards/${boardId.value}`);
    const data = res.data || {};
    form.value.name = data.name || "";
    form.value.summary = data.summary || "";
  } catch (error) {
    errorMessage.value = t("board.settings.status.errorLoad");
  } finally {
    isLoading.value = false;
  }
};

const saveBoard = async () => {
  if (!form.value.name) {
    formError.value = t("board.settings.validation.nameRequired");
    return;
  }

  isSaving.value = true;
  formError.value = "";

  try {
    const res = await api.patch(`/boards/${boardId.value}`, {
      name: form.value.name,
      summary: form.value.summary,
    });
    const updated = res.data;
    if (projectId.value) {
      boardStore.updateBoardDetails(boardId.value, projectId.value, {
        name: updated?.name ?? form.value.name,
        summary: updated?.summary ?? form.value.summary,
      });
    }
  } catch (error) {
    formError.value = error?.response?.data?.message || t("board.settings.status.errorUpdate");
  } finally {
    isSaving.value = false;
  }
};

const deleteBoard = async () => {
  if (!boardId.value) return;
  const confirmed = window.confirm(t("board.settings.confirm.delete"));
  if (!confirmed) return;

  isDeleting.value = true;
  deleteError.value = "";

  try {
    await boardStore.deleteBoard(boardId.value, projectId.value);
    router.push(`/project/${projectId.value}/board`);
  } catch (error) {
    deleteError.value = error?.response?.data?.message || t("board.settings.status.errorDelete");
  } finally {
    isDeleting.value = false;
  }
};

onMounted(fetchBoard);

watch(boardId, (nextId, prevId) => {
  if (nextId && nextId !== prevId) {
    fetchBoard();
  }
});
</script>

<style scoped>
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 420px;
}

.settings-form input {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--color-input-border);
  font-size: 14px;
  background-color: var(--color-input-bg);
  color: var(--color-text);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.status {
  font-size: 14px;
  color: var(--color-text-muted);
  margin: 0;
}

.status.error {
  color: var(--color-danger);
}

.danger-zone {
  margin-top: 32px;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--color-danger) 50%, transparent 50%);
  background-color: color-mix(in srgb, var(--color-danger) 6%, transparent 94%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.danger-zone h2 {
  font-size: 16px;
  margin: 0 0 4px;
}

.danger-desc {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 13px;
}

.danger-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

@media (max-width: 700px) {
  .danger-zone {
    flex-direction: column;
    align-items: flex-start;
  }

  .danger-actions {
    align-items: flex-start;
  }
}
</style>
