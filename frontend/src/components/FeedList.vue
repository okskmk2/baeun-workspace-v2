<template>
  <div class="feed">
    <div v-for="(group, groupIndex) in groups" :key="resolveGroupKey(group, groupIndex)" class="feed-group">
      <div class="feed-date">{{ group.label }}</div>
      <article
        v-for="(item, itemIndex) in group.items"
        :key="resolveItemKey(item, itemIndex)"
        class="feed-item"
        :class="{ 'feed-item--clickable': Boolean(itemClick) }"
        :role="itemClick ? 'button' : undefined"
        :tabindex="itemClick ? 0 : undefined"
        @click="handleItemClick(item, itemIndex, $event)"
        @keydown.enter="handleItemClick(item, itemIndex, $event)"
        @keydown.space.prevent="handleItemClick(item, itemIndex, $event)"
      >
        <div class="feed-icon-slot">
          <slot name="icon" :item="item" :group="group" :index="itemIndex">
            <span class="feed-icon-placeholder" aria-hidden="true"></span>
          </slot>
        </div>
        <div class="feed-body">
          <slot name="item" :item="item" :group="group" :index="itemIndex" />
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  groups: { type: Array, default: () => [] },
  groupKey: { type: [String, Function], default: "label" },
  itemKey: { type: [String, Function], default: "id" },
  itemClick: { type: Function, default: null },
});

const resolveKey = (value, key, index) => {
  if (typeof key === "function") return key(value, index);
  if (value && typeof key === "string" && value[key] != null) return value[key];
  return index;
};

const resolveGroupKey = (group, index) => resolveKey(group, props.groupKey, index);
const resolveItemKey = (item, index) => resolveKey(item, props.itemKey, index);

const handleItemClick = (item, index, event) => {
  if (!props.itemClick) return;
  props.itemClick(item, index, event);
};
</script>

<style scoped>
.feed-item--clickable {
  cursor: pointer;
}

.feed-item--clickable:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.feed-icon-slot {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.feed-icon-placeholder {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background-color: color-mix(in srgb, var(--color-border) 55%, transparent);
}
</style>
