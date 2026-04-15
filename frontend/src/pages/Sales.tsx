import React, { useEffect, useState } from 'react'
import { Plus, ShoppingCart, X } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { salesApi, productsApi } from '../services/api'
import type { Sale, Product } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

function formatMoney(v: number) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(v)) + ' ₸'
}

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [dailyStats, setDailyStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ product_id: '', quantity: '', unit_price: '' })

  const load = async () => {
    setLoading(true)
    try {
      const [salesRes, prodRes, statsRes] = await Promise.all([
        salesApi.list({ limit: 100 }),
        productsApi.list(),
        salesApi.dailyStats(30)
      ])
      setSales(salesRes.data)
      setProducts(prodRes.data)
      setDailyStats([...statsRes.data].reverse())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pid = parseInt(e.target.value)
    const prod = products.find(p => p.id === pid)
    setForm(f => ({
      ...f,
      product_id: e.target.value,
      unit_price: prod ? String(prod.selling_price) : ''
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await salesApi.create({
        product_id: parseInt(form.product_id),
        quantity: parseFloat(form.quantity),
        unit_price: parseFloat(form.unit_price)
      })
      setShowForm(false)
      setForm({ product_id: '', quantity: '', unit_price: '' })
      load()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Қате / Ошибка')
    } finally {
      setSaving(false)
    }
  }

  const productRevenue: Record<number, { name: string; revenue: number }> = {}
  sales.forEach(s => {
    if (!productRevenue[s.product_id]) {
      const prod = products.find(p => p.id === s.product_id)
      productRevenue[s.product_id] = { name: prod?.name_ru || `#${s.product_id}`, revenue: 0 }
    }
    productRevenue[s.product_id].revenue += s.total_price
  })
  const pieData = Object.values(productRevenue)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)

  const totalRevenue = sales.reduce((sum, s) => sum + s.total_price, 0)
  const totalQty = sales.reduce((sum, s) => sum + s.quantity, 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Сатылым</h1>
          <p className="text-slate-400 text-xs sm:text-sm">Продажи</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex-shrink-0">
          <Plus size={16} />
          <span className="hidden sm:inline">Сату жазу</span>
          <span className="sm:hidden">Жазу</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 sm:p-4 text-center">
          <div className="text-base sm:text-2xl font-bold text-primary-600 truncate">{totalRevenue >= 1000000 ? `${(totalRevenue/1000000).toFixed(1)}M` : `${(totalRevenue/1000).toFixed(0)}K`} ₸</div>
          <div className="text-[10px] sm:text-xs text-slate-400 mt-1">Жалпы түсім</div>
        </div>
        <div className="card p-3 sm:p-4 text-center">
          <div className="text-base sm:text-2xl font-bold text-emerald-600">{Math.round(totalQty).toLocaleString('ru-RU')}</div>
          <div className="text-[10px] sm:text-xs text-slate-400 mt-1">Жалпы мөлшер</div>
        </div>
        <div className="card p-3 sm:p-4 text-center">
          <div className="text-base sm:text-2xl font-bold text-slate-800 dark:text-slate-100">{sales.length}</div>
          <div className="text-[10px] sm:text-xs text-slate-400 mt-1">Транзакциялар</div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-100">Сату жазу / Записать продажу</h3>
            <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Тауар / Товар *</label>
                <select className="select" required value={form.product_id} onChange={handleProductChange}>
                  <option value="">Таңдаңыз...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name_ru} ({p.current_stock})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Мөлшер / Количество *</label>
                <input className="input" type="number" required min="0.01" step="0.01" value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <label className="label">Сату бағасы / Цена (₸) *</label>
                <input className="input" type="number" required min="0" value={form.unit_price}
                  onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? 'Жазылуда...' : 'Жазу / Записать'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Болдырмау</button>
            </div>
          </form>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="card p-4 sm:p-5">
          <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 mb-3">Күнделікті түсім — 30 күн</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} width={36} />
              <Tooltip formatter={(v: number) => [formatMoney(v), 'Түсім']} labelStyle={{ fontSize: 11 }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
              <Bar dataKey="revenue" name="Түсім" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4 sm:p-5">
          <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 mb-3">Тауарлар бойынша үлес</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                label={({ name, percent }) => `${name.slice(0, 10)} ${(percent * 100).toFixed(0)}%`}
                labelLine={false} fontSize={9}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatMoney(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="block sm:hidden space-y-3">
        {loading ? (
          <div className="py-16"><LoadingSpinner size="lg" className="mx-auto" /></div>
        ) : sales.length === 0 ? (
          <div className="card p-8 text-center text-slate-400">
            <ShoppingCart size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Сатылымдар жоқ</p>
          </div>
        ) : (
          sales.map(s => (
            <div key={s.id} className="card p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                    {s.product?.name_ru || `Тауар #${s.product_id}`}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(s.sold_at).toLocaleDateString('kk-KZ')} {new Date(s.sold_at).toLocaleTimeString('kk-KZ', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-sm text-emerald-600">{formatMoney(s.total_price)}</div>
                  <div className="text-[10px] text-slate-400">{s.quantity} {s.product?.unit}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="card overflow-hidden hidden sm:block">
        {loading ? (
          <div className="py-20"><LoadingSpinner size="lg" className="mx-auto" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left px-4 py-3 table-header">Күні / Дата</th>
                  <th className="text-left px-4 py-3 table-header">Тауар / Товар</th>
                  <th className="text-right px-4 py-3 table-header">Мөлшер</th>
                  <th className="text-right px-4 py-3 table-header">Баға</th>
                  <th className="text-right px-4 py-3 table-header">Сомасы</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id} className="table-row">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(s.sold_at).toLocaleDateString('kk-KZ')}{' '}
                      <span className="text-slate-400">{new Date(s.sold_at).toLocaleTimeString('kk-KZ', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        {s.product?.name_ru || `Тауар #${s.product_id}`}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">{s.quantity} {s.product?.unit}</td>
                    <td className="px-4 py-3 text-right text-sm text-slate-500">{formatMoney(s.unit_price)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-sm text-emerald-600">{formatMoney(s.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sales.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <ShoppingCart size={40} className="mx-auto mb-3 opacity-30" />
                <p>Сатылымдар жоқ / Нет продаж</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
