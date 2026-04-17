import React from 'react'
import { Menu, Moon, Sun, Bell, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  onMenuToggle: () => void
  onDarkToggle: () => void
  darkMode: boolean
}

export default function Header({ onMenuToggle, onDarkToggle, darkMode }: HeaderProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const roleLabel: Record<string, string> = {
    admin: 'Администратор',
    manager: 'Менеджер',
    viewer: 'Бақылаушы'
  }

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-3 sm:px-6 py-3 flex items-center justify-between gap-2 flex-shrink-0">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Hamburger — mobile only (desktop uses sidebar's own toggle) */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
          aria-label="Toggle menu"
        >
          <Menu size={18} />
        </button>
        <div className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 truncate hidden sm:block">
          StockIQ — Зияткерлік қойма жүйесі
        </div>
        <div className="text-xs text-slate-400 sm:hidden font-semibold text-slate-600 dark:text-slate-300">
          StockIQ
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <button
          onClick={onDarkToggle}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-100 dark:border-slate-800">
          <div className="text-right hidden md:block">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">
              {user?.name}
            </div>
            <div className="text-xs text-slate-400 leading-tight">
              {roleLabel[user?.role || 'viewer']}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-sm flex-shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Шығу / Выйти"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
