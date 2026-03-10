<template>
  <main class="admin-page">
    <header class="admin-page__header">
      <h1>License & Payment</h1>
      <div class="actions">
        <button type="button" class="wire-button">Refund Payment</button>
        <button type="button" class="wire-button">Update Master Price</button>
      </div>
    </header>

    <section class="wire-grid">
      <article class="wire-card">
        <h2>Payment Summary</h2>
        <div class="wire-block">Revenue/KPI cards</div>
      </article>
      <article class="wire-card">
        <h2>License Master Data</h2>
        <div class="wire-block">Slot prices list</div>
      </article>
    </section>

    <section class="wire-card wire-card--tall">
      <h2>Payment History (table placeholder)</h2>
      <div class="wire-block">Transactions table</div>
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

.wire-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.wire-card {
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #ffffff;
  padding: 14px;
}

.wire-card--tall {
  min-height: 300px;
}

.wire-block {
  display: grid;
  place-items: center;
  min-height: 150px;
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

  .wire-grid {
    grid-template-columns: 1fr;
  }
}
</style>
