<template>
	<main class="plan-page">
		<section class="hero">
			<p class="hero-eyebrow">{{ t("store.hero.eyebrow") }}</p>
			<h1>{{ t("store.hero.title") }}</h1>
			<p class="hero-subtitle">{{ t("store.hero.subtitle") }}</p>
		</section>

		<section class="plan-groups">
			<article v-for="group in planGroups" :key="group.id" class="group-card">
				<header class="group-header">
					<h2>{{ group.title }}</h2>
					<p>{{ group.description }}</p>
				</header>

				<div class="plan-grid">
					<article v-for="plan in group.plans" :key="plan.name" class="plan-card">
						<div class="plan-head">
							<h3>{{ plan.name }}</h3>
							<span v-if="plan.badge" class="badge">{{ plan.badge }}</span>
						</div>
						<p class="price">{{ plan.price }}</p>
						<p class="period">{{ plan.period }}</p>
						<ul>
							<li v-for="item in plan.includes" :key="item">{{ item }}</li>
						</ul>
					</article>
				</div>
			</article>
		</section>

		<section class="policy-grid">
			<article class="policy-card">
				<h2>{{ t("store.sections.lifecycle.title") }}</h2>
				<ol>
					<li v-for="step in lifecycleSteps" :key="step.title">
						<strong>{{ step.title }}</strong>
						<p>{{ step.description }}</p>
					</li>
				</ol>
			</article>
			<article class="policy-card">
				<h2>{{ t("store.sections.payment.title") }}</h2>
				<ul>
					<li v-for="item in paymentNotes" :key="item">{{ item }}</li>
				</ul>
			</article>
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
.plan-page {
	display: grid;
	gap: 24px;
}

.hero {
	padding: 16px;
	border: 1px solid #e5e7eb;
	border-radius: 12px;
	background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), transparent 60%);
}

.hero-eyebrow {
	margin: 0 0 8px;
	font-size: 12px;
	letter-spacing: 0.14em;
	text-transform: uppercase;
	color: #6b7280;
}

.hero h1 {
	margin: 0 0 8px;
	font-size: 28px;
}

.hero-subtitle {
	margin: 0;
	color: #6b7280;
}

.plan-groups {
	display: grid;
	gap: 16px;
}

.group-card {
	border: 1px solid #e5e7eb;
	border-radius: 12px;
	padding: 16px;
}

.group-header h2 {
	margin: 0 0 6px;
}

.group-header p {
	margin: 0;
	color: #6b7280;
}

.plan-grid {
	margin-top: 14px;
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
	gap: 12px;
}

.plan-card {
	border: 1px solid #e5e7eb;
	border-radius: 10px;
	padding: 14px;
	display: grid;
	gap: 8px;
	background-color: #fff;
}

.plan-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.plan-head h3 {
	margin: 0;
	font-size: 15px;
}

.badge {
	font-size: 11px;
	padding: 3px 8px;
	border-radius: 999px;
	background: rgba(37, 99, 235, 0.14);
}

.price {
	margin: 0;
	font-size: 22px;
	font-weight: 700;
}

.period {
	margin: 0;
	font-size: 12px;
	color: #6b7280;
}

.plan-card ul,
.policy-card ul,
.policy-card ol {
	margin: 0;
	padding-left: 18px;
	display: grid;
	gap: 6px;
}

.policy-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
	gap: 12px;
}

.policy-card {
	border: 1px solid #e5e7eb;
	border-radius: 12px;
	padding: 16px;
	background-color: #fff;
}

.policy-card h2 {
	margin: 0 0 10px;
	font-size: 17px;
}

.policy-card p {
	margin: 4px 0 0;
	color: #6b7280;
	font-size: 13px;
}
</style>
