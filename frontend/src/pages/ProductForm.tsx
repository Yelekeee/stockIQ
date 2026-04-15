import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { productsApi } from '../services/api'
import type { Category, Supplier } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'

export default function ProductForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id && id !== 'new'
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [form, setForm] = useState({
    name_kz: '', name_ru: '', sku: '', barcode: '',
    category_id: '', unit: 'шт', purchase_price: '',
    selling_price: '', current_stock: '0', min_stock: '10',
    max_stock: '500', lead_time_days: '7', order_cost: '5000',
    holding_cost_pct: '0.25', supplier_id: ''
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [catRes, supRes] = await Promise.all([productsApi.categories(), productsApi.suppliers()])
        setCategories(catRes.data)
        setSuppliers(supRes.data)
        if (isEdit) {
          const prodRes = await productsApi.get(parseInt(id!))
          const p = prodRes.data
          setForm({
            name_kz: p.name_kz, name_ru: p.name_ru, sku: p.sku,
            barcode: p.barcode || '', category_id: String(p.category_id),
            unit: p.unit, purchase_price: String(p.purchase_price),
            selling_price: String(p.selling_price), current_stock: String(p.current_stock),
            min_stock: String(p.min_stock), max_stock: String(p.max_stock),
            lead_time_days: String(p.lead_time_days), order_cost: String(p.order_cost),
            holding_cost_pct: String(p.holding_cost_pct), supplier_id: String(p.supplier_id || '')
          })
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        ...form,
        category_id: parseInt(form.category_id),
        purchase_price: parseFloat(form.purchase_price),
        selling_price: parseFloat(form.selling_price),
        current_stock: parseFloat(form.current_stock),
        min_stock: parseFloat(form.min_stock),
        max_stock: parseFloat(form.max_stock),
        lead_time_days: parseInt(form.lead_time_days),
        order_cost: parseFloat(form.order_cost),
        holding_cost_pct: parseFloat(form.holding_cost_pct),
        supplier_id: form.supplier_id ? parseInt(form.supplier_id) : undefined,
        barcode: form.barcode || undefined
      }
      if (isEdit) {
        await productsApi.update(parseInt(id!), data)
      } else {
        await productsApi.create(data)
      }
      navigate('/products')
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Қате болды / Ошибка')
    } finally {
      setSaving(false)
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-secondary p-2"><ArrowLeft size={16} /></button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {isEdit ? 'Тауарды өңдеу / Редактировать товар' : 'Жаңа тауар / Новый товар'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Атауы (қазақша) *</label>
            <input className="input" required value={form.name_kz} onChange={set('name_kz')} placeholder="Тауардың қазақша атауы" />
          </div>
          <div>
            <label className="label">Название (рус) *</label>
            <input className="input" required value={form.name_ru} onChange={set('name_ru')} placeholder="Название товара" />
          </div>
          <div>
            <label className="label">SKU *</label>
            <input className="input font-mono" required value={form.sku} onChange={set('sku')} placeholder="EL-001" />
          </div>
          <div>
            <label className="label">Штрих-код / Barcode</label>
            <input className="input font-mono" value={form.barcode} onChange={set('barcode')} placeholder="877001234567" />
          </div>
          <div>
            <label className="label">Санат / Категория *</label>
            <select className="select" required value={form.category_id} onChange={set('category_id')}>
              <option value="">Таңдаңыз...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name_kz} / {c.name_ru}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Өлшем бірлігі / Единица</label>
            <select className="select" value={form.unit} onChange={set('unit')}>
              <option value="шт">шт</option>
              <option value="кг">кг</option>
              <option value="л">л</option>
              <option value="м">м</option>
              <option value="жиын">жиын</option>
            </select>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
          <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-3">Баға / Цены</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Сатып алу бағасы (₸) / Закупочная цена *</label>
              <input className="input" type="number" required min="0" value={form.purchase_price} onChange={set('purchase_price')} />
            </div>
            <div>
              <label className="label">Сату бағасы (₸) / Цена продажи *</label>
              <input className="input" type="number" required min="0" value={form.selling_price} onChange={set('selling_price')} />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
          <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-3">Қор параметрлері / Параметры запасов</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Қазіргі қор / Текущий остаток</label>
              <input className="input" type="number" min="0" value={form.current_stock} onChange={set('current_stock')} />
            </div>
            <div>
              <label className="label">Минимум *</label>
              <input className="input" type="number" required min="0" value={form.min_stock} onChange={set('min_stock')} />
            </div>
            <div>
              <label className="label">Максимум *</label>
              <input className="input" type="number" required min="0" value={form.max_stock} onChange={set('max_stock')} />
            </div>
            <div>
              <label className="label">Жеткізу мерзімі (күн) / Срок поставки</label>
              <input className="input" type="number" min="1" value={form.lead_time_days} onChange={set('lead_time_days')} />
            </div>
            <div>
              <label className="label">Тапсырыс шығыны (₸) / Стоимость заказа</label>
              <input className="input" type="number" min="0" value={form.order_cost} onChange={set('order_cost')} />
            </div>
            <div>
              <label className="label">Сақтау шығыны % / Затраты хранения %</label>
              <input className="input" type="number" min="0" max="1" step="0.01" value={form.holding_cost_pct} onChange={set('holding_cost_pct')} />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
          <label className="label">Жеткізуші / Поставщик</label>
          <select className="select" value={form.supplier_id} onChange={set('supplier_id')}>
            <option value="">Таңдаңыз...</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Болдырмау / Отмена
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            <Save size={14} />
            {saving ? 'Сақталуда...' : 'Сақтау / Сохранить'}
          </button>
        </div>
      </form>
    </div>
  )
}
