<template>
  <hgroup>
    <h1>{{ t("board.home.header.title") }}</h1>
  </hgroup>

  <div class="feed">
    <div class="feed-group">
      <div class="feed-date">{{ t("board.home.feed.today") }}</div>
      <article class="feed-item">
        <ActivityBadge type="U" />
        <div class="feed-body">
          <div class="feed-title">{{ t("board.home.feed.items.today1") }}</div>
          <div class="feed-meta">{{ t("board.home.feed.items.today1Meta") }}</div>
        </div>
      </article>
      <article class="feed-item">
        <ActivityBadge type="C" />
        <div class="feed-body">
          <div class="feed-title">{{ t("board.home.feed.items.today2") }}</div>
          <div class="feed-meta">{{ t("board.home.feed.items.today2Meta") }}</div>
        </div>
      </article>
    </div>

    <div class="feed-group">
      <div class="feed-date">{{ t("board.home.feed.yesterday") }}</div>
      <article class="feed-item">
        <ActivityBadge type="U" />
        <div class="feed-body">
          <div class="feed-title">{{ t("board.home.feed.items.yesterday1") }}</div>
          <div class="feed-meta">{{ t("board.home.feed.items.yesterday1Meta") }}</div>
        </div>
      </article>
      <article class="feed-item">
        <ActivityBadge type="C" />
        <div class="feed-body">
          <div class="feed-title">{{ t("board.home.feed.items.yesterday2") }}</div>
          <div class="feed-meta">{{ t("board.home.feed.items.yesterday2Meta") }}</div>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import ActivityBadge from "../components/ActivityBadge.vue";

const { t } = useI18n();
</script>

<style scoped>
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
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
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.feed-item {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.feed-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.feed-meta {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
}
</style>
