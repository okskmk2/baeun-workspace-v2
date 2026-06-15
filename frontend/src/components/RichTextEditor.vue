<template>
  <div class="rte-wrap">
    <div class="rte-toolbar">
      <button
        v-for="button in commandButtons"
        :key="button.cmd"
        type="button"
        class="tb-btn"
        :class="{ active: activeCommands[button.cmd] }"
        :title="button.label"
        :aria-label="button.label"
        :data-cmd="button.cmd"
        @mousedown.prevent="onToolbarButtonMouseDown"
        @click="runCommand(button.cmd)"
      >
        <MaterialSymbol :name="button.icon" :size="16" alt="" />
      </button>

      <div class="tb-sep"></div>

      <select
        class="tb-select"
        :value="heading"
        :title="texts.heading"
        :aria-label="texts.heading"
        @mousedown="saveSelection"
        @change="onHeadingChange"
      >
        <option value="">{{ texts.paragraph }}</option>
        <option value="H1">{{ texts.heading1 }}</option>
        <option value="H2">{{ texts.heading2 }}</option>
        <option value="H3">{{ texts.heading3 }}</option>
        <option value="H4">{{ texts.heading4 }}</option>
        <option value="H5">{{ texts.heading5 }}</option>
        <option value="H6">{{ texts.heading6 }}</option>
      </select>

      <div class="tb-sep"></div>

      <div class="color-btn-wrap" ref="fgWrapRef">
        <button
          type="button"
          class="tb-btn"
          :title="texts.textColor"
          :aria-label="texts.textColor"
          @mousedown.prevent="onToolbarButtonMouseDown"
          @click.stop="togglePopup('fg')"
        >
          <MaterialSymbol name="format_color_text" :size="16" alt="" />
          <span class="color-indicator" :style="{ background: fgColor }"></span>
        </button>
        <div class="color-picker-popup" :class="{ open: openPopup === 'fg' }">
          <div class="color-grid">
            <button
              v-for="color in textColors"
              :key="`fg-${color}`"
              type="button"
              class="color-swatch"
              :title="color"
              :style="{ background: color }"
              @mousedown.prevent="applyTextColor(color)"
            ></button>
          </div>
          <div class="color-custom-row">
            <label>{{ texts.customColor }}</label>
            <input type="color" :value="fgColor" @input="onCustomTextColor" />
          </div>
        </div>
      </div>

      <div class="color-btn-wrap" ref="bgWrapRef">
        <button
          type="button"
          class="tb-btn"
          :title="texts.highlightColor"
          :aria-label="texts.highlightColor"
          @mousedown.prevent="onToolbarButtonMouseDown"
          @click.stop="togglePopup('bg')"
        >
          <MaterialSymbol name="ink_highlighter" :size="16" alt="" />
          <span class="color-indicator" :style="{ background: bgIndicatorColor }"></span>
        </button>
        <div class="color-picker-popup" :class="{ open: openPopup === 'bg' }">
          <div class="color-grid">
            <button
              v-for="color in highlightColors"
              :key="`bg-${color}`"
              type="button"
              class="color-swatch"
              :title="color"
              :style="colorSwatchStyle(color)"
              @mousedown.prevent="applyHighlightColor(color)"
            ></button>
          </div>
          <div class="color-custom-row">
            <label>{{ texts.customColor }}</label>
            <input type="color" :value="bgCustomValue" @input="onCustomHighlightColor" />
          </div>
        </div>
      </div>

      <div class="tb-sep"></div>

      <button
        type="button"
        class="tb-btn"
        :title="texts.insertLink"
        :aria-label="texts.insertLink"
        @mousedown.prevent="onToolbarButtonMouseDown"
        @click="openLinkModal"
      >
        <MaterialSymbol name="link" :size="16" alt="" />
      </button>

      <div class="tb-sep"></div>

      <button
        type="button"
        class="tb-btn"
        :title="texts.insertTable"
        :aria-label="texts.insertTable"
        @mousedown.prevent="onToolbarButtonMouseDown"
        @click="openTableModal"
      >
        <MaterialSymbol name="table" :size="16" alt="" />
      </button>
      <button
        type="button"
        class="tb-btn"
        :title="texts.quote"
        :aria-label="texts.quote"
        @mousedown.prevent="onToolbarButtonMouseDown"
        @click="formatAsQuote"
      >
        <MaterialSymbol name="format_quote" :size="16" alt="" />
      </button>
    </div>

    <div
      ref="editorRef"
      class="rte-editor"
      contenteditable="true"
      spellcheck="false"
      :data-placeholder="placeholder"
      @input="onEditorInput"
      @keydown="onEditorKeydown"
      @keyup="onEditorKeyup"
      @mouseup="updateToolbarState"
      @click="onEditorClick"
      @focus="updateToolbarState"
      @paste="onEditorPaste"
    ></div>

    <div class="rte-footer">
      <span class="rte-footer-info">{{ charCount }}{{ texts.charSuffix }}</span>
      <div class="rte-btn-group">
        <button type="button" class="rte-action-btn" @click="clearEditor">{{ texts.clear }}</button>
        <button type="button" class="rte-action-btn primary" @click="openOutputPanel">{{ texts.exportHtml }}</button>
      </div>
    </div>

    <div class="modal-overlay" :class="{ open: linkModalOpen }">
      <div ref="linkModalBoxRef" class="modal-box" role="dialog" aria-modal="true" aria-labelledby="rte-link-modal-title">
        <p id="rte-link-modal-title" class="modal-title">{{ editingLinkEl ? texts.editLink : texts.insertLink }}</p>
        <input v-model="linkText" class="modal-input" :placeholder="texts.linkTextPlaceholder" />
        <input v-model="linkUrl" class="modal-input" :placeholder="texts.linkUrlPlaceholder" />
        <div class="modal-actions">
          <button type="button" class="rte-action-btn" @click="closeModals">{{ texts.cancel }}</button>
          <button type="button" class="rte-action-btn primary" @click="insertLink">{{ texts.insert }}</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" :class="{ open: tableModalOpen }" @click.self="closeModals">
      <div ref="tableModalBoxRef" class="modal-box" role="dialog" aria-modal="true" aria-labelledby="rte-table-modal-title">
        <p id="rte-table-modal-title" class="modal-title">{{ texts.insertTable }}</p>
        <div class="table-inputs">
          <div>
            <label>{{ texts.tableColumns }}</label>
            <input v-model.number="tableCols" type="number" min="1" max="10" class="modal-input" />
          </div>
          <div>
            <label>{{ texts.tableRowsBody }}</label>
            <input v-model.number="tableRows" type="number" min="1" max="20" class="modal-input" />
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="rte-action-btn" @click="closeModals">{{ texts.cancel }}</button>
          <button type="button" class="rte-action-btn primary" @click="insertTable">{{ texts.insert }}</button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="linkTooltip.visible"
        ref="linkTooltipRef"
        class="link-tooltip"
        :style="{ top: linkTooltip.y + 'px', left: linkTooltip.x + 'px' }"
      >
        <a :href="linkTooltip.url" target="_blank" rel="noopener noreferrer" class="link-tooltip-url" :title="linkTooltip.url">{{ linkTooltip.displayUrl }}</a>
        <span class="link-tooltip-divider"></span>
        <button type="button" class="link-tooltip-btn" @mousedown.prevent="editLinkFromTooltip">수정</button>
        <button type="button" class="link-tooltip-btn link-tooltip-btn-danger" @mousedown.prevent="unlinkFromTooltip">해제</button>
      </div>
    </Teleport>

    <div class="output-panel" :class="{ open: outputPanelOpen }" @click.self="outputPanelOpen = false">
      <div ref="outputBoxRef" class="output-box" role="dialog" aria-modal="true" aria-labelledby="rte-output-title">
        <div class="output-header">
          <span id="rte-output-title">{{ texts.generatedHtml }}</span>
          <div class="rte-btn-group">
            <button type="button" class="rte-action-btn" @click="copyHtml">{{ copyButtonText }}</button>
            <button type="button" class="rte-action-btn" @click="outputPanelOpen = false">{{ texts.close }}</button>
          </div>
        </div>
        <pre class="output-pre">{{ formattedOutputHtml }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import MaterialSymbol from "./MaterialSymbol.vue";

const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  placeholder: {
    type: String,
    default: "여기에 내용을 입력하세요...",
  },
  labels: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["update:modelValue", "export"]);

