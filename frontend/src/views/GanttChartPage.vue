<template>
  <hgroup>
    <h1>간트차트</h1>
    <p class="subtitle">샘플 데이터 기반 간트차트입니다. (API 연동 없음)</p>
  </hgroup>

  <div class="actions">
    <button type="button" class="btn btn--sm" @click="createIssue">이슈 생성</button>
  </div>

  <div class="gantt-wrapper">
    <div class="timeline-header" :style="rowStyle">
      <div class="axis-left">보드 / 이슈</div>
      <div class="axis-right" :style="timelineGridStyle">
        <div v-for="day in timelineDays" :key="day" class="day-cell">{{ day.slice(5) }}</div>
      </div>
    </div>

    <div v-for="group in groupedIssues" :key="group.board.id" class="board-group">
      <div class="board-name">{{ group.board.name }}</div>
      <div
        v-for="issue in group.issues"
        :key="issue.id"
        class="issue-row"
        :style="rowStyle"
        @click="handleIssueClick(issue)"
      >
        <div class="issue-label">
          <strong>{{ issue.title }}</strong>
          <span class="muted">#{{ issue.id }}</span>
        </div>
        <div class="issue-track" :style="timelineGridStyle">
          <div
            class="issue-bar"
            :style="barStyle(issue)"
            @click.stop="handleIssueClick(issue)"
            :title="hoverText(issue)"
          >
            <button
              type="button"
              class="resize-handle start"
              @mousedown="startResize($event, issue, 'start')"
              @click.stop.prevent
            />
            <span class="bar-main">{{ assigneeName(issue) || '미할당' }} · {{ issue.status }}</span>
            <div class="bar-hover">
              <p>계획: {{ formatRange(issue.plannedStartAt, issue.plannedEndAt) }}</p>
              <p>실제: {{ formatRange(issue.actualStartAt, issue.actualEndAt) }}</p>
            </div>
            <button
              type="button"
              class="resize-handle end"
              @mousedown="startResize($event, issue, 'end')"
              @click.stop.prevent
            />
            <div class="bar-resize-actions" @click.stop>
              <button type="button" class="btn-mini" @click="shrinkIssue(issue)">-1d</button>
              <button type="button" class="btn-mini" @click="extendIssue(issue)">+1d</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <BaseModal :open="isModalOpen" title="이슈 상세" max-width="560px" @close="closeModal">
    <template v-if="selectedIssue">
      <div class="modal-grid">
        <p><strong>제목:</strong> {{ selectedIssue.title }}</p>
        <p><strong>상태:</strong> {{ selectedIssue.status }}</p>
        <p><strong>계획기간:</strong> {{ formatRange(selectedIssue.plannedStartAt, selectedIssue.plannedEndAt) }}</p>
        <p><strong>실제기간:</strong> {{ formatRange(selectedIssue.actualStartAt, selectedIssue.actualEndAt) }}</p>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn--sm" @click="shrinkIssue(selectedIssue)">기간 -1일</button>
        <button type="button" class="btn btn--sm" @click="extendIssue(selectedIssue)">기간 +1일</button>
        <button type="button" class="btn btn--sm btn-danger" @click="deleteIssue(selectedIssue.id)">
          이슈 삭제
        </button>
      </div>

      <hr />

      <div class="assign-section">
        <h3>관련자 할당 (REPORTER 제외)</h3>
        <div class="assign-form">
          <select v-model="assignMemberId">
            <option value="">멤버 선택</option>
            <option v-for="member in memberCandidates" :key="member.id" :value="member.id">
              {{ member.name }}
            </option>
          </select>
          <select v-model="assignRole">
            <option value="ASSIGNEE">ASSIGNEE</option>
            <option value="REVIEWER">REVIEWER</option>
            <option value="WATCHER">WATCHER</option>
          </select>
          <button type="button" class="btn btn--sm" @click="addRelatedMember">추가</button>
        </div>

        <ul class="member-list">
          <li v-for="member in selectedIssue.members" :key="`${selectedIssue.id}-${member.id}-${member.role}`">
            <span>{{ member.name }} ({{ member.role }})</span>
            <button type="button" class="link-btn" @click="removeMember(member.id, member.role)">
              제거
            </button>
          </li>
        </ul>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from "vue";
import BaseModal from "../components/BaseModal.vue";

const DAY_WIDTH_PX = 44;
const LABEL_WIDTH_PX = 260;

