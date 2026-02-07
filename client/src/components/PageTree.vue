<template>
  <ul
    :class="['page-list', level > 0 ? 'page-list--nested' : '']"
    @dragover.prevent
    @drop.stop="onDropList"
  >
    <li
      v-for="node in nodes"
      :key="node.id"
      class="page-item"
      :class="{
        'is-dragging': dragId === String(node.id),
        'drop-before':
          isTargetValid && dropTargetId === String(node.id) && dropPosition === 'before',
        'drop-after': isTargetValid && dropTargetId === String(node.id) && dropPosition === 'after',
      }"
      draggable="true"
      @dragstart="onDragStart(node.id, $event)"
      @dragend="onDragEnd"
      @dragover.prevent="onDragOverItem(node.id, $event)"
      @dragleave="onDragLeave"
      @drop.stop="onDropItem(node.id, $event)"
    >
      <RouterLink
        class="page-link"
        :to="`/workspace/${workspaceId}/project/${projectId}/wiki/${node.id}`"
      >
        {{ node.title }}
      </RouterLink>

      <PageTree
        v-if="node.children && node.children.length"
        :nodes="node.children"
        :project-id="projectId"
        :workspace-id="workspaceId"
        :parent-id="node.id"
        :level="level + 1"
        @reorder="emitReorder"
      />
    </li>
  </ul>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  level: { type: Number, default: 0 },
  projectId: { type: [String, Number], required: true },
  workspaceId: { type: [String, Number], required: true },
  parentId: { type: [String, Number, null], default: null },
});

const emit = defineEmits(["reorder"]);

const dragId = ref("");
const dropTargetId = ref("");
const dropPosition = ref("before");
const draggingParentId = ref(null); // 드래그 시작 시점의 부모 ID 저장

// 현재 타겟이 드래그 중인 요소와 같은 부모를 가졌는지 확인
const isTargetValid = computed(() => {
  return String(draggingParentId.value) === String(props.parentId);
});

const onDragStart = (id, event) => {
  dragId.value = String(id);
  draggingParentId.value = props.parentId; // 현재 레벨의 parentId 저장

  event.dataTransfer.effectAllowed = "move";
  // 다른 컴포넌트 인스턴스(다른 레벨)에서도 알 수 있도록 데이터 저장
  event.dataTransfer.setData("drag-id", String(id));
  event.dataTransfer.setData("parent-id", String(props.parentId));
};

const onDragEnd = () => {
  dragId.value = "";
  dropTargetId.value = "";
  draggingParentId.value = null;
};

const onDragOverItem = (targetId, event) => {
  // 1. 자기 자신 제외
  if (String(targetId) === dragId.value) return;

  // 2. DataTransfer에서 부모 ID 가져오기 (HTML5 표준 방식 보완)
  // dragover에서는 보안상 getData를 쓸 수 없으므로, 내부 ref(draggingParentId)를 활용하거나
  // 전역 상태 관리(Pinia 등)를 쓰는 것이 좋지만,
  // 같은 컴포넌트 재귀 구조에서는 '공유된 상태'가 아니므로 로직 처리가 필요합니다.

  // 가이드라인을 그릴지 결정 (현재 컴포넌트의 parentId와 드래그 시작 parentId 비교)
  // *주의: 이 로직이 작동하려면 드래그 시작 시 전역 변수나 싱글톤을 활용하는 것이 가장 확실합니다.
  if (!isTargetValid.value) return;

  const rect = event.currentTarget.getBoundingClientRect();
  const offset = event.clientY - rect.top;
  dropPosition.value = offset > rect.height / 2 ? "after" : "before";
  dropTargetId.value = String(targetId);
};

const onDragLeave = (event) => {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    dropTargetId.value = "";
  }
};

const onDropItem = (targetId, event) => {
  if (!isTargetValid.value) return;

  const orderedIds = reorderIds(dragId.value, targetId, dropPosition.value);
  if (orderedIds) {
    emit("reorder", { parentId: props.parentId, orderedIds });
  }

  onDragEnd();
};

const onDropList = (event) => {
  if (!isTargetValid.value) return;

  const ids = props.nodes.map((node) => String(node.id));
  const fromIndex = ids.indexOf(dragId.value);
  if (fromIndex !== -1) {
    const newIds = [...ids];
    const [movedItem] = newIds.splice(fromIndex, 1);
    newIds.push(movedItem);
    emit("reorder", { parentId: props.parentId, orderedIds: newIds });
  }
  onDragEnd();
};

const reorderIds = (fromId, toId, position) => {
  const ids = props.nodes.map((node) => String(node.id));
  const fromIndex = ids.indexOf(String(fromId));
  const toIndex = ids.indexOf(String(toId));

  if (fromIndex === -1 || toIndex === -1) return null;

  const newIds = [...ids];
  const [movedItem] = newIds.splice(fromIndex, 1);
  const adjustedToIndex = newIds.indexOf(String(toId));
  const insertIndex = position === "after" ? adjustedToIndex + 1 : adjustedToIndex;

  newIds.splice(insertIndex, 0, movedItem);
  return newIds;
};

const emitReorder = (payload) => emit("reorder", payload);
</script>

<style scoped>
.page-list {
  list-style: none;
  padding-left: 1rem;
  margin: 0;
}

.page-list--nested {
  border-left: 1px solid #e5e7eb;
}

.page-item {
  position: relative;
  padding: 4px 0;
  cursor: grab;
}

.page-item:active {
  cursor: grabbing;
}

.page-link {
  display: block;
  padding: 4px 8px;
  text-decoration: none;
  color: #374151;
  border-radius: 4px;
}

.page-link:hover {
  background-color: #f3f4f6;
}

/* 드롭 위치 시각화 */
.page-item.drop-before::before,
.page-item.drop-after::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: #3b82f6;
  z-index: 10;
}

.page-item.drop-before::before {
  top: 0;
}

.page-item.drop-after::after {
  bottom: 0;
}

.dragging {
  opacity: 0.5;
}
</style>
