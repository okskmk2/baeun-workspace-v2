<template>
  <main class="admin-page">
    <header class="admin-page__header">
      <h1>User & Workspace Management</h1>
      <div class="actions">
        <button type="button" class="wire-button">User Detail & Control</button>
        <button type="button" class="wire-button">Force Reset Password</button>
      </div>
    </header>

    <section class="wire-card">
      <h2>Filter Area</h2>
      <div class="wire-row">
        <div class="wire-input">Search keyword</div>
        <div class="wire-input">Status filter</div>
        <div class="wire-input">Workspace filter</div>
      </div>
    </section>

    <section class="wire-card wire-card--tall">
      <h2>Member / Workspace List (table placeholder)</h2>
      <div class="wire-block">Table area with paging</div>
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
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.actions {
  display: flex;
  gap: 8px;
}

.wire-card {
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #ffffff;
  padding: 14px;
}

.wire-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.wire-input {
  border: 1px dashed #9ca3af;
  border-radius: 8px;
  min-height: 38px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  color: #6b7280;
}

.wire-card--tall {
  min-height: 300px;
}

.wire-block {
  display: grid;
  place-items: center;
  min-height: 230px;
  border: 1px dashed #9ca3af;
  border-radius: 8px;
  color: #6b7280;
}

.wire-button {
  border: 1px solid #111827;
  border-radius: 8px;
  background: #ffffff;
  padding: 8px 12px;
  font-weight: 600;
  cursor: pointer;
}

@media (max-width: 960px) {
  .admin-page__header {
    align-items: stretch;
    flex-direction: column;
  }

  .actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .wire-row {
    grid-template-columns: 1fr;
  }
}
</style>
