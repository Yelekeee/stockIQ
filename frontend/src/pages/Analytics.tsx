import React, { useEffect, useState } from 'react'
import { Brain, RefreshCw, Lightbulb, AlertTriangle, TrendingUp, Grid3x3, Target } from 'lucide-react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  ReferenceLine, ZAxis
} from 'recharts'
import { mlApi, productsApi } from '../services/api'
import type { ABCXYZItem, ClusterItem, ForecastPoint, AnomalyPoint } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'

const CLUSTER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
const ABC_COLORS = { A: '#10b981', B: '#3b82f6', C: '#94a3b8' }

function formatMoney(v: number) {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M ₸`
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K ₸`
  return `${Math.round(v)} ₸`
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const d = payload[0]?.payload
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-3 shadow-lg text-xs max-w-48">
        <p className="font-bold text-slate-800 dark:text-slate-100 mb-1 truncate">{d?.name_ru}</p>
        {Object.entries(d || {}).filter(([k]) => !['name_ru', 'name_kz', 'id', 'product_id', 'cluster', 'abc_class', 'xyz_class', 'combined', 'sku'].includes(k)).map(([k, v]) => (
          <p key={k} className="text-slate-500">{k}: <span className="font-semibold text-slate-700 dark:text-slate-300">{typeof v === 'number' ? v.toFixed(2) : String(v)}</span></p>
        ))}
      </div>
    )
  }
  return null
}

