<template>
  <aside class="lnb-inner" role="navigation" aria-label="Left Navigation">
    <ul v-if="hasProject">
      <li><router-link :to="{ name: 'ProjectIssues', params: { projectId } }">Issues</router-link></li>
      <li><router-link :to="{ name: 'ProjectWiki', params: { projectId } }">Wiki</router-link></li>
      <li><router-link :to="{ name: 'ChatDashboard', params: { projectId } }">Chat</router-link></li>
    </ul>
  </aside>
</template>

<script>
import { useRoute } from 'vue-router'
import { computed } from 'vue'

export default {
  name: 'LNB',
  setup(){
    const route = useRoute()
    const projectId = computed(()=> route.params.projectId)
    const hasProject = computed(()=> !!projectId.value)
    return { projectId, hasProject }
  }
}
</script>

<style scoped>
.lnb-inner{padding:12px}
.lnb-inner ul{list-style:none;padding:0;margin:0}
.lnb-inner li{margin:8px 0}
</style>
