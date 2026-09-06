<template>
  <div class="AdminLayout">
    <header class="admin-gnb">
      <div class="admin-gnb__brand">Baeun Admin</div>
      <ContextSwicher />
    </header>

    <div class="admin-shell">
      <aside class="admin-lnb">
        <nav class="admin-lnb__nav">
          <router-link :to="{ name: 'AdminDashboard' }">대시보드</router-link>
        </nav>

        <section class="admin-lnb__group">
          <p class="admin-lnb__title">사람</p>
          <nav class="admin-lnb__nav">
            <router-link :to="{ name: 'AdminApprovals' }">
              <span>가입 승인</span>
              <span v-if="pendingApprovals > 0" class="admin-lnb__badge">{{ pendingApprovals }}</span>
            </router-link>
            <router-link :to="{ name: 'AdminUsers' }">회원</router-link>
          </nav>
        </section>

        <section class="admin-lnb__group">
          <p class="admin-lnb__title">테넌트</p>
          <nav class="admin-lnb__nav">
            <router-link :to="{ name: 'AdminWorkspaces' }">워크스페이스</router-link>
            <router-link :to="{ name: 'AdminProjects' }">프로젝트</router-link>
            <router-link :to="{ name: 'AdminPublicCatalog' }">공개 검수</router-link>
          </nav>
        </section>

        <section class="admin-lnb__group">
          <p class="admin-lnb__title">커머스</p>
          <nav class="admin-lnb__nav">
            <router-link :to="{ name: 'AdminLicenses' }">라이선스</router-link>
            <router-link :to="{ name: 'AdminAssignments' }">수동 지급</router-link>
            <router-link :to="{ name: 'AdminPayments' }">결제</router-link>
          </nav>
        </section>

        <section class="admin-lnb__group">
          <p class="admin-lnb__title">커뮤니케이션</p>
          <nav class="admin-lnb__nav">
            <router-link :to="{ name: 'AdminBroadcasts' }">시스템 방송</router-link>
          </nav>
        </section>
      </aside>

      <section class="admin-content">
        <router-view />
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import ContextSwicher from "../../components/ContextSwicher.vue";
import api from "../../lib/axios";

const route = useRoute();
const pendingApprovals = ref(0);

const fetchPendingCount = async () => {
  try {
    const res = await api.get("/admin/dashboard");
    pendingApprovals.value = Number(res.data?.kpis?.pendingApprovals || 0);
  } catch {
    pendingApprovals.value = 0;
  }
};

onMounted(fetchPendingCount);

watch(
  () => route.name,
  (name) => {
    if (name === "AdminApprovals" || name === "AdminDashboard") {
      fetchPendingCount();
    }
  }
);
</script>
