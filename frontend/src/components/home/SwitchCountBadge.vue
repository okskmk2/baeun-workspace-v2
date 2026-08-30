<template>
  <div class="switch">
    <div class="switch__side">
      <div class="switch__arrows" aria-hidden="true">
        <span class="switch__arrow is-nw" />
        <span class="switch__arrow is-ne" />
        <span class="switch__arrow is-sw" />
        <span class="switch__arrow is-se" />
      </div>
      <span class="switch__label">{{ $t("landing.switch.previous") }}</span>
    </div>
    <div class="switch__rule" aria-hidden="true" />
    <div class="switch__side">
      <div class="switch__dot" aria-hidden="true" />
      <span class="switch__label">{{ $t("landing.switch.now") }}</span>
    </div>
  </div>
</template>

<style scoped>
.switch {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 28px;
}

.switch__side {
  display: flex;
  align-items: center;
  gap: 10px;
}

.switch__arrows {
  display: grid;
  grid-template-columns: 12px 12px;
  grid-template-rows: 12px 12px;
  gap: 6px;
}

.switch__arrow {
  width: 8px;
  height: 8px;
  border-top: 1.5px solid var(--color-muted);
  border-right: 1.5px solid var(--color-muted);
}

.switch__arrow.is-ne {
  transform: rotate(0deg);
}

.switch__arrow.is-se {
  transform: rotate(90deg);
}

.switch__arrow.is-sw {
  transform: rotate(180deg);
}

.switch__arrow.is-nw {
  transform: rotate(-90deg);
}

.switch__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--color-fg);
}

.switch__label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--color-muted);
}

.switch__rule {
  width: 24px;
  height: 1px;
  background-color: var(--color-line);
}

@media (max-width: 767px) {
  .switch {
    margin-bottom: 20px;
  }
}
</style>
