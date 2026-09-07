<template>
  <hgroup>
    <div>
      <h1>{{ displayRoomTitle }}</h1>
      <span
        class="room-status"
        :class="{ offline: !isConnected }"
        role="status"
        :aria-label="
          isConnected ? t('channel.room.status.connected') : t('channel.room.status.disconnected')
        "
        :title="
          isConnected ? t('channel.room.status.connected') : t('channel.room.status.disconnected')
        "
      ></span>
    </div>
    <div class="actions">
      <router-link v-if="linkedIssuePath" class="btn btn--sm btn--secondary" :to="linkedIssuePath">
        <MaterialSymbol name="link" :size="16" alt="" />
        {{ t("channel.room.actions.linkedIssue") }}
      </router-link>
      <button v-if="!isNoticeChannel" type="button" class="btn btn--sm" @click="openInviteModal">
        <MaterialSymbol name="person_add" :size="16" alt="" />
        {{ t("channel.room.actions.invite") }}
      </button>
      <button
        v-if="!isDmChannel && !isNoticeChannel && !isChannelOwner"
        type="button"
        class="btn btn--sm btn--secondary"
        @click="leaveChannel"
      >
        <MaterialSymbol name="logout" :size="16" alt="" />
        {{ t("channel.room.actions.leave") }}
      </button>
      <router-link
        v-if="!isNoticeChannel"
        class="btn btn--icon"
        :aria-label="t('channel.room.actions.settings')"
        :title="t('channel.room.actions.settings')"
        :to="channelSettingsPath"
      >
        <MaterialSymbol name="settings" :size="18" />
      </router-link>
    </div>
  </hgroup>

  <ChannelChatPanel
    v-if="roomId"
    :channel-id="roomId"
    @update:connected="isConnected = $event"
  />

  <AddChannelMemberModal
    :open="isInviteOpen"
    :channel-id="roomId"
    :project-members="projectMembers"
    @close="closeInviteModal"
    @invited="onMemberInvited"
  />
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import api from "../../lib/axios";
import MaterialSymbol from "../../components/MaterialSymbol.vue";
import ChannelChatPanel from "../../components/ChannelChatPanel.vue";
import AddChannelMemberModal from "../../components/modals/AddChannelMemberModal.vue";
import { addToast } from "../../lib/toast";
import { useProjectMemberStore } from "../../stores/projectMemberStore";
import { useAppStore } from "../../stores/appStore";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const projectMemberStore = useProjectMemberStore();
const appStore = useAppStore();
const roomId = computed(() => route.params.roomId);
const projectId = computed(() => route.params.projectId);

const isConnected = ref(false);
const roomTitle = ref("");
const channelDetail = ref(null);
const isInviteOpen = ref(false);
const currentUserId = computed(() => appStore.currentUser?.id);
const projectMembers = computed(() => projectMemberStore.getProjectMembers(projectId.value));
const memberNameById = computed(() => {
  const map = {};
  (projectMembers.value || []).forEach((member) => {
    map[String(member.id)] = member.name;
  });
  return map;
});
const isDmChannel = computed(() => String(channelDetail.value?.type || "").toUpperCase() === "DM");
const isNoticeChannel = computed(
  () => String(channelDetail.value?.type || "").toUpperCase() === "NOTICE"
);
const isChannelOwner = computed(
  () => String(channelDetail.value?.viewer_role_name || "").toUpperCase() === "OWNER"
);
const dmPeerName = computed(() => {
  if (!isDmChannel.value) return "";
  const pairKey = String(channelDetail.value?.dm_pair_key || "");
  if (!pairKey.includes(":")) return "";
  const [firstMemberId, secondMemberId] = pairKey.split(":");
  const currentId = String(currentUserId.value || "");
  const peerId =
    currentId === String(firstMemberId) ? String(secondMemberId) : String(firstMemberId);
  return memberNameById.value[String(peerId)] || "";
});
const displayRoomTitle = computed(() => {
  if (isDmChannel.value && dmPeerName.value) {
    return dmPeerName.value;
  }
  return roomTitle.value || t("channel.room.fallback.roomTitle");
});
const linkedIssuePath = computed(() => {
  if (!projectId.value) return "";
  const taskId = channelDetail.value?.task_id || channelDetail.value?.issue_id;
  const kanbanId = channelDetail.value?.kanban_id || channelDetail.value?.board_id;
  if (!taskId || !kanbanId) return "";
  return `/project/${projectId.value}/kanban/${kanbanId}/task/${taskId}`;
});
const channelSettingsPath = computed(() => {
  if (!roomId.value) return "";
  return `/project/${projectId.value}/channel/${roomId.value}/settings`;
});

const fetchchannelDetail = async () => {
  if (!roomId.value) {
    roomTitle.value = "";
    channelDetail.value = null;
    return;
  }

  try {
    const res = await api.get(`/channels/${roomId.value}`);
    channelDetail.value = res.data || null;
    roomTitle.value = res.data?.name || "";
  } catch (error) {
    channelDetail.value = null;
    roomTitle.value = "";
  }
};

const openInviteModal = () => {
  isInviteOpen.value = true;
};

const closeInviteModal = () => {
  isInviteOpen.value = false;
};

const onMemberInvited = () => {
  // Member invited successfully
};

const leaveChannel = async () => {
  if (!roomId.value) return;
  const confirmed = window.confirm(t("channel.room.confirm.leave"));
  if (!confirmed) return;

  try {
    await api.post(`/channels/${roomId.value}/leave`);
    addToast({ message: t("channel.room.status.left"), type: "success" });
    router.push(`/project/${projectId.value}/channel`);
  } catch (error) {
    const message = error?.response?.data?.message || t("channel.room.status.errorLeave");
    addToast({ message, type: "error" });
  }
};

onMounted(async () => {
  await projectMemberStore.fetchProjectMembers(projectId.value);
  await fetchchannelDetail();
});

watch(roomId, async () => {
  await projectMemberStore.fetchProjectMembers(projectId.value);
  await fetchchannelDetail();
});
</script>

<style scoped>
.room-status {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background-color: var(--color-success);
}

.room-status.offline {
  background-color: var(--color-danger);
}
</style>
