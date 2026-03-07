<template>
  <span class="unread-dot" aria-hidden="true"></span>
</template>

<style scoped>
.unread-dot {
  position: absolute;
  top: -2px;
  right: 4px;
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background-color: var(--color-danger);
}
</style>
