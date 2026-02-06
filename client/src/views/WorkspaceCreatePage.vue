<template>
  <div class="page-container">
    <header class="page-header">
      <h1>워크스페이스 생성</h1>
    </header>
    <section class="page-body">
      <form @submit.prevent="create">
        <label>
          이름
          <input v-model="name" required />
        </label>
        <div style="margin-top:8px">
          <button class="btn btn-primary" type="submit">생성</button>
        </div>
      </form>
      <p v-if="error" class="error">{{ error }}</p>
    </section>
  </div>
</template>

<script>
import { ref } from 'vue'
import api from '../lib/axios'
import { useRouter } from 'vue-router'

export default {
  name: 'WorkspaceCreatePage',
  setup(){
    const name = ref('')
    const error = ref('')
    const router = useRouter()
    const create = async ()=>{
      error.value = ''
      try{
        const res = await api.post('/workspace', { name: name.value })
        const id = res.data?.data?.id
        if(id) router.push(`/workspace/${id}`)
      }catch(e){ error.value = e.response?.data?.message || e.message }
    }
    return { name, error, create }
  }
}
</script>

<style scoped>
.page-body{padding:12px}
.error{color:#c00;margin-top:8px}
</style>
