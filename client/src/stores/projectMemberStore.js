import { defineStore } from 'pinia'
import api from '../lib/axios'

export const useProjectMemberStore = defineStore('projectMember', {
  state: () => ({
    membersByProject: {}
  }),
  actions: {
    async fetchProjectMembers(projectId, options = {}){
      if(!projectId) return []
      const { force = false } = options
      if(!force && this.membersByProject[projectId]){
        return this.membersByProject[projectId]
      }
      try{
        const res = await api.get(`/projects/${projectId}/members`)
        const members = res.data?.data || []
        this.membersByProject[projectId] = members
        return members
      }catch(e){
        this.membersByProject[projectId] = []
        throw e
      }
    },
    setProjectMembers(projectId, members){
      if(!projectId) return
      this.membersByProject[projectId] = members || []
    },
    getProjectMembers(projectId){
      return this.membersByProject[projectId] || []
    },
    clearProjectMembers(projectId){
      if(!projectId) return
      delete this.membersByProject[projectId]
    }
  }
})
