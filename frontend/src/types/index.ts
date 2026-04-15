export type UserRole = 'admin' | 'manager' | 'viewer'

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  created_at: string
}

export interface Category {
  id: number
  name_kz: string
  name_ru: string
}

export interface Supplier {
  id: number
  name: string
  contact_phone?: string
  email?: string
  delivery_days: number
}

export interface Product {
  id: number
  name_kz: string
  name_ru: string
  sku: string
  barcode?: string
  category_id: number
  unit: string
  purchase_price: number
  selling_price: number
  current_stock: number
  min_stock: number
  max_stock: number
  lead_time_days: number
  order_cost: number
  holding_cost_pct: number
  supplier_id?: number
  abc_class?: string
  xyz_class?: string
  cluster_label?: string
  created_at: string
  category?: Category
  supplier?: Supplier
}

export interface StockMovement {
  id: number
  product_id: number
  type: 'incoming' | 'outgoing' | 'adjustment' | 'return'
  quantity: number
  unit_price?: number
  reason?: string
  user_id?: number
  created_at: string
  product?: Product
}

export interface Sale {
  id: number
  product_id: number
  quantity: number
  unit_price: number
  total_price: number
  sold_at: string
  product?: Product
}

export interface PurchaseOrder {
  id: number
  product_id: number
  supplier_id?: number
  ordered_qty: number
  received_qty: number
  unit_price?: number
  status: 'draft' | 'sent' | 'received' | 'cancelled'
  is_auto_generated: boolean
  urgency_level: string
  estimated_cost?: number
  created_at: string
  received_at?: string
  product?: Product
  supplier?: Supplier
}

export interface Alert {
  id: number
  product_id?: number
  type: 'low_stock' | 'anomaly' | 'overstock' | 'expiry'
  message: string
  message_kz?: string
  is_read: boolean
  created_at: string
  product?: Product
}

export interface ForecastPoint {
  date: string
  predicted: number
  lower: number
  upper: number
}

export interface ABCXYZItem {
  product_id: number
  name_ru: string
  name_kz: string
  sku: string
  abc_class: string
  xyz_class: string
  combined: string
  total_revenue: number
  cv: number
  current_stock: number
}

export interface ClusterItem {
  id: number
  name_ru: string
  name_kz: string
  avg_monthly_sales: number
  stock_turnover: number
  price: number
  demand_variance: number
  cluster: number
  cluster_label_kz: string
  cluster_label_ru: string
}

export interface ReorderData {
  product_id: number
  eoq: number
  reorder_point: number
  safety_stock: number
  avg_daily_demand: number
  annual_demand: number
  days_until_stockout: number
  current_stock: number
}

export interface AnomalyPoint {
  date: string
  product_id: number
  total_qty: number
  total_revenue: number
  product_name_ru: string
  product_name_kz: string
}

export interface DashboardSummary {
  total_products: number
  total_stock_value: number
  active_alerts: number
  orders_this_month: number
  low_stock_count: number
  total_sales_today: number
}

export interface TopProduct {
  product_id: number
  name_ru: string
  name_kz: string
  total_sold: number
  total_revenue: number
}

export interface AuthToken {
  access_token: string
  token_type: string
  user: User
}
