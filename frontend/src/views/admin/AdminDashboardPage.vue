<template>
  <main class="admin-page">
    <header class="admin-page__header">
      <h1>System Dashboard</h1>
      <button type="button" class="wire-button">Export CSV</button>
    </header>

    <section class="wire-grid wire-grid--stats">
      <article class="wire-card">
        <h2>Total Members</h2>
        <p class="wire-value">--</p>
      </article>
      <article class="wire-card">
        <h2>Active Workspaces</h2>
        <p class="wire-value">--</p>
      </article>
      <article class="wire-card">
        <h2>Total Payments</h2>
        <p class="wire-value">--</p>
      </article>
    </section>

    <section class="wire-card wire-card--tall">
      <h2>Trend Chart (placeholder)</h2>
      <div class="wire-block">Chart area</div>
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
}

.wire-grid {
  display: grid;
  gap: 12px;
}

.wire-grid--stats {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.wire-card {
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #ffffff;
  padding: 14px;
}

.wire-card h2 {
  margin: 0 0 10px;
  font-size: 14px;
}

.wire-value {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #111827;
}

.wire-card--tall {
  min-height: 260px;
}

.wire-block {
  display: grid;
  place-items: center;
  min-height: 200px;
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
  .wire-grid--stats {
    grid-template-columns: 1fr;
  }
}
</style>
