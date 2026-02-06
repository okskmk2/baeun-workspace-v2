<template>
  <div class="page-container">
    <header class="page-header">
      <h1>워크스페이스 상세</h1>
      <p v-if="workspace">{{ workspace.name }}</p>
    </header>

    <section class="page-body">
      <div v-if="loading">로딩 중...</div>
      <div v-else-if="workspace">
        <p>워크스페이스 ID: {{ workspaceId }}</p>
        <p>간단한 워크스페이스 정보 자리표시자입니다.</p>
      </div>
      <div v-else class="empty-state">
        <p>워크스페이스를 찾을 수 없습니다.</p>
      </div>
    </section>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../lib/axios'

export default {
  name: 'WorkspaceDetailPage',
  setup(){
    const route = useRoute()
    const workspaceId = route.params.workspaceId
    const workspace = ref(null)
    const loading = ref(true)

    const load = async ()=>{
      loading.value = true
      try{
        const res = await api.get(`/workspace/${workspaceId}`)
        workspace.value = res.data?.data || null
      }catch(e){ workspace.value = null }
      finally{ loading.value = false }
    }

    onMounted(load)
    return { workspaceId, workspace, loading }
  }
}
</script>

<style scoped>
.page-body{padding:12px}
.empty-state{padding:16px;background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
</style>
