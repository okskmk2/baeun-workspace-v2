<template>
	<main class="billing-page">
		<section class="hero">
			<h1>{{ t("store.features.billing.title") }}</h1>
			<p>{{ t("store.features.billing.description") }}</p>
			<div class="tags">
				<span v-for="tag in billingTags" :key="tag" class="tag">{{ tag }}</span>
			</div>
		</section>

		<section class="grid">
			<article class="card">
				<h2>{{ t("store.sections.payment.title") }}</h2>
				<ul>
					<li v-for="note in paymentNotes" :key="note">{{ note }}</li>
				</ul>
			</article>

			<article class="card">
				<h2>{{ t("store.sections.lifecycle.title") }}</h2>
				<ol>
					<li v-for="step in lifecycleSteps" :key="step.title">
						<strong>{{ step.title }}</strong>
						<p>{{ step.description }}</p>
					</li>
				</ol>
			</article>
		</section>

		<section class="card">
			<h2>{{ t("store.features.billing.title") }}</h2>
			<ul>
				<li v-for="item in billingBullets" :key="item">{{ item }}</li>
			</ul>
		</section>
	</main>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const billingTags = computed(() => [
	t("store.features.billing.tags.0"),
	t("store.features.billing.tags.1"),
	t("store.features.billing.tags.2"),
]);

const billingBullets = computed(() => [
	t("store.features.billing.bullets.0"),
	t("store.features.billing.bullets.1"),
	t("store.features.billing.bullets.2"),
]);

const paymentNotes = computed(() => [
	t("store.sections.payment.bullets.0"),
	t("store.sections.payment.bullets.1"),
	t("store.sections.payment.bullets.2"),
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
</script>

<style scoped>
.billing-page {
	display: grid;
	gap: 16px;
}

.hero,
.card {
	border: 1px solid #e5e7eb;
	border-radius: 12px;
	background-color: #fff;
	padding: 16px;
}

.hero {
	background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), transparent 60%);
}

.hero h1,
.card h2 {
	margin: 0 0 8px;
}

.hero p {
	margin: 0;
	color: #6b7280;
}

.grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
	gap: 12px;
}

.tags {
	margin-top: 10px;
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.tag {
	font-size: 12px;
	border-radius: 999px;
	padding: 4px 10px;
	background-color: rgba(17, 24, 39, 0.08);
}

ul,
ol {
	margin: 0;
	padding-left: 18px;
	display: grid;
	gap: 6px;
}

li p {
	margin: 4px 0 0;
	color: #6b7280;
	font-size: 13px;
}
</style>
