import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string, role: string) =>
    api.post('/auth/register', { name, email, password, role }),
}

// Products
export const productsApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get('/products', { params }),
  get: (id: number) => api.get(`/products/${id}`),
  create: (data: object) => api.post('/products', data),
  update: (id: number, data: object) => api.put(`/products/${id}`, data),
  delete: (id: number) => api.delete(`/products/${id}`),
  categories: () => api.get('/categories'),
  suppliers: () => api.get('/suppliers'),
  createSupplier: (data: object) => api.post('/suppliers', data),
}

// Stock
export const stockApi = {
  incoming: (data: object) => api.post('/stock/incoming', data),
  outgoing: (data: object) => api.post('/stock/outgoing', data),
  adjustment: (data: object) => api.post('/stock/adjustment', data),
  movements: (productId?: number) =>
    productId
      ? api.get(`/stock/movements/${productId}`)
      : api.get('/stock/movements'),
  allMovements: (type?: string) =>
    api.get('/stock/movements', { params: type ? { movement_type: type } : {} }),
}

// Sales
export const salesApi = {
  create: (data: object) => api.post('/sales', data),
  list: (params?: object) => api.get('/sales', { params }),
  dailyStats: (days?: number) => api.get('/sales/stats/daily', { params: { days } }),
}

// Orders
export const ordersApi = {
  list: (params?: object) => api.get('/orders', { params }),
  create: (data: object) => api.post('/orders', data),
  autoGenerate: () => api.post('/orders/auto-generate'),
  updateStatus: (id: number, data: object) => api.put(`/orders/${id}/status`, data),
}

// ML
export const mlApi = {
  forecast: (productId: number, days?: number) =>
    api.get(`/ml/forecast/${productId}`, { params: { days: days || 30 } }),
  cachedForecast: (productId: number) =>
    api.get(`/ml/forecast/${productId}/cached`),
  abcXyz: () => api.get('/ml/abc-xyz'),
  clusters: () => api.get('/ml/clusters'),
  reorder: (productId: number) => api.get(`/ml/reorder/${productId}`),
  anomalies: (productId?: number) =>
    api.get('/ml/anomalies', { params: productId ? { product_id: productId } : {} }),
  retrain: () => api.post('/ml/retrain'),
  recommendations: () => api.get('/ml/recommendations'),
}

// Dashboard
export const dashboardApi = {
  summary: () => api.get('/dashboard/summary'),
  topProducts: () => api.get('/dashboard/top-products'),
  lowStock: () => api.get('/dashboard/low-stock'),
  alerts: () => api.get('/dashboard/alerts'),
  stockValueTrend: (days?: number) =>
    api.get('/dashboard/stock-value-trend', { params: { days } }),
  forecastPreview: () => api.get('/dashboard/forecast-preview'),
  markAlertRead: (id: number) => api.put(`/dashboard/alerts/${id}/read`),
}

// Reports
export const reportsApi = {
  inventoryTurnover: () => api.get('/reports/inventory-turnover'),
  stockAging: () => api.get('/reports/stock-aging'),
  supplierPerformance: () => api.get('/reports/supplier-performance'),
  summary: () => api.get('/reports/summary'),
}

export default api
