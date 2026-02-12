<template>
  <BackLinkButton @click="$router.back()">
    {{ t("messenger.settings.actions.back") }}
  </BackLinkButton>
  <hgroup>
    <div>
      <h1>{{ t("messenger.settings.header.title") }}</h1>
      <p class="subtitle">{{ t("messenger.settings.header.subtitle") }}</p>
    </div>
  </hgroup>

  <p v-if="isLoading" class="status">{{ t("messenger.settings.status.loading") }}</p>
  <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>

  <form v-else class="settings-form" @submit.prevent="saveChannelName">
    <label for="channel-name">{{ t("messenger.settings.form.nameLabel") }}</label>
    <input
      id="channel-name"
      v-model.trim="form.name"
      type="text"
      :placeholder="t('messenger.settings.form.namePlaceholder')"
    />

    <p v-if="formError" class="status error">{{ formError }}</p>

    <div class="form-actions">
      <button type="submit" class="btn" :disabled="isSaving">
        {{
          isSaving
            ? t("messenger.settings.actions.saving")
            : t("messenger.settings.actions.save")
        }}
      </button>
    </div>
  </form>

  <section class="danger-zone">
    <div>
      <h2>{{ t("messenger.settings.danger.title") }}</h2>
      <p class="danger-desc">{{ t("messenger.settings.danger.description") }}</p>
    </div>
    <div class="danger-actions">
      <button type="button" class="btn btn--danger" :disabled="isDeleting" @click="deleteChannel">
        {{
          isDeleting
            ? t("messenger.settings.actions.deleting")
            : t("messenger.settings.actions.delete")
        }}
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
import { useChatStore } from "../stores/chatStore";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();


const projectId = computed(() => route.params.projectId);
const roomId = computed(() => route.params.roomId);

const isLoading = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const errorMessage = ref("");
const formError = ref("");
const deleteError = ref("");
const form = ref({
  name: "",
});

const fetchChannel = async () => {
  if (!roomId.value) return;
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get(`/channels/${roomId.value}`);
    const data = res.data?.data || {};
    form.value.name = data.name || "";
  } catch (error) {
    errorMessage.value = t("messenger.settings.status.errorLoad");
  } finally {
    isLoading.value = false;
  }
};

const saveChannelName = async () => {
  if (!form.value.name) {
    formError.value = t("messenger.settings.validation.nameRequired");
    return;
  }

  isSaving.value = true;
  formError.value = "";

  try {
    const res = await api.patch(`/channels/${roomId.value}`, {
      name: form.value.name,
    });
    const updated = res.data?.data;
    if (projectId.value) {
      chatStore.updateRoomName(
        roomId.value,
        projectId.value,
        updated?.name || form.value.name
      );
    }
  } catch (error) {
    formError.value = error?.response?.data?.message || t("messenger.settings.status.errorUpdate");
  } finally {
    isSaving.value = false;
  }
};

const deleteChannel = async () => {
  if (!roomId.value) return;
  const confirmed = window.confirm(t("messenger.settings.confirm.delete"));
  if (!confirmed) return;

  isDeleting.value = true;
  deleteError.value = "";

  try {
    await api.delete(`/channels/${roomId.value}`);
    await chatStore.fetchRooms(projectId.value);
    router.push(`/project/${projectId.value}/messenger`);
  } catch (error) {
    deleteError.value = error?.response?.data?.message || t("messenger.settings.status.errorDelete");
  } finally {
    isDeleting.value = false;
  }
};

onMounted(fetchChannel);

watch(roomId, (nextId, prevId) => {
  if (nextId && nextId !== prevId) {
    fetchChannel();
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
