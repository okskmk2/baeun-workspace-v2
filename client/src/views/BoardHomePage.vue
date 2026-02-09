<template>
  <hgroup>
    <h1>{{ t("board.home.header.title") }}</h1>
  </hgroup>

  <FeedList :groups="feedGroups" :item-key="itemKey">
    <template #icon="{ item }">
      <ActivityBadge :type="item.type" />
    </template>
    <template #item="{ item }">
      <div class="feed-title">{{ item.title }}</div>
      <div class="feed-meta">{{ item.meta }}</div>
    </template>
  </FeedList>
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

const itemKey = "id";
</script>

<style scoped>
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

</style>
