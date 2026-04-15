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

  const roleLabel = {
    admin: 'Администратор',
    manager: 'Менеджер',
    viewer: 'Бақылаушы'
  }[user?.role || 'viewer']

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Menu size={18} />
        </button>
        <div className="text-sm text-slate-400 dark:text-slate-500">
          StockIQ — Зияткерлік қойма жүйесі
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onDarkToggle}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
        >
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="flex items-center gap-3 pl-3 border-l border-slate-100 dark:border-slate-800">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {user?.name}
            </div>
            <div className="text-xs text-slate-400">{roleLabel}</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-sm">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Шығу"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
