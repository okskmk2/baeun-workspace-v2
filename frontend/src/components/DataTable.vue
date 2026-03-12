<template>
  <section class="data-table">
    <div class="data-table-wrap">
      <table class="data-table__table" :style="{ minWidth }">
        <thead>
          <tr>
            <th
              v-for="header in normalizedHeaders"
              :key="`head-${header.__index}-${String(header.key || '')}`"
              :class="resolveAlignClass(header.align)"
              scope="col"
            >
              {{ header.text }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!data.length">
            <td class="empty-cell" :colspan="Math.max(normalizedHeaders.length, 1)">
              {{ emptyText }}
            </td>
          </tr>
          <tr v-for="(row, rowIndex) in data" v-else :key="resolveRowKey(row, rowIndex)">
            <td
              v-for="header in normalizedHeaders"
              :key="`cell-${rowIndex}-${header.__index}-${String(header.key || '')}`"
              :class="resolveAlignClass(header.align)"
            >
              <TableCell :header="header" :row="row" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showPagination" class="pagination">
      <p class="pagination__summary">{{ rangeStart }}-{{ rangeEnd }} / {{ totalItems }}</p>
      <div class="pagination__controls">
        <button
          type="button"
          class="pagination__button"
          :disabled="currentPage <= 1"
          @click="goToPage(currentPage - 1)"
        >
          이전
        </button>

        <button
          v-for="page in visiblePages"
          :key="`page-${page}`"
          type="button"
          class="pagination__button"
          :class="{ 'is-active': page === currentPage }"
          :disabled="page === currentPage"
          @click="goToPage(page)"
        >
          {{ page }}
        </button>

        <button
          type="button"
          class="pagination__button"
          :disabled="currentPage >= totalPages"
          @click="goToPage(currentPage + 1)"
        >
          다음
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, defineComponent, h, isVNode } from "vue";

const props = defineProps({
  headers: {
    type: Array,
    default: () => [],
  },
  data: {
    type: Array,
    default: () => [],
  },
  rowKey: {
    type: [String, Function],
    default: "id",
  },
  minWidth: {
    type: String,
    default: "760px",
  },
  emptyText: {
    type: String,
    default: "데이터가 없습니다.",
  },
  pagination: {
    type: Object,
    default: null,
  },
  maxPageButtons: {
    type: Number,
    default: 5,
  },
});

const emit = defineEmits(["page-change"]);

const getCellValue = (row, key) => {
  if (!key) return undefined;
  if (typeof key !== "string") return row?.[key];
  if (!key.includes(".")) return row?.[key];

  return key.split(".").reduce((acc, part) => {
    if (acc === null || acc === undefined) return undefined;
    return acc[part];
  }, row);
};

const TableCell = defineComponent({
  name: "DataTableCell",
  props: {
    header: {
      type: Object,
      required: true,
    },
    row: {
      type: Object,
      required: true,
    },
  },
  setup(cellProps) {
    return () => {
      const value = getCellValue(cellProps.row, cellProps.header?.key);
      const render = cellProps.header?.render;

      if (typeof render !== "function") {
        if (value === null || value === undefined || value === "") return "-";
        return String(value);
      }

      const output = render(value, cellProps.row);

      if (output === null || output === undefined || output === false) {
        return "-";
      }

      if (isVNode(output)) {
        return output;
      }

      if (typeof output === "object" && (output.component || output.is)) {
        const component = output.component || output.is;
        return h(component, output.props || {}, output.children || undefined);
      }

      if (typeof output === "string" || typeof output === "number" || typeof output === "boolean") {
        return String(output);
      }

      if (typeof output === "object" || typeof output === "function") {
        return h(output);
      }

      return String(output);
    };
  },
});

const normalizedHeaders = computed(() =>
  (Array.isArray(props.headers) ? props.headers : []).map((header, index) => ({
    text: header?.text || "",
    key: header?.key,
    align: header?.align || "left",
    render: header?.render,
    __index: index,
  }))
);

const currentPage = computed(() => {
  const parsed = Number.parseInt(String(props.pagination?.page ?? 1), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
});

const pageSize = computed(() => {
  const parsed = Number.parseInt(String(props.pagination?.pageSize ?? 10), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 10;
});

const totalItems = computed(() => {
  const parsed = Number.parseInt(String(props.pagination?.total ?? props.data.length), 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : props.data.length;
});

const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pageSize.value)));

const showPagination = computed(() => Boolean(props.pagination));

const rangeStart = computed(() => {
  if (totalItems.value === 0) return 0;
  return (currentPage.value - 1) * pageSize.value + 1;
});

const rangeEnd = computed(() => {
  if (totalItems.value === 0) return 0;
  return Math.min(currentPage.value * pageSize.value, totalItems.value);
});

const visiblePages = computed(() => {
  const maxButtons = Math.max(3, Number(props.maxPageButtons || 5));
  const total = totalPages.value;

  if (total <= maxButtons) {
    return Array.from({ length: total }, (_, idx) => idx + 1);
  }

  const half = Math.floor(maxButtons / 2);
  let start = Math.max(1, currentPage.value - half);
  let end = Math.min(total, start + maxButtons - 1);

  if (end - start + 1 < maxButtons) {
    start = Math.max(1, end - maxButtons + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
});

const resolveAlignClass = (align) => {
  const normalized = String(align || "left").toLowerCase();
  if (normalized === "right") return "is-right";
  if (normalized === "center") return "is-center";
  return "is-left";
};

const resolveRowKey = (row, rowIndex) => {
  if (typeof props.rowKey === "function") {
    return props.rowKey(row, rowIndex);
  }

  const keyValue = getCellValue(row, props.rowKey);
  if (keyValue !== null && keyValue !== undefined && keyValue !== "") {
    return keyValue;
  }

  return rowIndex;
};

const goToPage = (page) => {
  const nextPage = Math.min(Math.max(1, page), totalPages.value);
  if (nextPage === currentPage.value) return;

  emit("page-change", {
    page: nextPage,
    pageSize: pageSize.value,
  });
};
</script>

<style scoped>
.data-table {
  display: grid;
  gap: 10px;
}

.data-table-wrap {
  overflow-x: auto;
}

.data-table__table {
  width: 100%;
  border-collapse: collapse;
}

.data-table__table th,
.data-table__table td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.data-table__table th {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.data-table__table .is-left {
  text-align: left;
}

.data-table__table .is-center {
  text-align: center;
}

.data-table__table .is-right {
  text-align: right;
}

.empty-cell {
  color: var(--color-text-muted);
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.pagination__summary {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.pagination__controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pagination__button {
  min-width: 32px;
  min-height: 30px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-page-bg);
  color: var(--color-text);
  cursor: pointer;
  padding: 4px 8px;
}

.pagination__button.is-active {
  border-color: var(--color-text);
  font-weight: 700;
}

.pagination__button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>