const editorRef = ref(null);
const fgWrapRef = ref(null);
const bgWrapRef = ref(null);
const linkModalBoxRef = ref(null);
const tableModalBoxRef = ref(null);
const outputBoxRef = ref(null);
const linkTooltipRef = ref(null);
const editingLinkEl = ref(null);

const DEFAULT_TEXTS = Object.freeze({
  bold: "굵게",
  italic: "기울기",
  strikeThrough: "취소선",
  unorderedList: "순서 없는 목록",
  orderedList: "순서 있는 목록",
  indent: "들여쓰기",
  outdent: "내어쓰기",
  heading: "헤딩",
  paragraph: "본문",
  heading1: "제목 1",
  heading2: "제목 2",
  heading3: "제목 3",
  heading4: "제목 4",
  heading5: "제목 5",
  heading6: "제목 6",
  textColor: "글씨 색상",
  highlightColor: "배경 색상",
  customColor: "직접 선택",
  insertLink: "링크 만들기",
  editLink: "링크 수정",
  insertTable: "테이블 삽입",
  quote: "인용",
  clear: "지우기",
  exportHtml: "HTML 내보내기",
  generatedHtml: "생성된 HTML",
  close: "닫기",
  cancel: "취소",
  insert: "삽입",
  copy: "복사",
  copied: "복사됨",
  copyFailed: "실패",
  charSuffix: "자",
  clearConfirm: "내용을 모두 지우시겠습니까?",
  linkTextPlaceholder: "표시할 텍스트 (선택사항)",
  linkUrlPlaceholder: "URL (예: https://example.com)",
  tableColumns: "열(컬럼)",
  tableRowsBody: "본문 행(헤더 제외)",
});

