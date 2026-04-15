import React, { useEffect, useState } from 'react'
import { Plus, Zap, CheckCircle, XCircle, Send, Clock } from 'lucide-react'
import { ordersApi, productsApi } from '../services/api'
import type { PurchaseOrder, Product } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'

const STATUS_CONFIG = {
  draft: { label: 'Жоба / Черновик', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200', icon: Clock },
  sent: { label: 'Жіберілді / Отправлен', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: Send },
  received: { label: 'Алынды / Получен', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle },
  cancelled: { label: 'Болдырылмаған / Отменён', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: XCircle }
}

const URGENCY_CONFIG = {
  critical: 'badge-critical',
  warning: 'badge-warning',
  normal: 'badge-ok'
}

const URGENCY_LABELS = {
  critical: 'Критикалық',
  warning: 'Ескерту',
  normal: 'Қалыпты'
}

function formatMoney(v: number) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(v)) + ' ₸'
}

export default function Orders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [autoGenerating, setAutoGenerating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState({ product_id: '', ordered_qty: '', unit_price: '' })

  const load = async () => {
    setLoading(true)
    try {
      const [ordRes, prodRes] = await Promise.all([
        ordersApi.list(statusFilter ? { status: statusFilter } : {}),
        productsApi.list()
      ])
      setOrders(ordRes.data)
      setProducts(prodRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [statusFilter])

  const handleAutoGenerate = async () => {
    if (!confirm('ML моделі негізінде тапсырыстарды автоматты түрде жасайсыз ба? / Автоматически создать заказы на основе ML-модели?')) return
    setAutoGenerating(true)
    try {
      const res = await ordersApi.autoGenerate()
      alert(`${res.data.length} тапсырыс жасалды! / ${res.data.length} заказов создано!`)
      load()
    } finally {
      setAutoGenerating(false)
    }
  }

  const handleStatusChange = async (orderId: number, status: string) => {
    await ordersApi.updateStatus(orderId, { status })
    load()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const prod = products.find(p => p.id === parseInt(form.product_id))
      await ordersApi.create({
        product_id: parseInt(form.product_id),
        ordered_qty: parseFloat(form.ordered_qty),
        unit_price: form.unit_price ? parseFloat(form.unit_price) : prod?.purchase_price
      })
      setShowForm(false)
      setForm({ product_id: '', ordered_qty: '', unit_price: '' })
      load()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Қате / Ошибка')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Сатып алу тапсырыстары</h1>
          <p className="text-slate-400 text-sm">Заказы на закупку</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAutoGenerate} disabled={autoGenerating} className="btn-secondary">
            <Zap size={16} className={autoGenerating ? 'animate-pulse text-amber-500' : 'text-amber-500'} />
            {autoGenerating ? 'Жасалуда...' : 'ML Авто-тапсырыс'}
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            <Plus size={16} /> Тапсырыс
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Жаңа тапсырыс / Новый заказ</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="label">Тауар / Товар *</label>
              <select className="select" required value={form.product_id}
                onChange={e => {
                  const prod = products.find(p => p.id === parseInt(e.target.value))
                  setForm(f => ({ ...f, product_id: e.target.value, unit_price: prod ? String(prod.purchase_price) : '' }))
                }}>
                <option value="">Таңдаңыз...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name_ru} (қор: {p.current_stock})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Мөлшер / Количество *</label>
              <input className="input" type="number" required min="1" value={form.ordered_qty}
                onChange={e => setForm(f => ({ ...f, ordered_qty: e.target.value }))} />
            </div>
            <div>
              <label className="label">Баға / Цена (₸)</label>
              <input className="input" type="number" min="0" value={form.unit_price}
                onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Жасалуда...' : 'Жасау'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">✕</button>
            </div>
          </form>
        </div>
      )}

      {/* Status Filter */}
      <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800">
        {[
          { id: '', label: 'Барлығы / Все' },
          { id: 'draft', label: 'Жоба' },
          { id: 'sent', label: 'Жіберілді' },
          { id: 'received', label: 'Алынды' },
          { id: 'cancelled', label: 'Болдырылмаған' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setStatusFilter(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === t.id ? 'border-b-2 border-primary-500 text-primary-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-20"><LoadingSpinner size="lg" className="mx-auto" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left px-4 py-3 table-header">#</th>
                  <th className="text-left px-4 py-3 table-header">Тауар / Товар</th>
                  <th className="text-left px-4 py-3 table-header">Жеткізуші / Поставщик</th>
                  <th className="text-right px-4 py-3 table-header">Мөлшер / Кол-во</th>
                  <th className="text-right px-4 py-3 table-header">Сомасы / Сумма</th>
                  <th className="text-center px-4 py-3 table-header">Күйі / Статус</th>
                  <th className="text-center px-4 py-3 table-header">Шұғылдық</th>
                  <th className="text-center px-4 py-3 table-header">ML?</th>
                  <th className="text-left px-4 py-3 table-header">Күні / Дата</th>
                  <th className="text-right px-4 py-3 table-header">Әрекет</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const sc = STATUS_CONFIG[o.status]
                  const Icon = sc.icon
                  return (
                    <tr key={o.id} className="table-row">
                      <td className="px-4 py-3 text-xs font-mono text-slate-400">#{o.id}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          {o.product?.name_ru || `Тауар #${o.product_id}`}
                        </div>
                        <div className="text-xs text-slate-400">{o.product?.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{o.supplier?.name || '—'}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold">
                        {o.ordered_qty} {o.product?.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-emerald-600 font-semibold">
                        {o.estimated_cost ? formatMoney(o.estimated_cost) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${sc.color}`}>
                          <Icon size={11} />
                          {sc.label.split(' / ')[0]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`badge ${URGENCY_CONFIG[o.urgency_level as keyof typeof URGENCY_CONFIG] || 'badge-ok'}`}>
                          {URGENCY_LABELS[o.urgency_level as keyof typeof URGENCY_LABELS] || o.urgency_level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {o.is_auto_generated ? (
                          <span className="badge bg-violet-100 text-violet-700">ML ⚡</span>
                        ) : <span className="text-slate-300 text-xs">Қол / Ручной</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {new Date(o.created_at).toLocaleDateString('kk-KZ')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {o.status === 'draft' && (
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => handleStatusChange(o.id, 'sent')}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              Жіберу
                            </button>
                            <button
                              onClick={() => handleStatusChange(o.id, 'cancelled')}
                              className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              Болдырмау
                            </button>
                          </div>
                        )}
                        {o.status === 'sent' && (
                          <button
                            onClick={() => handleStatusChange(o.id, 'received')}
                            className="px-2 py-1 text-xs bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            Алынды
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {orders.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <p>Тапсырыстар жоқ / Нет заказов</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