const boards = ref([
  { id: 1, name: "웹 플랫폼" },
  { id: 2, name: "모바일 앱" },
  { id: 3, name: "인프라" },
]);

const allMembers = ref([
  { id: 1, name: "김민수" },
  { id: 2, name: "박지은" },
  { id: 3, name: "이서준" },
  { id: 4, name: "최윤아" },
]);

const issues = ref([
  {
    id: 101,
    title: "로그인 화면 개선",
    boardId: 1,
    status: "IN_PROGRESS",
    plannedStartAt: "2026-02-10",
    plannedEndAt: "2026-02-13",
    actualStartAt: "2026-02-11",
    actualEndAt: null,
    members: [
      { id: 1, name: "김민수", role: "ASSIGNEE" },
      { id: 2, name: "박지은", role: "REVIEWER" },
    ],
  },
  {
    id: 102,
    title: "결제 모듈 테스트",
    boardId: 1,
    status: "BACKLOG",
    plannedStartAt: "2026-02-14",
    plannedEndAt: "2026-02-15",
    actualStartAt: null,
    actualEndAt: null,
    members: [{ id: 3, name: "이서준", role: "ASSIGNEE" }],
  },
  {
    id: 201,
    title: "푸시 알림 연동",
    boardId: 2,
    status: "IN_REVIEW",
    plannedStartAt: "2026-02-12",
    plannedEndAt: "2026-02-17",
    actualStartAt: "2026-02-13",
    actualEndAt: null,
    members: [{ id: 4, name: "최윤아", role: "ASSIGNEE" }],
  },
  {
    id: 301,
    title: "배포 파이프라인 최적화",
    boardId: 3,
    status: "DONE",
    plannedStartAt: "2026-02-08",
    plannedEndAt: "2026-02-12",
    actualStartAt: "2026-02-08",
    actualEndAt: "2026-02-11",
    members: [
      { id: 2, name: "박지은", role: "ASSIGNEE" },
      { id: 1, name: "김민수", role: "WATCHER" },
    ],
  },
  {
    id: 401,
    title: "계획기간 없는 이슈(숨김)",
    boardId: 3,
    status: "BACKLOG",
    plannedStartAt: null,
    plannedEndAt: null,
    actualStartAt: null,
    actualEndAt: null,
    members: [],
  },
]);

const selectedIssue = ref(null);
const isModalOpen = ref(false);
const assignMemberId = ref("");
const assignRole = ref("ASSIGNEE");
const dragState = ref(null);
const suppressClickUntil = ref(0);

const visibleIssues = computed(() =>
  issues.value.filter((issue) => issue.plannedStartAt && issue.plannedEndAt)
);

const groupedIssues = computed(() => {
  return boards.value.map((board) => ({
    board,
    issues: visibleIssues.value.filter((issue) => issue.boardId === board.id),
  }));
});

const timelineBounds = computed(() => {
  const starts = visibleIssues.value.map((issue) => toDate(issue.plannedStartAt));
  const ends = visibleIssues.value.map((issue) => toDate(issue.plannedEndAt));
  if (starts.length === 0 || ends.length === 0) {
    const today = startOfDay(new Date());
    return { start: today, end: addDays(today, 7) };
  }

  const min = new Date(Math.min(...starts.map((date) => date.getTime())));
  const max = new Date(Math.max(...ends.map((date) => date.getTime())));
  return { start: addDays(min, -1), end: addDays(max, 1) };
});

