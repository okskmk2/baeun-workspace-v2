<template>
  <div class="WikiFilesPage">
    <header class="page-header">
      <hgroup class="page-heading">
        <h1 class="page-title">파일</h1>
        <div class="files-breadcrumb">
          <nav class="breadcrumb-path" aria-label="현재 위치">
            <button type="button" class="breadcrumb-item" @click="goHome">/</button>
            <template v-for="(crumb, i) in currentFolderPath" :key="crumb.id">
              <span v-if="i > 0" class="breadcrumb-sep" aria-hidden="true">/</span>
              <button
                type="button"
                class="breadcrumb-item"
                :class="{ 'is-current': i === currentFolderPath.length - 1 }"
                @click="jumpTo(i)"
              >
                {{ crumb.name }}
              </button>
            </template>
          </nav>
        </div>
      </hgroup>
      <div class="actions">
        <button type="button" class="btn files-action-btn" disabled>
          <MaterialSymbol name="download" :size="16" alt="" />
          다운로드
        </button>
        <button type="button" class="btn files-action-btn" :disabled="isUploading" @click="openUploadPicker">
          <MaterialSymbol name="upload" :size="16" alt="" />
          {{ isUploading ? "업로드 중..." : "업로드" }}
        </button>
        <button
          type="button"
          class="btn files-action-btn files-action-btn--ghost"
          :disabled="isCreatingFolder"
          @click="createFolder"
        >
          <MaterialSymbol name="create_new_folder" :size="16" alt="" />
          {{ isCreatingFolder ? "생성 중..." : "폴더" }}
        </button>
      </div>
    </header>

    <input
      ref="uploadInputRef"
      type="file"
      class="upload-input"
      @change="onPickUpload"
    />

    <CreateFolderModal
      :open="isFolderModalOpen"
      @close="closeFolderModal"
      @confirm="confirmCreateFolder"
    />

    <!-- 파일 목록 테이블 -->
    <div class="files-list-wrap">
      <div v-if="isLoadingItems" class="files-status">파일 목록을 불러오는 중입니다.</div>
      <div v-else-if="itemsErrorMessage" class="files-status">{{ itemsErrorMessage }}</div>
      <table v-else class="files-list">
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
              </div>
            </td>
            <td class="col-type">{{ item.type === "folder" ? "폴더" : fileTypeName(item.ext) }}</td>
            <td class="col-size">{{ item.size || "—" }}</td>
            <td class="col-date">{{ item.updatedAt || "—" }}</td>
            <td class="col-actions">
              <button
                v-if="item.type === 'file'"
                type="button"
                class="row-download-btn"
                title="다운로드"
                @click.stop="downloadFile(item)"
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
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import CreateFolderModal from "../../components/modals/CreateFolderModal.vue";
import MaterialSymbol from "../../components/MaterialSymbol.vue";
import api from "../../lib/axios";
import { addToast } from "../../lib/toast";

const route = useRoute();
const router = useRouter();
const projectId = computed(() => route.params.projectId);
const uploadInputRef = ref(null);
const isUploading = ref(false);
const isCreatingFolder = ref(false);
const isFolderModalOpen = ref(false);
const isLoadingItems = ref(false);
const itemsErrorMessage = ref("");
const rawItems = ref([]);

const parsePathSegments = (value) => {
  if (typeof value !== "string" || !value.trim()) return [];

  return value
    .split("/")
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    })
    .map((part) => part.trim())
    .filter(Boolean);
};

const currentFolderPath = computed(() => {
  const parts = parsePathSegments(route.query.path);
  return parts.map((name) => ({ id: name, name }));
});

const currentStoragePath = computed(() => currentFolderPath.value.map((crumb) => crumb.name).join("/"));

const items = computed(() => {
  return rawItems.value;
});

const sortedItems = computed(() => {
  const folders = items.value.filter((i) => i.type === "folder");
  const files = items.value.filter((i) => i.type === "file");
  const next = [...folders, ...files];

  if (currentFolderPath.value.length > 0) {
    next.unshift({
      id: "__parent__",
      name: "..",
      type: "folder",
      isParentLink: true,
    });
  }

  return next;
});

const toDisplayDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
};

