<template>
  <main class="home">
    <section class="hero">
      <div class="hero__copy">
        <p class="hero__eyebrow">{{ t("home.hero.eyebrow") }}</p>
        <h1 class="hero__title">{{ t("home.hero.title") }}</h1>
        <p class="hero__subtitle">{{ t("home.hero.subtitle") }}</p>
        <div class="hero__actions">
          <router-link class="btn" to="/signup">{{ t("home.hero.primaryCta") }}</router-link>
          <router-link class="btn btn--secondary" to="/store">
            {{ t("home.hero.secondaryCta") }}
          </router-link>
        </div>
        <div class="hero__stats">
          <div v-for="stat in stats" :key="stat.label" class="stat">
            <p class="stat__value">{{ stat.value }}</p>
            <p class="stat__label">{{ stat.label }}</p>
          </div>
        </div>
      </div>
      <div class="hero__panel">
        <div class="panel__header">
          <h2>{{ t("home.snapshot.title") }}</h2>
          <p>{{ t("home.snapshot.description") }}</p>
        </div>
        <div class="panel__chips">
          <span v-for="chip in snapshotChips" :key="chip" class="chip">{{ chip }}</span>
        </div>
        <div class="panel__footer">
          <div class="panel__row">
            <span class="panel__label">{{ t("home.snapshot.metrics.primaryLabel") }}</span>
            <span class="panel__value">{{ t("home.snapshot.metrics.primaryValue") }}</span>
          </div>
          <div class="panel__row">
            <span class="panel__label">{{ t("home.snapshot.metrics.cadenceLabel") }}</span>
            <span class="panel__value">{{ t("home.snapshot.metrics.cadenceValue") }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="features">
      <div class="section-heading">
        <h2>{{ t("home.features.title") }}</h2>
        <p>{{ t("home.features.subtitle") }}</p>
      </div>
      <div class="feature-grid">
        <article v-for="card in featureCards" :key="card.title" class="feature-card">
          <h3>{{ card.title }}</h3>
          <p class="feature-card__desc">{{ card.description }}</p>
          <ul class="feature-card__list">
            <li v-for="item in card.bullets" :key="item">{{ item }}</li>
          </ul>
          <div class="feature-card__tables">
            <span v-for="table in card.tables" :key="table" class="chip chip--muted">
              {{ table }}
            </span>
          </div>
        </article>
      </div>
    </section>

    <section class="cta">
      <div>
        <h2>{{ t("home.cta.title") }}</h2>
        <p>{{ t("home.cta.description") }}</p>
      </div>
      <router-link class="btn" to="/signup">{{ t("home.cta.primary") }}</router-link>
    </section>
  </main>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const stats = computed(() => [
  { value: "3", label: t("home.stats.workspaces") },
  { value: "12", label: t("home.stats.projects") },
  { value: "48", label: t("home.stats.boards") },
  { value: "120+", label: t("home.stats.messages") },
]);

const snapshotChips = computed(() => [
  t("home.snapshot.chips.0"),
  t("home.snapshot.chips.1"),
  t("home.snapshot.chips.2"),
  t("home.snapshot.chips.3"),
  t("home.snapshot.chips.4"),
  t("home.snapshot.chips.5"),
]);

const featureCards = computed(() => [
  {
    title: t("home.features.workspace.title"),
    description: t("home.features.workspace.description"),
    bullets: [
      t("home.features.workspace.bullets.0"),
      t("home.features.workspace.bullets.1"),
      t("home.features.workspace.bullets.2"),
    ],
    tables: [
      t("home.features.workspace.tags.0"),
      t("home.features.workspace.tags.1"),
      t("home.features.workspace.tags.2"),
    ],
  },
  {
    title: t("home.features.project.title"),
    description: t("home.features.project.description"),
    bullets: [
      t("home.features.project.bullets.0"),
      t("home.features.project.bullets.1"),
      t("home.features.project.bullets.2"),
    ],
    tables: [
      t("home.features.project.tags.0"),
      t("home.features.project.tags.1"),
      t("home.features.project.tags.2"),
    ],
  },
  {
    title: t("home.features.board.title"),
    description: t("home.features.board.description"),
    bullets: [
      t("home.features.board.bullets.0"),
      t("home.features.board.bullets.1"),
      t("home.features.board.bullets.2"),
    ],
    tables: [
      t("home.features.board.tags.0"),
      t("home.features.board.tags.1"),
      t("home.features.board.tags.2"),
    ],
  },
  {
    title: t("home.features.wiki.title"),
    description: t("home.features.wiki.description"),
    bullets: [
      t("home.features.wiki.bullets.0"),
      t("home.features.wiki.bullets.1"),
      t("home.features.wiki.bullets.2"),
    ],
    tables: [
      t("home.features.wiki.tags.0"),
      t("home.features.wiki.tags.1"),
      t("home.features.wiki.tags.2"),
    ],
  },
  {
    title: t("home.features.messenger.title"),
    description: t("home.features.messenger.description"),
    bullets: [
      t("home.features.messenger.bullets.0"),
      t("home.features.messenger.bullets.1"),
      t("home.features.messenger.bullets.2"),
    ],
    tables: [
      t("home.features.messenger.tags.0"),
      t("home.features.messenger.tags.1"),
      t("home.features.messenger.tags.2"),
    ],
  },
  {
    title: t("home.features.billing.title"),
    description: t("home.features.billing.description"),
    bullets: [
      t("home.features.billing.bullets.0"),
      t("home.features.billing.bullets.1"),
      t("home.features.billing.bullets.2"),
    ],
    tables: [
      t("home.features.billing.tags.0"),
      t("home.features.billing.tags.1"),
      t("home.features.billing.tags.2"),
    ],
  },
]);
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 48px;

  color: var(--dl-text);
}

