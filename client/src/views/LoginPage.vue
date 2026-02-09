<template>
  <div class="login">
    <header class="login__header">
      <h1>Login</h1>
      <p>Enter your email and password.</p>
    </header>

    <form class="login__form" @submit.prevent="onSubmit">
      <div class="login__field">
        <label for="email">Email</label>
        <input
          id="email"
          v-model.trim="email"
          type="email"
          autocomplete="email"
          placeholder="name@company.com"
        />
        <p v-if="errors.email" class="login__error">{{ errors.email }}</p>
      </div>

      <div class="login__field">
        <label for="password">Password</label>
        <input
          id="password"
          v-model.trim="password"
          type="password"
          autocomplete="current-password"
          placeholder="Password"
        />
        <p v-if="errors.password" class="login__error">{{ errors.password }}</p>
      </div>

      <label class="login__remember">
        <input v-model="remember" type="checkbox" />
        <span>Remember me</span>
      </label>

      <button type="submit" class="btn" :disabled="loading">
        {{ loading ? "Signing in..." : "Sign in" }}
      </button>

      <p v-if="errors.form" class="login__error">{{ errors.form }}</p>
    </form>

    <p class="login__signup">
      Don't have an account?
      <router-link to="/signup">Sign up</router-link>
    </p>
  </div>
</template>

<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../lib/axios";
import { useAppStore } from "../stores/appStore";

const router = useRouter();
const appStore = useAppStore();

const email = ref("");
const password = ref("");
const remember = ref(false);
const loading = ref(false);
const errors = reactive({
  email: "",
  password: "",
  form: "",
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = () => {
  errors.email = "";
  errors.password = "";
  errors.form = "";

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

  return !errors.email && !errors.password;
};

const onSubmit = async () => {
  if (!validate()) {
    return;
  }

  loading.value = true;
  try {
    const response = await api.post("/members/login", {
      email: email.value,
      password: password.value,
    });

    if (!response.data?.success) {
      errors.form = response.data?.message || "Login failed.";
      return;
    }

    appStore.setCurrentUser(response.data.data);

    if (workspaces.length > 0) {
      router.push("/account/workspaces");
    } else {
      router.push("/");
    }
  } catch (error) {
    errors.form = error?.response?.data?.message || "Login failed.";
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap");

.login {
  --card-width: 380px;
  --card-padding: 28px;
  display: grid;
  place-items: center;
  padding: 32px 16px 48px;
  font-family: "Manrope", "Noto Sans KR", sans-serif;
  color: #0f172a;
}

.login__header {
  text-align: center;
  margin-bottom: 20px;
}

.login__header h1 {
  margin: 0 0 6px;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.login__header p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.login__form {
  width: min(100%, var(--card-width));
  display: grid;
  gap: 16px;
  padding: var(--card-padding);
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
}

.login__field label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.login__field input {
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

.login__field input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  background: #ffffff;
}

.login__remember {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #475569;
}

.login__remember input {
  width: 16px;
  height: 16px;
}

.login__error {
  margin: 6px 0 0;
  font-size: 12px;
  color: #b91c1c;
}

.login__form .btn {
  width: 100%;
  min-height: 42px;
  border-radius: 10px;
}

.login__signup {
  margin-top: 18px;
  font-size: 13px;
  color: #475569;
  text-align: center;
}

.login__signup a {
  color: #1d4ed8;
  font-weight: 600;
}

@media (max-width: 480px) {
  .login__form {
    padding: 22px;
  }

  .login__header h1 {
    font-size: 24px;
  }
}
</style>
