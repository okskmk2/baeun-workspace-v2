<template>
  <header class="section-header">
    <h2>Active Boards</h2>
    <div class="section-actions">
      <button type="button" class="btn btn--ghost btn--sm">Filter</button>
    </div>
  </header>

  <div class="feed">
    <div class="feed-group">
      <div class="feed-date">Today</div>
      <article class="feed-item">
        <div class="feed-icon">S</div>
        <div class="feed-body">
          <div class="feed-title">"Login error" status changed to In Progress</div>
          <div class="feed-meta">Lina · 10:32</div>
        </div>
      </article>
      <article class="feed-item">
        <div class="feed-icon">C</div>
        <div class="feed-body">
          <div class="feed-title">Comment added to "Access policy"</div>
          <div class="feed-meta">jojo · 09:10</div>
        </div>
      </article>
    </div>

    <div class="feed-group">
      <div class="feed-date">Yesterday</div>
      <article class="feed-item">
        <div class="feed-icon">S</div>
        <div class="feed-body">
          <div class="feed-title">"Release checklist" status changed to In Review</div>
          <div class="feed-meta">mira · 18:42</div>
        </div>
      </article>
      <article class="feed-item">
        <div class="feed-icon">C</div>
        <div class="feed-body">
          <div class="feed-title">Comment added to "Build timeline"</div>
          <div class="feed-meta">sojin · 15:20</div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-header h2 {
  margin: 0;
  font-size: 18px;
}

.feed {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feed-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.feed-date {
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.feed-item {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
}

.feed-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #111827;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.feed-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.feed-meta {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}
</style>