const texts = computed(() => ({ ...DEFAULT_TEXTS, ...(props.labels || {}) }));

const openPopup = ref("");
const linkTooltip = ref({ visible: false, url: "", displayUrl: "", x: 0, y: 0 });
const linkModalOpen = ref(false);
const tableModalOpen = ref(false);
const outputPanelOpen = ref(false);

const linkText = ref("");
const linkUrl = ref("https://");
const tableCols = ref(3);
const tableRows = ref(3);

const charCount = ref(0);
const heading = ref("");
const fgColor = ref("#2b2b2b");
const bgColor = ref("#ffe066");
const bgCustomValue = ref("#ffe066");
const formattedOutputHtml = ref("");
const copyButtonText = ref(DEFAULT_TEXTS.copy);
const activeCommands = ref({
  bold: false,
  italic: false,
  strikeThrough: false,
  insertUnorderedList: false,
  insertOrderedList: false,
  indent: false,
  outdent: false,
});

let savedRange = null;

const commandButtons = computed(() => [
  { cmd: "bold", label: texts.value.bold, icon: "format_bold" },
  { cmd: "italic", label: texts.value.italic, icon: "format_italic" },
  { cmd: "strikeThrough", label: texts.value.strikeThrough, icon: "strikethrough_s" },
  {
    cmd: "insertUnorderedList",
    label: texts.value.unorderedList,
    icon: "format_list_bulleted",
  },
  {
    cmd: "insertOrderedList",
    label: texts.value.orderedList,
    icon: "format_list_numbered",
  },
  { cmd: "outdent", label: texts.value.outdent, icon: "format_indent_decrease" },
  { cmd: "indent", label: texts.value.indent, icon: "format_indent_increase" },
]);

const textColors = [
  "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#ffffff",
  "#ff0000", "#ff4500", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#9900ff",
  "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e4f7", "#c9daf8", "#d9d2e9", "#ead1dc",
  "#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#9fc5e8", "#a4c2f4", "#b4a7d6", "#d5a6bd",
  "#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6fa8dc", "#8e7cc3", "#c27ba0",
  "#cc0000", "#e69138", "#f1c232", "#6aa84f", "#45818e", "#3d85c8", "#674ea7", "#a61c00",
  "#990000", "#b45f06", "#bf9000", "#38761d", "#134f5c", "#1155cc", "#351c75", "#741b47",
];

const highlightColors = [
  "transparent", "#ffe066", "#b5ead7", "#c7ceea", "#ffc8a2", "#ff9aa2", "#b5b9ff", "#e2f0cb",
  "#fffacd", "#e0f7fa", "#fce4ec", "#e8f5e9", "#fff3e0", "#f3e5f5", "#e8eaf6", "#fafafa",
];

const bgIndicatorColor = computed(() => (bgColor.value === "transparent" ? "#c9c9c9" : bgColor.value));
const activeModal = computed(() => {
  if (linkModalOpen.value) return "link";
  if (tableModalOpen.value) return "table";
  if (outputPanelOpen.value) return "output";
  return "";
});

