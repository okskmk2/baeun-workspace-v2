<template>
  <span :class="['activity-badge', toneClass]" :title="title">
    {{ display }}
  </span>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  type: { type: String, required: true },
});

const typeKey = computed(() => (props.type || "").toUpperCase());

const tone = computed(() => {
  const key = typeKey.value;
  if (key === "C" || key === "CREATE" || key === "CREATED") return "create";
  if (key === "D" || key === "DELETE" || key === "DELETED") return "delete";
  if (key === "S" || key === "U" || key === "UPDATE" || key === "UPDATED") return "update";
  return "update";
});

const display = computed(() => {
  if (tone.value === "create") return "C";
  if (tone.value === "delete") return "D";
  return "U";
});

const title = computed(() => {
  if (tone.value === "create") return "Created";
  if (tone.value === "delete") return "Deleted";
  return "Updated";
});

const toneClass = computed(() => `activity-badge--${tone.value}`);
</script>

<style scoped>
.activity-badge {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.activity-badge--update {
  background: #111827;
}

.activity-badge--create {
  background: #166534;
}

.activity-badge--delete {
  background: #dc2626;
}
</style>
