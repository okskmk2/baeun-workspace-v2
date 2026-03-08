<template>
  <article class="board-card" @dragover.prevent @drop="handleDrop" @click="handleClick">
    <h3>{{ board.name }}</h3>
    <p class="board-card-summary">{{ board.summary || "" }}</p>
    <div class="issue-counts">
      <div v-for="(count, status) in board.task_counts || {}" :key="status" class="status-count">
        <span>{{ t(`task.status.${convertSnakeToCamel(status)}`) }}:</span>
        <span class="tabular-nums">{{ count }}</span>
      </div>
    </div>
  </article>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { convertSnakeToCamel } from "../lib/utils";

const props = defineProps({
  board: { type: Object, required: true },
  projectId: { type: [String, Number], required: true },
});

const emit = defineEmits(["drop"]);

const { t } = useI18n();
const router = useRouter();

const handleDrop = () => {
  emit("drop", props.board.id);
};

const handleClick = () => {
  router.push(`/project/${props.projectId}/kanban/${props.board.id}`);
};
</script>

<style scoped>
.board-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 16px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.2s ease-in-out;
}

.board-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.board-card h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--color-text);
}

.board-card-summary {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  min-height: calc(1.4em * 2);
  color: var(--color-text-muted);
  line-clamp: 2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.issue-counts {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

.status-count {
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
}
</style>