export default function Analytics() {
  const [tab, setTab] = useState<'abcxyz' | 'clusters' | 'forecast' | 'anomalies' | 'recommendations'>('abcxyz')
  const [abcXyzData, setAbcXyzData] = useState<ABCXYZItem[]>([])
  const [clusterData, setClusterData] = useState<ClusterItem[]>([])
  const [forecastData, setForecastData] = useState<ForecastPoint[]>([])
  const [anomalyData, setAnomalyData] = useState<AnomalyPoint[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [retraining, setRetraining] = useState(false)

  const loadTab = async () => {
    setLoading(true)
    try {
      if (tab === 'abcxyz') {
        const res = await mlApi.abcXyz()
        setAbcXyzData(res.data)
      } else if (tab === 'clusters') {
        const res = await mlApi.clusters()
        setClusterData(res.data)
      } else if (tab === 'anomalies') {
        const res = await mlApi.anomalies()
        setAnomalyData(res.data)
      } else if (tab === 'recommendations') {
        const res = await mlApi.recommendations()
        setRecommendations(res.data)
      } else if (tab === 'forecast') {
        const prodRes = await productsApi.list({ limit: 40 })
        setProducts(prodRes.data)
        if (prodRes.data.length > 0 && !selectedProduct) {
          setSelectedProduct(prodRes.data[0].id)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTab() }, [tab])

  useEffect(() => {
    if (tab === 'forecast' && selectedProduct) {
      setLoading(true)
      mlApi.cachedForecast(selectedProduct).then(res => {
        setForecastData(res.data)
      }).catch(() => {}).finally(() => setLoading(false))
    }
  }, [selectedProduct, tab])

  const handleRetrain = async () => {
    if (!confirm('Барлық ML модельдерін қайта оқытасыз ба?')) return
    setRetraining(true)
    try {
      const res = await mlApi.retrain()
      alert(`Аяқталды! ABC-XYZ: ${res.data.abc_xyz_updated}, Кластерлер: ${res.data.clusters_updated}`)
      loadTab()
    } finally {
      setRetraining(false)
    }
  }

  const TABS = [
    { id: 'abcxyz', label: 'ABC-XYZ', icon: Grid3x3 },
    { id: 'clusters', label: 'Кластерлер', icon: Target },
    { id: 'forecast', label: 'Болжам', icon: TrendingUp },
    { id: 'anomalies', label: 'Аномалиялар', icon: AlertTriangle },
    { id: 'recommendations', label: 'Ұсыныстар', icon: Lightbulb },
  ]

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">ML Аналитика</h1>
          <p className="text-slate-400 text-xs sm:text-sm">Машиналық оқыту талдауы</p>
        </div>
        <button onClick={handleRetrain} disabled={retraining} className="btn-secondary flex-shrink-0">
          <Brain size={14} className={retraining ? 'animate-pulse text-primary-500' : ''} />
          <span className="hidden sm:inline">{retraining ? 'Оқытылуда...' : 'ML Қайта оқыту'}</span>
          <span className="sm:hidden"><RefreshCw size={14} /></span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              tab === t.id
                ? 'bg-white dark:bg-slate-900 text-primary-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <t.icon size={13} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="card py-24"><LoadingSpinner size="lg" className="mx-auto" /></div>
      ) : (
        <>
          {/* ABC-XYZ */}
          {tab === 'abcxyz' && (
            <div className="space-y-4">
              <div className="card p-4 sm:p-5">
                <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 mb-1">ABC-XYZ Талдау матрицасы</h3>
                <p className="text-xs text-slate-400 mb-4">
                  X ось: Вариация коэффициенті (CV) | Y ось: Жалпы түсім
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="cv" name="CV"
                      label={{ value: 'CV →', position: 'insideBottom', offset: -10, style: { fontSize: 10, fill: '#94a3b8' } }}
                      tick={{ fontSize: 9, fill: '#94a3b8' }}
                    />
                    <YAxis
                      dataKey="total_revenue" name="Түсім"
                      label={{ value: 'Түсім', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8' } }}
                      tick={{ fontSize: 9, fill: '#94a3b8' }}
                      tickFormatter={v => formatMoney(v)}
                      width={50}
                    />
                    <ZAxis range={[40, 160]} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine x={0.1} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'X|Y', style: { fontSize: 9, fill: '#f59e0b' } }} />
                    <ReferenceLine x={0.25} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Y|Z', style: { fontSize: 9, fill: '#ef4444' } }} />
                    {['A', 'B', 'C'].map(abc =>
                      ['X', 'Y', 'Z'].map(xyz => {
                        const items = abcXyzData.filter(d => d.abc_class === abc && d.xyz_class === xyz)
                        if (!items.length) return null
                        return (
                          <Scatter
                            key={`${abc}${xyz}`}
                            name={`${abc}${xyz}`}
                            data={items}
                            fill={ABC_COLORS[abc as 'A' | 'B' | 'C']}
                            opacity={xyz === 'X' ? 1 : xyz === 'Y' ? 0.7 : 0.4}
                          />
                        )
                      })
                    )}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              {/* ABC-XYZ mobile cards */}
              <div className="block sm:hidden space-y-2">
                {abcXyzData.slice(0, 20).map(item => (
                  <div key={item.product_id} className="card p-3 flex items-center gap-3">
                    <div className="flex gap-1 flex-shrink-0">
                      <span className={`badge badge-${item.abc_class.toLowerCase()}`}>{item.abc_class}</span>
                      <span className={`badge badge-${item.xyz_class.toLowerCase()}`}>{item.xyz_class}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">{item.name_ru}</div>
                      <div className="text-[10px] text-slate-400">{item.sku}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{formatMoney(item.total_revenue)}</div>
                      <div className="text-[10px] text-slate-400">CV: {item.cv.toFixed(3)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ABC-XYZ Desktop table */}
              <div className="card overflow-hidden hidden sm:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="text-left px-4 py-3 table-header">SKU</th>
                        <th className="text-left px-4 py-3 table-header">Тауар</th>
                        <th className="text-center px-4 py-3 table-header">ABC</th>
                        <th className="text-center px-4 py-3 table-header">XYZ</th>
                        <th className="text-center px-4 py-3 table-header">Комби</th>
                        <th className="text-right px-4 py-3 table-header">Түсім</th>
                        <th className="text-right px-4 py-3 table-header">CV</th>
                        <th className="text-right px-4 py-3 table-header">Қоймада</th>
                      </tr>
                    </thead>
                    <tbody>
                      {abcXyzData.map(item => (
                        <tr key={item.product_id} className="table-row">
                          <td className="px-4 py-2 text-xs font-mono text-slate-400">{item.sku}</td>
                          <td className="px-4 py-2">
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate max-w-40">{item.name_ru}</div>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`badge badge-${item.abc_class.toLowerCase()}`}>{item.abc_class}</span>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`badge badge-${item.xyz_class.toLowerCase()}`}>{item.xyz_class}</span>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className="font-bold text-slate-700 dark:text-slate-200">{item.combined}</span>
                          </td>
                          <td className="px-4 py-2 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {formatMoney(item.total_revenue)}
                          </td>
                          <td className="px-4 py-2 text-right text-xs text-slate-500">{item.cv.toFixed(3)}</td>
                          <td className="px-4 py-2 text-right text-sm">{item.current_stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Clusters */}
          {tab === 'clusters' && (
            <div className="space-y-4">
              <div className="card p-4 sm:p-5">
                <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 mb-1">K-Means кластерлеу (4 кластер)</h3>
                <p className="text-xs text-slate-400 mb-4">X: Орташа ай. сату | Y: Қор айналымы</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  {['Жылдам сатылатын', 'Баяу сатылатын', 'Маусымдық', 'Өлі қор'].map((label, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CLUSTER_COLORS[i] }} />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{label}</span>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="avg_monthly_sales" name="Ай. Сату" tick={{ fontSize: 9, fill: '#94a3b8' }}
                      label={{ value: 'Ай. сату →', position: 'insideBottom', offset: -10, style: { fontSize: 9, fill: '#94a3b8' } }} />
                    <YAxis dataKey="stock_turnover" name="Айналым" tick={{ fontSize: 9, fill: '#94a3b8' }}
                      label={{ value: 'Айналым', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#94a3b8' } }} />
                    <ZAxis dataKey="price" range={[30, 200]} />
                    <Tooltip content={<CustomTooltip />} />
                    {[0, 1, 2, 3].map(cluster => {
                      const items = clusterData.filter(d => d.cluster === cluster)
                      return (
                        <Scatter
                          key={cluster}
                          name={['Жылдам', 'Баяу', 'Маусымдық', 'Өлі қор'][cluster]}
                          data={items}
                          fill={CLUSTER_COLORS[cluster]}
                        />
                      )
                    })}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[0, 1, 2, 3].map(cluster => {
                  const items = clusterData.filter(d => d.cluster === cluster)
                  const labels = ['Жылдам сатылатын', 'Баяу сатылатын', 'Маусымдық', 'Өлі қор']
                  return (
                    <div key={cluster} className="card p-3 sm:p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CLUSTER_COLORS[cluster] }} />
                        <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-100">{labels[cluster]}</span>
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{items.length}</div>
                      <div className="text-[10px] sm:text-xs text-slate-400 mt-1">тауар</div>
                      <div className="mt-2 space-y-1">
                        {items.slice(0, 2).map(item => (
                          <div key={item.id} className="text-[10px] sm:text-xs text-slate-500 truncate">{item.name_ru}</div>
                        ))}
                        {items.length > 2 && <div className="text-[10px] sm:text-xs text-slate-400">+{items.length - 2} басқа...</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Forecast */}
          {tab === 'forecast' && (
            <div className="card p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100">Prophet Болжамы</h3>
                  <p className="text-xs text-slate-400">Сұраныс болжамы сенімділік аралығымен</p>
                </div>
                <select
                  className="select sm:w-64"
                  value={selectedProduct || ''}
                  onChange={e => setSelectedProduct(parseInt(e.target.value))}
                >
                  {products.map(p => <option key={p.id} value={p.id}>{p.name_ru}</option>)}
                </select>
              </div>
              {forecastData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={forecastData}>
                      <defs>
                        <linearGradient id="fcFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
                      <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} width={36} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="upper" name="Жоғары шек" stroke="transparent" fill="#bfdbfe" />
                      <Area type="monotone" dataKey="lower" name="Төмен шек" stroke="transparent" fill="white" />
                      <Line type="monotone" dataKey="predicted" name="Болжам" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="mt-3 flex gap-4 text-xs text-slate-500 justify-center">
                    <span className="flex items-center gap-1"><span className="w-8 h-0.5 bg-primary-500 inline-block" /> Болжам</span>
                    <span className="flex items-center gap-1"><span className="w-8 h-3 bg-primary-100 inline-block rounded" /> Сенімділік аралығы</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-16 text-slate-400">
                  <TrendingUp size={40} className="mx-auto mb-3 opacity-20" />
                  <p>Болжам деректері жоқ</p>
                  <p className="text-xs mt-1">ML моделін қайта оқытыңыз</p>
                </div>
              )}
            </div>
          )}

          {/* Anomalies */}
          {tab === 'anomalies' && (
            <div className="card p-4 sm:p-5">
              <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 mb-1">Аномалиялар — Isolation Forest</h3>
              <p className="text-xs text-slate-400 mb-4">Сатылымдағы күтпеген өзгерістер (contamination=5%)</p>
              {anomalyData.length > 0 ? (
                <div className="space-y-2">
                  {anomalyData.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        <AlertTriangle size={16} className="text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {a.product_name_ru}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {a.date} · {a.total_qty.toFixed(1)} дана · {formatMoney(a.total_revenue)}
                        </div>
                      </div>
                      <span className="badge badge-warning flex-shrink-0 text-[10px]">Аномалия</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <AlertTriangle size={40} className="mx-auto mb-3 opacity-20" />
                  <p>Аномалиялар анықталмады</p>
                  <p className="text-xs mt-1">Деректер жеткіліксіз немесе аномалиялар жоқ</p>
                </div>
              )}
            </div>
          )}

          {/* Recommendations */}
          {tab === 'recommendations' && (
            <div className="card p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb size={18} className="text-amber-500 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100">AI Ұсыныстар</h3>
                  <p className="text-xs text-slate-400">ABC-XYZ талдауына негізделген</p>
                </div>
              </div>
              {recommendations.length > 0 ? (
                <div className="space-y-3">
                  {recommendations.map((r, i) => (
                    <div key={i} className={`p-3 sm:p-4 rounded-xl border-l-4 ${
                      r.priority === 'high' ? 'border-l-red-500 bg-red-50 dark:bg-red-900/10' :
                      r.priority === 'medium' ? 'border-l-amber-500 bg-amber-50 dark:bg-amber-900/10' :
                      'border-l-slate-300 bg-slate-50 dark:bg-slate-800'
                    }`}>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`badge ${
                          r.priority === 'high' ? 'badge-critical' :
                          r.priority === 'medium' ? 'badge-warning' : 'badge-ok'
                        }`}>
                          {r.priority === 'high' ? 'Жоғары' : r.priority === 'medium' ? 'Орта' : 'Төмен'}
                        </span>
                        <span className="badge badge-a">{r.combined}</span>
                        <span className="text-xs text-slate-500 truncate">{r.name_ru}</span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-200">{r.recommendation_kz}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{r.recommendation_ru}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Lightbulb size={40} className="mx-auto mb-3 opacity-20" />
                  <p>Ұсыныстар жоқ</p>
                  <p className="text-xs mt-1">ML моделін іске қосыңыз</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
