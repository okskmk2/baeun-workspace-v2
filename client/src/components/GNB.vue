<template>
  <nav class="gnb-inner" role="navigation" aria-label="Global Navigation">
    <div class="gnb-left">
      <router-link to="/">workspace.baeun</router-link>
      <template v-if="currentUser">
        <span class="sep">·</span>
        <router-link to="/workspace">워크스페이스</router-link>
      </template>
    </div>
    <div class="gnb-right">
      <template v-if="!currentUser">
        <router-link to="/login">로그인</router-link>
        <span class="sep">|</span>
        <router-link to="/signup">회원가입</router-link>
      </template>
      <template v-else>
        <router-link :to="{ name: 'Profile' }">{{ currentUser.name || 'Profile' }}</router-link>
        <button class="logout" @click="logout">로그아웃</button>
      </template>
    </div>
  </nav>
</template>

<script>
import { useAppStore } from '../stores/appStore'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

export default {
  name: 'GNB',
  setup(){
    const app = useAppStore()
    const { currentUser } = storeToRefs(app)
    const logout = ()=> app.setCurrentUser(null)
    return { currentUser, logout }
  }
}
</script>

<style scoped>
.gnb-inner{display:flex;justify-content:space-between;width:100%;align-items:center}
.gnb-left a{font-weight:600;color:var(--color-primary);text-decoration:none}
.gnb-right a{color:var(--muted);text-decoration:none;margin-right:8px}
.gnb-right .sep{margin:0 6px;color:var(--muted)}
.logout{background:transparent;border:0;color:var(--muted);cursor:pointer}
</style>
