<template>
	<section class="profile">
		<hgroup>
			<h1>내 프로필</h1>
			<p>기본 정보를 확인하세요.</p>
		</hgroup>

		<p v-if="isLoading" class="status">불러오는 중...</p>
		<p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>

		<div v-else class="profile-card">
			<div class="avatar" aria-hidden="true">
				{{ initials }}
			</div>
			<div class="details">
				<div class="detail">
					<span class="label">이름</span>
					<span class="value">{{ profile.name || "-" }}</span>
				</div>
				<div class="detail">
					<span class="label">이메일</span>
					<span class="value">{{ profile.email || "-" }}</span>
				</div>
				<div class="detail">
					<span class="label">가입일</span>
					<span class="value">{{ formatDate(profile.created_at) || "-" }}</span>
				</div>
			</div>
		</div>
	</section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import api from "../lib/axios";

const isLoading = ref(false);
const errorMessage = ref("");
const profile = ref({});

const fetchProfile = async () => {
	isLoading.value = true;
	errorMessage.value = "";

	try {
		const res = await api.get("/member/me");
		profile.value = res.data?.data || {};
	} catch (error) {
		profile.value = {};
		errorMessage.value = "프로필 정보를 불러오지 못했습니다.";
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
	return date.toLocaleDateString("ko-KR", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
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

.avatar {
	width: 72px;
	height: 72px;
	border-radius: 24px;
	background: #111827;
	color: #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-weight: 700;
	font-size: 18px;
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
}
</style>
