<template>
	<section class="profile">
		<hgroup>
			<h1>{{ t("profile.header.title") }}</h1>
			<p>{{ t("profile.header.subtitle") }}</p>
		</hgroup>

		<p v-if="isLoading" class="status">{{ t("profile.status.loading") }}</p>
		<p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>

		<div v-else class="profile-card">
			<Avatar :text="initials" :label="profile.name" :size="72" />
			<div class="details">
				<div class="detail">
					<span class="label">{{ t("profile.fields.name") }}</span>
					<span class="value">{{ profile.name || "-" }}</span>
				</div>
				<div class="detail">
					<span class="label">{{ t("profile.fields.email") }}</span>
					<span class="value">{{ profile.email || "-" }}</span>
				</div>
				<div class="detail">
					<span class="label">{{ t("profile.fields.joined") }}</span>
					<span class="value">{{ formatDate(profile.created_at) || "-" }}</span>
				</div>
			</div>
		</div>

		<div class="profile-actions">
			<button
				class="btn btn--danger"
				type="button"
				:disabled="isLoggingOut"
				@click="logout"
			>
				{{ isLoggingOut ? t("profile.actions.loggingOut") : t("profile.actions.logout") }}
			</button>
			<p v-if="logoutError" class="status error">{{ logoutError }}</p>
		</div>

		<div class="locale-card" aria-label="Locale settings">
			<div class="locale-header">
				<h2>{{ t("profile.locale.title") }}</h2>
				<p>{{ t("profile.locale.subtitle") }}</p>
			</div>
			<div class="locale-controls">
				<label class="control">
					<span class="control-label">{{ t("profile.locale.language") }}</span>
					<select v-model="locale" class="control-input" aria-label="Language">
						<option value="ko">{{ t("profile.locale.languageOptions.ko") }}</option>
						<option value="en">{{ t("profile.locale.languageOptions.en") }}</option>
						<option value="id">{{ t("profile.locale.languageOptions.id") }}</option>
					</select>
				</label>
				<label class="control">
					<span class="control-label">{{ t("profile.locale.region") }}</span>
					<select v-model="region" class="control-input" aria-label="Region">
						<option value="kr">{{ t("profile.locale.regionOptions.kr") }}</option>
						<option value="us">{{ t("profile.locale.regionOptions.us") }}</option>
					</select>
				</label>
				<button class="save-button" type="button">{{ t("profile.locale.save") }}</button>
			</div>
		</div>
	</section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import api from "../lib/axios";
import { persistLocale, supportedLocales } from "../i18n";
import { useAppStore } from "../stores/appStore";
import Avatar from "../components/Avatar.vue";

const { t, locale } = useI18n();
const router = useRouter();
const appStore = useAppStore();

const isLoading = ref(false);
const errorMessage = ref("");
const profile = ref({});
const region = ref("kr");
const isLoggingOut = ref(false);
const logoutError = ref("");

const fetchProfile = async () => {
	isLoading.value = true;
	errorMessage.value = "";

	try {
		const res = await api.get("/members/me");
		profile.value = res.data?.data || {};
	} catch (error) {
		profile.value = {};
		errorMessage.value = t("profile.status.error");
	} finally {
		isLoading.value = false;
	}
};

const initials = computed(() => {
	const name = profile.value?.name || "";
	if (!name) return "?";
	return name.slice(0, 2).toUpperCase();
});

const formatDate = (value) => {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	const localeMap = {
		ko: "ko-KR",
		en: "en-US",
		id: "id-ID",
	};
	const dateLocale = localeMap[locale.value] || "en-US";
	return date.toLocaleDateString(dateLocale, {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
};

watch(locale, (value) => {
	if (!supportedLocales.includes(value)) return;
	persistLocale(value);
});

const logout = async () => {
	if (isLoggingOut.value) return;
	isLoggingOut.value = true;
	logoutError.value = "";

	try {
		await api.post("/members/logout");
		appStore.setCurrentUser(null);
		await router.push("/login");
	} catch (error) {
		logoutError.value =
			error?.response?.data?.message || t("profile.status.logoutError");
	} finally {
		isLoggingOut.value = false;
	}
};

onMounted(fetchProfile);
</script>

<style scoped>
.profile {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

hgroup h1 {
	margin: 0 0 4px;
	font-size: 20px;
	color: #111827;
}

hgroup p {
	margin: 0;
	color: #6b7280;
	font-size: 14px;
}

.status {
	font-size: 14px;
	color: #6b7280;
}

.status.error {
	color: #b91c1c;
}

.profile-card {
	display: grid;
	grid-template-columns: 72px 1fr;
	gap: 16px;
	padding: 16px;
	border: 1px solid #e5e7eb;
	border-radius: 12px;
	background: #ffffff;
	align-items: center;
}

.profile-actions {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.locale-card {
	padding: 16px;
	border: 1px solid #e5e7eb;
	border-radius: 12px;
	background: #ffffff;
	display: grid;
	gap: 16px;
}

.locale-header h2 {
	margin: 0 0 4px;
	font-size: 16px;
	color: #111827;
}

.locale-header p {
	margin: 0;
	color: #6b7280;
	font-size: 13px;
}

.locale-controls {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
	gap: 12px;
	align-items: end;
}

.control {
	display: grid;
	gap: 6px;
}

.control-label {
	font-size: 12px;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: #9ca3af;
}

.control-input {
	padding: 8px 10px;
	border-radius: 8px;
	border: 1px solid #d1d5db;
	font-size: 14px;
	color: #111827;
	background: #ffffff;
}

.save-button {
	padding: 10px 16px;
	border-radius: 999px;
	border: none;
	background: #111827;
	color: #ffffff;
	font-size: 13px;
	font-weight: 600;
	cursor: pointer;
}

.save-button:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.details {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.detail {
	display: grid;
	grid-template-columns: 80px 1fr;
	gap: 8px;
}

.label {
	font-size: 12px;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: #9ca3af;
}

.value {
	font-size: 14px;
	color: #111827;
}

@media (max-width: 640px) {
	.profile-card {
		grid-template-columns: 1fr;
		text-align: center;
	}

	.detail {
		grid-template-columns: 1fr;
		gap: 2px;
	}

	.label {
		justify-self: center;
	}

	.locale-controls {
		grid-template-columns: 1fr;
	}

	.save-button {
		width: 100%;
	}
}
</style>
