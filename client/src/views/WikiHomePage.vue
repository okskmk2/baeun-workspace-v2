<template>
  <hgroup>
    <h1>{{ t("wiki.home.header.title") }}</h1>
  </hgroup>

  <div class="feed">
    <div class="feed-group">
      <div class="feed-date">{{ t("wiki.home.feed.today") }}</div>
      <article class="feed-item">
        <ActivityBadge type="U" />
        <div class="feed-body">
          <div class="feed-title">{{ t("wiki.home.feed.items.today1") }}</div>
          <div class="feed-meta">{{ t("wiki.home.feed.items.today1Meta") }}</div>
        </div>
      </article>
      <article class="feed-item">
        <ActivityBadge type="C" />
        <div class="feed-body">
          <div class="feed-title">{{ t("wiki.home.feed.items.today2") }}</div>
          <div class="feed-meta">{{ t("wiki.home.feed.items.today2Meta") }}</div>
        </div>
      </article>
    </div>

    <div class="feed-group">
      <div class="feed-date">{{ t("wiki.home.feed.yesterday") }}</div>
      <article class="feed-item">
        <ActivityBadge type="U" />
        <div class="feed-body">
          <div class="feed-title">{{ t("wiki.home.feed.items.yesterday1") }}</div>
          <div class="feed-meta">{{ t("wiki.home.feed.items.yesterday1Meta") }}</div>
        </div>
      </article>
      <article class="feed-item">
        <ActivityBadge type="C" />
        <div class="feed-body">
          <div class="feed-title">{{ t("wiki.home.feed.items.yesterday2") }}</div>
          <div class="feed-meta">{{ t("wiki.home.feed.items.yesterday2Meta") }}</div>
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
