<template>
  <div class="page-container">
    <header class="page-header">
      <div>
        <h1 class="page-header-info">🗂️ 워크스페이스</h1>
        <p>계정에 속한 워크스페이스 목록입니다.</p>
      </div>
    </header>

    <section class="page-body">
      <div v-if="loading">로딩 중...</div>
      <div v-else>
        <ul v-if="workspaces.length">
          <li v-for="ws in workspaces" :key="ws.id">
            <router-link :to="`/workspace/${ws.id}`">{{ ws.name }}</router-link>
          </li>
        </ul>
        <div v-else class="empty-state">
          <p>참여 중인 워크스페이스가 없습니다.</p>
          <router-link to="/workspace/create" class="btn btn-primary">워크스페이스 생성</router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import api from '../lib/axios'

export default {
  name: 'WorkspaceListPage',
  setup(){
    const workspaces = ref([])
    const loading = ref(true)

    const load = async ()=>{
      loading.value = true
      try{
        const res = await api.get('/workspace/my')
        workspaces.value = res.data?.data || []
      }catch(e){
        workspaces.value = []
      }finally{ loading.value = false }
    }

    onMounted(load)
    return { workspaces, loading }
  }
}
</script>

<style scoped>
.page-body{padding:12px}
.empty-state{padding:16px;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
</style>
