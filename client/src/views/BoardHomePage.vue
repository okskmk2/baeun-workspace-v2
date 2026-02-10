<template>
  <hgroup>
    <h1>{{ t("board.home.header.title") }}</h1>
  </hgroup>

  <FeedList v-if="hasFeedItems" :groups="feedGroups" :item-key="itemKey">
    <template #icon="{ item }">
      <ActivityBadge :type="item.type" />
    </template>
    <template #item="{ item }">
      <div class="feed-title">{{ item.title }}</div>
      <div class="feed-meta">{{ item.meta }}</div>
    </template>
  </FeedList>

  <div v-else class="empty" aria-live="polite">
    <div class="empty-card">
      <h1>{{ t("board.home.empty.title") }}</h1>
      <p class="empty-desc">{{ t("board.home.empty.description") }}</p>
      <button type="button" class="btn">{{ t("board.layout.actions.create") }}</button>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { computed } from "vue";
import ActivityBadge from "../components/ActivityBadge.vue";
import FeedList from "../components/FeedList.vue";

const { t } = useI18n();

const feedGroups = computed(() => [
  {
    label: t("board.home.feed.today"),
    items: [
      {
        id: "today-1",
        type: "U",
        title: t("board.home.feed.items.today1"),
        meta: t("board.home.feed.items.today1Meta"),
      },
      {
        id: "today-2",
        type: "C",
        title: t("board.home.feed.items.today2"),
        meta: t("board.home.feed.items.today2Meta"),
      },
    ],
  },
  {
    label: t("board.home.feed.yesterday"),
    items: [
      {
        id: "yesterday-1",
        type: "U",
        title: t("board.home.feed.items.yesterday1"),
        meta: t("board.home.feed.items.yesterday1Meta"),
      },
      {
        id: "yesterday-2",
        type: "C",
        title: t("board.home.feed.items.yesterday2"),
        meta: t("board.home.feed.items.yesterday2Meta"),
      },
    ],
  },
]);

const hasFeedItems = computed(() =>
  feedGroups.value.some((group) => Array.isArray(group.items) && group.items.length > 0)
);

const itemKey = "id";
</script>

<style scoped>
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.empty {
  display: flex;
  justify-content: center;
}

.empty-card {
  max-width: 520px;
  width: 100%;
  padding: 20px 24px;
  border-radius: 12px;
  border: 1px dashed var(--color-border);
  text-align: center;
}

.empty-card h1 {
  margin: 0 0 8px;
  font-size: 18px;
  color: var(--color-text);
}

.empty-desc {
  margin: 0 0 16px;
  color: var(--color-text-muted);
  font-size: 14px;
}

</style>
