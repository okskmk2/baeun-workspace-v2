<template>
  <div class="signup">
    <header class="signup__header">
      <h1>{{ t("auth.signup.title") }}</h1>
      <p>{{ t("auth.signup.subtitle") }}</p>
    </header>

    <form class="signup__form" @submit.prevent="onSubmit">
      <div class="signup__field">
        <label for="name">{{ t("auth.signup.fields.name.label") }}</label>
        <input
          id="name"
          v-model.trim="name"
          type="text"
          autocomplete="name"
          :placeholder="t('auth.signup.fields.name.placeholder')"
        />
        <p v-if="errors.name" class="signup__error">{{ errors.name }}</p>
      </div>

      <div class="signup__field">
        <label for="email">{{ t("auth.signup.fields.email.label") }}</label>
        <input
          id="email"
          v-model.trim="email"
          type="email"
          autocomplete="email"
          placeholder="name@company.com"
        />
        <p v-if="emailCheckState === 'checking'" class="signup__hint signup__hint--checking">
          {{ t("auth.signup.emailCheck.checking") }}
        </p>
        <p v-else-if="emailCheckMessage" class="signup__hint" :class="emailCheckToneClass">
          {{ emailCheckMessage }}
        </p>
        <p v-if="errors.email" class="signup__error">{{ errors.email }}</p>
      </div>

      <div class="signup__field">
        <label for="password">{{ t("auth.signup.fields.password.label") }}</label>
        <input
          id="password"
          v-model.trim="password"
          type="password"
          autocomplete="new-password"
          :placeholder="t('auth.signup.fields.password.placeholder')"
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
          <span class="signup__strength-text">
            {{ t("auth.signup.strength.summary", { label: strength.label }) }}
          </span>
        </div>
      </div>

      <div class="signup__field">
        <label for="confirmPassword">{{ t("auth.signup.fields.confirmPassword.label") }}</label>
        <input
          id="confirmPassword"
          v-model.trim="confirmPassword"
          type="password"
          autocomplete="new-password"
          :placeholder="t('auth.signup.fields.confirmPassword.placeholder')"
        />
        <p v-if="errors.confirmPassword" class="signup__error">
          {{ errors.confirmPassword }}
        </p>
      </div>

      <button type="submit" class="btn" :disabled="loading">
        {{ loading ? t("auth.signup.actions.signingUp") : t("auth.signup.actions.signUp") }}
      </button>

      <p v-if="errors.form" class="signup__error">{{ errors.form }}</p>
      <p v-if="successMessage" class="signup__success">{{ successMessage }}</p>
    </form>

    <p class="signup__signin">
      {{ t("auth.signup.signinPrompt") }}
      <router-link to="/login">{{ t("auth.signup.signinLink") }}</router-link>
    </p>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import api from "../../lib/axios";

const { t } = useI18n();
const router = useRouter();

