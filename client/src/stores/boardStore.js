import { defineStore } from 'pinia'
import api from '../lib/axios'

export const useBoardStore = defineStore('board', {
  state: () => ({
    // map of projectId => boards array
    boardsByProject: {}
  }),
  actions: {
    async fetchBoards(projectId){
      if(!projectId) return
      try{
        const res = await api.get(`/boards`, { params: { projectId } })
        this.boardsByProject[projectId] = res.data?.data || []
      }catch(e){
        this.boardsByProject[projectId] = []
        throw e
      }
    },
    getBoards(projectId){
      return this.boardsByProject[projectId] || []
    }
  }
})
