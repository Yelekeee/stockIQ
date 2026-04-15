import React, { useEffect, useState } from 'react'
import { FileText, Printer, RefreshCw, TrendingUp, Package, Truck } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { reportsApi } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

function formatMoney(v: number) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(v)) + ' ₸'
}

const AGING_COLORS: Record<string, string> = {
  '<30 күн / <30 дней': '#10b981',
  '30-60 күн / 30-60 дней': '#f59e0b',
  '60-90 күн / 60-90 дней': '#f97316',
  '>90 күн / >90 дней': '#ef4444'
}

export default function Reports() {
  const [tab, setTab] = useState<'turnover' | 'aging' | 'suppliers' | 'summary'>('summary')
  const [turnoverData, setTurnoverData] = useState<any[]>([])
  const [agingData, setAgingData] = useState<any[]>([])
  const [supplierData, setSupplierData] = useState<any[]>([])
  const [summaryData, setSummaryData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const loadTab = async () => {
    setLoading(true)
    try {
      if (tab === 'turnover') {
        const res = await reportsApi.inventoryTurnover()
        setTurnoverData(res.data.slice(0, 20))
      } else if (tab === 'aging') {
        const res = await reportsApi.stockAging()
        setAgingData(res.data.slice(0, 30))
      } else if (tab === 'suppliers') {
        const res = await reportsApi.supplierPerformance()
        setSupplierData(res.data)
      } else if (tab === 'summary') {
        const res = await reportsApi.summary()
        setSummaryData(res.data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTab() }, [tab])

  const TABS = [
    { id: 'summary', label: 'Жиынтық / Сводка', icon: FileText },
    { id: 'turnover', label: 'Айналым / Оборот', icon: TrendingUp },
    { id: 'aging', label: 'Ескіру / Устаревание', icon: Package },
    { id: 'suppliers', label: 'Жеткізушілер / Поставщики', icon: Truck },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Есептер</h1>
          <p className="text-slate-400 text-sm">Отчёты</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadTab} className="btn-secondary">
            <RefreshCw size={14} /> Жаңарту
          </button>
          <button onClick={() => window.print()} className="btn-secondary">
            <Printer size={14} /> PDF Басып шығару
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-white dark:bg-slate-900 text-primary-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <t.icon size={14} />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card py-24"><LoadingSpinner size="lg" className="mx-auto" /></div>
      ) : (
        <>
          {/* Summary */}
          {tab === 'summary' && summaryData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Барлық тауарлар / Товаров', value: summaryData.total_products, color: 'text-primary-600' },
                  { label: 'Қойма құны / Стоимость склада', value: formatMoney(summaryData.total_stock_value), color: 'text-emerald-600' },
                  { label: 'Сату құны / Стоимость продажи', value: formatMoney(summaryData.total_selling_value), color: 'text-blue-600' },
                  { label: 'Потенциал пайда / Прибыль', value: formatMoney(summaryData.potential_profit), color: 'text-violet-600' },
                  { label: 'Ай. сатылым / Выручка за месяц', value: formatMoney(summaryData.month_sales_revenue), color: 'text-amber-600' },
                  { label: 'Төмен қор / Мало запаса', value: summaryData.low_stock_products, color: 'text-red-600' },
                  { label: 'ABC-A класс тауарлар', value: summaryData.abc_a_count, color: 'text-emerald-600' },
                  { label: 'ABC-B класс тауарлар', value: summaryData.abc_b_count, color: 'text-primary-600' },
                ].map((item, i) => (
                  <div key={i} className="card p-4">
                    <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                    <div className="text-xs text-slate-400 mt-1">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Turnover */}
          {tab === 'turnover' && (
            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">Қор айналым коэффициенті (үздік 20)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={turnoverData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                    <YAxis type="category" dataKey="name_ru" tick={{ fontSize: 9, fill: '#94a3b8' }} width={120} />
                    <Tooltip formatter={(v: number) => [v.toFixed(2), 'Айналым']} contentStyle={{ borderRadius: 12 }} />
                    <Bar dataKey="turnover_ratio" name="Айналым" radius={[0, 4, 4, 0]}>
                      {turnoverData.map((_, i) => (
                        <Cell key={i} fill={i < 5 ? '#10b981' : i < 10 ? '#3b82f6' : '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="text-left px-4 py-3 table-header">SKU</th>
                        <th className="text-left px-4 py-3 table-header">Тауар</th>
                        <th className="text-right px-4 py-3 table-header">Қоймада</th>
                        <th className="text-right px-4 py-3 table-header">Қойма ₸</th>
                        <th className="text-right px-4 py-3 table-header">Сатылды</th>
                        <th className="text-right px-4 py-3 table-header">Түсім</th>
                        <th className="text-right px-4 py-3 table-header">Айналым</th>
                      </tr>
                    </thead>
                    <tbody>
                      {turnoverData.map(row => (
                        <tr key={row.product_id} className="table-row">
                          <td className="px-4 py-2 text-xs font-mono text-slate-400">{row.sku}</td>
                          <td className="px-4 py-2 text-sm text-slate-800 dark:text-slate-100 truncate max-w-40">{row.name_ru}</td>
                          <td className="px-4 py-2 text-right text-sm">{row.current_stock}</td>
                          <td className="px-4 py-2 text-right text-sm">{formatMoney(row.stock_value)}</td>
                          <td className="px-4 py-2 text-right text-sm">{Math.round(row.total_sold)}</td>
                          <td className="px-4 py-2 text-right text-sm text-emerald-600 font-semibold">{formatMoney(row.total_revenue)}</td>
                          <td className="px-4 py-2 text-right">
                            <span className={`badge ${row.turnover_ratio > 5 ? 'badge-ok' : row.turnover_ratio > 2 ? 'badge-warning' : 'badge-critical'}`}>
                              {row.turnover_ratio.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Aging */}
          {tab === 'aging' && (
            <div className="card overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Қор ескіру есебі</h3>
                <p className="text-xs text-slate-400">Последней продажи с момента (сатылмаған тауарлар)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="text-left px-4 py-3 table-header">SKU</th>
                      <th className="text-left px-4 py-3 table-header">Тауар</th>
                      <th className="text-right px-4 py-3 table-header">Қоймада</th>
                      <th className="text-right px-4 py-3 table-header">Құны</th>
                      <th className="text-right px-4 py-3 table-header">Күндер / Дней</th>
                      <th className="text-center px-4 py-3 table-header">Санат</th>
                      <th className="text-left px-4 py-3 table-header">Соңғы сату</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agingData.map(row => (
                      <tr key={row.product_id} className="table-row">
                        <td className="px-4 py-2 text-xs font-mono text-slate-400">{row.sku}</td>
                        <td className="px-4 py-2 text-sm text-slate-800 dark:text-slate-100 truncate max-w-40">{row.name_ru}</td>
                        <td className="px-4 py-2 text-right text-sm">{row.current_stock}</td>
                        <td className="px-4 py-2 text-right text-sm">{formatMoney(row.stock_value)}</td>
                        <td className="px-4 py-2 text-right">
                          <span className={`text-sm font-bold ${
                            row.days_since_sold > 90 ? 'text-red-600' :
                            row.days_since_sold > 60 ? 'text-orange-500' :
                            row.days_since_sold > 30 ? 'text-amber-500' : 'text-emerald-600'
                          }`}>
                            {row.days_since_sold === 999 ? '∞' : row.days_since_sold}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full`}
                            style={{ background: AGING_COLORS[row.aging_category] + '20', color: AGING_COLORS[row.aging_category] }}>
                            {row.aging_category}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-slate-400">{row.last_sale_date || 'Ешқашан'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Supplier Performance */}
          {tab === 'suppliers' && (
            <div className="card overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Жеткізуші өнімділігі</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="text-left px-4 py-3 table-header">Жеткізуші / Поставщик</th>
                      <th className="text-right px-4 py-3 table-header">Тапсырыс / Заказов</th>
                      <th className="text-right px-4 py-3 table-header">Орындалды</th>
                      <th className="text-right px-4 py-3 table-header">Орындалу %</th>
                      <th className="text-right px-4 py-3 table-header">Жалпы сома</th>
                      <th className="text-right px-4 py-3 table-header">Жеткізу мерзімі</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierData.map(row => (
                      <tr key={row.supplier_id} className="table-row">
                        <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-100">{row.name}</td>
                        <td className="px-4 py-3 text-right text-sm">{row.total_orders}</td>
                        <td className="px-4 py-3 text-right text-sm">{row.completed_orders}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`badge ${row.completion_rate >= 80 ? 'badge-ok' : row.completion_rate >= 50 ? 'badge-warning' : 'badge-critical'}`}>
                            {row.completion_rate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-600">
                          {formatMoney(row.total_order_value)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">{row.delivery_days} күн</td>
                      </tr>
                    ))}
                    {supplierData.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-12 text-slate-400">Деректер жоқ</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
