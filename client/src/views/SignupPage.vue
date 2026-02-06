<template>
  <div class="page-container">
    <header class="page-header">
      <h1>회원가입</h1>
    </header>

    <section class="page-body">
      <form @submit.prevent="onSubmit" class="auth-form">
        <label>
          이름
          <input v-model="name" type="text" required />
        </label>
        <label>
          이메일
          <input v-model="email" type="email" required />
        </label>
        <label>
          비밀번호
          <input v-model="password" type="password" required minlength="6" />
        </label>
        <div class="actions">
          <button type="submit" class="btn btn-primary">회원가입</button>
          <router-link to="/login" class="btn btn-link">로그인</router-link>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </section>
  </div>
</template>

<script>
import api from '../lib/axios'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/appStore'

export default {
  name: 'SignupPage',
  data(){
    return { name: '', email: '', password: '', error: '' }
  },
  setup(){
    const router = useRouter()
    const app = useAppStore()
    return { router, app }
  },
  methods: {
    async onSubmit(){
      this.error = ''
      try{
        await api.post('/member/signup', { name: this.name, email: this.email, password: this.password })
        // after signup, perform login to get session + user data
        const res = await api.post('/member/login', { email: this.email, password: this.password })
        if(res.data && res.data.success){
          const user = res.data.data
          this.app.setCurrentUser(user)
          this.router.push('/')
        }else{
          this.error = res.data?.message || '회원가입 후 로그인에 실패했습니다.'
        }
      }catch(e){
        this.error = e.response?.data?.message || e.message || '서버 에러'
      }
    }
  }
}
</script>

<style scoped>
.page-container{padding:12px}
.auth-form{display:flex;flex-direction:column;gap:8px;max-width:360px}
.auth-form label{display:flex;flex-direction:column}
.actions{display:flex;gap:8px;align-items:center;margin-top:8px}
.error{color:#c00;margin-top:8px}
</style>