const fetchItems = async () => {
  if (!projectId.value) {
    rawItems.value = [];
    return;
  }

  isLoadingItems.value = true;
  itemsErrorMessage.value = "";

  try {
    const res = await api.get("/files/list", {
      params: {
        project_id: projectId.value,
        path: currentStoragePath.value,
      },
    });

    rawItems.value = Array.isArray(res.data?.data?.items)
      ? res.data.data.items.map((item) => {
          const name = String(item?.name || "");
          const ext = name.includes(".") ? name.split(".").pop() : "";

          return {
            id: item?.id || name,
            name,
            type: item?.type === "folder" ? "folder" : "file",
            ext,
            size: item?.size || null,
            updatedAt: toDisplayDate(item?.updated_at),
            objectPath: item?.object_path || null,
          };
        })
      : [];
  } catch (error) {
    rawItems.value = [];
    itemsErrorMessage.value = "파일 목록을 불러오지 못했습니다.";
  } finally {
    isLoadingItems.value = false;
  }
};

const pushPath = (names) => {
  const encoded = names.map((name) => encodeURIComponent(String(name)));
  const query = { ...route.query };

  if (encoded.length > 0) {
    query.path = encoded.join("/");
  } else {
    delete query.path;
  }

  router.push({
    path: route.path,
    query,
  });
};

const onRowClick = (item) => {
  if (item.isParentLink) {
    goBack();
    return;
  }

  if (item.type === "folder") {
    enterFolder(item.id);
  }
};

const enterFolder = (folderId) => {
  const folder = items.value.find(
    (item) => item.type === "folder" && String(item.id) === String(folderId)
  );
  if (!folder) return;

  pushPath([...currentFolderPath.value.map((crumb) => crumb.name), folder.name]);
};

const goBack = () => {
  pushPath(currentFolderPath.value.slice(0, -1).map((crumb) => crumb.name));
};

const goHome = () => {
  pushPath([]);
};

const jumpTo = (index) => {
  pushPath(currentFolderPath.value.slice(0, index + 1).map((crumb) => crumb.name));
};

const openUploadPicker = () => {
  if (!uploadInputRef.value) return;
  uploadInputRef.value.value = "";
  uploadInputRef.value.click();
};

const createFolder = () => {
  if (!projectId.value || isCreatingFolder.value) return;
  isFolderModalOpen.value = true;
};

const closeFolderModal = () => {
  isFolderModalOpen.value = false;
};

const confirmCreateFolder = async (folderName) => {
  isFolderModalOpen.value = false;
  isCreatingFolder.value = true;

  try {
    await api.post("/files/folders", {
      project_id: projectId.value,
      path: currentStoragePath.value,
      folder_name: folderName,
    });

    addToast({
      message: "폴더가 생성되었습니다.",
      type: "success",
    });

    await fetchItems();
  } catch (error) {
    const message =
      error?.response?.status === 409
        ? "이미 동일한 폴더가 존재합니다."
        : "폴더 생성에 실패했습니다.";

    addToast({
      message,
      type: "error",
    });
  } finally {
    isCreatingFolder.value = false;
  }
};

const onPickUpload = async (event) => {
  const file = event?.target?.files?.[0];
  if (!file || !projectId.value) return;

  isUploading.value = true;

  try {
    const uploadRes = await api.post("/files/upload-url", {
      project_id: projectId.value,
      path: currentStoragePath.value,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
    });

    const uploadUrl = uploadRes.data?.data?.upload_url;
    const mode = String(uploadRes.data?.data?.mode || "signed");

    if (mode === "proxy") {
      const formData = new FormData();
      formData.append("project_id", String(projectId.value));
      formData.append("path", currentStoragePath.value);
      formData.append("file_name", file.name);
      formData.append("file", file);
      await api.post("/files/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    } else {
      if (!uploadUrl) {
        throw new Error("UPLOAD_URL_MISSING");
      }

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!putRes.ok) {
        throw new Error("UPLOAD_FAILED");
      }
    }

    addToast({
      message: "파일 업로드가 완료되었습니다.",
      type: "success",
    });

    await fetchItems();
  } catch (error) {
    addToast({
      message: "파일 업로드에 실패했습니다.",
      type: "error",
    });
  } finally {
    isUploading.value = false;
  }
};

