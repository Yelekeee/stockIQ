import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Package, TrendingUp, AlertTriangle, ShoppingCart,
  RefreshCw, Zap, BarChart2, Clock
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Area, AreaChart, ReferenceLine
} from 'recharts'
import { productsApi, mlApi, stockApi, salesApi } from '../services/api'
import type { Product, ForecastPoint, ReorderData, AnomalyPoint, StockMovement, Sale } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import { ordersApi } from '../services/api'

function formatPrice(v: number) {
  return new Intl.NumberFormat('ru-RU').format(v) + ' ₸'
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 shadow-lg text-xs">
        <p className="text-slate-500 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</p>
        ))}
      </div>
    )
  }
  return null
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [forecast, setForecast] = useState<ForecastPoint[]>([])
  const [reorder, setReorder] = useState<ReorderData | null>(null)
  const [anomalies, setAnomalies] = useState<AnomalyPoint[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [forecastLoading, setForecastLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'forecast' | 'sales' | 'movements'>('forecast')

  const productId = parseInt(id!)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [prodRes, reorderRes, anomalyRes, movRes, salesRes] = await Promise.all([
          productsApi.get(productId),
          mlApi.reorder(productId),
          mlApi.anomalies(productId),
          stockApi.movements(productId),
          salesApi.list({ product_id: productId, limit: 60 })
        ])
        setProduct(prodRes.data)
        setReorder(reorderRes.data)
        setAnomalies(anomalyRes.data)
        setMovements(movRes.data)
        setSales(salesRes.data)

        // Load cached forecast first
        try {
          const fcRes = await mlApi.cachedForecast(productId)
          if (fcRes.data.length > 0) setForecast(fcRes.data)
        } catch { /* no cached forecast */ }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [productId])

  const runForecast = async () => {
    setForecastLoading(true)
    try {
      const res = await mlApi.forecast(productId, 30)
      setForecast(res.data.forecast)
    } finally {
      setForecastLoading(false)
    }
  }

  const autoOrder = async () => {
    if (!reorder) return
    await ordersApi.create({
      product_id: productId,
      ordered_qty: reorder.eoq,
      unit_price: product?.purchase_price
    })
    alert('Тапсырыс жасалды! / Заказ создан!')
  }

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  if (!product) return <div className="text-center py-20 text-slate-400">Тауар табылмады</div>

  const stockStatus = product.current_stock <= product.min_stock ? 'critical'
    : product.current_stock <= product.min_stock * 1.5 ? 'warning' : 'ok'

  const statusColors = {
    critical: 'text-red-600 bg-red-50 border-red-200',
    warning: 'text-amber-600 bg-amber-50 border-amber-200',
    ok: 'text-emerald-600 bg-emerald-50 border-emerald-200'
  }

  // Aggregate sales by week for chart
  const salesByWeek: Record<string, number> = {}
  sales.forEach(s => {
    const d = new Date(s.sold_at)
    const week = `${d.getFullYear()}-W${Math.ceil(d.getDate() / 7)}-${d.getMonth() + 1}`
    salesByWeek[week] = (salesByWeek[week] || 0) + s.quantity
  })
  const salesChartData = Object.entries(salesByWeek).map(([k, v]) => ({ week: k, qty: v })).slice(-12)

  const anomalyDates = new Set(anomalies.map(a => a.date))

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-secondary p-2">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{product.name_kz}</h1>
          <p className="text-sm text-slate-400">{product.name_ru} · SKU: {product.sku}</p>
        </div>
        <div className={`px-4 py-2 rounded-xl border text-sm font-semibold ${statusColors[stockStatus]}`}>
          {stockStatus === 'critical' ? '⚠ Критикалық' : stockStatus === 'warning' ? '⚡ Ескерту' : '✓ Жақсы'}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{product.current_stock}</div>
          <div className="text-xs text-slate-400 mt-1">Қоймада / Остаток</div>
          <div className="text-xs text-slate-500">{product.unit}</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{product.min_stock}</div>
          <div className="text-xs text-slate-400 mt-1">Минимум / Мин запас</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatPrice(product.selling_price)}</div>
          <div className="text-xs text-slate-400 mt-1">Сату бағасы / Цена продажи</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatPrice(product.purchase_price)}</div>
          <div className="text-xs text-slate-400 mt-1">Сатып алу / Закупочная</div>
        </div>
      </div>

      {/* ML Insights */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} className="text-primary-500" />
          <h2 className="font-bold text-slate-800 dark:text-slate-100">ML Аналитика</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
            <div className="text-xs text-slate-400 mb-1">ABC класс</div>
            {product.abc_class ? (
              <span className={`badge badge-${product.abc_class.toLowerCase()} text-base px-3 py-1`}>
                {product.abc_class}
              </span>
            ) : <span className="text-slate-300">—</span>}
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
            <div className="text-xs text-slate-400 mb-1">XYZ класс</div>
            {product.xyz_class ? (
              <span className={`badge badge-${product.xyz_class.toLowerCase()} text-base px-3 py-1`}>
                {product.xyz_class}
              </span>
            ) : <span className="text-slate-300">—</span>}
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
            <div className="text-xs text-slate-400 mb-1">Кластер / Кластер</div>
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1">
              {product.cluster_label || '—'}
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
            <div className="text-xs text-slate-400 mb-1">EOQ</div>
            <div className="text-lg font-bold text-primary-600">{reorder?.eoq || '—'}</div>
            <div className="text-[10px] text-slate-400">{product.unit}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
            <div className="text-xs text-slate-400 mb-1">Тапсырыс нүктесі</div>
            <div className="text-lg font-bold text-amber-600">{reorder?.reorder_point?.toFixed(0) || '—'}</div>
            <div className="text-[10px] text-slate-400">Точка перезаказа</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
            <div className="text-xs text-slate-400 mb-1">Тауарсыз күндер</div>
            <div className={`text-lg font-bold ${
              (reorder?.days_until_stockout || 999) < 7 ? 'text-red-600' :
              (reorder?.days_until_stockout || 999) < 14 ? 'text-amber-500' : 'text-emerald-600'
            }`}>
              {reorder?.days_until_stockout === 9999 ? '∞' : reorder?.days_until_stockout?.toFixed(0) || '—'}
            </div>
            <div className="text-[10px] text-slate-400">Дней до нуля</div>
          </div>
        </div>

        {stockStatus !== 'ok' && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm">
              <AlertTriangle size={16} />
              <span>Қор тапсырыс нүктесінен төмен. EOQ = <strong>{reorder?.eoq}</strong> {product.unit} тапсырыс беру ұсынылады.</span>
            </div>
            <button onClick={autoOrder} className="btn-primary flex-shrink-0">
              <ShoppingCart size={14} /> Тапсырыс беру
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-slate-100 dark:border-slate-800">
          {[
            { id: 'forecast', label: 'Болжам / Прогноз', icon: TrendingUp },
            { id: 'sales', label: 'Сатылым / Продажи', icon: BarChart2 },
            { id: 'movements', label: 'Қозғалыс / Движение', icon: Clock }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === t.id
                  ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'forecast' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">Prophet ML Болжамы — 30 күн</h3>
                  <p className="text-xs text-slate-400">Прогноз спроса с доверительным интервалом</p>
                </div>
                <button onClick={runForecast} disabled={forecastLoading} className="btn-secondary">
                  <RefreshCw size={14} className={forecastLoading ? 'animate-spin' : ''} />
                  {forecastLoading ? 'Есептелуде...' : 'Жаңарту'}
                </button>
              </div>
              {forecast.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={forecast}>
                    <defs>
                      <linearGradient id="fcGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="upper" name="Жоғары / Верхний" stroke="transparent" fill="#bfdbfe" />
                    <Area type="monotone" dataKey="lower" name="Төмен / Нижний" stroke="transparent" fill="white" />
                    <Line type="monotone" dataKey="predicted" name="Болжам / Прогноз" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    {anomalies.map(a => (
                      <ReferenceLine key={a.date} x={a.date} stroke="#ef4444" strokeDasharray="3 3" />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <TrendingUp size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="mb-3">Болжам жоқ</p>
                  <button onClick={runForecast} className="btn-primary mx-auto">
                    Болжам жасау
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sales' && (
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Сатылым тарихы / История продаж</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="qty" name="Мөлшер / Кол-во" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeTab === 'movements' && (
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Қозғалыс тарихы / История движений</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {movements.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                      m.type === 'incoming' ? 'bg-emerald-100 text-emerald-700' :
                      m.type === 'outgoing' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {m.type === 'incoming' ? '↑' : m.type === 'outgoing' ? '↓' : '⟳'}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {m.type === 'incoming' ? 'Кіріс / Приход' :
                         m.type === 'outgoing' ? 'Шығыс / Расход' : 'Түзету / Корректировка'}
                        {' · '}<span className="font-bold">{m.quantity} {product.unit}</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {m.reason} · {new Date(m.created_at).toLocaleDateString('kk-KZ')}
                      </div>
                    </div>
                  </div>
                ))}
                {movements.length === 0 && <p className="text-slate-400 text-sm text-center py-8">Қозғалыстар жоқ</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
