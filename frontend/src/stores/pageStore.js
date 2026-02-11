import { defineStore } from 'pinia'
import api from '../lib/axios'

export const usePageStore = defineStore('page', {
  state: () => ({
    pagesByProject: {}
  }),
  actions: {
    async fetchPages(projectId){
      if(!projectId) return
      try{
        const res = await api.get("/pages", { params: { project_id: projectId } })
        this.pagesByProject[projectId] = res.data?.data || []
      }catch(e){
        this.pagesByProject[projectId] = []
        throw e
      }
    },
    getPages(projectId){
      return this.pagesByProject[projectId] || []
    }
  }
})
