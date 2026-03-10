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

<style scoped>
.AdminLayout {
  min-height: 100vh;
  background: #f3f4f6;
  color: #111827;
}

.admin-gnb {
  height: 64px;
  border-bottom: 1px solid #d1d5db;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.admin-gnb__brand {
  font-size: 20px;
  font-weight: 800;
}

.admin-shell {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  min-height: calc(100vh - 64px);
}

.admin-lnb {
  border-right: 1px solid #d1d5db;
  background: #ffffff;
  padding: 18px 14px;
}

.admin-lnb__title {
  margin: 0 0 10px;
  font-size: 12px;
  text-transform: uppercase;
  color: #6b7280;
}

.admin-lnb__nav {
  display: grid;
  gap: 6px;
}

.admin-lnb__nav a {
  text-decoration: none;
  color: #111827;
  border-radius: 8px;
  padding: 10px 12px;
}

.admin-lnb__nav a.router-link-active {
  background: #e5e7eb;
  font-weight: 700;
}

.admin-content {
  padding: 20px;
}

@media (max-width: 860px) {
  .admin-shell {
    grid-template-columns: 1fr;
  }

  .admin-lnb {
    border-right: 0;
    border-bottom: 1px solid #d1d5db;
  }

  .admin-lnb__nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
