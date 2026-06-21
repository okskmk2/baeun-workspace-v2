<template>
  <div class="WikiFileTreeNode">
    <!-- 폴더 행 -->
    <button
      v-if="node.type === 'folder'"
      type="button"
      class="tree-item tree-item--folder"
      :class="{ 'is-current': currentFolderPath.length > 0 && currentFolderPath.at(-1).id === node.id }"
      @click="$emit('navigate', node.id)"
    >
      <MaterialSymbol
        :name="expandedIds.has(node.id) ? 'folder_open' : 'folder'"
        :size="15"
        alt=""
        class="tree-icon"
      />
      <span class="tree-item__name">{{ node.name }}</span>
      <MaterialSymbol
        :name="expandedIds.has(node.id) ? 'keyboard_arrow_down' : 'keyboard_arrow_right'"
        :size="14"
        alt=""
        class="tree-chevron"
      />
    </button>
    <!-- 하위 항목 (펼침 시) -->
    <div v-if="node.type === 'folder' && expandedIds.has(node.id)" class="tree-children">
      <WikiFileTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :expanded-ids="expandedIds"
        :current-folder-path="currentFolderPath"
        :selected-file-id="selectedFileId"
        @navigate="$emit('navigate', $event)"
        @select-file="$emit('select-file', $event)"
      />
    </div>
    <!-- 파일 행 -->
    <button
      v-if="node.type === 'file'"
      type="button"
      class="tree-item tree-item--file"
      :class="{ 'is-active': selectedFileId === node.id }"
      @click="$emit('select-file', node)"
    >
      <MaterialSymbol :name="fileIcon(node.ext)" :size="15" alt="" class="tree-icon" />
      <span class="tree-item__name">{{ node.name }}</span>
    </button>
  </div>
</template>

<script>
export default { name: 'WikiFileTreeNode' };
</script>

<script setup>
import MaterialSymbol from './MaterialSymbol.vue';

defineProps({
  node: { type: Object, required: true },
  expandedIds: { type: Object, required: true }, // reactive Set
  currentFolderPath: { type: Array, default: () => [] },
  selectedFileId: { type: String, default: null },
});

defineEmits(['navigate', 'select-file']);

const fileIcon = (ext) => {
  const map = {
    pdf: 'picture_as_pdf',
    png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image',
    doc: 'description', docx: 'description',
    xls: 'table_chart', xlsx: 'table_chart',
    mp4: 'movie', mov: 'movie',
    zip: 'folder_zip',
  };
  return map[ext?.toLowerCase()] ?? 'insert_drive_file';
};
</script>

<style scoped>
.WikiFileTreeNode {
  display: flex;
  flex-direction: column;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 5px 6px;
  border-radius: 4px;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  color: var(--color-text);
  font-size: var(--font-size-label);
  line-height: 1.3;
}

.tree-item:hover {
  background-color: var(--color-surface-alt);
}

.tree-item__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-icon {
  flex-shrink: 0;
  color: var(--color-text-muted);
}

.tree-chevron {
  flex-shrink: 0;
  opacity: 0.5;
  margin-left: auto;
}

.tree-children {
  padding-left: 14px;
}

.tree-item--folder.is-current {
  background-color: var(--color-accent-soft);
  color: var(--color-accent);
}

.tree-item--folder.is-current .tree-icon {
  color: var(--color-accent);
}

.tree-item--file.is-active {
  background-color: var(--color-accent-soft);
  color: var(--color-accent);
}

.tree-item--file.is-active .tree-icon {
  color: var(--color-accent);
}
</style>
