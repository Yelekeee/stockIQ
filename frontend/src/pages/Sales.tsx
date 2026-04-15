import React, { useEffect, useState } from 'react'
import { Plus, ShoppingCart, TrendingUp } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
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

  // Pie chart data — top 6 by revenue
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Сатылым</h1>
          <p className="text-slate-400 text-sm">Продажи</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus size={16} /> Сату жазу
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-primary-600">{formatMoney(totalRevenue)}</div>
          <div className="text-xs text-slate-400 mt-1">Жалпы түсім / Общая выручка</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{Math.round(totalQty).toLocaleString('ru-RU')}</div>
          <div className="text-xs text-slate-400 mt-1">Жалпы мөлшер / Всего продано</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{sales.length}</div>
          <div className="text-xs text-slate-400 mt-1">Транзакциялар / Транзакций</div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Сату жазу / Записать продажу</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="label">Тауар / Товар *</label>
              <select className="select" required value={form.product_id} onChange={handleProductChange}>
                <option value="">Таңдаңыз...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name_ru} (қор: {p.current_stock})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Мөлшер / Количество *</label>
              <input className="input" type="number" required min="0.01" step="0.01" value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div>
              <label className="label">Сату бағасы / Цена (₸) *</label>
              <input className="input" type="number" required min="0" value={form.unit_price}
                onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Жазылуда...' : 'Жазу / Записать'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">✕</button>
            </div>
          </form>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">Күнделікті түсім — 30 күн</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => [formatMoney(v), 'Түсім']} labelStyle={{ fontSize: 11 }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
              <Bar dataKey="revenue" name="Түсім" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">Тауарлар бойынша үлес / По товарам</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name.slice(0,12)} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatMoney(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sales Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-20"><LoadingSpinner size="lg" className="mx-auto" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left px-4 py-3 table-header">Күні / Дата</th>
                  <th className="text-left px-4 py-3 table-header">Тауар / Товар</th>
                  <th className="text-right px-4 py-3 table-header">Мөлшер / Кол-во</th>
                  <th className="text-right px-4 py-3 table-header">Баға / Цена</th>
                  <th className="text-right px-4 py-3 table-header">Сомасы / Итого</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id} className="table-row">
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(s.sold_at).toLocaleDateString('kk-KZ')}{' '}
                      {new Date(s.sold_at).toLocaleTimeString('kk-KZ', { hour: '2-digit', minute: '2-digit' })}
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
