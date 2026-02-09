<template>
  <div class="AcountLayout">
    <aside>
      <button class="btn btn--sm" type="button" @click="openModal">채널 만들기</button>
      <nav class="chat-nav">
        <p v-if="isLoading">불러오는 중...</p>
        <p v-else-if="errorMessage">{{ errorMessage }}</p>
        <p v-else-if="rooms.length === 0">채널이 없습니다.</p>
        <template v-else>
          <router-link
            v-for="room in rooms"
            :key="room.id"
            :to="`/workspace/${workspaceId}/project/${projectId}/messenger/${room.id}`"
          >
            {{ room.name || "이름 없는 채널" }}
          </router-link>
        </template>
      </nav>
    </aside>
    <main>
      <router-view />
    </main>
  </div>

  <BaseModal :open="isModalOpen" title="채널 만들기" @close="closeModal">
    <form class="modal-form" @submit.prevent="createChannel">
      <label for="channel-name">채널 이름</label>
      <input id="channel-name" v-model.trim="form.name" type="text" placeholder="채널 이름" />
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="closeModal">취소</button>
        <button type="submit" class="btn" :disabled="isCreating">
          {{ isCreating ? "생성 중..." : "생성" }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../lib/axios";
import { addToast } from "../lib/toast";
import BaseModal from "../components/BaseModal.vue";
import { useChatStore } from "../stores/chatStore";

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
    errorMessage.value = "채널 목록을 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

const openModal = () => {
  if (!projectId.value) {
    formError.value = "프로젝트가 선택되지 않았습니다.";
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
    formError.value = "채널 이름을 입력해 주세요.";
    return;
  }

  if (!projectId.value) {
    formError.value = "프로젝트가 선택되지 않았습니다.";
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
    addToast({ message: "채널이 생성되었습니다.", type: "success" });
    const newRoomId = res.data?.data?.id;
    if (newRoomId) {
      await router.push(
        `/workspace/${workspaceId.value}/project/${projectId.value}/messenger/${newRoomId}`
      );
    }
  } catch (error) {
    const message = error?.response?.data?.message || "채널 생성에 실패했습니다.";
    formError.value = message;
    addToast({ message, type: "error" });
  } finally {
    isCreating.value = false;
  }
};

onMounted(fetchRooms);
watch(projectId, fetchRooms);
</script>
