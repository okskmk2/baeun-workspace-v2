<template>
  <div class="AdminLayout">
    <header class="admin-gnb">
      <div class="admin-gnb__brand">Baeun Admin</div>
      <ContextSwicher />
    </header>

    <div class="admin-shell">
      <aside class="admin-lnb">
        <p class="admin-lnb__title">Management</p>
        <nav class="admin-lnb__nav">
          <router-link :to="{ name: 'AdminDashboard' }">Dashboard</router-link>
          <router-link :to="{ name: 'AdminUserWorkspaceManager' }">Users & Workspaces</router-link>
          <router-link :to="{ name: 'AdminBillingManager' }">Billing</router-link>
          <router-link :to="{ name: 'AdminLicenseManager' }">Licenses</router-link>
          <router-link :to="{ name: 'AdminNotificationManager' }">Notifications</router-link>
        </nav>
      </aside>

      <section class="admin-content">
        <router-view />
      </section>
    </div>
  </div>
</template>

<script setup>
import ContextSwicher from "../../components/ContextSwicher.vue";
</script>
