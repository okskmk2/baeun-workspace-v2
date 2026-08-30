<script setup>
import MockCard from "./primitives/MockCard.vue";
import MockLine from "./primitives/MockLine.vue";

defineProps({
  variant: { type: String, default: "light" },
});
</script>

<template>
  <div class="mock-channel" :data-variant="variant" aria-hidden="true">
    <div class="mock-channel__thread">
      <div class="mock-channel__msg">
        <span class="mock-channel__avatar" />
        <div class="mock-channel__bubble">
          <MockLine width="88%" height="9px" />
          <MockLine width="64%" height="9px" />
        </div>
      </div>
      <div class="mock-channel__msg mock-channel__msg--action">
        <span class="mock-channel__avatar" />
        <div class="mock-channel__bubble">
          <MockLine width="76%" height="9px" />
          <span class="mock-channel__action">{{ $t("landing.mock.makeTask") }}</span>
        </div>
      </div>
    </div>
    <div class="mock-channel__result">
      <MockCard :variant="variant">
        <MockLine width="70%" />
        <MockLine width="46%" height="8px" />
        <span class="mock-channel__link">
          <span class="mock-channel__link-icon" />
          <span class="mock-channel__link-bar" />
        </span>
      </MockCard>
    </div>
  </div>
</template>

<style scoped>
.mock-channel {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 16px;
  align-items: center;
  padding: 20px;
  border: 1px solid var(--mock-line);
  border-radius: var(--radius);
  background-color: var(--mock-bg);
}

.mock-channel[data-variant="dim"] {
  --mock-bg: var(--mock-fill-dim);
  --mock-line: color-mix(in srgb, var(--color-fg-on-dark) 14%, transparent);
  --mock-fill: color-mix(in srgb, var(--color-fg-on-dark) 18%, transparent);
}

.mock-channel__thread {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mock-channel__msg {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.mock-channel__avatar {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 50%;
  background-color: var(--mock-fill);
}

.mock-channel__bubble {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--mock-line);
  border-radius: 2px 10px 10px 10px;
  background-color: color-mix(in srgb, var(--mock-fill) 40%, var(--mock-bg));
}

.mock-channel__action {
  align-self: flex-start;
  margin-top: 2px;
  padding: 4px 8px;
  border: 1px solid color-mix(in srgb, var(--color-accent) 35%, var(--mock-line));
  border-radius: 4px;
  color: var(--color-accent);
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1.3;
}

.mock-channel__result {
  position: relative;
}

.mock-channel__result::before {
  content: "";
  position: absolute;
  left: -14px;
  top: 50%;
  width: 12px;
  border-top: 1px dashed var(--mock-line);
}

.mock-channel__link {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.mock-channel__link-icon {
  width: 10px;
  height: 10px;
  border: 1.5px solid var(--color-accent);
  border-radius: 3px;
  opacity: 0.7;
}

.mock-channel__link-bar {
  width: 42%;
  height: 6px;
  border-radius: 999px;
  background-color: color-mix(in srgb, var(--color-accent) 35%, var(--mock-fill));
}

@media (max-width: 767px) {
  .mock-channel {
    grid-template-columns: 1fr;
  }

  .mock-channel__result::before {
    left: 32px;
    top: -14px;
    width: 0;
    height: 12px;
    border-top: 0;
    border-left: 1px dashed var(--mock-line);
  }
}
</style>
