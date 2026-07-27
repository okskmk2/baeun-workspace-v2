<template>
  <BaseModal :open="open" title="새 폴더" max-width="360px" @close="handleClose">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <div class="form-field">
        <label for="folder-name">폴더 이름</label>
        <input
          id="folder-name"
          ref="inputRef"
          v-model.trim="folderName"
          type="text"
          placeholder="새 폴더 이름을 입력하세요."
        />
      </div>
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="handleClose">취소</button>
        <button type="submit" class="btn">생성</button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { nextTick, ref, watch } from "vue";
import BaseModal from "../BaseModal.vue";

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(["close", "confirm"]);

const inputRef = ref(null);
const folderName = ref("");
const formError = ref("");

const handleClose = () => {
  emit("close");
};

const handleSubmit = () => {
  const trimmedName = folderName.value.trim();
  if (!trimmedName) {
    formError.value = "폴더 이름을 입력하세요.";
    return;
  }

  emit("confirm", trimmedName);
};

watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      folderName.value = "";
      formError.value = "";
      nextTick(() => inputRef.value?.focus());
    }
  }
);
</script>
