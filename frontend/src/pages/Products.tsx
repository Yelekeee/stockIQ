import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Search, Filter, Eye, Edit, Trash2, Package } from 'lucide-react'
import { productsApi } from '../services/api'
import type { Product, Category } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'

function stockStatus(p: Product): 'critical' | 'warning' | 'ok' {
  if (p.current_stock <= p.min_stock) return 'critical'
  if (p.current_stock <= p.min_stock * 1.5) return 'warning'
  return 'ok'
}

const STATUS_LABELS = {
  critical: { label: 'Критикалық', class: 'badge-critical' },
  warning: { label: 'Ескерту', class: 'badge-warning' },
  ok: { label: 'Жақсы', class: 'badge-ok' }
}

function formatPrice(v: number) {
  return new Intl.NumberFormat('ru-RU').format(v) + ' ₸'
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [abcFilter, setAbcFilter] = useState('')
  const [xyzFilter, setXyzFilter] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [stockFilter, setStockFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const s = searchParams.get('stock_status')
    if (s) setStockFilter(s)
  }, [searchParams])

  const load = async () => {
    setLoading(true)
    try {
      const [prodRes, catRes] = await Promise.all([
        productsApi.list({
          search: search || undefined,
          abc_class: abcFilter || undefined,
          xyz_class: xyzFilter || undefined,
          category_id: catFilter ? parseInt(catFilter) : undefined,
          stock_status: stockFilter || undefined
        }),
        productsApi.categories()
      ])
      setProducts(prodRes.data)
      setCategories(catRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [search, abcFilter, xyzFilter, catFilter, stockFilter])

  const handleDelete = async (id: number) => {
    if (!confirm('Тауарды жою? / Удалить товар?')) return
    await productsApi.delete(id)
    load()
  }

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Тауарлар</h1>
          <p className="text-slate-400 text-sm">Товары — {products.length} позиция</p>
        </div>
        <Link to="/products/new" className="btn-primary">
          <Plus size={16} /> Тауар қосу
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Іздеу / Поиск по названию или SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-8"
            />
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="select w-auto">
            <option value="">Барлық санаттар</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name_kz} / {c.name_ru}</option>
            ))}
          </select>
          <select value={abcFilter} onChange={e => setAbcFilter(e.target.value)} className="select w-auto">
            <option value="">ABC класс</option>
            <option value="A">A класс</option>
            <option value="B">B класс</option>
            <option value="C">C класс</option>
          </select>
          <select value={xyzFilter} onChange={e => setXyzFilter(e.target.value)} className="select w-auto">
            <option value="">XYZ класс</option>
            <option value="X">X (тұрақты)</option>
            <option value="Y">Y (айнымалы)</option>
            <option value="Z">Z (болжанбайтын)</option>
          </select>
          <select value={stockFilter} onChange={e => setStockFilter(e.target.value)} className="select w-auto">
            <option value="">Қор күйі</option>
            <option value="critical">Критикалық</option>
            <option value="warning">Ескерту</option>
            <option value="ok">Жақсы</option>
          </select>
          {(search || abcFilter || xyzFilter || catFilter || stockFilter) && (
            <button
              onClick={() => { setSearch(''); setAbcFilter(''); setXyzFilter(''); setCatFilter(''); setStockFilter('') }}
              className="btn-secondary"
            >
              Тазарту
            </button>
          )}
        </div>
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
                  <th className="text-left px-4 py-3 table-header">SKU</th>
                  <th className="text-left px-4 py-3 table-header">Атауы / Название</th>
                  <th className="text-left px-4 py-3 table-header">Санат</th>
                  <th className="text-right px-4 py-3 table-header">Қоймада / Остаток</th>
                  <th className="text-right px-4 py-3 table-header">Мин</th>
                  <th className="text-right px-4 py-3 table-header">Баға / Цена</th>
                  <th className="text-center px-4 py-3 table-header">ABC</th>
                  <th className="text-center px-4 py-3 table-header">XYZ</th>
                  <th className="text-center px-4 py-3 table-header">Кластер</th>
                  <th className="text-center px-4 py-3 table-header">Күй</th>
                  <th className="text-right px-4 py-3 table-header">Әрекет</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const status = stockStatus(p)
                  const s = STATUS_LABELS[status]
                  return (
                    <tr key={p.id} className="table-row">
                      <td className="px-4 py-3 text-xs font-mono text-slate-500">{p.sku}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm text-slate-800 dark:text-slate-100">{p.name_kz}</div>
                        <div className="text-xs text-slate-400">{p.name_ru}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {p.category ? `${p.category.name_kz}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold text-sm ${
                          status === 'critical' ? 'text-red-600' :
                          status === 'warning' ? 'text-amber-500' : 'text-emerald-600'
                        }`}>
                          {p.current_stock} {p.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-slate-400">{p.min_stock}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700 dark:text-slate-300">
                        {formatPrice(p.selling_price)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.abc_class ? (
                          <span className={`badge badge-${p.abc_class.toLowerCase()}`}>{p.abc_class}</span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.xyz_class ? (
                          <span className={`badge badge-${p.xyz_class.toLowerCase()}`}>{p.xyz_class}</span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.cluster_label ? (
                          <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-24 block">
                            {p.cluster_label}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`badge ${s.class}`}>{s.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/products/${p.id}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-primary-500 hover:bg-primary-50 transition-colors"
                          >
                            <Eye size={14} />
                          </Link>
                          <Link
                            to={`/products/${p.id}/edit`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                          >
                            <Edit size={14} />
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {products.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <Package size={40} className="mx-auto mb-3 opacity-30" />
                <p>Тауарлар табылмады / Товары не найдены</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
