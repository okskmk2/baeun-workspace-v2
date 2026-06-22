<template>
  <main class="signup-complete">
    <section class="signup-complete__card">
      <p class="signup-complete__eyebrow">{{ t("auth.signupComplete.eyebrow") }}</p>
      <h1>{{ t("auth.signupComplete.title") }}</h1>
      <p class="signup-complete__lead">{{ t("auth.signupComplete.lead") }}</p>
      <p class="signup-complete__detail">{{ t("auth.signupComplete.detail") }}</p>

      <div class="signup-complete__actions">
        <router-link class="btn" to="/login">{{ t("auth.signupComplete.actions.login") }}</router-link>
        <router-link class="signup-complete__link" to="/">{{ t("auth.signupComplete.actions.home") }}</router-link>
      </div>
    </section>
  </main>
</template>

<script setup>
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap");

.signup-complete {
  min-height: calc(100vh - 80px);
  display: grid;
  place-items: center;
  padding: 32px 16px 48px;
  font-family: "Manrope", "Noto Sans KR", sans-serif;
  color: var(--color-text);
}

.signup-complete__card {
  width: min(100%, 520px);
  padding: 32px;
  border-radius: 20px;
  border: 1px solid var(--color-border);
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.12), transparent 45%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.98));
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
}

.signup-complete__eyebrow {
  margin: 0 0 10px;
  color: var(--color-accent);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.signup-complete__card h1 {
  margin: 0 0 12px;
  font-size: 32px;
  line-height: 1.15;
}

.signup-complete__lead {
  margin: 0 0 8px;
  color: var(--color-text);
  font-size: 16px;
  font-weight: 600;
}

.signup-complete__detail {
  margin: 0;
  color: var(--color-text-muted);
  line-height: 1.7;
}

.signup-complete__actions {
  margin-top: 24px;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.signup-complete__link {
  color: var(--color-accent);
  font-weight: 600;
}

@media (max-width: 640px) {
  .signup-complete__card {
    padding: 24px;
  }

  .signup-complete__card h1 {
    font-size: 28px;
  }
}
</style>
