import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, ArrowLeftRight, ShoppingCart,
  ClipboardList, Brain, FileText, TrendingUp, X
} from 'lucide-react'
import clsx from 'clsx'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label_kz: 'Дашборд', label_ru: 'Панель' },
  { to: '/products', icon: Package, label_kz: 'Тауарлар', label_ru: 'Товары' },
  { to: '/stock', icon: ArrowLeftRight, label_kz: 'Қозғалыс', label_ru: 'Движение' },
  { to: '/sales', icon: ShoppingCart, label_kz: 'Сатылым', label_ru: 'Продажи' },
  { to: '/orders', icon: ClipboardList, label_kz: 'Тапсырыстар', label_ru: 'Заказы' },
  { to: '/analytics', icon: Brain, label_kz: 'ML Аналитика', label_ru: 'ML Аналитика' },
  { to: '/reports', icon: FileText, label_kz: 'Есептер', label_ru: 'Отчёты' },
]

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <aside className="flex flex-col h-full bg-slate-900 dark:bg-slate-950 w-64">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={20} className="text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight">StockIQ</div>
            <div className="text-slate-400 text-xs leading-tight">Зияткерлік жүйе</div>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label_kz, label_ru }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-xs font-semibold truncate">{label_kz}</span>
              <span className="text-[10px] opacity-60 truncate">{label_ru}</span>
            </div>
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-slate-800 flex-shrink-0">
        <div className="text-xs text-slate-500 text-center">Дипломдық жоба • 2024</div>
      </div>
    </aside>
  )
}
