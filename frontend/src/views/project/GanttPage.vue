<template>
  <hgroup>
    <div>
      <h1>{{ t("kanban.gantt.header.title") }}</h1>
      <p class="subtitle">{{ t("kanban.gantt.header.subtitle") }}</p>
    </div>
  </hgroup>

  <p v-if="isLoading">{{ t("kanban.gantt.status.loading") }}</p>
  <p v-else-if="errorMessage">{{ errorMessage }}</p>
  <p v-else-if="kanbanGroups.length === 0">{{ t("kanban.gantt.empty.tasks") }}</p>

  <div v-else class="gantt-wrap">
    <div class="gantt-head" :style="rowStyle">
      <div class="task-label-col">{{ t("kanban.gantt.columns.task") }}</div>
      <div class="tasktrack" :style="tasktrackStyle">
        <div
          v-for="day in timelineDayParts"
          :key="day.value"
          class="tasktrack-cell tasktrack-cell--head"
        >
          <span>{{ day.month }}</span>
          <span>{{ day.date }}</span>
        </div>
      </div>
    </div>

    <section v-for="group in kanbanGroups" :key="group.kanbanId" class="kanban-group">
      <h2>{{ group.kanbanName }}</h2>

      <article v-for="task in group.tasks" :key="task.id" class="task-row" :style="rowStyle">
        <router-link
          class="task-label-col task-link"
          :to="`/project/${projectId}/kanban/${group.kanbanId}/task/${task.id}`"
        >
          <span class="task-title">{{ task.title || t("task.detail.header.fallbackTitle") }}</span>
          <span class="task-meta">#{{ task.id }} · {{ statusLabel(task.status) }}</span>
        </router-link>

        <div class="tasktrack" :style="tasktrackStyle">
          <div v-for="day in timelineDays" :key="`${task.id}-${day}`" class="tasktrack-cell"></div>
          <div class="taskbar" :style="taskbarStyle(task)">
            <span class="taskbar-text">{{
              task.title || t("task.detail.header.fallbackTitle")
            }}</span>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import api from "../../lib/axios";
import { convertSnakeToCamel } from "../../lib/utils";

const TASKTRACK_UNIT_PX = 32;
const LABEL_COL_PX = 260;

const { t } = useI18n();
const route = useRoute();

const isLoading = ref(false);
const errorMessage = ref("");
const kanbanGroups = ref([]);

const projectId = computed(() => route.params.projectId);

const normalizeDate = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const diffDays = (start, end) => {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
};

const timelineBounds = computed(() => {
  const allTasks = kanbanGroups.value.flatMap((group) => group.tasks);
  if (allTasks.length === 0) {
    const today = normalizeDate(new Date()) || new Date();
    return { start: today, end: addDays(today, 6) };
  }

  const today = normalizeDate(new Date()) || new Date();
  const starts = allTasks.map((task) => normalizeDate(task.created_at)).filter(Boolean);
  const ends = allTasks
    .map((task) => {
      const start = normalizeDate(task.created_at);
      const rawEnd =
        (String(task.status || "").toUpperCase() === "DONE"
          ? normalizeDate(task.updated_at)
          : today) || today;
      if (!start) return null;
      return rawEnd < start ? start : rawEnd;
    })
    .filter(Boolean);

  if (starts.length === 0 || ends.length === 0) {
    return { start: today, end: addDays(today, 6) };
  }

  const minStart = new Date(Math.min(...starts.map((d) => d.getTime())));
  const maxEnd = new Date(Math.max(...ends.map((d) => d.getTime())));

  return {
    start: addDays(minStart, -1),
    end: addDays(maxEnd, 1),
  };
});

const timelineDays = computed(() => {
  const days = [];
  let cursor = new Date(timelineBounds.value.start);
  while (cursor <= timelineBounds.value.end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor = addDays(cursor, 1);
  }
  return days;
});

const timelineDayParts = computed(() =>
  timelineDays.value.map((day) => {
    const date = normalizeDate(day);
    if (!date) {
      return { value: day, month: "--", date: "--" };
    }

    return {
      value: day,
      month: String(date.getMonth() + 1).padStart(2, "0"),
      date: String(date.getDate()).padStart(2, "0"),
    };
  })
);