const downloadFile = async (item) => {
  if (!item?.objectPath || !projectId.value) return;

  try {
    const res = await api.get("/files/download-url", {
      params: {
        project_id: projectId.value,
        object_path: item.objectPath,
      },
    });

    const downloadUrl = res.data?.data?.download_url;
    if (!downloadUrl) {
      throw new Error("DOWNLOAD_URL_MISSING");
    }

    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  } catch (error) {
    addToast({
      message: "파일 다운로드에 실패했습니다.",
      type: "error",
    });
  }
};

const fileIcon = (ext) => {
  const map = {
    pdf: "picture_as_pdf",
    png: "image",
    jpg: "image",
    jpeg: "image",
    gif: "image",
    webp: "image",
    doc: "description",
    docx: "description",
    xls: "table_chart",
    xlsx: "table_chart",
    mp4: "movie",
    mov: "movie",
    md: "article",
    json: "data_object",
    zip: "folder_zip",
  };
  return map[ext?.toLowerCase()] ?? "insert_drive_file";
};

const iconColorClass = (item) => {
  if (item.type === "folder") return "icon--folder";
  const ext = item.ext?.toLowerCase();
  const map = {
    pdf: "icon--pdf",
    png: "icon--image",
    jpg: "icon--image",
    jpeg: "icon--image",
    gif: "icon--image",
    webp: "icon--image",
    doc: "icon--doc",
    docx: "icon--doc",
    xls: "icon--sheet",
    xlsx: "icon--sheet",
    mp4: "icon--video",
    md: "icon--doc",
    json: "icon--sheet",
    mov: "icon--video",
  };
  return map[ext] ?? "icon--default";
};

const fileTypeName = (ext) => {
  const map = {
    pdf: "PDF",
    png: "PNG 이미지",
    jpg: "JPEG 이미지",
    jpeg: "JPEG 이미지",
    gif: "GIF 이미지",
    webp: "WebP 이미지",
    doc: "Word 문서",
    docx: "Word 문서",
    xls: "Excel",
    xlsx: "Excel",
    mp4: "MP4 동영상",
    md: "Markdown",
    json: "JSON",
    mov: "동영상",
    zip: "ZIP 압축",
  };
  return map[ext?.toLowerCase()] ?? (ext?.toUpperCase() || "파일");
};

onMounted(fetchItems);
watch([projectId, currentStoragePath], fetchItems);
</script>

<style scoped>
.WikiFilesPage {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: var(--color-text);
}

/* ── 헤더 ── */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 0 1rem;
  flex-shrink: 0;
  border-bottom: 1px solid var(--color-border);
}

.page-heading {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.page-title {
  margin: 0;
}

.actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.files-breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: var(--color-text-muted);
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

.files-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  font-size: var(--font-size-label);
}

.files-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.files-action-btn--ghost {
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.upload-input {
  display: none;
}

/* ── 파일 목록 ── */
.files-list-wrap {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.files-status {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  color: var(--color-text-muted);
  font-size: var(--font-size-body);
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

.files-list thead .col-name,
.files-list tbody .col-name {
  padding-left: 8px;
}

.file-row {
  cursor: pointer;
  transition: background-color 0.1s;
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-icon {
  flex-shrink: 0;
}

.icon--folder {
  color: #d97706;
}
.icon--pdf {
  color: #dc2626;
}
.icon--image {
  color: #2563eb;
}
.icon--doc {
  color: #1d4ed8;
}
.icon--sheet {
  color: #15803d;
}
.icon--video {
  color: #7c3aed;
}
.icon--default {
  color: var(--color-text-muted);
}

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

.col-name {
  width: 100%;
}
.col-type {
  white-space: nowrap;
  color: var(--color-text-muted);
  min-width: 100px;
}
.col-size {
  white-space: nowrap;
  color: var(--color-text-muted);
  min-width: 80px;
}
.col-date {
  white-space: nowrap;
  color: var(--color-text-muted);
  min-width: 100px;
}
.col-actions {
  width: 36px;
  padding-right: 12px;
}

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
