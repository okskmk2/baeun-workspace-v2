<template>
  <main class="admin-page">
    <header class="admin-page__header">
      <h1>Workspace Slot License Detail</h1>
      <router-link class="back-link" :to="{ name: 'AdminLicenseManager' }">목록으로</router-link>
    </header>

    <section class="wire-card">
      <h2>현재 사용 워크스페이스</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Workspace</th>
              <th scope="col">Owner</th>
              <th scope="col">보유 슬롯</th>
              <th scope="col">사용 슬롯</th>
              <th scope="col">상태</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.workspaceId">
              <td>{{ row.workspaceName }}</td>
              <td>{{ row.owner }}</td>
              <td>{{ row.totalSlots }}</td>
              <td>{{ row.usedSlots }}</td>
              <td>
                <span :class="['status-pill', row.usedSlots <= row.totalSlots ? 'ok' : 'danger']">
                  {{ row.usedSlots <= row.totalSlots ? '정상' : '초과' }}
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
  { workspaceId: 1, workspaceName: "Ops Team", owner: "mira", totalSlots: 12, usedSlots: 9 },
  { workspaceId: 2, workspaceName: "Growth Squad", owner: "jojo", totalSlots: 8, usedSlots: 8 },
  { workspaceId: 3, workspaceName: "Partner Success", owner: "lina", totalSlots: 5, usedSlots: 7 },
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
  min-width: 700px;
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