const focusEditor = () => {
  editorRef.value?.focus();
};

const getSelectionContainer = () => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const node = selection.getRangeAt(0).commonAncestorContainer;
  return node?.nodeType === Node.TEXT_NODE ? node.parentNode : node;
};

const isInsideListItem = () => {
  const container = getSelectionContainer();
  if (!container) return false;
  return Boolean(container.closest?.("li"));
};

const runCommand = (cmd) => {
  focusEditor();
  document.execCommand(cmd, false, null);
  updateToolbarState();
  updateModel();
};

const onHeadingChange = (event) => {
  focusEditor();
  const value = event.target.value;
  document.execCommand("formatBlock", false, value || "p");
  updateToolbarState();
  updateModel();
};

const applyTextColor = (color) => {
  fgColor.value = color;
  focusEditor();
  document.execCommand("foreColor", false, color);
  updateModel();
};

const applyHighlightColor = (color) => {
  bgColor.value = color;
  if (color !== "transparent") {
    bgCustomValue.value = color;
  }
  focusEditor();
  if (color === "transparent") {
    document.execCommand("hiliteColor", false, "rgba(0,0,0,0)");
  } else {
    document.execCommand("hiliteColor", false, color);
  }
  updateModel();
};

const onCustomTextColor = (event) => {
  applyTextColor(event.target.value);
};

const onCustomHighlightColor = (event) => {
  applyHighlightColor(event.target.value);
};

const colorSwatchStyle = (color) => {
  if (color === "transparent") {
    return {
      background:
        "linear-gradient(135deg, var(--color-page-bg) 45%, #d11a2a 45%, #d11a2a 55%, var(--color-page-bg) 55%)",
    };
  }
  return { background: color };
};

const togglePopup = (type) => {
  openPopup.value = openPopup.value === type ? "" : type;
};

const closePopups = () => {
  openPopup.value = "";
};

const onToolbarButtonMouseDown = () => {
  saveSelection();
};

const saveSelection = () => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  savedRange = selection.getRangeAt(0).cloneRange();
};

const restoreSelection = () => {
  if (!savedRange) return;
  const selection = window.getSelection();
  if (!selection) return;
  selection.removeAllRanges();
  selection.addRange(savedRange);
};

const openLinkModal = () => {
  saveSelection();
  const selection = window.getSelection();
  linkText.value = selection?.toString() || "";
  linkUrl.value = "https://";
  linkModalOpen.value = true;
};

const showLinkTooltip = (anchor) => {
  const rect = anchor.getBoundingClientRect();
  const url = anchor.getAttribute("href") || anchor.href || "";
  const displayUrl = url.length > 48 ? url.slice(0, 45) + "..." : url;
  linkTooltip.value = { visible: true, url, displayUrl, x: rect.left, y: rect.bottom + 6 };
  nextTick(() => {
    if (!linkTooltipRef.value) return;
    const tr = linkTooltipRef.value.getBoundingClientRect();
    if (tr.right > window.innerWidth - 8) {
      linkTooltip.value = { ...linkTooltip.value, x: Math.max(8, window.innerWidth - tr.width - 8) };
    }
  });
};

const hideLinkTooltip = () => {
  linkTooltip.value = { ...linkTooltip.value, visible: false };
  editingLinkEl.value = null;
};

const onEditorClick = (event) => {
  const anchor = event.target.closest("a");
  if (anchor && editorRef.value?.contains(anchor)) {
    showLinkTooltip(anchor);
    editingLinkEl.value = anchor;
  } else {
    hideLinkTooltip();
  }
};

const editLinkFromTooltip = () => {
  const anchor = editingLinkEl.value;
  if (!anchor) return;
  const range = document.createRange();
  range.selectNodeContents(anchor);
  const sel = window.getSelection();
  if (sel) { sel.removeAllRanges(); sel.addRange(range); }
  savedRange = range.cloneRange();
  linkText.value = anchor.innerText || "";
  linkUrl.value = anchor.getAttribute("href") || anchor.href || "https://";
  hideLinkTooltip();
  linkModalOpen.value = true;
};

