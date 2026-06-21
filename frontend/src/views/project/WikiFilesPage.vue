<template>
  <div class="WikiFilesPage">
    <!-- 툴바 -->
    <div class="files-toolbar">
      <div class="files-breadcrumb">
        <button
          v-if="breadcrumb.length > 0"
          type="button"
          class="btn btn--icon breadcrumb-back"
          title="뒤로"
          @click="$emit('back')"
        >
          <MaterialSymbol name="arrow_back" :size="18" alt="뒤로" />
        </button>
        <nav class="breadcrumb-path" aria-label="현재 위치">
          <button type="button" class="breadcrumb-item" @click="$emit('home')">루트</button>
          <template v-for="(crumb, i) in breadcrumb" :key="crumb.id">
            <span class="breadcrumb-sep" aria-hidden="true">/</span>
            <button
              type="button"
              class="breadcrumb-item"
              :class="{ 'is-current': i === breadcrumb.length - 1 }"
              @click="$emit('jump', i)"
            >{{ crumb.name }}</button>
          </template>
        </nav>
      </div>
      <div class="files-actions">
        <button type="button" class="btn files-action-btn" disabled>
          <MaterialSymbol name="download" :size="16" alt="" />
          다운로드
        </button>
        <button type="button" class="btn files-action-btn" disabled>
          <MaterialSymbol name="upload" :size="16" alt="" />
          업로드
        </button>
        <button type="button" class="btn files-action-btn files-action-btn--ghost" disabled>
          <MaterialSymbol name="create_new_folder" :size="16" alt="" />
          폴더
        </button>
      </div>
    </div>

    <!-- 파일 목록 테이블 -->
    <div class="files-list-wrap">
      <table class="files-list">
        <thead>
          <tr>
            <th class="col-name">이름</th>
            <th class="col-type">종류</th>
            <th class="col-size">크기</th>
            <th class="col-date">수정일</th>
            <th class="col-actions"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="sortedItems.length === 0">
            <td colspan="5" class="empty-state">이 폴더는 비어 있습니다</td>
          </tr>
          <tr
            v-for="item in sortedItems"
            :key="item.id"
            class="file-row"
            :class="{
              'file-row--folder': item.type === 'folder',
            }"
            @click="onRowClick(item)"
          >
            <td class="col-name">
              <div class="file-name-cell">
                <MaterialSymbol
                  :name="item.type === 'folder' ? 'folder' : fileIcon(item.ext)"
                  :size="18"
                  alt=""
                  class="file-icon"
                  :class="iconColorClass(item)"
                />
                <span class="file-name">{{ item.name }}</span>
                <MaterialSymbol
                  v-if="item.type === 'folder'"
                  name="chevron_right"
                  :size="16"
                  alt=""
                  class="folder-arrow"
                />
              </div>
            </td>
            <td class="col-type">{{ item.type === 'folder' ? '폴더' : fileTypeName(item.ext) }}</td>
            <td class="col-size">{{ item.size || '—' }}</td>
            <td class="col-date">{{ item.updatedAt || '—' }}</td>
            <td class="col-actions">
              <button
                v-if="item.type === 'file'"
                type="button"
                class="row-download-btn"
                title="다운로드"
                @click.stop
              >
                <MaterialSymbol name="download" :size="16" alt="다운로드" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>


  </div>
</template>

<script setup>
import { computed } from 'vue';
import MaterialSymbol from '../../components/MaterialSymbol.vue';

const props = defineProps({
  items: { type: Array, default: () => [] },
  breadcrumb: { type: Array, default: () => [] },
});

const emit = defineEmits(['back', 'home', 'enter', 'jump']);

const sortedItems = computed(() => {
  const folders = props.items.filter(i => i.type === 'folder');
  const files = props.items.filter(i => i.type === 'file');
  return [...folders, ...files];
});

const onRowClick = (item) => {
  if (item.type === 'folder') {
    emit('enter', item.id);
  }
};

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

