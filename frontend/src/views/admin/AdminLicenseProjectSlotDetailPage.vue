<template>
  <main class="admin-page">
    <header class="admin-page__header">
      <h1>Project Slot License Detail</h1>
      <router-link class="back-link" :to="{ name: 'AdminLicenseManager' }">목록으로</router-link>
    </header>

    <section class="wire-card">
      <h2>현재 사용 프로젝트</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Project</th>
              <th scope="col">Workspace</th>
              <th scope="col">Owner</th>
              <th scope="col">연결 상태</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.projectId">
              <td>{{ row.projectName }}</td>
              <td>{{ row.workspaceName }}</td>
              <td>{{ row.owner }}</td>
              <td>
                <span :class="['status-pill', row.connected ? 'ok' : 'danger']">
                  {{ row.connected ? '연결됨' : '미연결' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<script setup>
const rows = [
  { projectId: 1011, projectName: "Q2 Launch", workspaceName: "Growth Squad", owner: "mira", connected: true },
  { projectId: 1012, projectName: "CRM Cleanup", workspaceName: "Ops Team", owner: "jojo", connected: true },
  { projectId: 1013, projectName: "Support Revamp", workspaceName: "Partner Success", owner: "lina", connected: false },
];
</script>

<style scoped>
.admin-page {
  display: grid;
  gap: 16px;
}

.admin-page__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

h1 {
  margin: 0;
}

.wire-card {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-page-bg);
  padding: 14px;
}

.wire-card h2 {
  margin: 0 0 10px;
  font-size: 1rem;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 680px;
}

th,
td {
  text-align: left;
  padding: 10px 8px;
  border-bottom: 1px solid var(--color-border);
}

th {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.8rem;
  border: 1px solid var(--color-border);
}

.status-pill.ok {
  color: var(--color-success);
  border-color: color-mix(in srgb, var(--color-success) 45%, var(--color-border));
}

.status-pill.danger {
  color: var(--color-danger);
  border-color: color-mix(in srgb, var(--color-danger) 45%, var(--color-border));
}

.back-link {
  color: var(--color-link, var(--color-text));
  text-decoration: underline;
}
</style>
