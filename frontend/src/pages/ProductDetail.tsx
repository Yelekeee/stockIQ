import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, TrendingUp, AlertTriangle, ShoppingCart,
  RefreshCw, Zap, BarChart2, Clock
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Area, AreaChart, ReferenceLine
} from 'recharts'
import { productsApi, mlApi, stockApi, salesApi, ordersApi } from '../services/api'
import type { Product, ForecastPoint, ReorderData, AnomalyPoint, StockMovement, Sale } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'

function formatPrice(v: number) {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M ₸`
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K ₸`
  return `${Math.round(v)} ₸`
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-2.5 shadow-lg text-xs max-w-[160px]">
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
        try {
          const fcRes = await mlApi.cachedForecast(productId)
          if (fcRes.data.length > 0) setForecast(fcRes.data)
        } catch { }
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
    await ordersApi.create({ product_id: productId, ordered_qty: reorder.eoq, unit_price: product?.purchase_price })
    alert('Тапсырыс жасалды!')
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

  // Aggregate sales by week
  const salesByWeek: Record<string, number> = {}
  sales.forEach(s => {
    const d = new Date(s.sold_at)
    const week = `${d.getMonth() + 1}/${Math.ceil(d.getDate() / 7)}`
    salesByWeek[week] = (salesByWeek[week] || 0) + s.quantity
  })
  const salesChartData = Object.entries(salesByWeek).map(([k, v]) => ({ week: k, qty: v })).slice(-12)

  return (
    <div className="space-y-4 sm:space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary p-2 flex-shrink-0 mt-0.5">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">{product.name_kz}</h1>
          <p className="text-xs sm:text-sm text-slate-400 truncate">{product.name_ru} · {product.sku}</p>
        </div>
        <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex-shrink-0 ${statusColors[stockStatus]}`}>
          {stockStatus === 'critical' ? '⚠ Критикалық' : stockStatus === 'warning' ? '⚡ Ескерту' : '✓ Жақсы'}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Қоймада', sub: product.unit, value: product.current_stock, big: true },
          { label: 'Минимум', sub: 'мин запас', value: product.min_stock },
          { label: 'Сату бағасы', sub: 'цена продажи', value: formatPrice(product.selling_price) },
          { label: 'Сатып алу', sub: 'закупочная', value: formatPrice(product.purchase_price) }
        ].map((item, i) => (
          <div key={i} className="card p-3 sm:p-4 text-center">
            <div className={`font-bold ${item.big ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'} text-slate-900 dark:text-slate-100 truncate`}>
              {item.value}
            </div>
            <div className="text-xs text-slate-400 mt-0.5 leading-tight">{item.label}</div>
            <div className="text-[10px] text-slate-300 dark:text-slate-600">{item.sub}</div>
          </div>
        ))}
      </div>

      {/* ML Insights */}
      <div className="card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} className="text-primary-500" />
          <h2 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100">ML Аналитика</h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
          {[
            { label: 'ABC', value: product.abc_class, badge: true, cls: `badge-${product.abc_class?.toLowerCase()}` },
            { label: 'XYZ', value: product.xyz_class, badge: true, cls: `badge-${product.xyz_class?.toLowerCase()}` },
            { label: 'EOQ', value: reorder?.eoq, sub: product.unit, color: 'text-primary-600' },
            { label: 'Тапсырыс нүктесі', value: reorder?.reorder_point?.toFixed(0), color: 'text-amber-600' },
            { label: 'Қауіпсіздік қоры', value: reorder?.safety_stock?.toFixed(0), color: 'text-slate-600' },
            {
              label: 'Тауарсыз күн',
              value: reorder?.days_until_stockout === 9999 ? '∞' : reorder?.days_until_stockout?.toFixed(0),
              color: (reorder?.days_until_stockout || 999) < 7 ? 'text-red-600' : (reorder?.days_until_stockout || 999) < 14 ? 'text-amber-500' : 'text-emerald-600'
            }
          ].map((item, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 text-center">
              <div className="text-[10px] text-slate-400 mb-1 leading-tight">{item.label}</div>
              {item.badge ? (
                item.value
                  ? <span className={`badge ${item.cls} text-sm px-2 py-0.5`}>{item.value}</span>
                  : <span className="text-slate-300 text-sm">—</span>
              ) : (
                <div className={`text-base sm:text-lg font-bold ${item.color || 'text-slate-800 dark:text-slate-100'}`}>
                  {item.value ?? '—'}
                </div>
              )}
              {item.sub && <div className="text-[9px] text-slate-400">{item.sub}</div>}
            </div>
          ))}
        </div>

        {stockStatus !== 'ok' && (
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs flex-1">
                <AlertTriangle size={14} className="flex-shrink-0" />
                <span>EOQ = <strong>{reorder?.eoq}</strong> {product.unit} тапсырыс беру ұсынылады</span>
              </div>
              <button onClick={autoOrder} className="btn-primary text-xs py-1.5 flex-shrink-0 self-start sm:self-auto">
                <ShoppingCart size={12} /> Тапсырыс беру
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
          {[
            { id: 'forecast', label_kz: 'Болжам', label_ru: 'Прогноз', icon: TrendingUp },
            { id: 'sales', label_kz: 'Сатылым', label_ru: 'Продажи', icon: BarChart2 },
            { id: 'movements', label_kz: 'Қозғалыс', label_ru: 'Движение', icon: Clock }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-1.5 px-3 sm:px-5 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === t.id
                  ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <t.icon size={13} />
              <span>{t.label_kz}</span>
              <span className="text-slate-400 hidden sm:inline">/ {t.label_ru}</span>
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-5">
          {activeTab === 'forecast' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">Prophet ML — 30 күн</h3>
                  <p className="text-xs text-slate-400">Сенімділік аралығымен</p>
                </div>
                <button onClick={runForecast} disabled={forecastLoading} className="btn-secondary text-xs py-1.5">
                  <RefreshCw size={12} className={forecastLoading ? 'animate-spin' : ''} />
                  {forecastLoading ? 'Есептелуде...' : 'Жаңарту'}
                </button>
              </div>
              {forecast.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={forecast}>
                    <defs>
                      <linearGradient id="fcGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} width={32} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="upper" stroke="transparent" fill="#bfdbfe" />
                    <Area type="monotone" dataKey="lower" stroke="transparent" fill="white" />
                    <Line type="monotone" dataKey="predicted" name="Болжам" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    {anomalies.slice(0, 5).map(a => (
                      <ReferenceLine key={a.date} x={a.date} stroke="#ef4444" strokeDasharray="3 3" />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-10 text-slate-400">
                  <TrendingUp size={36} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm mb-3">Болжам жоқ</p>
                  <button onClick={runForecast} className="btn-primary mx-auto">Болжам жасау</button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sales' && (
            <div>
              <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100 mb-3">Сатылым тарихы</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} width={32} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="qty" name="Мөлшер" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeTab === 'movements' && (
            <div>
              <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100 mb-3">Қозғалыс тарихы</h3>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {movements.map(m => (
                  <div key={m.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0 ${
                      m.type === 'incoming' ? 'bg-emerald-100 text-emerald-700' :
                      m.type === 'outgoing' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {m.type === 'incoming' ? '↑' : m.type === 'outgoing' ? '↓' : '⟳'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-200">
                        {m.type === 'incoming' ? 'Кіріс' : m.type === 'outgoing' ? 'Шығыс' : 'Түзету'}
                        {' · '}<strong>{m.quantity}</strong>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{m.reason} · {new Date(m.created_at).toLocaleDateString('kk-KZ')}</div>
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