const unlinkFromTooltip = () => {
  const anchor = editingLinkEl.value;
  if (!anchor) return;
  const range = document.createRange();
  range.selectNode(anchor);
  const sel = window.getSelection();
  if (sel) { sel.removeAllRanges(); sel.addRange(range); }
  focusEditor();
  document.execCommand("unlink", false, null);
  hideLinkTooltip();
  updateModel();
};

const insertLink = () => {
  const url = linkUrl.value.trim();
  const text = linkText.value.trim();
  if (!url || url === "https://") return;

  if (editingLinkEl.value) {
    const anchor = editingLinkEl.value;
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    if (text && text !== anchor.innerText.trim()) {
      anchor.textContent = text;
    }
    closeModals();
    updateModel();
    return;
  }

  restoreSelection();
  focusEditor();

  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0 && selection.toString()) {
    document.execCommand("createLink", false, url);
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const container = sel.getRangeAt(0).commonAncestorContainer;
      const anchor = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
      if (anchor && anchor.tagName === "A") {
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
      }
    }
  } else {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.textContent = text || url;

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.insertNode(anchor);
      range.setStartAfter(anchor);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      editorRef.value?.appendChild(anchor);
    }
  }

  closeModals();
  updateModel();
};

const openTableModal = () => {
  saveSelection();
  tableModalOpen.value = true;
};

const insertTable = () => {
  const cols = Math.min(10, Math.max(1, Number(tableCols.value) || 3));
  const rows = Math.min(20, Math.max(1, Number(tableRows.value) || 3));

  let html = "<table><thead><tr>";
  for (let c = 0; c < cols; c += 1) {
    html += `<th>헤더 ${c + 1}</th>`;
  }
  html += "</tr></thead><tbody>";

  for (let r = 0; r < rows - 1; r += 1) {
    html += "<tr>";
    for (let c = 0; c < cols; c += 1) {
      html += "<td>&nbsp;</td>";
    }
    html += "</tr>";
  }

  html += "</tbody></table><p><br></p>";

  restoreSelection();
  focusEditor();
  document.execCommand("insertHTML", false, html);

  closeModals();
  updateModel();
};

const formatAsQuote = () => {
  focusEditor();
  document.execCommand("formatBlock", false, "blockquote");
  updateModel();
};

const closeModals = () => {
  linkModalOpen.value = false;
  tableModalOpen.value = false;
  editingLinkEl.value = null;
};

const onEditorInput = () => {
  updateToolbarState();
  updateModel();
};

const onEditorKeydown = (event) => {
  if (event.key === "Tab") {
    if (!isInsideListItem()) return;
    event.preventDefault();
    focusEditor();
    document.execCommand(event.shiftKey ? "outdent" : "indent", false, null);
    updateToolbarState();
    updateModel();
    return;
  }

  if (!(event.ctrlKey || event.metaKey)) return;
  const key = String(event.key || "").toLowerCase();
  if (key !== "b" && key !== "i") return;
  event.preventDefault();
  document.execCommand(key === "b" ? "bold" : "italic", false, null);
  updateToolbarState();
  updateModel();
};

const onEditorKeyup = () => {
  updateToolbarState();
  updateModel();
};

const isSafeUrl = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return false;
  if (raw.startsWith("#") || raw.startsWith("/") || raw.startsWith("./") || raw.startsWith("../")) {
    return true;
  }

  try {
    const url = new URL(raw, window.location.origin);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol);
  } catch {
    return false;
  }
};

const sanitizeRichHtml = (html) => {
  const div = document.createElement("div");
  div.innerHTML = String(html || "");

  const blockedTags = ["script", "style", "iframe", "object", "embed", "link", "meta"];
  blockedTags.forEach((tag) => {
    div.querySelectorAll(tag).forEach((node) => node.remove());
  });

  div.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attr) => {
      const name = String(attr.name || "").toLowerCase();
      const value = String(attr.value || "");

      if (name.startsWith("on") || name === "style") {
        node.removeAttribute(attr.name);
        return;
      }

      if ((name === "href" || name === "src") && !isSafeUrl(value)) {
        node.removeAttribute(attr.name);
      }
    });
  });

  return div.innerHTML;
};

const onEditorPaste = (event) => {
  event.preventDefault();
  const clipboard = event.clipboardData;
  const html = clipboard?.getData("text/html") || "";
  const text = clipboard?.getData("text/plain") || "";

  if (html.trim()) {
    document.execCommand("insertHTML", false, sanitizeRichHtml(html));
  } else if (text.length > 0) {
    document.execCommand("insertText", false, text);
  }

  updateModel();
};

