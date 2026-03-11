<template>
  <BackLinkButton @click="$router.back()">
    {{ t("channel.settings.actions.back") }}
  </BackLinkButton>
  <hgroup>
    <div>
      <h1>{{ t("channel.settings.header.title") }}</h1>
      <p class="subtitle">{{ t("channel.settings.header.subtitle") }}</p>
    </div>
  </hgroup>

  <p v-if="isLoading" class="status">{{ t("channel.settings.status.loading") }}</p>
  <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>

  <form v-else class="settings-form" @submit.prevent="saveChannelName">
    <label for="channel-name">{{ t("channel.settings.form.nameLabel") }}</label>
    <input
      id="channel-name"
      v-model.trim="form.name"
      type="text"
      :placeholder="t('channel.settings.form.namePlaceholder')"
    />

    <p v-if="formError" class="status error">{{ formError }}</p>

    <div class="form-actions">
      <button type="submit" class="btn" :disabled="isSaving">
        {{
          isSaving ? t("channel.settings.actions.saving") : t("channel.settings.actions.save")
        }}
      </button>
    </div>
  </form>

  <section class="members-section" v-if="!isLoading && !errorMessage">
    <h2>{{ t("channel.settings.members.title") }}</h2>
    <p v-if="isMembersLoading" class="status">
      {{ t("channel.settings.members.status.loading") }}
    </p>
    <p v-else-if="membersError" class="status error">{{ membersError }}</p>
    <p v-else-if="!channelMembers.length" class="status">
      {{ t("channel.settings.members.empty") }}
    </p>
    <ul v-else class="members-list">
      <li v-for="member in channelMembers" :key="member.id">
        <span class="member-name">{{ member.name }}</span>
        <span class="member-meta">{{ member.email }}</span>
        <span class="member-role">{{ getRoleLabel("channel_member", member.role_name) }}</span>
      </li>
    </ul>
  </section>

  <DangerZone
    v-if="showDangerZone"
    :title="t('channel.settings.danger.title')"
    :description="t('channel.settings.danger.description')"
  >
    <template #actions>
      <button
        type="button"
        class="btn btn--secondary"
        :disabled="isArchiving"
        @click="toggleArchive"
      >
        {{
          isArchiving
            ? t("channel.settings.actions.archiving")
            : isArchived
              ? t("channel.settings.actions.reopen")
              : t("channel.settings.actions.archive")
        }}
      </button>
      <p v-if="archiveError" class="status error">{{ archiveError }}</p>
      <button
        v-if="!isNoticeChannel"
        type="button"
        class="btn btn--danger"
        :disabled="isDeleting"
        @click="deleteChannel"
      >
        {{
          isDeleting
            ? t("channel.settings.actions.deleting")
            : t("channel.settings.actions.delete")
        }}
      </button>
      <p v-if="!isNoticeChannel && deleteError" class="status error">{{ deleteError }}</p>
    </template>
  </DangerZone>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import api from "../../lib/axios";
import BackLinkButton from "../../components/BackLinkButton.vue";
import DangerZone from "../../components/DangerZone.vue";
import { useChatStore } from "../../stores/chatStore";
import { useRoleLabels } from "../../lib/roleLabels";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();
const { getRoleLabel } = useRoleLabels();

const projectId = computed(() => route.params.projectId);
const roomId = computed(() => route.params.roomId);

const isLoading = ref(false);
const isSaving = ref(false);
const isArchiving = ref(false);
const isDeleting = ref(false);
const errorMessage = ref("");
const formError = ref("");
const archiveError = ref("");
const deleteError = ref("");
const channelStatus = ref("ACTIVE");
const channelType = ref("GENERAL");
const channelViewerRole = ref("");
const channelMembers = ref([]);
const isMembersLoading = ref(false);
const membersError = ref("");
const form = ref({
  name: "",
});

