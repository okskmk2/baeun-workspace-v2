<template>
  <div class="LnbLayout ChannelLayout">
    <aside>
      <div>
        <button class="btn" type="button" @click="openModal">
          {{ t("messenger.layout.actions.createChannel") }}
        </button>

        <nav>
          <p v-if="isLoading">{{ t("messenger.layout.status.loading") }}</p>
          <p v-else-if="errorMessage">{{ errorMessage }}</p>
          <p v-else-if="rooms.length === 0">{{ t("messenger.layout.empty.channels") }}</p>
          <template v-else>
            <section v-for="section in roomSections" :key="section.key" class="room-section">
              <h3>{{ section.title }}</h3>
              <router-link
                v-for="room in section.items"
                :key="room.id"
                :to="`/project/${projectId}/channel/${room.id}`"
              >
                {{ getRoomDisplayName(room) }}
              </router-link>
            </section>
          </template>
        </nav>
      </div>
      <router-link class="archive-link" :to="archivePath">
        {{ t("messenger.layout.actions.archiveInbox") }}
      </router-link>
    </aside>
    <main>
      <router-view />
    </main>
  </div>

  <CreateChannelModal
    :open="isModalOpen"
    :project-id="projectId"
    :project-members="projectMembers"
    :current-user-id="currentUserId"
    @close="closeModal"
    @created="onChannelCreated"
  />
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import CreateChannelModal from "../../components/modals/CreateChannelModal.vue";
import { useChatStore } from "../../stores/chatStore";
import { useProjectSearchStore } from "../../stores/projectSearchStore";
import { useProjectMemberStore } from "../../stores/projectMemberStore";
import { useAppStore } from "../../stores/appStore";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();
const projectSearchStore = useProjectSearchStore();
const projectMemberStore = useProjectMemberStore();
const appStore = useAppStore();

const projectId = computed(() => route.params.projectId);

const isModalOpen = ref(false);
const rooms = computed(() => chatStore.getRooms(projectId.value));
const archivePath = computed(() => `/project/${projectId.value}/channel/archive`);
const isLoading = ref(false);
const errorMessage = ref("");

const currentUserId = computed(() => appStore.currentUser?.id);
const projectMembers = computed(() => projectMemberStore.getProjectMembers(projectId.value) || []);
const memberNameById = computed(() => {
  const map = {};
  projectMembers.value.forEach((member) => {
    map[String(member.id)] = member.name;
  });
  return map;
});

const roomSections = computed(() => {
  const mapByType = {
    NOTICE: [],
    GENERAL: [],
    TASK: [],
    DM: [],
    AGENT: [],
  };

  rooms.value.forEach((room) => {
    const key = String(room.type || "GENERAL").toUpperCase();
    if (!mapByType[key]) {
      mapByType.GENERAL.push(room);
      return;
    }
    mapByType[key].push(room);
  });

  const noticeItems = [...mapByType.NOTICE].sort((left, right) => {
    const leftScope = String(left.scope || "").toUpperCase();
    const rightScope = String(right.scope || "").toUpperCase();
    if (leftScope === rightScope) return 0;
    if (leftScope === "WORKSPACE") return -1;
    if (rightScope === "WORKSPACE") return 1;
    return 0;
  });

  const sections = [
    { key: "NOTICE", title: t("messenger.layout.sections.notice"), items: noticeItems },
    { key: "GENERAL", title: t("messenger.layout.sections.general"), items: mapByType.GENERAL },
    { key: "TASK", title: t("messenger.layout.sections.task"), items: mapByType.TASK },
    { key: "DM", title: t("messenger.layout.sections.dm"), items: mapByType.DM },
    { key: "AGENT", title: t("messenger.layout.sections.agent"), items: mapByType.AGENT },
  ];

  return sections.filter((section) => section.items.length > 0);
});

const fetchRooms = async () => {
  if (!projectId.value) {
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
    await chatStore.fetchRooms(projectId.value);
    await projectMemberStore.fetchProjectMembers(projectId.value);
    projectSearchStore.upsertChannels(projectId.value, chatStore.getRooms(projectId.value));
  } catch (error) {
    if (error?.response?.status === 404) {
      router.push("/not-found");
      return;
    }
    errorMessage.value = t("messenger.layout.status.errorLoad");
  } finally {
    isLoading.value = false;
  }
};

const getDmPeerName = (room) => {
  if (!room || String(room.type || "").toUpperCase() !== "DM") {
    return "";
  }

  const pairKey = String(room.dm_pair_key || "");
  if (!pairKey.includes(":")) {
    return "";
  }

  const [firstMemberId, secondMemberId] = pairKey.split(":");
  const currentId = String(currentUserId.value || "");
  const peerId =
    currentId === String(firstMemberId) ? String(secondMemberId) : String(firstMemberId);

  return memberNameById.value[peerId] || "";
};

const getRoomDisplayName = (room) => {
  const dmPeerName = getDmPeerName(room);
  if (dmPeerName) {
    return dmPeerName;
  }
  return room?.name || t("messenger.layout.fallback.channelName");
};

const openModal = () => {
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const onChannelCreated = async () => {
  await fetchRooms();
};

onMounted(fetchRooms);
watch(projectId, fetchRooms);
</script>

<style>
.ChannelLayout main {
  padding-bottom: 2rem;
}

.archive-link {
  font-size: 14px;
  color: var(--color-text-muted);
}

.archive-link:hover {
  color: var(--color-text);
}

.ChannelLayout aside {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.layout-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.room-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.room-section h3 {
  margin: 8px 0 2px;
  font-size: 12px;
  color: var(--color-text-muted);
}
</style>

