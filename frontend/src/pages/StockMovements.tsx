import React, { useEffect, useState } from 'react'
import { Plus, ArrowUp, ArrowDown, RotateCcw, X } from 'lucide-react'
import { stockApi, productsApi } from '../services/api'
import type { StockMovement, Product } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'

const TYPE_CONFIG = {
  incoming: { label_kz: 'Кіріс', label_ru: 'Приход', icon: ArrowUp, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', dot: 'bg-emerald-500' },
  outgoing: { label_kz: 'Шығыс', label_ru: 'Расход', icon: ArrowDown, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', dot: 'bg-red-500' },
  adjustment: { label_kz: 'Түзету', label_ru: 'Корректировка', icon: RotateCcw, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-700', dot: 'bg-amber-500' },
  return: { label_kz: 'Қайтарым', label_ru: 'Возврат', icon: RotateCcw, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', dot: 'bg-blue-500' }
}

export default function StockMovements() {
  const [tab, setTab] = useState<'all' | 'incoming' | 'outgoing' | 'adjustment'>('all')
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ product_id: '', type: 'incoming', quantity: '', unit_price: '', reason: '' })
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

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const filteredMovements = tab === 'all' ? movements : movements.filter(m => m.type === tab)

  const TABS = [
    { id: 'all', label: 'Барлығы' },
    { id: 'incoming', label: 'Кіріс' },
    { id: 'outgoing', label: 'Шығыс' },
    { id: 'adjustment', label: 'Түзету' }
  ]

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Қор қозғалысы</h1>
          <p className="text-slate-400 text-xs sm:text-sm">Движение запасов</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex-shrink-0">
          <Plus size={16} />
          <span className="hidden sm:inline">Қозғалыс қосу</span>
          <span className="sm:hidden">Қосу</span>
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-100">Жаңа қозғалыс</h3>
            <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Тауар / Товар *</label>
                <select className="select" required value={form.product_id} onChange={set('product_id')}>
                  <option value="">Таңдаңыз...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name_ru} ({p.sku})</option>)}
                </select>
              </div>
              <div>
                <label className="label">Түрі / Тип *</label>
                <select className="select" value={form.type} onChange={set('type')}>
                  <option value="incoming">Кіріс / Приход</option>
                  <option value="outgoing">Шығыс / Расход</option>
                  <option value="adjustment">Түзету / Корректировка</option>
                </select>
              </div>
              <div>
                <label className="label">Мөлшер / Количество *</label>
                <input className="input" type="number" required min="0.01" step="0.01" value={form.quantity} onChange={set('quantity')} placeholder="0" />
              </div>
              <div>
                <label className="label">Баға / Цена за ед.</label>
                <input className="input" type="number" min="0" value={form.unit_price} onChange={set('unit_price')} placeholder="0" />
              </div>
            </div>
            <div>
              <label className="label">Себеп / Причина</label>
              <input className="input" value={form.reason} onChange={set('reason')} placeholder="Жаңа жеткізілім / Новая поставка" />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? 'Сақталуда...' : 'Сақтау / Сохранить'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Болдырмау</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.id
                ? 'bg-white dark:bg-slate-900 text-primary-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="block sm:hidden space-y-3">
        {loading ? (
          <div className="py-16"><LoadingSpinner size="lg" className="mx-auto" /></div>
        ) : filteredMovements.length === 0 ? (
          <div className="card p-8 text-center text-slate-400 text-sm">Қозғалыстар жоқ</div>
        ) : (
          filteredMovements.map(m => {
            const cfg = TYPE_CONFIG[m.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.adjustment
            const Icon = cfg.icon
            return (
              <div key={m.id} className="card p-3.5 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                      {m.product?.name_ru || `Тауар #${m.product_id}`}
                    </div>
                    <span className={`font-bold text-sm flex-shrink-0 ${m.type === 'outgoing' ? 'text-red-600' : 'text-emerald-600'}`}>
                      {m.type === 'outgoing' ? '−' : '+'}{m.quantity}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label_kz}
                    {m.reason && <span className="truncate">· {m.reason}</span>}
                  </div>
                  <div className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5">
                    {new Date(m.created_at).toLocaleDateString('kk-KZ')} {new Date(m.created_at).toLocaleTimeString('kk-KZ', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          })
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
                  <th className="text-center px-4 py-3 table-header">Түр / Тип</th>
                  <th className="text-right px-4 py-3 table-header">Мөлшер</th>
                  <th className="text-right px-4 py-3 table-header">Баға</th>
                  <th className="text-left px-4 py-3 table-header">Себеп</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map(m => {
                  const cfg = TYPE_CONFIG[m.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.adjustment
                  const Icon = cfg.icon
                  return (
                    <tr key={m.id} className="table-row">
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(m.created_at).toLocaleDateString('kk-KZ')}<br />
                        <span className="text-slate-400">{new Date(m.created_at).toLocaleTimeString('kk-KZ', { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{m.product?.name_ru || `#${m.product_id}`}</div>
                        <div className="text-xs text-slate-400">{m.product?.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${cfg.color}`}>
                          <Icon size={11} />{cfg.label_kz}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-sm">
                        <span className={m.type === 'outgoing' ? 'text-red-600' : 'text-emerald-600'}>
                          {m.type === 'outgoing' ? '−' : '+'}{m.quantity} {m.product?.unit}
                        </span>
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
              <div className="text-center py-16 text-slate-400 text-sm">Қозғалыстар жоқ</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
