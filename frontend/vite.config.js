import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const faviconCachePlugin = () => ({
  name: 'favicon-cache-control',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const requestPath = String(req.url || '').split('?')[0]
      if (requestPath === '/favicon.svg') {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      }
      next()
    })
  }
})

export default defineConfig({
  plugins: [vue(), faviconCachePlugin()],
  server: {
    port: 8081,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
