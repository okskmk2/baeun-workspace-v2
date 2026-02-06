import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/styles.css'
import api from './lib/axios'
import { useAppStore } from './stores/appStore'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// Hydrate current user from server session before mount
const store = useAppStore()
api.get('/member/me').then(res => {
	if (res.data && res.data.success) store.setCurrentUser(res.data.data)
}).catch(()=>{}).finally(()=>{
	app.mount('#app')
})