const tasktrackStyle = computed(() => ({
  gridTemplateColumns: `repeat(${timelineDays.value.length}, ${TASKTRACK_UNIT_PX}px)`,
  width: `${timelineDays.value.length * TASKTRACK_UNIT_PX}px`,
}));

const rowStyle = computed(() => ({
  width: `${LABEL_COL_PX + timelineDays.value.length * TASKTRACK_UNIT_PX}px`,
}));

const statusLabel = (status) => {
  const key = convertSnakeToCamel(String(status || "BACKLOG").toUpperCase());
  return t(`task.status.${key}`);
};

const taskbarStyle = (task) => {
  const start = normalizeDate(task.created_at) || timelineBounds.value.start;
  const today = normalizeDate(new Date()) || new Date();
  const fallbackEnd =
    String(task.status || "").toUpperCase() === "DONE" ? normalizeDate(task.updated_at) : today;
  const end = fallbackEnd && fallbackEnd >= start ? fallbackEnd : start;

  const offset = Math.max(0, diffDays(timelineBounds.value.start, start));
  const duration = Math.max(1, diffDays(start, end) + 1);

  return {
    left: `${offset * TASKTRACK_UNIT_PX}px`,
    width: `${duration * TASKTRACK_UNIT_PX}px`,
  };
};

const fetchGantt = async () => {
  if (!projectId.value) return;

  isLoading.value = true;
  errorMessage.value = "";

  try {
    const kanbanRes = await api.get(`/kanbans`, { params: { projectId: projectId.value } });
    const kanbans = Array.isArray(kanbanRes.data) ? kanbanRes.data : [];
    const targetKanbans = kanbans.filter((kanban) => kanban.type !== "BACKLOG");

    const taskResults = await Promise.all(
      targetKanbans.map((kanban) => api.get(`/kanbans/${kanban.id}/tasks`))
    );

    kanbanGroups.value = targetKanbans
      .map((kanban, index) => {
        const tasks = Array.isArray(taskResults[index]?.data) ? taskResults[index].data : [];
        return {
          kanbanId: kanban.id,
          kanbanName: kanban.name || t("kanban.page.header.fallbackTitle"),
          tasks,
        };
      })
      .filter((group) => group.tasks.length > 0);
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || t("kanban.gantt.status.errorLoad");
    kanbanGroups.value = [];
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchGantt);
watch(projectId, fetchGantt);
</script>

<style scoped>
.gantt-wrap {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  border: 1px solid var(--color-border);
  /* border-radius: 10px; */
}

.gantt-head,
.task-row {
  display: grid;
  grid-template-columns: 260px 1fr;
}

.gantt-head {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--color-surface);
}

.task-label-col {
  height: 32px;
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  border-right: 1px solid var(--color-border);
  font-size: 13px;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.task-link {
  text-decoration: none;
  color: var(--color-text);
  justify-content: center;
  align-items: flex-start;
  flex-direction: column;
}

.task-title {
  font-size: 13px;
  font-weight: 600;
  max-width: 230px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-meta {
  font-size: 11px;
  color: var(--color-text-muted);
}

.tasktrack {
  position: relative;
  display: grid;
  grid-auto-rows: 32px;
  min-height: 32px;
}

.tasktrack-cell {
  width: 32px;
  height: 32px;
  border-right: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  font-size: 11px;
  color: var(--color-text-muted);
  display: inline-flex;
  justify-content: center;
  align-items: center;
}

.tasktrack-cell--head {
  flex-direction: column;
  gap: 0;
  line-height: 1.05;
  font-size: 10px;
}

.taskbar {
  position: absolute;
  top: 6px;
  height: 20px;
  border-radius: 999px;
  background: var(--color-accent);
  color: white;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 12px;
  pointer-events: none;
}

.taskbar-text {
  display: block;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kanban-group {
  width: max-content;
  min-width: 100%;
}

.kanban-group h2 {
  margin: 0;
  padding: 10px;
  font-size: 14px;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}
</style>