const isArchived = computed(() => String(channelStatus.value || "") === "ARCHIVED");
const currentUserRole = computed(() => String(channelViewerRole.value || "").toUpperCase());
const isDmChannel = computed(() => String(channelType.value || "").toUpperCase() === "DM");
const isNoticeChannel = computed(() => String(channelType.value || "").toUpperCase() === "NOTICE");
const showDangerZone = computed(() => isDmChannel.value || currentUserRole.value === "OWNER");

const fetchChannelMembers = async () => {
  if (!roomId.value) return;

  isMembersLoading.value = true;
  membersError.value = "";

  try {
    const res = await api.get(`/channels/${roomId.value}/members`);
    channelMembers.value = res.data || [];
  } catch (error) {
    channelMembers.value = [];
    membersError.value = t("channel.settings.members.status.errorLoad");
  } finally {
    isMembersLoading.value = false;
  }
};

const fetchChannel = async () => {
  if (!roomId.value) return;
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get(`/channels/${roomId.value}`);
    const data = res.data || {};
    form.value.name = data.name || "";
    channelStatus.value = data.status || "ACTIVE";
    channelType.value = data.type || "GENERAL";
    channelViewerRole.value = data.viewer_role_name || "";
  } catch (error) {
    errorMessage.value = t("channel.settings.status.errorLoad");
  } finally {
    isLoading.value = false;
  }
};

const toggleArchive = async () => {
  if (!roomId.value) return;

  const confirmKey = isArchived.value
    ? "channel.settings.confirm.reopen"
    : "channel.settings.confirm.archive";
  const confirmed = window.confirm(t(confirmKey));
  if (!confirmed) return;

  isArchiving.value = true;
  archiveError.value = "";

  try {
    const nextStatus = isArchived.value ? "ACTIVE" : "ARCHIVED";
    const res = await api.patch(`/channels/${roomId.value}/status`, {
      status: nextStatus,
    });
    channelStatus.value = res.data?.status || nextStatus;

    await chatStore.fetchRooms(projectId.value);

    if (nextStatus === "ARCHIVED") {
      router.push(`/project/${projectId.value}/channel`);
      return;
    }

    router.push(`/project/${projectId.value}/channel/${roomId.value}`);
  } catch (error) {
    archiveError.value =
      error?.response?.data?.message || t("channel.settings.status.errorArchive");
  } finally {
    isArchiving.value = false;
  }
};

const saveChannelName = async () => {
  if (!form.value.name) {
    formError.value = t("channel.settings.validation.nameRequired");
    return;
  }

  isSaving.value = true;
  formError.value = "";

  try {
    const res = await api.patch(`/channels/${roomId.value}`, {
      name: form.value.name,
    });
    const updated = res.data;
    if (projectId.value) {
      chatStore.updateRoomName(roomId.value, projectId.value, updated?.name || form.value.name);
    }
  } catch (error) {
    formError.value = error?.response?.data?.message || t("channel.settings.status.errorUpdate");
  } finally {
    isSaving.value = false;
  }
};

const deleteChannel = async () => {
  if (!roomId.value) return;
  const confirmed = window.confirm(t("channel.settings.confirm.delete"));
  if (!confirmed) return;

  isDeleting.value = true;
  deleteError.value = "";

  try {
    await api.delete(`/channels/${roomId.value}`);
    await chatStore.fetchRooms(projectId.value);
    router.push(`/project/${projectId.value}/channel`);
  } catch (error) {
    deleteError.value =
      error?.response?.data?.message || t("channel.settings.status.errorDelete");
  } finally {
    isDeleting.value = false;
  }
};

onMounted(async () => {
  await Promise.all([fetchChannel(), fetchChannelMembers()]);
});

watch(roomId, (nextId, prevId) => {
  if (nextId && nextId !== prevId) {
    fetchChannel();
    fetchChannelMembers();
  }
});
</script>

<style scoped>
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.members-section {
  margin-top: 24px;
}

.members-section h2 {
  font-size: 16px;
  margin: 0 0 8px;
}

.members-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.members-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: var(--color-card-bg);
}

.member-name {
  font-weight: 600;
  color: var(--color-text);
}

.member-meta {
  font-size: 12px;
  color: var(--color-text-muted);
}

.member-role {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
}

</style>