const updateToolbarState = () => {
  const nextState = {};
  commandButtons.value.forEach(({ cmd }) => {
    try {
      nextState[cmd] = document.queryCommandState(cmd);
    } catch {
      nextState[cmd] = false;
    }
  });

  const inListItem = isInsideListItem();
  nextState.indent = inListItem;
  nextState.outdent = inListItem;

  activeCommands.value = nextState;

  try {
    const block = String(document.queryCommandValue("formatBlock") || "").toUpperCase();
    heading.value = ["H1", "H2", "H3", "H4", "H5", "H6"].includes(block) ? block : "";
  } catch {
    heading.value = "";
  }
};

const updateCharCount = () => {
  const text = editorRef.value?.innerText || "";
  charCount.value = text.replace(/\n/g, "").length;
};

const formatHtml = (html) => {
  let indent = 0;
  const tab = "  ";

  return html
    .replace(/></g, ">\n<")
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";

      if (/^<\/[^>]+>/.test(trimmed)) {
        indent = Math.max(0, indent - 1);
      }

      const result = `${tab.repeat(indent)}${trimmed}`;

      if (
        /^<[^/!][^>]*[^/]>$/.test(trimmed) &&
        !/^<(br|hr|img|input|link|meta)/i.test(trimmed)
      ) {
        indent += 1;
      }

      return result;
    })
    .filter(Boolean)
    .join("\n");
};

const openOutputPanel = () => {
  const raw = sanitizeRichHtml(editorRef.value?.innerHTML || "");
  const formatted = formatHtml(raw);
  formattedOutputHtml.value = formatted;
  outputPanelOpen.value = true;
  emit("export", formatted);
};

const clearEditor = () => {
  if (!window.confirm(texts.value.clearConfirm)) return;
  if (!editorRef.value) return;
  editorRef.value.innerHTML = "";
  updateModel();
};

const copyHtml = async () => {
  try {
    await navigator.clipboard.writeText(formattedOutputHtml.value);
    copyButtonText.value = texts.value.copied;
    window.setTimeout(() => {
      copyButtonText.value = texts.value.copy;
    }, 1200);
  } catch {
    copyButtonText.value = texts.value.copyFailed;
    window.setTimeout(() => {
      copyButtonText.value = texts.value.copy;
    }, 1200);
  }
};

const updateModel = () => {
  const html = editorRef.value?.innerHTML || "";
  updateCharCount();
  emit("update:modelValue", html);
};

const handleDocumentClick = (event) => {
  const target = event.target;
  if (openPopup.value === "fg" && !fgWrapRef.value?.contains(target)) {
    openPopup.value = "";
  }
  if (openPopup.value === "bg" && !bgWrapRef.value?.contains(target)) {
    openPopup.value = "";
  }
  if (linkTooltip.value.visible) {
    const inEditor = editorRef.value?.contains(target);
    const inTooltip = linkTooltipRef.value?.contains(target);
    if (!inEditor && !inTooltip) {
      hideLinkTooltip();
    }
  }
};

const handleDocumentKeydown = (event) => {
  if (event.key === "Escape") {
    closeModals();
    closePopups();
    outputPanelOpen.value = false;
    return;
  }

  if (event.key !== "Tab") return;
  if (!activeModal.value) return;

  const modalContainer =
    activeModal.value === "link"
      ? linkModalBoxRef.value
      : activeModal.value === "table"
        ? tableModalBoxRef.value
        : outputBoxRef.value;

  if (!modalContainer) return;

  const focusable = [...modalContainer.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )].filter((el) => !el.hasAttribute("disabled"));

  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  }
};

watch(activeModal, (value) => {
  document.body.style.overflow = value ? "hidden" : "";
});

watch(
  () => props.modelValue,
  (newValue) => {
    if (!editorRef.value) return;
    const next = newValue || "<p><br></p>";
    if (editorRef.value.innerHTML === next) return;
    editorRef.value.innerHTML = next;
    updateCharCount();
  }
);

onMounted(async () => {
  await nextTick();
  if (!editorRef.value) return;
  editorRef.value.innerHTML = props.modelValue || "<p><br></p>";
  updateToolbarState();
  updateCharCount();
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleDocumentKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
  document.removeEventListener("keydown", handleDocumentKeydown);
  document.body.style.overflow = "";
});
</script>
