<template>
  <div class="page-container">
    <header class="page-header">
      <div>
        <h1 class="page-header-info">{{ headerTitle }}</h1>
        <p v-if="headerSubtitle">{{ headerSubtitle }}</p>
      </div>
    </header>

    <template v-if="isIssueRoute && !isIssueEmpty">
      <section class="tab-content">
        <div class="flex-between">
          <h3 class="section-title">이슈 보드</h3>
          <router-link :to="`/project/${projectId}/board/new`"><button class="btn btn-primary">+ 새 보드 만들기</button></router-link>
        </div>
        <div class="card-grid">
          <div v-for="b in boards" :key="b.id" class="card">
            <router-link :to="`/project/${projectId}/board/${b.id}`">{{ b.name }}</router-link>
          </div>
          <p v-if="boards.length===0" class="text-light">보드가 없습니다.</p>
        </div>
      </section>
    </template>

    <template v-if="isWikiRoute && !isWikiEmpty">
      <section class="tab-content">
        <div class="flex-between">
          <h3 class="section-title">위키 문서</h3>
          <router-link :to="`/project/${projectId}/wiki/new`"><button class="btn btn-primary">+ 새 페이지 생성</button></router-link>
        </div>
        <div class="lnb-list">
          <router-link v-for="p in pages" :key="p.id" :to="`/project/${projectId}/wiki/${p.id}`" class="lnb-item">{{ p.title }}</router-link>
          <p v-if="pages.length===0" class="text-light">페이지가 없습니다.</p>
        </div>
      </section>
    </template>

    <!-- Empty states -->
    <section v-if="isIssueRoute && isIssueEmpty" class="empty-state-container">
      <div class="empty-state">
        <p>보드가 없습니다. 좌측에서 보드를 선택하거나 새 보드를 만들어보세요.</p>
        <p class="text-light">또는 우측 상단의 버튼으로 새 보드를 생성할 수 있습니다.</p>
      </div>
    </section>

    <section v-if="isWikiRoute && isWikiEmpty" class="empty-state-container">
      <div class="empty-state">
        <p>페이지가 없습니다. 새 페이지를 생성하여 위키를 시작하세요.</p>
        <p class="text-light">또는 우측 상단의 버튼으로 새 페이지를 생성할 수 있습니다.</p>
      </div>
    </section>

  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import api from '../lib/axios'
import { useRoute } from 'vue-router'

export default {
  name: 'ProjectDetailPage',
  setup(){
    const route = useRoute()
    const projectId = route.params.projectId
    const boards = ref([])
    const pages = ref([])

    const isIssueRoute = computed(()=> route.path.includes('/issue'))
    const isWikiRoute = computed(()=> route.path.includes('/wiki'))
    const isIssueEmpty = computed(()=> isIssueRoute.value && boards.value.length===0)
    const isWikiEmpty = computed(()=> isWikiRoute.value && pages.value.length===0)

    const headerTitle = computed(()=>{
      if(isIssueEmpty.value) return '📋 이슈 보드'
      if(isWikiEmpty.value) return '📚 위키 문서'
      return '📂 프로젝트 상세'
    })
    const headerSubtitle = computed(()=>{
      if(isIssueEmpty.value) return '좌측의 보드를 선택하거나 새 보드를 만들어보세요.'
      if(isWikiEmpty.value) return '위키 문서를 생성하여 내용을 추가해보세요.'
      return ''
    })

    onMounted(async ()=>{
      if(projectId){
        try{
          const b = await api.get(`/project/${projectId}/boards`)
          boards.value = b.data.data || []
        }catch(e){ boards.value = [] }
        try{
          const p = await api.get(`/project/${projectId}/pages`)
          pages.value = p.data.data || []
        }catch(e){ pages.value = [] }
      }
    })

    return { projectId, boards, pages, isIssueRoute, isWikiRoute, isIssueEmpty, isWikiEmpty, headerTitle, headerSubtitle }
  }
}
</script>

<style scoped>
.page-container{padding:8px}
.empty-state-container{display:flex;align-items:center;justify-content:center;padding:40px}
.empty-state{max-width:640px;text-align:center;background:#fff;padding:24px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
.card-grid{display:flex;gap:12px;flex-wrap:wrap}
.card{background:#fff;padding:12px;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,0.04)}
.lnb-list{display:flex;flex-direction:column;gap:8px}
</style>
