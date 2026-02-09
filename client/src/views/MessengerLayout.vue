<template>
  <div class="AcountLayout">
    <aside>
      <button class="btn" type="button" @click="openModal">
        {{ t("messenger.layout.actions.createChannel") }}
      </button>
      <nav class="chat-nav">
        <p v-if="isLoading">{{ t("messenger.layout.status.loading") }}</p>
        <p v-else-if="errorMessage">{{ errorMessage }}</p>
        <p v-else-if="rooms.length === 0">{{ t("messenger.layout.empty.channels") }}</p>
        <template v-else>
          <router-link
            v-for="room in rooms"
            :key="room.id"
            :to="`/workspace/${workspaceId}/project/${projectId}/messenger/${room.id}`"
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

  <BaseModal
    :open="isModalOpen"
    :title="t('messenger.layout.modal.title')"
    @close="closeModal"
  >
    <form class="modal-form" @submit.prevent="createChannel">
      <label for="channel-name">{{ t("messenger.layout.modal.nameLabel") }}</label>
      <input
        id="channel-name"
        v-model.trim="form.name"
        type="text"
        :placeholder="t('messenger.layout.modal.namePlaceholder')"
      />
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="closeModal">
          {{ t("messenger.layout.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isCreating">
          {{
            isCreating ? t("messenger.layout.actions.creating") : t("messenger.layout.actions.create")
          }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import api from "../lib/axios";
import { addToast } from "../lib/toast";
import BaseModal from "../components/BaseModal.vue";
import { useChatStore } from "../stores/chatStore";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();
const workspaceId = computed(() => route.params.workspaceId);
const projectId = computed(() => route.params.projectId);

const isModalOpen = ref(false);
const isCreating = ref(false);
const formError = ref("");
const form = ref({ name: "" });
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
  if (!projectId.value) {
    formError.value = t("messenger.layout.validation.noProject");
    return;
  }
  form.value = { name: "" };
  formError.value = "";
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const createChannel = async () => {
  if (!form.value.name) {
    formError.value = t("messenger.layout.validation.nameRequired");
    return;
  }

  if (!projectId.value) {
    formError.value = t("messenger.layout.validation.noProject");
    return;
  }

  isCreating.value = true;
  formError.value = "";

  try {
    const res = await api.post("/channels", {
      name: form.value.name,
      project_id: projectId.value,
      type: "PROJECT",
    });
    await fetchRooms();
    closeModal();
    addToast({ message: t("messenger.layout.toast.created"), type: "success" });
    const newRoomId = res.data?.data?.id;
    if (newRoomId) {
      await router.push(
        `/workspace/${workspaceId.value}/project/${projectId.value}/messenger/${newRoomId}`
      );
    }
  } catch (error) {
    const message =
      error?.response?.data?.message || t("messenger.layout.status.errorCreate");
    formError.value = message;
    addToast({ message, type: "error" });
  } finally {
    isCreating.value = false;
  }
};

onMounted(fetchRooms);
watch(projectId, fetchRooms);
</script>
