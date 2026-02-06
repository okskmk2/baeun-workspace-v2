<template>
  <div class="page-container">
    <header class="page-header">
      <h1>프로필</h1>
    </header>
    <section class="page-body">
      <div v-if="user">
        <p><strong>이름:</strong> {{ user.name || '이름 없음' }}</p>
        <p><strong>이메일:</strong> {{ user.email || '이메일 없음' }}</p>
      </div>
      <div v-else>
        <p>로그인이 필요합니다. <router-link to="/login">로그인</router-link></p>
      </div>
    </section>
  </div>
</template>

<script>
import { useAppStore } from '../stores/appStore'
import { storeToRefs } from 'pinia'

export default {
  name: 'ProfilePage',
  setup(){
    const app = useAppStore()
    const { currentUser } = storeToRefs(app)
    return { user: currentUser }
  }
}
</script>

<style scoped>
.page-container{padding:12px}
</style>
