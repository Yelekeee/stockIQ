import React, { useEffect, useState } from 'react'
import { Plus, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react'
import { stockApi, productsApi } from '../services/api'
import type { StockMovement, Product } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'

const TYPE_CONFIG = {
  incoming: { label: 'Кіріс / Приход', icon: ArrowUp, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  outgoing: { label: 'Шығыс / Расход', icon: ArrowDown, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  adjustment: { label: 'Түзету / Корректировка', icon: RotateCcw, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  return: { label: 'Қайтарым / Возврат', icon: RotateCcw, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' }
}

export default function StockMovements() {
  const [tab, setTab] = useState<'all' | 'incoming' | 'outgoing' | 'adjustment'>('all')
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    product_id: '', type: 'incoming', quantity: '', unit_price: '', reason: ''
  })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [movRes, prodRes] = await Promise.all([
        stockApi.allMovements(tab !== 'all' ? tab : undefined),
        productsApi.list()
      ])
      setMovements(movRes.data)
      setProducts(prodRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [tab])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        product_id: parseInt(form.product_id),
        quantity: parseFloat(form.quantity),
        unit_price: form.unit_price ? parseFloat(form.unit_price) : undefined,
        reason: form.reason || undefined,
        type: form.type
      }
      if (form.type === 'incoming') await stockApi.incoming(data)
      else if (form.type === 'outgoing') await stockApi.outgoing(data)
      else await stockApi.adjustment(data)
      setShowForm(false)
      setForm({ product_id: '', type: 'incoming', quantity: '', unit_price: '', reason: '' })
      load()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Қате / Ошибка')
    } finally {
      setSaving(false)
    }
  }

  const filteredMovements = tab === 'all' ? movements : movements.filter(m => m.type === tab)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Қор қозғалысы</h1>
          <p className="text-slate-400 text-sm">Движение запасов</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus size={16} /> Қозғалыс қосу
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Жаңа қозғалыс / Новое движение</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Тауар / Товар *</label>
              <select className="select" required value={form.product_id}
                onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}>
                <option value="">Таңдаңыз...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name_ru} ({p.sku})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Түрі / Тип *</label>
              <select className="select" value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="incoming">Кіріс / Приход</option>
                <option value="outgoing">Шығыс / Расход</option>
                <option value="adjustment">Түзету / Корректировка</option>
              </select>
            </div>
            <div>
              <label className="label">Мөлшер / Количество *</label>
              <input className="input" type="number" required min="0.01" step="0.01" value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div>
              <label className="label">Баға / Цена за ед.</label>
              <input className="input" type="number" min="0" value={form.unit_price}
                onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} />
            </div>
            <div>
              <label className="label">Себеп / Причина</label>
              <input className="input" value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Жаңа жеткізілім / Новая поставка" />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Сақталуда...' : 'Сақтау / Сохранить'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                Болдырмау
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800">
        {[
          { id: 'all', label: 'Барлығы / Все' },
          { id: 'incoming', label: 'Кіріс / Приход' },
          { id: 'outgoing', label: 'Шығыс / Расход' },
          { id: 'adjustment', label: 'Түзету / Корректировка' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'border-b-2 border-primary-500 text-primary-600' : 'text-slate-500 hover:text-slate-700'
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
                  <th className="text-left px-4 py-3 table-header">Күні / Дата</th>
                  <th className="text-left px-4 py-3 table-header">Тауар / Товар</th>
                  <th className="text-center px-4 py-3 table-header">Түр / Тип</th>
                  <th className="text-right px-4 py-3 table-header">Мөлшер / Кол-во</th>
                  <th className="text-right px-4 py-3 table-header">Баға / Цена</th>
                  <th className="text-left px-4 py-3 table-header">Себеп / Причина</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map(m => {
                  const config = TYPE_CONFIG[m.type] || TYPE_CONFIG.adjustment
                  const Icon = config.icon
                  return (
                    <tr key={m.id} className="table-row">
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(m.created_at).toLocaleDateString('kk-KZ')}
                        <br />
                        <span className="text-slate-400">{new Date(m.created_at).toLocaleTimeString('kk-KZ', { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          {m.product?.name_ru || `Тауар #${m.product_id}`}
                        </div>
                        <div className="text-xs text-slate-400">{m.product?.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.color}`}>
                          <Icon size={11} />
                          {config.label.split(' / ')[0]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-sm text-slate-800 dark:text-slate-100">
                        {m.type === 'outgoing' ? '-' : '+'}{m.quantity} {m.product?.unit || ''}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-500">
                        {m.unit_price ? `${m.unit_price.toLocaleString('ru-RU')} ₸` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{m.reason || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredMovements.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <p>Қозғалыстар жоқ / Нет движений</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
