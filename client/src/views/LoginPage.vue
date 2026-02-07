<template>
  <main>
    <h1>Sign in</h1>
    <p>Enter your email and password to continue.</p>

    <form @submit.prevent="onSubmit">
      <div>
        <label for="email">Email</label>
        <input
          id="email"
          v-model.trim="email"
          type="email"
          autocomplete="email"
          placeholder="name@company.com"
        />
        <p v-if="errors.email">{{ errors.email }}</p>
      </div>

      <div>
        <label for="password">Password</label>
        <input
          id="password"
          v-model.trim="password"
          type="password"
          autocomplete="current-password"
          placeholder="Password"
        />
        <p v-if="errors.password">{{ errors.password }}</p>
      </div>

      <label>
        <input v-model="remember" type="checkbox" />
        <span>Keep me signed in</span>
      </label>

      <button type="submit" class="btn" :disabled="loading">
        {{ loading ? "Signing in..." : "Sign in" }}
      </button>

      <p v-if="errors.form">{{ errors.form }}</p>
    </form>

    <p>
      No account yet?
      <router-link to="/signup">Create one</router-link>
    </p>
  </main>
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
    errors.email = "Email is required.";
  } else if (!emailPattern.test(email.value)) {
    errors.email = "Enter a valid email address.";
  }

  if (!password.value) {
    errors.password = "Password is required.";
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
    const response = await api.post("/member/login", {
      email: email.value,
      password: password.value,
    });

    if (!response.data?.success) {
      errors.form = response.data?.message || "Login failed.";
      return;
    }

    appStore.setCurrentUser(response.data.data);

    const workspaceRes = await api.get("/workspace/my");
    const workspaces = workspaceRes.data?.data || [];

    if (workspaces.length > 0) {
      router.push(`/workspace/${workspaces[0].id}`);
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
