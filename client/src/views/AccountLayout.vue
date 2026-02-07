<template>
  <div class="AcountLayout">
    <aside>
      <nav>
        <router-link to="/account/profile">프로필 설정</router-link>
        <router-link to="/account/security">계정 보안</router-link>
        <router-link to="/account/plan">플랜 및 구독</router-link>
        <router-link to="/account/billing">결제 및 청구</router-link>
        <router-link to="/account/workspaces">워크스페이스</router-link>
      </nav>
    </aside>
    <main>
      <router-view />
    </main>
  </div>
</template>