const iconColorClass = (item) => {
  if (item.type === 'folder') return 'icon--folder';
  const ext = item.ext?.toLowerCase();
  const map = {
    pdf: 'icon--pdf',
    png: 'icon--image', jpg: 'icon--image', jpeg: 'icon--image', gif: 'icon--image', webp: 'icon--image',
    doc: 'icon--doc', docx: 'icon--doc',
    xls: 'icon--sheet', xlsx: 'icon--sheet',
    mp4: 'icon--video', mov: 'icon--video',
  };
  return map[ext] ?? 'icon--default';
};

const fileTypeName = (ext) => {
  const map = {
    pdf: 'PDF',
    png: 'PNG 이미지', jpg: 'JPEG 이미지', jpeg: 'JPEG 이미지', gif: 'GIF 이미지', webp: 'WebP 이미지',
    doc: 'Word 문서', docx: 'Word 문서',
    xls: 'Excel', xlsx: 'Excel',
    mp4: 'MP4 동영상', mov: '동영상',
    zip: 'ZIP 압축',
  };
  return map[ext?.toLowerCase()] ?? (ext?.toUpperCase() || '파일');
};
</script>

<style scoped>
.WikiFilesPage {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: var(--color-text);
}

/* ── 툴바 ── */
.files-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 2rem 0.75rem;
  flex-shrink: 0;
  border-bottom: 1px solid var(--color-border);
}

.files-breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.breadcrumb-path {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: nowrap;
  font-size: var(--font-size-label);
  overflow: hidden;
}

.breadcrumb-item {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
  padding: 3px 5px;
  border-radius: 4px;
  font-size: var(--font-size-label);
  white-space: nowrap;
}

.breadcrumb-item:hover {
  color: var(--color-text);
  background-color: var(--color-surface-alt);
}

.breadcrumb-item.is-current {
  color: var(--color-text);
  font-weight: 600;
  cursor: default;
  pointer-events: none;
}

.breadcrumb-sep {
  color: var(--color-text-muted);
  user-select: none;
  font-size: var(--font-size-label);
}

.breadcrumb-back {
  flex-shrink: 0;
  color: var(--color-text-muted);
}

.files-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.files-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  font-size: var(--font-size-label);
  opacity: 0.5;
  cursor: not-allowed;
}

.files-action-btn--ghost {
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

/* ── 파일 목록 ── */
.files-list-wrap {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.files-list {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-label);
}

.files-list thead th {
  position: sticky;
  top: 0;
  padding: 10px 16px;
  text-align: left;
  color: var(--color-text-muted);
  font-size: var(--font-size-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background-color: var(--color-page-bg);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.files-list tbody td {
  padding: 9px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
  vertical-align: middle;
}

.file-row {
  cursor: pointer;
  transition: background-color 0.1s;
}

.file-row:hover {
  background-color: var(--color-surface-alt);
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-icon {
  flex-shrink: 0;
}

.icon--folder { color: #d97706; }
.icon--pdf    { color: #dc2626; }
.icon--image  { color: #2563eb; }
.icon--doc    { color: #1d4ed8; }
.icon--sheet  { color: #15803d; }
.icon--video  { color: #7c3aed; }
.icon--default { color: var(--color-text-muted); }

.file-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--font-size-label);
}

.file-row--folder .file-name {
  font-weight: 500;
}

.folder-arrow {
  flex-shrink: 0;
  color: var(--color-text-muted);
  opacity: 0;
  transition: opacity 0.1s;
}

.file-row--folder:hover .folder-arrow {
  opacity: 1;
}

.col-name  { width: 100%; }
.col-type  { white-space: nowrap; color: var(--color-text-muted); min-width: 100px; }
.col-size  { white-space: nowrap; color: var(--color-text-muted); min-width: 80px; }
.col-date  { white-space: nowrap; color: var(--color-text-muted); min-width: 100px; }
.col-actions { width: 36px; padding-right: 12px; }

.row-download-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: none;
  cursor: pointer;
  color: var(--color-text-muted);
  transition: background-color 0.1s;
}

.row-download-btn:hover {
  background-color: var(--color-border);
  color: var(--color-text);
}

.empty-state {
  text-align: center;
  color: var(--color-text-muted);
  padding: 64px 0;
  font-size: var(--font-size-body);
}


</style>
