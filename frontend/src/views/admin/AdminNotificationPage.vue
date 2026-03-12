<template>
  <main class="admin-page">
    <header class="admin-page__header">
      <h1>System Notifications</h1>
      <button type="button" class="wire-button">Send Broadcast</button>
    </header>

    <section class="wire-card">
      <h2>Broadcast Composer (placeholder)</h2>
      <div class="wire-form">
        <div class="wire-input">Target type</div>
        <div class="wire-input">Target selector</div>
        <div class="wire-input wire-input--large">Message content</div>
      </div>
    </section>

    <section class="wire-card wire-card--tall">
      <h2>Notification History (table placeholder)</h2>
      <div class="wire-block">Delivery result list</div>
    </section>
  </main>
</template>

<style scoped>
.admin-page {
  display: grid;
  gap: 16px;
}

.admin-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.wire-card {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-page-bg);
  padding: 14px;
}

.wire-form {
  display: grid;
  gap: 10px;
}

.wire-input {
  border: 1px dashed var(--color-text-muted);
  border-radius: 8px;
  min-height: 40px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  color: var(--color-text-muted);
}

.wire-input--large {
  min-height: 110px;
  align-items: flex-start;
  padding-top: 12px;
}

.wire-card--tall {
  min-height: 280px;
}

.wire-block {
  display: grid;
  place-items: center;
  min-height: 200px;
  border: 1px dashed var(--color-text-muted);
  border-radius: 8px;
  color: var(--color-text-muted);
}

.wire-button {
  border: 1px solid var(--color-text);
  border-radius: 8px;
  background: var(--color-page-bg);
  padding: 8px 12px;
  font-weight: 600;
  cursor: pointer;
}
</style>