const name = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const successMessage = ref("");
const emailCheckState = ref("idle");
const emailCheckMessage = ref("");
const emailCheckTone = ref("neutral");
const emailCheckTimer = ref(null);
const emailCheckRequestId = ref(0);
const errors = reactive({
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  form: "",
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emailCheckToneClass = computed(() => {
  if (emailCheckTone.value === "success") return "success";
  if (emailCheckTone.value === "error") return "error";
  return "";
});

const clearEmailCheckTimer = () => {
  if (emailCheckTimer.value) {
    clearTimeout(emailCheckTimer.value);
    emailCheckTimer.value = null;
  }
};

const resetEmailCheck = () => {
  emailCheckState.value = "idle";
  emailCheckMessage.value = "";
  emailCheckTone.value = "neutral";
};

const checkEmailAvailability = async (value) => {
  const requestId = emailCheckRequestId.value + 1;
  emailCheckRequestId.value = requestId;
  emailCheckState.value = "checking";
  emailCheckMessage.value = "";

  try {
    const response = await api.get("/members/signup/email-check", {
      params: { email: value },
    });

    if (requestId !== emailCheckRequestId.value) return;

    const available = Boolean(response.data?.available);
    emailCheckState.value = available ? "available" : "taken";
    emailCheckTone.value = available ? "success" : "error";
    emailCheckMessage.value = available
      ? t("auth.signup.emailCheck.available")
      : t("auth.signup.emailCheck.taken");
  } catch (error) {
    if (requestId !== emailCheckRequestId.value) return;

    emailCheckState.value = "error";
    emailCheckTone.value = "error";
    emailCheckMessage.value = error?.response?.data?.message || t("auth.signup.emailCheck.error");
  }
};

watch(email, (value) => {
  errors.email = "";
  clearEmailCheckTimer();

  const normalized = String(value || "").trim();
  if (!normalized) {
    resetEmailCheck();
    return;
  }

  if (!emailPattern.test(normalized)) {
    resetEmailCheck();
    return;
  }

  emailCheckState.value = "checking";
  emailCheckMessage.value = "";
  emailCheckTimer.value = window.setTimeout(() => {
    checkEmailAvailability(normalized);
  }, 350);
});

onBeforeUnmount(() => {
  clearEmailCheckTimer();
});

const strength = computed(() => {
  const value = password.value;
  if (!value) {
    return { label: t("auth.signup.strength.empty"), tone: "empty", percent: 0 };
  }

  let score = 0;
  if (value.length >= 6) score += 1;
  if (value.length >= 10) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  const percent = Math.round((score / 5) * 100);
  if (score <= 2) return { label: t("auth.signup.strength.weak"), tone: "weak", percent };
  if (score <= 4) return { label: t("auth.signup.strength.medium"), tone: "medium", percent };
  return { label: t("auth.signup.strength.strong"), tone: "strong", percent };
});

const validate = () => {
  errors.name = "";
  errors.email = "";
  errors.password = "";
  errors.confirmPassword = "";
  errors.form = "";

  if (!name.value) {
    errors.name = t("auth.signup.errors.nameRequired");
  }

  if (!email.value) {
    errors.email = t("auth.signup.errors.emailRequired");
  } else if (!emailPattern.test(email.value)) {
    errors.email = t("auth.signup.errors.emailInvalid");
  } else if (emailCheckState.value === "taken") {
    errors.email = t("auth.signup.emailCheck.taken");
  }

  if (!password.value) {
    errors.password = t("auth.signup.errors.passwordRequired");
  } else if (password.value.length < 6) {
    errors.password = t("auth.signup.errors.passwordLength");
  }

  if (!confirmPassword.value) {
    errors.confirmPassword = t("auth.signup.errors.confirmRequired");
  } else if (confirmPassword.value !== password.value) {
    errors.confirmPassword = t("auth.signup.errors.confirmMismatch");
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
    await api.post("/members/signup", {
      name: name.value,
      email: email.value,
      password: password.value,
    });

    await router.push({
      path: "/signup/complete",
      query: { email: email.value },
    });
  } catch (error) {
    errors.form = error?.response?.data?.message || t("auth.signup.errors.formDefault");
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
  color: var(--color-text);
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
  color: var(--color-text-muted);
  font-size: 14px;
}

.signup__form {
  width: min(100%, var(--card-width));
  display: grid;
  gap: 16px;
  padding: var(--card-padding);
  background-color: var(--color-page-bg);
  border-radius: 18px;
  border: 1px solid var(--color-border);
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
}

.signup__field label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.signup__field input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--color-input-border);
  background-color: var(--color-input-bg);
  color: var(--color-text);
  caret-color: var(--color-text);
  font-size: 14px;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.signup__field input::placeholder {
  color: var(--color-text-muted);
}

.signup__field input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  background-color: var(--color-page-bg);
}

.signup__hint {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.4;
}

.signup__hint--checking {
  color: var(--color-text-muted);
}

.signup__hint.success {
  color: #15803d;
}

.signup__hint.error {
  color: #b45309;
}

.signup__error {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--color-danger);
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
  background-color: var(--color-border);
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
  background-color: var(--color-danger);
}

.signup__strength-fill.medium {
  background-color: var(--color-warning);
}

.signup__strength-fill.strong {
  background-color: var(--color-success);
}

.signup__strength-text {
  font-size: 12px;
  color: var(--color-text-muted);
}

.signup__success {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--color-success);
}

.signup__form .btn {
  width: 100%;
  min-height: 42px;
  border-radius: 10px;
}

.signup__signin {
  margin-top: 18px;
  font-size: 13px;
  color: var(--color-text-muted);
  text-align: center;
}

.signup__signin a {
  color: var(--color-accent);
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

