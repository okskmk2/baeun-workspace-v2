import { defineStore } from 'pinia'
import api from '../lib/axios'

export const useChatStore = defineStore('chat', {
  state: () => ({
    roomsByProject: {},
    messagesByRoom: {}
  }),
  actions: {
    async fetchRooms(projectId){
      if(!projectId) return
      try{
        const res = await api.get(`/project/${projectId}/chat/rooms`)
        this.roomsByProject[projectId] = res.data?.data || []
      }catch(e){
        this.roomsByProject[projectId] = []
        throw e
      }
    },
    async fetchMessages(roomId){
      if(!roomId) return
      try{
        const res = await api.get(`/chatroom/${roomId}/messages`)
        this.messagesByRoom[roomId] = res.data?.data || []
      }catch(e){
        this.messagesByRoom[roomId] = []
        throw e
      }
    }
  }
})
