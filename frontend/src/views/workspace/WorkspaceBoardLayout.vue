<template>
  <main class="workspace-board-layout container">
    <aside class="board-snb">
      <h2 class="board-snb__title">게시판</h2>
      <nav class="board-snb__nav">
        <router-link :to="homeTo">게시판 홈</router-link>
        <router-link :to="noticeTo">공지사항</router-link>
      </nav>

      <div class="board-snb__section">
        <p class="board-snb__section-title">커뮤니티</p>
        <nav class="board-snb__nav">
          <router-link :to="eventsTo">경조사</router-link>
        </nav>
      </div>

      <div class="board-snb__section">
        <p class="board-snb__section-title">정보</p>
        <nav class="board-snb__nav">
          <router-link :to="marketTo">중고시장</router-link>
          <router-link :to="resourceTo">인력 수소문</router-link>
        </nav>
      </div>
    </aside>

    <section class="board-content">
      <router-view />
    </section>
  </main>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const workspaceId = computed(() => route.params.workspaceId);

const homeTo = computed(() => ({
  name: "workspace-board-home",
  params: { workspaceId: workspaceId.value },
}));

const noticeTo = computed(() => ({
  name: "workspace-board-notice",
  params: { workspaceId: workspaceId.value },
}));

const eventsTo = computed(() => ({
  name: "workspace-board-events",
  params: { workspaceId: workspaceId.value },
}));

const marketTo = computed(() => ({
  name: "workspace-board-market",
  params: { workspaceId: workspaceId.value },
}));

const resourceTo = computed(() => ({
  name: "workspace-board-resource",
  params: { workspaceId: workspaceId.value },
}));
</script>

<style scoped>
.workspace-board-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 16px;
  padding: 20px;
}

.board-snb {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  padding: 12px;
  height: fit-content;
}

.board-snb__title {
  margin: 0 0 10px;
  font-size: 14px;
}

.board-snb__section {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--color-border);
}

.board-snb__section-title {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--color-text-muted);
}

.board-snb__nav {
  display: grid;
  gap: 6px;
}

.board-snb__nav a {
  text-decoration: none;
  color: var(--color-text);
  border-radius: 8px;
  padding: 8px 10px;
}

.board-snb__nav a.router-link-active {
  background: #e5e7eb;
  font-weight: 700;
}

.board-content {
  min-width: 0;
}

@media (max-width: 900px) {
  .workspace-board-layout {
    grid-template-columns: 1fr;
  }
}
</style>
