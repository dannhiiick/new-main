import React from 'react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { getAdminToken, clearAdminToken } from '../lib/api'

const NAV_ITEMS = [
  { to: '/catalog', label: 'Каталог', icon: '♪' },
  { to: '/artists', label: 'Артисты', icon: '👤' },
  { to: '/releases', label: 'Релизы', icon: '💿' },
  { to: '/ingestion', label: 'Загрузка', icon: '↑' },
  { to: '/users', label: 'Пользователи', icon: '◎' },
  { to: '/analytics', label: 'Аналитика', icon: '📊' },
  { to: '/feedback', label: 'Обратная связь', icon: '✉' },
]

const ROUTE_LABELS: Record<string, string> = {
  '/catalog': 'Каталог треков',
  '/artists': 'Артисты',
  '/releases': 'Релизы',
  '/ingestion': 'Загрузка трека',
  '/users': 'Пользователи',
  '/analytics': 'Аналитика',
  '/feedback': 'Обратная связь',
}

function getBreadcrumb(pathname: string): string {
  if (pathname.startsWith('/catalog/')) return 'Детали трека'
  return ROUTE_LABELS[pathname] ?? pathname
}

export function Layout(): React.ReactElement {
  const token = getAdminToken()
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  function handleLogout() {
    clearAdminToken()
    window.location.href = '/login'
  }

  const breadcrumb = getBreadcrumb(location.pathname)

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-surface border-r border-border-default flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border-default">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
              <span className="text-black font-bold text-sm">M</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-none">MoodStream</p>
              <p className="text-zinc-500 text-[10px] mt-0.5 leading-none">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="text-zinc-600 text-[10px] uppercase tracking-widest px-2 mb-2 font-semibold">
            Управление
          </p>
          <ul className="space-y-0.5">
            {NAV_ITEMS.map(item => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-accent/15 text-accent font-medium'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <span className="text-base w-5 text-center">{item.icon}</span>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User section */}
        <div className="px-3 py-4 border-t border-border-default">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-md">
            <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
              <span className="text-accent text-xs font-bold">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">Admin</p>
              <p className="text-zinc-600 text-[10px] truncate">CATALOG_MANAGER</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-900/10 transition-colors text-xs"
          >
            <span className="text-sm">⎋</span>
            Выйти
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-surface border-b border-border-default flex items-center px-6 shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">Admin</span>
            <span className="text-zinc-700">/</span>
            <span className="text-white font-medium">{breadcrumb}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
