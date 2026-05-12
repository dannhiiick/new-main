import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminFetch, setAdminToken } from '../lib/api'
import { Button } from '../components/ui/Button'
import type { OtpVerifyResponse } from '../lib/types'

export function Login(): React.ReactElement {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return

    setLoading(true)
    setError(null)

    try {
      const data = await adminFetch<OtpVerifyResponse>('/api/v1/auth/email/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      })

      const allowedRoles = ['ADMIN', 'CATALOG_MANAGER']
      if (!allowedRoles.includes(data.user.role)) {
        setError('Нет доступа. Требуется роль ADMIN или CATALOG_MANAGER.')
        return
      }

      setAdminToken(data.accessToken)
      navigate('/catalog')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неверный email или пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
            <span className="text-black font-bold text-xl">M</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-xl leading-none">MoodStream</h1>
            <p className="text-zinc-500 text-xs mt-0.5">Admin Panel</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border-default rounded-xl p-6">
          <form onSubmit={e => void handleLogin(e)} className="space-y-4">
            <div>
              <h2 className="text-white font-semibold text-lg">Вход</h2>
              <p className="text-zinc-500 text-sm mt-1">Введите email и пароль администратора</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-400 text-xs font-medium uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full bg-surface-2 border border-border-default rounded-md px-3 py-2.5 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-accent transition-colors"
                autoComplete="email"
                autoFocus
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-400 text-xs font-medium uppercase tracking-wide">
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface-2 border border-border-default rounded-md px-3 py-2.5 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-accent transition-colors"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-800/50 rounded-md px-3 py-2 text-red-400 text-sm">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full" loading={loading}>
              Войти
            </Button>
          </form>
        </div>

        <p className="text-center text-zinc-700 text-xs mt-6">MoodStream KZ Admin v1.0</p>
      </div>
    </div>
  )
}
