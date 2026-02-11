import { defineStore } from 'pinia'
import api from '../lib/axios'

export const useChatStore = defineStore('chat', {
  state: () => ({
    roomsByProject: {},
    messagesByRoom: {}
  }),
  actions: {
    getRooms(projectId){
      return this.roomsByProject[projectId] || []
    },
    async fetchRooms(projectId){
      if(!projectId) return
      try{
        const res = await api.get("/channels", { params: { project_id: projectId } })
        this.roomsByProject[projectId] = res.data?.data || []
      }catch(e){
        this.roomsByProject[projectId] = []
        throw e
      }
    },
    async fetchMessages(roomId){
      if(!roomId) return
      try{
        const res = await api.get(`/channels/${roomId}/messages`)
        this.messagesByRoom[roomId] = res.data?.data || []
      }catch(e){
        this.messagesByRoom[roomId] = []
        throw e
      }
    },
    updateRoomName(roomId, projectId, name){
      if(!roomId || !projectId) return
      const current = this.roomsByProject[projectId] || []
      this.roomsByProject[projectId] = current.map((room) => {
        if(String(room.id) !== String(roomId)) return room
        return {
          ...room,
          name
        }
      })
    }
  }
})
