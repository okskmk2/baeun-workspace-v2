<template>
  <div class="AcountLayout">
    <aside>
      <nav>
        <router-link to="/account/profile">Profile</router-link>
        <router-link to="/account/security">계정 보안</router-link>
        <router-link to="/account/plan">Plan & Subscription</router-link>
        <router-link to="/account/billing">Billing History</router-link>
        <router-link to="/account/workspaces">Workspaces</router-link>
      </nav>
    </aside>
    <main>
      <router-view />
    </main>
  </div>
</template>
