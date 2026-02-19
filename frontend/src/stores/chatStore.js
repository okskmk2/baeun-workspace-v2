import { defineStore } from 'pinia'
import api from '../lib/axios'

export const useChatStore = defineStore('chat', {
  state: () => ({
    roomsByProject: {},
    messagesByRoom: {}
  }),
  actions: {
    getRooms(projectId, options = {}){
      const archived = Boolean(options.archived)
      const bucket = this.roomsByProject[projectId] || { active: [], archived: [] }
      return archived ? (bucket.archived || []) : (bucket.active || [])
    },
    async fetchRooms(projectId, options = {}){
      if(!projectId) return
      const archived = Boolean(options.archived)
      try{
        const res = await api.get("/channels", {
          params: {
            project_id: projectId,
            archived: archived ? 1 : 0,
          }
        })
        const current = this.roomsByProject[projectId] || { active: [], archived: [] }
        this.roomsByProject[projectId] = {
          ...current,
          [archived ? 'archived' : 'active']: res.data || []
        }
      }catch(e){
        const current = this.roomsByProject[projectId] || { active: [], archived: [] }
        this.roomsByProject[projectId] = {
          ...current,
          [archived ? 'archived' : 'active']: []
        }
        throw e
      }
    },
    async fetchMessages(roomId){
      if(!roomId) return
      try{
        const res = await api.get(`/channels/${roomId}/messages`)
        this.messagesByRoom[roomId] = res.data || []
      }catch(e){
        this.messagesByRoom[roomId] = []
        throw e
      }
    },
    async createDmChannel(projectId, targetMemberId){
      const res = await api.post('/channels/dm', {
        project_id: projectId,
        target_member_id: targetMemberId,
      })
      return res.data || null
    },
    updateRoomName(roomId, projectId, name){
      if(!roomId || !projectId) return
      const current = this.roomsByProject[projectId] || { active: [], archived: [] }
      const updateBucket = (rooms) =>
        rooms.map((room) => {
          if(String(room.id) !== String(roomId)) return room
          return {
            ...room,
            name
          }
        })

      this.roomsByProject[projectId] = {
        active: updateBucket(current.active || []),
        archived: updateBucket(current.archived || []),
      }
    }
  }
})
