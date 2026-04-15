import React, { useEffect, useState } from 'react'
import {
  Package, DollarSign, Bell, ClipboardList, AlertTriangle,
  TrendingUp, RefreshCw, ChevronRight
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, LineChart, Line
} from 'recharts'
import { dashboardApi } from '../services/api'
import type { DashboardSummary, TopProduct, Alert } from '../types'
import StatCard from '../components/StatCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { Link } from 'react-router-dom'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1']

function formatMoney(v: number) {
  return new Intl.NumberFormat('kk-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(v)
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 shadow-lg text-sm">
        <p className="text-slate-500 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-semibold">
            {p.name}: {typeof p.value === 'number' && p.value > 1000 ? formatMoney(p.value) : p.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [stockTrend, setStockTrend] = useState<any[]>([])
  const [forecasts, setForecasts] = useState<any[]>([])
  const [lowStock, setLowStock] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [summaryRes, topRes, alertsRes, trendRes, forecastRes, lowRes] = await Promise.all([
        dashboardApi.summary(),
        dashboardApi.topProducts(),
        dashboardApi.alerts(),
        dashboardApi.stockValueTrend(30),
        dashboardApi.forecastPreview(),
        dashboardApi.lowStock()
      ])
      setSummary(summaryRes.data)
      setTopProducts(topRes.data)
      setAlerts(alertsRes.data)
      setStockTrend(trendRes.data)
      setForecasts(forecastRes.data)
      setLowStock(lowRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const markRead = async (id: number) => {
    await dashboardApi.markAlertRead(id)
    setAlerts(a => a.filter(x => x.id !== id))
  }

  const alertIcon = (type: string) => {
    if (type === 'low_stock') return '📦'
    if (type === 'anomaly') return '⚠️'
    if (type === 'overstock') return '📈'
    return '🔔'
  }

  const alertColor = (type: string) => {
    if (type === 'low_stock') return 'border-l-red-500 bg-red-50 dark:bg-red-900/10'
    if (type === 'anomaly') return 'border-l-amber-500 bg-amber-50 dark:bg-amber-900/10'
    if (type === 'overstock') return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10'
    return 'border-l-slate-300 bg-slate-50 dark:bg-slate-800'
  }

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Дашборд</h1>
          <p className="text-slate-400 text-sm mt-0.5">Басқару панелі • Панель управления</p>
        </div>
        <button onClick={load} className="btn-secondary">
          <RefreshCw size={14} /> Жаңарту
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title_kz="Барлық тауарлар"
          title_ru="Всего товаров"
          value={summary?.total_products || 0}
          icon={Package}
          color="blue"
        />
        <StatCard
          title_kz="Қойма құны"
          title_ru="Стоимость склада"
          value={formatMoney(summary?.total_stock_value || 0)}
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          title_kz="Белсенді ескертулер"
          title_ru="Активных предупреждений"
          value={summary?.active_alerts || 0}
          subtitle={`Төмен: ${summary?.low_stock_count || 0} тауар`}
          icon={Bell}
          color="red"
        />
        <StatCard
          title_kz="Осы айдағы тапсырыстар"
          title_ru="Заказов в этом месяце"
          value={summary?.orders_this_month || 0}
          icon={ClipboardList}
          color="violet"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Value Trend */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Қойма құны үрдісі</h3>
              <p className="text-xs text-slate-400">Динамика стоимости склада (30 күн)</p>
            </div>
            <TrendingUp size={18} className="text-primary-500" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stockTrend}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" name="Құн / Стоимость" stroke="#3b82f6" strokeWidth={2} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Low Stock */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Критикалық қор</h3>
              <p className="text-xs text-slate-400">Критический запас</p>
            </div>
            <Link to="/products?stock_status=critical" className="text-primary-500 hover:text-primary-600">
              <ChevronRight size={16} />
            </Link>
          </div>
          <div className="space-y-2">
            {lowStock.slice(0, 6).map((p: any) => (
              <div key={p.id} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.status === 'critical' ? 'bg-red-500' : 'bg-amber-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{p.name_ru}</div>
                  <div className="text-[10px] text-slate-400">{p.current_stock} / мин: {p.min_stock}</div>
                </div>
                <span className={`badge ${p.status === 'critical' ? 'badge-critical' : 'badge-warning'}`}>
                  {p.status === 'critical' ? 'Критикалық' : 'Ескерту'}
                </span>
              </div>
            ))}
            {lowStock.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Барлық тауар жеткілікті ✓</p>
            )}
          </div>
        </div>
      </div>

      {/* Top Products + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Үздік 10 тауар</h3>
              <p className="text-xs text-slate-400">Топ-10 по выручке</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topProducts.slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <YAxis type="category" dataKey="name_ru" tick={{ fontSize: 9, fill: '#94a3b8' }} width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total_revenue" name="Түсім / Выручка" radius={[0, 4, 4, 0]}>
                {topProducts.slice(0, 8).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Alerts */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Ескертулер</h3>
              <p className="text-xs text-slate-400">Уведомления системы</p>
            </div>
            <span className="badge badge-critical">{alerts.length}</span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {alerts.slice(0, 8).map(alert => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 rounded-xl border-l-4 ${alertColor(alert.type)}`}
              >
                <span className="text-lg">{alertIcon(alert.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed line-clamp-2">
                    {alert.message_kz || alert.message}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(alert.created_at).toLocaleDateString('kk-KZ')}
                  </p>
                </div>
                <button
                  onClick={() => markRead(alert.id)}
                  className="text-slate-300 hover:text-slate-500 text-xs flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Ескертулер жоқ</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Forecast Preview */}
      {forecasts.length > 0 && (
        <div className="card p-5">
          <div className="mb-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Сұраныс болжамы — алдағы 14 күн</h3>
            <p className="text-xs text-slate-400">Прогноз спроса на 14 дней (Prophet ML)</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {forecasts.map((f: any) => (
              <div key={f.product_id} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate mb-2">{f.name_ru}</p>
                <ResponsiveContainer width="100%" height={60}>
                  <LineChart data={f.forecasts}>
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-slate-400 mt-1 text-center">
                  Орт. {f.forecasts.length > 0 ? (f.forecasts.reduce((a: number, b: any) => a + b.value, 0) / f.forecasts.length).toFixed(1) : 0} дана/күн
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
