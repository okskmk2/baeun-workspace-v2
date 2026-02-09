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

const sharedDragId = ref("");
const sharedParentId = ref(null);

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  level: { type: Number, default: 0 },
  projectId: { type: [String, Number], required: true },
  workspaceId: { type: [String, Number], required: true },
  parentId: { type: [String, Number, null], default: null },
});

const emit = defineEmits(["reorder"]);

const dragId = sharedDragId;
const dropTargetId = ref("");
const dropPosition = ref("before");

// Only allow reorders within the same parent.
const isTargetValid = computed(() => {
  return String(sharedParentId.value) === String(props.parentId);
});

const onDragStart = (id, event) => {
  sharedDragId.value = String(id);
  sharedParentId.value = props.parentId;

  event.dataTransfer.effectAllowed = "move";
  // Persist ids for cross-level instances.
  event.dataTransfer.setData("drag-id", String(id));
  event.dataTransfer.setData("parent-id", String(props.parentId));
};

const onDragEnd = () => {
  sharedDragId.value = "";
  dropTargetId.value = "";
  sharedParentId.value = null;
};

const onDragOverItem = (targetId, event) => {
  // Ignore self.
  if (String(targetId) === sharedDragId.value) return;

  // Only show drop indicator when parent ids match.
  if (!isTargetValid.value) {
    dropTargetId.value = "";
    return;
  }

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
  user-select: none;
}

.page-list--nested {
  border-left: 1px solid #e5e7eb;
}

.page-item {
  position: relative;
  padding: 4px 0;
  cursor: grab;
  user-select: none;
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

/* Drop indicator line */
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
