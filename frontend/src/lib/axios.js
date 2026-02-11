import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const requestUrl = String(error?.config?.url || '')
    const isAuthEndpoint =
      requestUrl.includes('/members/login') || requestUrl.includes('/members/signup')

    if (status === 401 && !isAuthEndpoint && typeof window !== 'undefined') {
      const isLoginPage = window.location.pathname === '/login'
      if (!isLoginPage) {
        const redirectPath = `${window.location.pathname}${window.location.search}${window.location.hash}`
        window.sessionStorage.setItem('auth:force-logout', '1')
        window.location.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`)
      }
    }

    return Promise.reject(error)
  }
)

export default api
