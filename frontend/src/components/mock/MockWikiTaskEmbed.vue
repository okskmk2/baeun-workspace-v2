<script setup>
import MockLine from "./primitives/MockLine.vue";

defineProps({
  variant: { type: String, default: "light" },
});
</script>

<template>
  <div class="mock-wiki" :data-variant="variant" aria-hidden="true">
    <div class="mock-wiki__page">
      <MockLine width="42%" height="12px" />
      <div class="mock-wiki__lines">
        <MockLine />
        <MockLine width="92%" />
        <MockLine width="78%" />
      </div>
      <ul class="mock-wiki__tasks">
        <li class="mock-wiki__task">
          <span class="mock-wiki__badge is-doing">{{ $t("landing.mock.status.doing") }}</span>
          <div class="mock-wiki__task-body">
            <MockLine width="68%" height="8px" />
            <span class="mock-wiki__bar"><i style="width: 58%" /></span>
          </div>
        </li>
        <li class="mock-wiki__task">
          <span class="mock-wiki__badge is-done">{{ $t("landing.mock.status.done") }}</span>
          <div class="mock-wiki__task-body">
            <MockLine width="54%" height="8px" />
            <span class="mock-wiki__bar"><i style="width: 100%" /></span>
          </div>
        </li>
        <li class="mock-wiki__task">
          <span class="mock-wiki__badge is-doing">{{ $t("landing.mock.status.doing") }}</span>
          <div class="mock-wiki__task-body">
            <MockLine width="61%" height="8px" />
            <span class="mock-wiki__bar"><i style="width: 34%" /></span>
          </div>
        </li>
      </ul>
      <div class="mock-wiki__lines">
        <MockLine width="86%" />
        <MockLine width="70%" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mock-wiki {
  padding: 20px;
  border: 1px solid var(--mock-line);
  border-radius: var(--radius);
  background-color: var(--mock-bg);
}

.mock-wiki[data-variant="dim"] {
  --mock-bg: var(--mock-fill-dim);
  --mock-line: color-mix(in srgb, var(--color-fg-on-dark) 14%, transparent);
  --mock-fill: color-mix(in srgb, var(--color-fg-on-dark) 18%, transparent);
}

.mock-wiki__page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mock-wiki__lines {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mock-wiki__tasks {
  margin: 0;
  padding: 12px;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid var(--mock-line);
  border-radius: calc(var(--radius) - 2px);
  background-color: color-mix(in srgb, var(--mock-fill) 40%, var(--mock-bg));
}

.mock-wiki__task {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: center;
}

.mock-wiki__badge {
  padding: 3px 7px;
  border-radius: 4px;
  font-size: 0.6875rem;
  font-weight: 600;
  white-space: nowrap;
}

.mock-wiki__badge.is-doing {
  background-color: color-mix(in srgb, var(--color-accent) 12%, var(--mock-bg));
  color: var(--color-accent);
}

.mock-wiki__badge.is-done {
  background-color: var(--mock-fill);
  color: var(--color-muted);
}

.mock-wiki__task-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.mock-wiki__bar {
  display: block;
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background-color: var(--mock-fill);
}

.mock-wiki__bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background-color: var(--color-accent);
}
</style>
