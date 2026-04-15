import React from 'react'
import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title_kz: string
  title_ru: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  color: 'blue' | 'emerald' | 'amber' | 'red' | 'violet'
  trend?: number
}

const colors = {
  blue: { bg: 'bg-primary-50 dark:bg-primary-950', icon: 'bg-primary-500', text: 'text-primary-600' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950', icon: 'bg-emerald-500', text: 'text-emerald-600' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950', icon: 'bg-amber-500', text: 'text-amber-600' },
  red: { bg: 'bg-red-50 dark:bg-red-950', icon: 'bg-red-500', text: 'text-red-600' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-950', icon: 'bg-violet-500', text: 'text-violet-600' },
}

export default function StatCard({ title_kz, title_ru, value, subtitle, icon: Icon, color, trend }: StatCardProps) {
  const c = colors[color]
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0', c.icon)}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col leading-tight mb-1">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{title_kz}</span>
          <span className="text-[10px] text-slate-400">{title_ru}</span>
        </div>
        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">{value}</div>
        {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
      </div>
      {trend !== undefined && (
        <div className={clsx('text-xs font-semibold', trend >= 0 ? 'text-emerald-500' : 'text-red-500')}>
          {trend >= 0 ? '+' : ''}{trend}%
        </div>
      )}
    </div>
  )
}