.hero {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 32px;
  align-items: center;
}

.hero__eyebrow {
  margin: 0 0 8px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--dl-text-muted);
}

.hero__title {
  margin: 0 0 12px;
  font-size: clamp(28px, 4vw, 42px);
  line-height: 1.1;
}

.hero__subtitle {
  margin: 0 0 24px;
  color: var(--dl-text-muted);
  font-size: 15px;
  max-width: 480px;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
}

.hero__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
}

.stat {
  padding: 12px 14px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--dl-surface), transparent);
  border: 1px solid var(--dl-border);
}

.stat__value {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
}

.stat__label {
  margin: 0;
  font-size: 12px;
  color: var(--dl-text-muted);
}

.hero__panel {
  background:
    radial-gradient(circle at top, rgba(37, 99, 235, 0.2), transparent 55%), var(--dl-surface);
  border: 1px solid var(--dl-border);
  border-radius: 18px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
}

.panel__header h2 {
  margin: 0 0 6px;
  font-size: 18px;
}

.panel__header p {
  margin: 0;
  font-size: 13px;
  color: var(--dl-text-muted);
}

.panel__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  padding: 6px 10px;
  border-radius: 999px;
  background-color: rgba(37, 99, 235, 0.12);
  color: var(--dl-text);
  font-size: 12px;
  border: 1px solid rgba(37, 99, 235, 0.2);
}

.chip--muted {
  background-color: var(--dl-surface);
  border-color: var(--dl-border);
}

.panel__footer {
  display: grid;
  gap: 10px;
  font-size: 12px;
}

.panel__row {
  display: flex;
  justify-content: space-between;
  color: var(--dl-text-muted);
}

.panel__value {
  color: var(--dl-text);
  font-weight: 600;
}

.features {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-heading h2 {
  margin: 0 0 6px;
  font-size: 22px;
}

.section-heading p {
  margin: 0;
  color: var(--dl-text-muted);
  font-size: 14px;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
}

.feature-card {
  padding: 18px 20px;
  border-radius: 16px;
  border: 1px solid var(--dl-border);
  background-color: var(--dl-surface);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feature-card h3 {
  margin: 0;
  font-size: 16px;
}

.feature-card__desc {
  margin: 0;
  color: var(--dl-text-muted);
  font-size: 13px;
}

.feature-card__list {
  margin: 0;
  padding-left: 18px;
  color: var(--dl-text);
  font-size: 13px;
  display: grid;
  gap: 6px;
}

.feature-card__tables {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cta {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px;
  border-radius: 16px;
  border: 1px solid var(--dl-border);
  background: linear-gradient(120deg, rgba(37, 99, 235, 0.15), transparent 60%);
}

.cta h2 {
  margin: 0 0 6px;
  font-size: 22px;
}

.cta p {
  margin: 0;
  color: var(--dl-text-muted);
}

@media (max-width: 720px) {
  .hero__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cta {
    align-items: flex-start;
  }
}
</style>
