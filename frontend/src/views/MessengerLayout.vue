<template>
  <div class="LnbLayout ChannelLayout">
    <aside>
      <button class="btn" type="button" @click="openModal">
        {{ t("messenger.layout.actions.createChannel") }}
      </button>
      <nav>
        <p v-if="isLoading">{{ t("messenger.layout.status.loading") }}</p>
        <p v-else-if="errorMessage">{{ errorMessage }}</p>
        <p v-else-if="rooms.length === 0">{{ t("messenger.layout.empty.channels") }}</p>
        <template v-else>
          <router-link
            v-for="room in rooms"
            :key="room.id"
            :to="`/project/${projectId}/messenger/${room.id}`"
          >
            {{ room.name || t("messenger.layout.fallback.channelName") }}
          </router-link>
        </template>
      </nav>
    </aside>
    <main>
      <router-view />
    </main>
  </div>

  <CreateChannelModal
    :open="isModalOpen"
    :project-id="projectId"
    @close="closeModal"
    @created="onChannelCreated"
  />
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import CreateChannelModal from "../components/modals/CreateChannelModal.vue";
import { useChatStore } from "../stores/chatStore";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();

const projectId = computed(() => route.params.projectId);

const isModalOpen = ref(false);
const rooms = computed(() => chatStore.getRooms(projectId.value));
const isLoading = ref(false);
const errorMessage = ref("");

const fetchRooms = async () => {
  if (!projectId.value) {
    rooms.value = [];
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
    await chatStore.fetchRooms(projectId.value);
  } catch (error) {
    errorMessage.value = t("messenger.layout.status.errorLoad");
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

const onChannelCreated = async () => {
  await chatStore.fetchRooms(projectId.value);
};

onMounted(fetchRooms);
watch(projectId, fetchRooms);
</script>

<style>
.ChannelLayout main {
  padding-bottom: 2rem;
}
</style>
