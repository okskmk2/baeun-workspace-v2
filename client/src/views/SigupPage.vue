<template>
  <div class="signup">
    <header class="signup__header">
      <h1>Sign up</h1>
      <p>Start your workspace in minutes.</p>
    </header>

    <form class="signup__form" @submit.prevent="onSubmit">
      <div class="signup__field">
        <label for="name">Name</label>
        <input id="name" v-model.trim="name" type="text" autocomplete="name" placeholder="Name" />
        <p v-if="errors.name" class="signup__error">{{ errors.name }}</p>
      </div>

      <div class="signup__field">
        <label for="email">Email</label>
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
        <label for="password">Password</label>
        <input
          id="password"
          v-model.trim="password"
          type="password"
          autocomplete="new-password"
          placeholder="At least 6 characters"
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
          <span class="signup__strength-text">Password strength: {{ strength.label }}</span>
        </div>
      </div>

      <div class="signup__field">
        <label for="confirmPassword">Confirm password</label>
        <input
          id="confirmPassword"
          v-model.trim="confirmPassword"
          type="password"
          autocomplete="new-password"
          placeholder="Re-enter your password"
        />
        <p v-if="errors.confirmPassword" class="signup__error">
          {{ errors.confirmPassword }}
        </p>
      </div>

      <button type="submit" class="btn" :disabled="loading">
        {{ loading ? "Signing up..." : "Sign up" }}
      </button>

      <p v-if="errors.form" class="signup__error">{{ errors.form }}</p>
      <p v-if="successMessage" class="signup__success">{{ successMessage }}</p>
    </form>

    <p class="signup__signin">
      Already have an account?
      <router-link to="/login">Sign in</router-link>
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
    return { label: "Type a password", tone: "empty", percent: 0 };
  }

  let score = 0;
  if (value.length >= 6) score += 1;
  if (value.length >= 10) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  const percent = Math.round((score / 5) * 100);
  if (score <= 2) return { label: "Weak", tone: "weak", percent };
  if (score <= 4) return { label: "보통", tone: "medium", percent };
  return { label: "Strong", tone: "strong", percent };
});

const validate = () => {
  errors.name = "";
  errors.email = "";
  errors.password = "";
  errors.confirmPassword = "";
  errors.form = "";

  if (!name.value) {
    errors.name = "Please enter your name.";
  }

  if (!email.value) {
    errors.email = "Please enter your email.";
  } else if (!emailPattern.test(email.value)) {
    errors.email = "Please enter a valid email address.";
  }

  if (!password.value) {
    errors.password = "Please enter your password.";
  } else if (password.value.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }

  if (!confirmPassword.value) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (confirmPassword.value !== password.value) {
    errors.confirmPassword = "Passwords do not match.";
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
    const response = await api.post("/members/signup", {
      name: name.value,
      email: email.value,
      password: password.value,
    });

    if (!response.data?.success) {
      errors.form = response.data?.message || "Sign up failed.";
      return;
    }

    const loginResponse = await api.post("/members/login", {
      email: email.value,
      password: password.value,
    });

    if (!loginResponse.data?.success) {
      errors.form = "Sign up succeeded but auto-login failed.";
      return;
    }

    appStore.setCurrentUser(loginResponse.data.data);
    const workspaceRes = await api.get("/workspaces/my");
    const workspaces = workspaceRes.data?.data || [];
    successMessage.value = "Sign up completed. Redirecting...";

    if (workspaces.length > 0) {
      router.push(`/workspace/${workspaces[0].id}`);
    } else {
      router.push("/");
    }
  } catch (error) {
    errors.form = error?.response?.data?.message || "Sign up failed.";
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
  background-color: #ffffff;
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
  background-color: #f8fafc;
  font-size: 14px;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.signup__field input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  background-color: #ffffff;
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
  background-color: #e2e8f0;
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
  background-color: #f87171;
}

.signup__strength-fill.medium {
  background-color: #fbbf24;
}

.signup__strength-fill.strong {
  background-color: #22c55e;
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
