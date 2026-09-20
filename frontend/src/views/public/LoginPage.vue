<template>
  <div class="login">
    <header class="login__header">
      <h1>{{ t("auth.login.title") }}</h1>
      <p>{{ passkeyAvailable ? t("auth.login.subtitlePasskey") : t("auth.login.subtitle") }}</p>
    </header>

    <div class="login__form">
      <template v-if="passkeyAvailable">
        <button
          type="button"
          class="btn"
          :disabled="isBusy"
          :aria-busy="pending === 'passkey' ? 'true' : 'false'"
          @click="onPasskeyLogin"
        >
          <MaterialSymbol
            v-if="pending === 'passkey'"
            class="login__spinner"
            name="progress_activity"
            :size="18"
            alt=""
          />
          {{
            pending === "passkey"
              ? t("auth.login.actions.signingIn")
              : t("auth.login.actions.passkey")
          }}
        </button>
        <p class="login__divider">{{ t("auth.login.orPassword") }}</p>
      </template>

      <form class="login__password" @submit.prevent="onSubmit">
        <div class="login__field">
          <label for="email">{{ t("auth.login.fields.email.label") }}</label>
          <input
            id="email"
            v-model.trim="email"
            type="email"
            autocomplete="username webauthn"
            placeholder="name@company.com"
          />
          <p v-if="errors.email" class="login__error">{{ errors.email }}</p>
        </div>

        <div class="login__field">
          <label for="password">{{ t("auth.login.fields.password.label") }}</label>
          <input
            id="password"
            v-model.trim="password"
            type="password"
            autocomplete="current-password"
            :placeholder="t('auth.login.fields.password.placeholder')"
          />
          <p v-if="errors.password" class="login__error">{{ errors.password }}</p>
        </div>

        <label class="login__remember">
          <input v-model="remember" type="checkbox" />
          <span>{{ t("auth.login.remember") }}</span>
        </label>

        <button
          type="submit"
          class="btn"
          :class="{ 'btn--secondary': passkeyAvailable }"
          :disabled="isBusy"
          :aria-busy="pending === 'password' ? 'true' : 'false'"
        >
          <MaterialSymbol
            v-if="pending === 'password'"
            class="login__spinner"
            name="progress_activity"
            :size="18"
            alt=""
          />
          {{
            pending === "password"
              ? t("auth.login.actions.signingIn")
              : t("auth.login.actions.signIn")
          }}
        </button>
      </form>

      <p v-if="errors.form" class="login__error">{{ errors.form }}</p>
    </div>

    <p class="login__signup">
      {{ t("auth.login.signupPrompt") }}
      <router-link to="/signup">{{ t("auth.login.signupLink") }}</router-link>
    </p>

    <PasskeyOfferModal
      :open="offerOpen"
      :busy="offerBusy"
      :error="offerError"
      @skip="skipPasskeyOffer"
      @accept="acceptPasskeyOffer"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import MaterialSymbol from "../../components/MaterialSymbol.vue";
import PasskeyOfferModal from "../../components/modals/PasskeyOfferModal.vue";
import api from "../../lib/axios";
import {
  authenticatePasskey,
  cancelPasskeyCeremony,
  dismissPasskeyOffer,
  isPasskeyCanceled,
  isPasskeyOfferDismissed,
  isPasskeyTimeout,
  registerPasskey,
  supportsPasskeys,
} from "../../lib/passkey";
import { useAppStore } from "../../stores/appStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const appStore = useAppStore();
const workspaceStore = useWorkspaceStore();

