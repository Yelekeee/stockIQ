import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Eye, EyeOff } from 'lucide-react'
import { authApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import type { AuthToken } from '../types'

export default function Login() {
  const [email, setEmail] = useState('admin@stockiq.kz')
  const [password, setPassword] = useState('admin123')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await authApi.login(email, password)
      const data: AuthToken = res.data
      login(data.access_token, data.user)
      navigate('/')
    } catch {
      setError('Қате email немесе құпия сөз / Неверный email или пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500 shadow-lg shadow-primary-900/50 mb-4">
            <TrendingUp size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">StockIQ</h1>
          <p className="text-slate-400 mt-1 text-sm">Зияткерлік қойма жүйесі</p>
          <p className="text-slate-500 text-xs">Интеллектуальная система управления запасами</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Жүйеге кіру</h2>
          <p className="text-slate-400 text-sm mb-6">Войти в систему</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
                placeholder="admin@stockiq.kz"
                required
              />
            </div>
            <div>
              <label className="label">Құпия сөз / Пароль</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary justify-center py-3 text-base"
            >
              {loading ? 'Кіру...' : 'Кіру / Войти'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-500 space-y-1">
            <p className="font-medium text-slate-600 dark:text-slate-300">Тест тіркелгілері:</p>
            <p>👤 admin@stockiq.kz / admin123</p>
            <p>👤 manager@stockiq.kz / manager123</p>
          </div>
        </div>
      </div>
    </div>
  )
}