const timelineDays = computed(() => {
  const days = [];
  let cursor = new Date(timelineBounds.value.start);
  while (cursor <= timelineBounds.value.end) {
    days.push(formatDate(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
});

const timelineGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${timelineDays.value.length}, ${DAY_WIDTH_PX}px)`,
  minWidth: `${timelineDays.value.length * DAY_WIDTH_PX}px`,
}));

const rowStyle = computed(() => {
  const timelineWidth = timelineDays.value.length * DAY_WIDTH_PX;
  return {
    width: `${LABEL_WIDTH_PX + timelineWidth}px`,
    minWidth: "100%",
  };
});

const timelineTotalDays = computed(() => timelineDays.value.length || 1);

const barStyle = (issue) => {
  const start = toDate(issue.plannedStartAt);
  const end = toDate(issue.plannedEndAt);
  const leftDays = diffDays(timelineBounds.value.start, start);
  const durationDays = Math.max(1, diffDays(start, end) + 1);

  const leftPercent = (leftDays / timelineTotalDays.value) * 100;
  const widthPercent = (durationDays / timelineTotalDays.value) * 100;

  return {
    left: `${leftPercent}%`,
    width: `${Math.max(3, widthPercent)}%`,
  };
};

const formatRange = (start, end) => {
  if (!start || !end) return "-";
  return `${start} ~ ${end}`;
};

const assigneeName = (issue) => {
  return issue.members.find((member) => member.role === "ASSIGNEE")?.name || "";
};

const hoverText = (issue) => {
  return `계획: ${formatRange(issue.plannedStartAt, issue.plannedEndAt)} | 실제: ${formatRange(issue.actualStartAt, issue.actualEndAt)}`;
};

const createIssue = () => {
  const baseDate = startOfDay(new Date());
  const start = formatDate(baseDate);
  const end = formatDate(addDays(baseDate, 1));
  const newId = Math.max(0, ...issues.value.map((issue) => issue.id)) + 1;

  const nextIssue = {
    id: newId,
    title: `새 이슈 ${newId}`,
    boardId: boards.value[0]?.id || 1,
    status: "BACKLOG",
    plannedStartAt: start,
    plannedEndAt: end,
    actualStartAt: null,
    actualEndAt: null,
    members: [],
  };

  issues.value.unshift(nextIssue);
  openIssueModal(nextIssue);
};

const extendIssue = (issue) => {
  const target = getIssueById(issue.id);
  if (!target?.plannedEndAt) return;
  target.plannedEndAt = formatDate(addDays(toDate(target.plannedEndAt), 1));
};

const shrinkIssue = (issue) => {
  const target = getIssueById(issue.id);
  if (!target?.plannedStartAt || !target?.plannedEndAt) return;

  const nextEnd = addDays(toDate(target.plannedEndAt), -1);
  const start = toDate(target.plannedStartAt);
  if (nextEnd < start) return;
  target.plannedEndAt = formatDate(nextEnd);
};

const openIssueModal = (issue) => {
  const target = getIssueById(issue.id);
  if (!target) return;
  selectedIssue.value = target;
  assignMemberId.value = "";
  assignRole.value = "ASSIGNEE";
  isModalOpen.value = true;
};

const handleIssueClick = (issue) => {
  if (Date.now() < suppressClickUntil.value) return;
  openIssueModal(issue);
};

const closeModal = () => {
  isModalOpen.value = false;
  selectedIssue.value = null;
};

const deleteIssue = (issueId) => {
  issues.value = issues.value.filter((issue) => issue.id !== issueId);
  closeModal();
};

const memberCandidates = computed(() => {
  if (!selectedIssue.value) return allMembers.value;
  const assignedIds = new Set(selectedIssue.value.members.map((member) => member.id));
  return allMembers.value.filter((member) => !assignedIds.has(member.id));
});

const addRelatedMember = () => {
  if (!selectedIssue.value || !assignMemberId.value) return;

  if (assignRole.value === "REPORTER") {
    return;
  }

  const member = allMembers.value.find((candidate) => String(candidate.id) === String(assignMemberId.value));
  if (!member) return;

  selectedIssue.value.members.push({
    id: member.id,
    name: member.name,
    role: assignRole.value,
  });

  assignMemberId.value = "";
};

const removeMember = (memberId, role) => {
  if (!selectedIssue.value) return;
  selectedIssue.value.members = selectedIssue.value.members.filter(
    (member) => !(member.id === memberId && member.role === role)
  );
};

const startResize = (event, issue, edge) => {
  event.preventDefault();
  event.stopPropagation();

  const target = getIssueById(issue.id);
  if (!target?.plannedStartAt || !target?.plannedEndAt) return;

  dragState.value = {
    issueId: target.id,
    edge,
    startX: event.clientX,
    originStart: target.plannedStartAt,
    originEnd: target.plannedEndAt,
    moved: false,
  };

  window.addEventListener("mousemove", onResizeMove);
  window.addEventListener("mouseup", stopResize);
};

const onResizeMove = (event) => {
  if (!dragState.value) return;

  const target = getIssueById(dragState.value.issueId);
  if (!target) return;

  const deltaX = event.clientX - dragState.value.startX;
  const dayDelta = Math.round(deltaX / DAY_WIDTH_PX);
  if (dayDelta !== 0) {
    dragState.value.moved = true;
  }

  const originalStart = toDate(dragState.value.originStart);
  const originalEnd = toDate(dragState.value.originEnd);

  if (dragState.value.edge === "start") {
    const nextStart = addDays(originalStart, dayDelta);
    if (nextStart <= originalEnd) {
      target.plannedStartAt = formatDate(nextStart);
    }
    return;
  }

  const nextEnd = addDays(originalEnd, dayDelta);
  if (nextEnd >= originalStart) {
    target.plannedEndAt = formatDate(nextEnd);
  }
};

const stopResize = () => {
  if (dragState.value?.moved) {
    suppressClickUntil.value = Date.now() + 180;
  }
  dragState.value = null;
  window.removeEventListener("mousemove", onResizeMove);
  window.removeEventListener("mouseup", stopResize);
};

onBeforeUnmount(() => {
  stopResize();
});

const getIssueById = (issueId) => issues.value.find((issue) => issue.id === issueId);

function toDate(value) {
  return new Date(`${value}T00:00:00`);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function diffDays(from, to) {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
</script>

<style scoped>
.subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

.actions {
  margin-bottom: 12px;
}

.gantt-wrapper {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow-x: auto;
  overflow-y: hidden;
  background: var(--color-page-bg);
}

.timeline-header,
.issue-row {
  display: grid;
  grid-template-columns: 260px 1fr;
}

.axis-left,
.issue-label,
.board-name {
  padding: 10px 12px;
  border-right: 1px solid var(--color-border);
}

.axis-left {
  font-weight: 700;
}

.axis-right,
.issue-track {
  display: grid;
  position: relative;
}

.axis-right {
  border-left: 1px solid var(--color-border);
}

.day-cell {
  min-height: 36px;
  border-left: 1px solid var(--color-border);
  font-size: 11px;
  color: var(--color-text-muted);
  padding: 8px 4px;
  text-align: center;
}

.board-group {
  border-top: 1px solid var(--color-border);
}

.board-name {
  background: var(--color-surface);
  font-weight: 600;
  border-bottom: 1px solid var(--color-border);
}

.issue-row {
  cursor: pointer;
}

.issue-row + .issue-row {
  border-top: 1px solid var(--color-border);
}

.issue-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.issue-track {
  min-height: 44px;
  align-items: center;
  background-image: repeating-linear-gradient(
    to right,
    transparent,
    transparent calc((100% / 14) - 1px),
    color-mix(in srgb, var(--color-border) 80%, transparent 20%) calc((100% / 14) - 1px),
    color-mix(in srgb, var(--color-border) 80%, transparent 20%) calc(100% / 14)
  );
}

.issue-bar {
  position: absolute;
  height: 30px;
  top: 50%;
  transform: translateY(-50%);
  border-radius: 6px;
  background: var(--color-primary);
  color: var(--color-text-inverse);
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  overflow: hidden;
  cursor: pointer;
  user-select: none;
}

.resize-handle {
  position: absolute;
  top: 0;
  width: 8px;
  height: 100%;
  border: 0;
  background: color-mix(in srgb, var(--color-text-inverse) 65%, transparent 35%);
  cursor: ew-resize;
  padding: 0;
}

.resize-handle.start {
  left: 0;
}

.resize-handle.end {
  right: 0;
}

.bar-main {
  font-size: 12px;
  font-weight: 600;
}

.bar-hover {
  display: none;
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 220px;
  background: var(--color-page-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px;
  z-index: 3;
}

.issue-bar:hover .bar-hover {
  display: block;
}

.bar-hover p {
  margin: 0;
  font-size: 12px;
}

.bar-resize-actions {
  display: none;
  gap: 4px;
  margin-left: 8px;
}

.issue-bar:hover .bar-resize-actions {
  display: inline-flex;
}

.btn-mini {
  border: 1px solid color-mix(in srgb, var(--color-text-inverse) 45%, transparent 55%);
  background: transparent;
  color: var(--color-text-inverse);
  border-radius: 4px;
  font-size: 11px;
  height: 20px;
  padding: 0 6px;
  cursor: pointer;
}

.muted {
  color: var(--color-text-muted);
  font-size: 12px;
}

.modal-grid p {
  margin: 0;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.btn-danger {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.assign-section h3 {
  margin: 0 0 8px;
  font-size: 14px;
}

.assign-form {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  margin-bottom: 10px;
}

.assign-form select {
  min-height: 34px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-page-bg);
  color: var(--color-text);
}

.member-list {
  margin: 0;
  padding-left: 18px;
}

.member-list li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
}

.link-btn {
  border: 0;
  background: transparent;
  color: var(--color-primary);
  cursor: pointer;
}
</style>