const email = ref("");
const password = ref("");
const remember = ref(false);
const pending = ref(null);
const passkeyAvailable = ref(false);
const offerOpen = ref(false);
const offerBusy = ref(false);
const offerError = ref("");
const isBusy = computed(() => Boolean(pending.value) || offerOpen.value);
let offerResolve = null;
const errors = ref({
  email: "",
  password: "",
  form: "",
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = () => {
  errors.value.email = "";
  errors.value.password = "";
  errors.value.form = "";

  if (!email.value) {
    errors.value.email = t("auth.login.errors.emailRequired");
  } else if (!emailPattern.test(email.value)) {
    errors.value.email = t("auth.login.errors.emailInvalid");
  }

  if (!password.value) {
    errors.value.password = t("auth.login.errors.passwordRequired");
  } else if (password.value.length < 6) {
    errors.value.password = t("auth.login.errors.passwordLength");
  }

  return !errors.value.email && !errors.value.password;
};

const redirectAfterLogin = async () => {
  const redirect = Array.isArray(route.query.redirect) ? route.query.redirect[0] : route.query.redirect;
  if (typeof redirect === "string" && redirect.startsWith("/") && !redirect.startsWith("//")) {
    await router.push(redirect);
    return;
  }

  const workspaces = await workspaceStore.fetchWorkspaces({ force: true });
  if (workspaces.length > 0) {
    await router.push("/settings/workspaces");
    return;
  }
  await router.push("/");
};

const finishPasskeyOffer = () => {
  offerOpen.value = false;
  offerBusy.value = false;
  offerError.value = "";
  offerResolve?.();
  offerResolve = null;
};

const maybeOfferPasskey = (userId) => {
  if (!supportsPasskeys() || isPasskeyOfferDismissed(userId)) {
    return Promise.resolve();
  }
  cancelPasskeyCeremony();
  offerError.value = "";
  offerBusy.value = false;
  offerOpen.value = true;
  return new Promise((resolve) => {
    offerResolve = resolve;
  });
};

const skipPasskeyOffer = () => {
  if (offerBusy.value) return;
  dismissPasskeyOffer(appStore.currentUser?.id);
  finishPasskeyOffer();
};

const acceptPasskeyOffer = async () => {
  if (offerBusy.value) return;
  offerBusy.value = true;
  offerError.value = "";
  try {
    await registerPasskey("");
    dismissPasskeyOffer(appStore.currentUser?.id);
    finishPasskeyOffer();
  } catch (error) {
    offerBusy.value = false;
    if (isPasskeyTimeout(error)) {
      offerError.value = t("auth.login.passkeyOffer.timeout");
      return;
    }
    if (isPasskeyCanceled(error)) {
      offerError.value = t("auth.login.passkeyOffer.canceled");
      return;
    }
    offerError.value = error?.response?.data?.message || t("auth.login.passkeyOffer.error");
  }
};

const afterAuthenticated = async ({ offerPasskey = false } = {}) => {
  const response = await api.get("/members/me");
  appStore.setCurrentUser(response.data);
  pending.value = null;
  if (offerPasskey) {
    await maybeOfferPasskey(response.data?.id);
  }
  await redirectAfterLogin();
};

const applyAuthError = (error) => {
  if (error?.response?.status === 403) {
    errors.value.form = t("auth.login.errors.approvalPending");
    return;
  }
  errors.value.form = error?.response?.data?.message || t("auth.login.errors.formDefault");
};

const onSubmit = async () => {
  if (!validate()) {
    return;
  }

  cancelPasskeyCeremony();
  pending.value = "password";
  try {
    await api.post("/members/login", {
      email: email.value,
      password: password.value,
      remember: remember.value,
    });
    await afterAuthenticated({ offerPasskey: true });
  } catch (error) {
    applyAuthError(error);
  } finally {
    pending.value = null;
  }
};

const onPasskeyLogin = async () => {
  errors.value.form = "";
  pending.value = "passkey";
  try {
    await authenticatePasskey({
      email: email.value,
      remember: remember.value,
    });
    await afterAuthenticated();
  } catch (error) {
    if (isPasskeyCanceled(error)) {
      errors.value.form = t("auth.login.errors.passkeyCanceled");
      return;
    }
    applyAuthError(error);
  } finally {
    pending.value = null;
  }
};

onMounted(() => {
  passkeyAvailable.value = supportsPasskeys();
});

onBeforeUnmount(() => {
  cancelPasskeyCeremony();
  if (offerResolve) {
    offerResolve();
    offerResolve = null;
  }
});
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
  color: var(--color-text);
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
  color: var(--color-text-muted);
  font-size: 14px;
}

.login__form,
.login__password {
  display: grid;
  gap: 16px;
}

.login__form {
  width: min(100%, var(--card-width));
  padding: var(--card-padding);
  background-color: var(--color-page-bg);
  border-radius: 18px;
  border: 1px solid var(--color-border);
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
}

.login__field label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.login__field input {
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

.login__field input::placeholder {
  color: var(--color-text-muted);
}

.login__field input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  background-color: var(--color-page-bg);
}

.login__remember {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text-muted);
}

.login__remember input {
  width: 16px;
  height: 16px;
}

.login__error {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--color-danger);
}

.login__form .btn {
  width: 100%;
  min-height: 42px;
  border-radius: 10px;
}

.login__spinner {
  flex-shrink: 0;
  animation: login-spin 0.8s linear infinite;
}

@keyframes login-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .login__spinner {
    animation: none;
  }
}

.login__divider {
  margin: 0;
  text-align: center;
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.login__signup {
  margin-top: 18px;
  font-size: 13px;
  color: var(--color-text-muted);
  text-align: center;
}

.login__signup a {
  color: var(--color-accent);
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
