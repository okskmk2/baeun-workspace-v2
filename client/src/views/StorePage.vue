<template>
  <main class="store">
    <section class="store-hero">
      <div>
        <p class="store-hero__eyebrow">{{ t("store.hero.eyebrow") }}</p>
        <h1>{{ t("store.hero.title") }}</h1>
        <p class="store-hero__subtitle">{{ t("store.hero.subtitle") }}</p>
      </div>
      <div class="store-hero__actions">
        <router-link class="btn" to="/signup">{{ t("store.hero.primaryCta") }}</router-link>
        <button class="btn btn--secondary" type="button">{{ t("store.hero.secondaryCta") }}</button>
      </div>
    </section>

    <section class="plans">
      <div v-for="group in planGroups" :key="group.id" class="plan-group">
        <div class="plan-group__header">
          <div>
            <h2>{{ group.title }}</h2>
            <p>{{ group.description }}</p>
          </div>
        </div>
        <div class="plan-grid">
          <article v-for="plan in group.plans" :key="plan.name" class="plan-card">
            <div class="plan-card__header">
              <h3>{{ plan.name }}</h3>
              <span v-if="plan.badge" class="plan-badge">{{ plan.badge }}</span>
            </div>
            <p class="plan-card__price">{{ plan.price }}</p>
            <p class="plan-card__period">{{ plan.period }}</p>
            <ul class="plan-card__list">
              <li v-for="item in plan.includes" :key="item">{{ item }}</li>
            </ul>
            <button class="btn btn--secondary" type="button">
              {{ t("store.actions.select") }}
            </button>
          </article>
        </div>
      </div>
    </section>

    <section class="store-details">
      <div class="detail-card">
        <h2>{{ t("store.sections.lifecycle.title") }}</h2>
        <ol class="detail-steps">
          <li v-for="step in lifecycleSteps" :key="step.title">
            <h3>{{ step.title }}</h3>
            <p>{{ step.description }}</p>
          </li>
        </ol>
      </div>
      <div class="detail-card">
        <h2>{{ t("store.sections.payment.title") }}</h2>
        <ul class="detail-list">
          <li v-for="item in paymentNotes" :key="item">{{ item }}</li>
        </ul>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const planGroups = computed(() => [
  {
    id: "workspace",
    title: t("store.groups.workspace.title"),
    description: t("store.groups.workspace.description"),
    plans: [
      {
        name: t("store.plans.workspace.monthly.name"),
        price: t("store.plans.workspace.monthly.price"),
        period: t("store.plans.workspace.monthly.period"),
        includes: [
          t("store.plans.workspace.monthly.includes.0"),
          t("store.plans.workspace.monthly.includes.1"),
          t("store.plans.workspace.monthly.includes.2"),
        ],
      },
      {
        name: t("store.plans.workspace.yearly.name"),
        price: t("store.plans.workspace.yearly.price"),
        period: t("store.plans.workspace.yearly.period"),
        badge: t("store.plans.badges.popular"),
        includes: [
          t("store.plans.workspace.yearly.includes.0"),
          t("store.plans.workspace.yearly.includes.1"),
          t("store.plans.workspace.yearly.includes.2"),
        ],
      },
      {
        name: t("store.plans.workspace.lifetime.name"),
        price: t("store.plans.workspace.lifetime.price"),
        period: t("store.plans.workspace.lifetime.period"),
        includes: [
          t("store.plans.workspace.lifetime.includes.0"),
          t("store.plans.workspace.lifetime.includes.1"),
          t("store.plans.workspace.lifetime.includes.2"),
        ],
      },
    ],
  },
  {
    id: "project",
    title: t("store.groups.project.title"),
    description: t("store.groups.project.description"),
    plans: [
      {
        name: t("store.plans.project.monthly.name"),
        price: t("store.plans.project.monthly.price"),
        period: t("store.plans.project.monthly.period"),
        includes: [
          t("store.plans.project.monthly.includes.0"),
          t("store.plans.project.monthly.includes.1"),
          t("store.plans.project.monthly.includes.2"),
        ],
      },
      {
        name: t("store.plans.project.yearly.name"),
        price: t("store.plans.project.yearly.price"),
        period: t("store.plans.project.yearly.period"),
        includes: [
          t("store.plans.project.yearly.includes.0"),
          t("store.plans.project.yearly.includes.1"),
          t("store.plans.project.yearly.includes.2"),
        ],
      },
      {
        name: t("store.plans.project.lifetime.name"),
        price: t("store.plans.project.lifetime.price"),
        period: t("store.plans.project.lifetime.period"),
        includes: [
          t("store.plans.project.lifetime.includes.0"),
          t("store.plans.project.lifetime.includes.1"),
          t("store.plans.project.lifetime.includes.2"),
        ],
      },
    ],
  },
]);

const lifecycleSteps = computed(() => [
  {
    title: t("store.sections.lifecycle.steps.0.title"),
    description: t("store.sections.lifecycle.steps.0.description"),
  },
  {
    title: t("store.sections.lifecycle.steps.1.title"),
    description: t("store.sections.lifecycle.steps.1.description"),
  },
  {
    title: t("store.sections.lifecycle.steps.2.title"),
    description: t("store.sections.lifecycle.steps.2.description"),
  },
]);

const paymentNotes = computed(() => [
  t("store.sections.payment.bullets.0"),
  t("store.sections.payment.bullets.1"),
  t("store.sections.payment.bullets.2"),
]);
</script>

<style scoped>
.store {
  display: flex;
  flex-direction: column;
  gap: 40px;
  color: var(--dl-text);
}

.store-hero {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
  border-radius: 18px;
  border: 1px solid var(--dl-border);
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.16), transparent 60%);
}

.store-hero__eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--dl-text-muted);
}

.store-hero h1 {
  margin: 0 0 10px;
  font-size: clamp(26px, 3.6vw, 38px);
}

.store-hero__subtitle {
  margin: 0;
  color: var(--dl-text-muted);
  max-width: 520px;
}

.store-hero__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.plans {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.plan-group__header h2 {
  margin: 0 0 6px;
  font-size: 22px;
}

.plan-group__header p {
  margin: 0;
  color: var(--dl-text-muted);
  font-size: 14px;
}

.plan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.plan-card {
  padding: 18px 20px;
  border-radius: 16px;
  border: 1px solid var(--dl-border);
  background-color: var(--dl-surface);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plan-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.plan-card__header h3 {
  margin: 0;
  font-size: 16px;
}

.plan-badge {
  padding: 4px 10px;
  border-radius: 999px;
  background-color: rgba(37, 99, 235, 0.15);
  color: var(--dl-text);
  font-size: 11px;
  font-weight: 600;
}

.plan-card__price {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
}

.plan-card__period {
  margin: 0;
  color: var(--dl-text-muted);
  font-size: 12px;
}

.plan-card__list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: var(--dl-text);
}

.store-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 18px;
}

.detail-card {
  padding: 20px;
  border-radius: 16px;
  border: 1px solid var(--dl-border);
  background-color: var(--dl-surface);
}

.detail-card h2 {
  margin: 0 0 14px;
  font-size: 18px;
}

.detail-steps {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 12px;
  color: var(--dl-text);
}

.detail-steps h3 {
  margin: 0 0 4px;
  font-size: 14px;
}

.detail-steps p {
  margin: 0;
  color: var(--dl-text-muted);
  font-size: 13px;
}

.detail-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
  color: var(--dl-text);
  font-size: 13px;
}

@media (max-width: 720px) {
  .store-hero {
    padding: 20px;
  }
}
</style>
