import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Search, Eye, Edit, Trash2, Package, Filter, X } from 'lucide-react'
import { productsApi } from '../services/api'
import type { Product, Category } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'

function stockStatus(p: Product): 'critical' | 'warning' | 'ok' {
  if (p.current_stock <= p.min_stock) return 'critical'
  if (p.current_stock <= p.min_stock * 1.5) return 'warning'
  return 'ok'
}

function formatPrice(v: number) {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M ₸`
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K ₸`
  return `${v} ₸`
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
  const [showFilters, setShowFilters] = useState(false)
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
    if (!confirm('Тауарды жою?')) return
    await productsApi.delete(id)
    load()
  }

  const hasFilters = !!(search || abcFilter || xyzFilter || catFilter || stockFilter)
  const clearAll = () => { setSearch(''); setAbcFilter(''); setXyzFilter(''); setCatFilter(''); setStockFilter('') }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Тауарлар</h1>
          <p className="text-slate-400 text-xs sm:text-sm">{products.length} позиция</p>
        </div>
        <Link to="/products/new" className="btn-primary flex-shrink-0">
          <Plus size={16} />
          <span className="hidden sm:inline">Тауар қосу</span>
          <span className="sm:hidden">Қосу</span>
        </Link>
      </div>

      {/* Search + Filter toggle */}
      <div className="card p-3 sm:p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Іздеу / SKU немесе атауы..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-8 w-full"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex-shrink-0 ${showFilters ? 'bg-primary-50 text-primary-600 border-primary-200' : ''}`}
          >
            <Filter size={14} />
            <span className="hidden sm:inline">Фильтр</span>
            {hasFilters && <span className="w-2 h-2 bg-primary-500 rounded-full" />}
          </button>
          {hasFilters && (
            <button onClick={clearAll} className="btn-secondary flex-shrink-0 text-red-500">
              <X size={14} />
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="select text-xs">
              <option value="">Барлық санат</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name_kz}</option>)}
            </select>
            <select value={abcFilter} onChange={e => setAbcFilter(e.target.value)} className="select text-xs">
              <option value="">ABC класс</option>
              <option value="A">A класс</option>
              <option value="B">B класс</option>
              <option value="C">C класс</option>
            </select>
            <select value={xyzFilter} onChange={e => setXyzFilter(e.target.value)} className="select text-xs">
              <option value="">XYZ класс</option>
              <option value="X">X (тұрақты)</option>
              <option value="Y">Y (айнымалы)</option>
              <option value="Z">Z (болжанбайтын)</option>
            </select>
            <select value={stockFilter} onChange={e => setStockFilter(e.target.value)} className="select text-xs">
              <option value="">Қор күйі</option>
              <option value="critical">Критикалық</option>
              <option value="warning">Ескерту</option>
              <option value="ok">Жақсы</option>
            </select>
          </div>
        )}
      </div>

      {/* Mobile cards view */}
      <div className="block sm:hidden space-y-3">
        {loading ? (
          <div className="py-16"><LoadingSpinner size="lg" className="mx-auto" /></div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-slate-400 card p-8">
            <Package size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Тауарлар табылмады</p>
          </div>
        ) : (
          products.map(p => {
            const status = stockStatus(p)
            return (
              <div key={p.id} className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 leading-tight">{p.name_kz}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{p.name_ru}</div>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">{p.sku}</div>
                  </div>
                  <span className={`badge flex-shrink-0 ${status === 'critical' ? 'badge-critical' : status === 'warning' ? 'badge-warning' : 'badge-ok'}`}>
                    {status === 'critical' ? 'Критикалық' : status === 'warning' ? 'Ескерту' : 'Жақсы'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                    <div className={`text-base font-bold ${status === 'critical' ? 'text-red-600' : status === 'warning' ? 'text-amber-500' : 'text-emerald-600'}`}>
                      {p.current_stock}
                    </div>
                    <div className="text-[10px] text-slate-400">Қоймада</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                    <div className="text-base font-bold text-slate-700 dark:text-slate-200">{formatPrice(p.selling_price)}</div>
                    <div className="text-[10px] text-slate-400">Баға</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                    <div className="flex gap-1 justify-center flex-wrap">
                      {p.abc_class && <span className={`badge badge-${p.abc_class.toLowerCase()} text-[10px]`}>{p.abc_class}</span>}
                      {p.xyz_class && <span className={`badge badge-${p.xyz_class.toLowerCase()} text-[10px]`}>{p.xyz_class}</span>}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">ABC/XYZ</div>
                  </div>
                </div>
                <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <Link to={`/products/${p.id}`} className="flex-1 btn-secondary justify-center py-1.5 text-xs">
                    <Eye size={12} /> Егжей
                  </Link>
                  <Link to={`/products/${p.id}/edit`} className="flex-1 btn-secondary justify-center py-1.5 text-xs">
                    <Edit size={12} /> Өңдеу
                  </Link>
                  <button onClick={() => handleDelete(p.id)} className="btn-danger justify-center py-1.5 text-xs px-3">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Desktop table view */}
      <div className="card overflow-hidden hidden sm:block">
        {loading ? (
          <div className="py-20"><LoadingSpinner size="lg" className="mx-auto" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left px-4 py-3 table-header">SKU</th>
                  <th className="text-left px-4 py-3 table-header">Атауы / Название</th>
                  <th className="text-left px-4 py-3 table-header">Санат</th>
                  <th className="text-right px-4 py-3 table-header">Қоймада</th>
                  <th className="text-right px-4 py-3 table-header">Мин</th>
                  <th className="text-right px-4 py-3 table-header">Баға</th>
                  <th className="text-center px-4 py-3 table-header">ABC</th>
                  <th className="text-center px-4 py-3 table-header">XYZ</th>
                  <th className="text-center px-4 py-3 table-header">Күй</th>
                  <th className="text-right px-4 py-3 table-header">Әрекет</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const status = stockStatus(p)
                  return (
                    <tr key={p.id} className="table-row">
                      <td className="px-4 py-3 text-xs font-mono text-slate-500">{p.sku}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm text-slate-800 dark:text-slate-100">{p.name_kz}</div>
                        <div className="text-xs text-slate-400">{p.name_ru}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{p.category?.name_kz || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold text-sm ${status === 'critical' ? 'text-red-600' : status === 'warning' ? 'text-amber-500' : 'text-emerald-600'}`}>
                          {p.current_stock} {p.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-slate-400">{p.min_stock}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700 dark:text-slate-300">{formatPrice(p.selling_price)}</td>
                      <td className="px-4 py-3 text-center">
                        {p.abc_class ? <span className={`badge badge-${p.abc_class.toLowerCase()}`}>{p.abc_class}</span> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.xyz_class ? <span className={`badge badge-${p.xyz_class.toLowerCase()}`}>{p.xyz_class}</span> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`badge ${status === 'critical' ? 'badge-critical' : status === 'warning' ? 'badge-warning' : 'badge-ok'}`}>
                          {status === 'critical' ? 'Критикалық' : status === 'warning' ? 'Ескерту' : 'Жақсы'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/products/${p.id}`} className="p-1.5 rounded-lg text-slate-400 hover:text-primary-500 hover:bg-primary-50 transition-colors"><Eye size={14} /></Link>
                          <Link to={`/products/${p.id}/edit`} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"><Edit size={14} /></Link>
                          <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
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
                <p>Тауарлар табылмады</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
