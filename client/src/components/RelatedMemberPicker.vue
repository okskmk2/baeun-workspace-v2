<template>
  <div ref="rootRef" class="related-picker">
    <div class="picker-header">
      <span class="picker-label">{{ label }}</span>
    </div>
    <div class="picker-tags">
      <div v-if="selected.length" class="tag-list">
        <span v-for="member in selected" :key="member.issue_member_id" class="member-tag">
          <span class="member-name">{{ member.name }}</span>
          <button
            type="button"
            class="tag-remove"
            :disabled="isBusy(member.issue_member_id)"
            @click="handleRemove(member.issue_member_id)"
            aria-label="삭제"
          >
            <MaterialSymbol name="close" :size="16" alt="" />
          </button>
        </span>
      </div>
      <span v-else class="tag-empty">선택된 사람 없음</span>
      <button
        type="button"
        class="picker-add"
        :disabled="isUpdating"
        @click="toggle"
        aria-label="관련자 추가"
      >
        <MaterialSymbol name="add" :size="18" alt="" />
      </button>
    </div>
    <div v-if="isOpen" class="picker-options">
      <div
        v-for="member in members"
        :key="member.id"
        class="picker-option"
        :class="{ disabled: isOptionDisabled(member.id) }"
        @click="handleAdd(member.id)"
      >
        <span class="option-name">{{ member.name }}</span>
        <span class="option-meta">{{ member.email }}</span>
      </div>
      <div v-if="!members.length" class="picker-empty">선택할 사람이 없습니다.</div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import MaterialSymbol from "./MaterialSymbol.vue";

const props = defineProps({
  role: { type: String, default: "" },
  label: { type: String, default: "" },
  members: { type: Array, default: () => [] },
  selected: { type: Array, default: () => [] },
  isUpdating: { type: Boolean, default: false },
  updatingMemberId: { type: [String, Number], default: null },
});

const emit = defineEmits(["add", "remove"]);

const isOpen = ref(false);
const rootRef = ref(null);

const selectedIds = computed(() =>
  new Set(props.selected.map((member) => String(member.member_id)))
);

const isOptionDisabled = (memberId) => {
  const key = String(memberId);
  return selectedIds.value.has(key);
};

const isBusy = (issueMemberId) =>
  props.isUpdating || String(props.updatingMemberId || "") === String(issueMemberId);

const toggle = () => {
  if (props.isUpdating) return;
  isOpen.value = !isOpen.value;
};

const handleAdd = (memberId) => {
  if (props.isUpdating || isOptionDisabled(memberId)) return;
  emit("add", memberId);
  isOpen.value = false;
};

const handleRemove = (issueMemberId) => {
  if (props.isUpdating) return;
  emit("remove", issueMemberId);
};

const handleClickOutside = (event) => {
  if (!rootRef.value) return;
  if (!rootRef.value.contains(event.target)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<style scoped>
.related-picker {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker-label {
  font-size: 13px;
  color: #374151;
  font-weight: 600;
}

.picker-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-empty {
  font-size: 12px;
  color: #9ca3af;
}

.member-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  font-size: 12px;
  color: #111827;
}

.member-name {
  font-weight: 500;
}

.tag-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.tag-remove:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.picker-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px dashed #d1d5db;
  background: #ffffff;
  color: #6b7280;
  cursor: pointer;
}

.picker-add:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.picker-options {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
  max-height: 220px;
  overflow-y: auto;
}

.picker-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
}

.picker-option:hover {
  background: #f3f4f6;
}

.picker-option.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.picker-option.disabled:hover {
  background: transparent;
}

.option-name {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.option-meta {
  font-size: 12px;
  color: #6b7280;
}

.picker-empty {
  padding: 8px 10px;
  font-size: 12px;
  color: #9ca3af;
}
</style>
