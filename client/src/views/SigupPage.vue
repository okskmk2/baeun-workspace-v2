<template>
  <div class="signup">
    <header class="signup__header">
      <h1>회원가입</h1>
      <p>몇 분 만에 워크스페이스를 시작하세요.</p>
    </header>

    <form class="signup__form" @submit.prevent="onSubmit">
      <div class="signup__field">
        <label for="name">이름</label>
        <input id="name" v-model.trim="name" type="text" autocomplete="name" placeholder="이름" />
        <p v-if="errors.name" class="signup__error">{{ errors.name }}</p>
      </div>

      <div class="signup__field">
        <label for="email">이메일</label>
        <input
          id="email"
          v-model.trim="email"
          type="email"
          autocomplete="email"
          placeholder="name@company.com"
        />
        <p v-if="errors.email" class="signup__error">{{ errors.email }}</p>
      </div>

      <div class="signup__field">
        <label for="password">비밀번호</label>
        <input
          id="password"
          v-model.trim="password"
          type="password"
          autocomplete="new-password"
          placeholder="6자 이상"
        />
        <p v-if="errors.password" class="signup__error">{{ errors.password }}</p>
        <div class="signup__strength">
          <div class="signup__strength-bar">
            <span
              class="signup__strength-fill"
              :class="strength.tone"
              :style="{ width: strength.percent + '%' }"
            ></span>
          </div>
          <span class="signup__strength-text">비밀번호 강도: {{ strength.label }}</span>
        </div>
      </div>

      <div class="signup__field">
        <label for="confirmPassword">비밀번호 확인</label>
        <input
          id="confirmPassword"
          v-model.trim="confirmPassword"
          type="password"
          autocomplete="new-password"
          placeholder="비밀번호를 다시 입력"
        />
        <p v-if="errors.confirmPassword" class="signup__error">
          {{ errors.confirmPassword }}
        </p>
      </div>

      <button type="submit" class="btn" :disabled="loading">
        {{ loading ? "가입 중..." : "회원가입" }}
      </button>

      <p v-if="errors.form" class="signup__error">{{ errors.form }}</p>
      <p v-if="successMessage" class="signup__success">{{ successMessage }}</p>
    </form>

    <p class="signup__signin">
      이미 계정이 있으신가요?
      <router-link to="/login">로그인</router-link>
    </p>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../lib/axios";
import { useAppStore } from "../stores/appStore";

const router = useRouter();
const appStore = useAppStore();

const name = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const successMessage = ref("");
const errors = reactive({
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  form: "",
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const strength = computed(() => {
  const value = password.value;
  if (!value) {
    return { label: "입력하세요", tone: "empty", percent: 0 };
  }

  let score = 0;
  if (value.length >= 6) score += 1;
  if (value.length >= 10) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  const percent = Math.round((score / 5) * 100);
  if (score <= 2) return { label: "약함", tone: "weak", percent };
  if (score <= 4) return { label: "보통", tone: "medium", percent };
  return { label: "강함", tone: "strong", percent };
});

const validate = () => {
  errors.name = "";
  errors.email = "";
  errors.password = "";
  errors.confirmPassword = "";
  errors.form = "";

  if (!name.value) {
    errors.name = "이름을 입력해 주세요.";
  }

  if (!email.value) {
    errors.email = "이메일을 입력해 주세요.";
  } else if (!emailPattern.test(email.value)) {
    errors.email = "올바른 이메일 형식을 입력해 주세요.";
  }

  if (!password.value) {
    errors.password = "비밀번호를 입력해 주세요.";
  } else if (password.value.length < 6) {
    errors.password = "비밀번호는 6자 이상이어야 합니다.";
  }

  if (!confirmPassword.value) {
    errors.confirmPassword = "비밀번호를 다시 입력해 주세요.";
  } else if (confirmPassword.value !== password.value) {
    errors.confirmPassword = "비밀번호가 일치하지 않습니다.";
  }

  return !errors.name && !errors.email && !errors.password && !errors.confirmPassword;
};

const onSubmit = async () => {
  if (!validate()) {
    return;
  }

  loading.value = true;
  successMessage.value = "";
  try {
    const response = await api.post("/member/signup", {
      name: name.value,
      email: email.value,
      password: password.value,
    });

    if (!response.data?.success) {
      errors.form = response.data?.message || "회원가입에 실패했습니다.";
      return;
    }

    const loginResponse = await api.post("/member/login", {
      email: email.value,
      password: password.value,
    });

    if (!loginResponse.data?.success) {
      errors.form = "가입은 완료되었지만 자동 로그인에 실패했습니다.";
      return;
    }

    appStore.setCurrentUser(loginResponse.data.data);
    const workspaceRes = await api.get("/workspace/my");
    const workspaces = workspaceRes.data?.data || [];
    successMessage.value = "가입이 완료되었습니다. 이동 중...";

    if (workspaces.length > 0) {
      router.push(`/workspace/${workspaces[0].id}`);
    } else {
      router.push("/");
    }
  } catch (error) {
    errors.form = error?.response?.data?.message || "회원가입에 실패했습니다.";
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap");

.signup {
  --card-width: 420px;
  --card-padding: 28px;
  display: grid;
  place-items: center;
  padding: 32px 16px 48px;
  font-family: "Manrope", "Noto Sans KR", sans-serif;
  color: #0f172a;
}

.signup__header {
  text-align: center;
  margin-bottom: 20px;
}

.signup__header h1 {
  margin: 0 0 6px;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.signup__header p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.signup__form {
  width: min(100%, var(--card-width));
  display: grid;
  gap: 16px;
  padding: var(--card-padding);
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
}

.signup__field label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.signup__field input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 14px;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.signup__field input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  background: #ffffff;
}

.signup__error {
  margin: 6px 0 0;
  font-size: 12px;
  color: #b91c1c;
}

.signup__strength {
  display: grid;
  gap: 6px;
  margin-top: 10px;
}

.signup__strength-bar {
  position: relative;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.signup__strength-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  border-radius: inherit;
  transition: width 0.2s ease;
}

.signup__strength-fill.empty,
.signup__strength-fill.weak {
  background: #f87171;
}

.signup__strength-fill.medium {
  background: #fbbf24;
}

.signup__strength-fill.strong {
  background: #22c55e;
}

.signup__strength-text {
  font-size: 12px;
  color: #64748b;
}

.signup__success {
  margin: 6px 0 0;
  font-size: 12px;
  color: #16a34a;
}

.signup__form .btn {
  width: 100%;
  min-height: 42px;
  border-radius: 10px;
}

.signup__signin {
  margin-top: 18px;
  font-size: 13px;
  color: #475569;
  text-align: center;
}

.signup__signin a {
  color: #1d4ed8;
  font-weight: 600;
}

@media (max-width: 480px) {
  .signup__form {
    padding: 22px;
  }

  .signup__header h1 {
    font-size: 24px;
  }
}
</style>
