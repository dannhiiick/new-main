import React, { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminFetch } from '../../lib/api'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import type { AdminUserSummary, AdminUsersPage } from '../../lib/types'
import type { BadgeVariant } from '../../components/ui/Badge'

const ROLES = ['USER', 'CATALOG_MANAGER', 'ADMIN'] as const
type UserRole = typeof ROLES[number]

function roleBadgeVariant(role: string): BadgeVariant {
  switch (role) {
    case 'ADMIN': return 'red'
    case 'CATALOG_MANAGER': return 'blue'
    default: return 'gray'
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

function UserSkeleton(): React.ReactElement {
  return (
    <tbody>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-border-default">
          <td className="px-4 py-3">
            <div className="space-y-1.5">
              <div className="h-3.5 w-32 bg-surface-2 rounded animate-pulse" />
              <div className="h-3 w-40 bg-surface-2 rounded animate-pulse" />
            </div>
          </td>
          <td className="px-4 py-3"><div className="h-3.5 w-24 bg-surface-2 rounded animate-pulse" /></td>
          <td className="px-4 py-3"><div className="h-5 w-20 bg-surface-2 rounded animate-pulse" /></td>
          <td className="px-4 py-3"><div className="h-3.5 w-16 bg-surface-2 rounded animate-pulse" /></td>
          <td className="px-4 py-3"><div className="h-3.5 w-24 bg-surface-2 rounded animate-pulse" /></td>
          <td className="px-4 py-3"><div className="h-7 w-32 bg-surface-2 rounded animate-pulse" /></td>
          <td className="px-4 py-3"><div className="h-7 w-24 bg-surface-2 rounded animate-pulse" /></td>
        </tr>
      ))}
    </tbody>
  )
}

function RoleSelect({
  userId,
  currentRole,
}: {
  userId: string
  currentRole: string
}): React.ReactElement {
  const queryClient = useQueryClient()
  const [localRole, setLocalRole] = useState<string>(currentRole)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (role: UserRole) =>
      adminFetch<AdminUserSummary>(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    onSuccess: (updated) => {
      setLocalRole(updated.role)
      setError(null)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (err: unknown) => {
      setLocalRole(currentRole)
      setError(err instanceof Error ? err.message : 'Ошибка')
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const newRole = e.target.value as UserRole
    setLocalRole(newRole)
    setError(null)
    mutation.mutate(newRole)
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="relative inline-block w-full min-w-[130px]">
        <select
          value={localRole}
          onChange={handleChange}
          disabled={mutation.isPending}
          className="w-full appearance-none bg-surface-2 hover:bg-[#2C2C32] text-white text-xs rounded-md pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {ROLES.map(r => (
            <option key={r} value={r} className="bg-surface">{r}</option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-zinc-500">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>
      {error && <span className="text-red-400 text-[10px] mt-0.5">{error}</span>}
    </div>
  )
}

function BanButton({ userId, isBanned }: { userId: string; isBanned: boolean }): React.ReactElement {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (banned: boolean) =>
      adminFetch<AdminUserSummary>(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isBanned: banned }),
      }),
    onSuccess: () => {
      setError(null)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Ошибка')
    },
  })

  return (
    <div className="flex flex-col gap-0.5">
      <Button
        variant={isBanned ? 'secondary' : 'danger'}
        size="sm"
        onClick={() => mutation.mutate(!isBanned)}
        loading={mutation.isPending}
        className="whitespace-nowrap"
      >
        {isBanned ? 'Разбанить' : 'Блокировать'}
      </Button>
      {error && <span className="text-red-400 text-[10px] mt-0.5">{error}</span>}
    </div>
  )
}

function UserRow({ user }: { user: AdminUserSummary }): React.ReactElement {
  const contact = user.email ?? user.phone ?? '—'
  return (
    <tr className={[
      'border-b border-border-default/45 hover:bg-surface-2/30 transition-all duration-150',
      user.isBanned ? 'opacity-60' : '',
    ].join(' ')}>
      <td className="px-4 py-3 min-w-[200px]">
        <div className="flex items-center gap-2">
          <p className="text-white text-sm font-medium">{user.displayName}</p>
          {user.isBanned && (
            <Badge variant="red" label="бан" />
          )}
        </div>
        <p className="text-zinc-500 text-xs mt-0.5">{contact}</p>
      </td>
      <td className="px-4 py-3 text-zinc-400 text-xs font-mono">{user.id.slice(0, 12)}…</td>
      <td className="px-4 py-3">
        <Badge label={user.role} variant={roleBadgeVariant(user.role)} />
      </td>
      <td className="px-4 py-3 text-zinc-400 text-xs uppercase">{user.preferredLocale}</td>
      <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">{formatDate(user.createdAt)}</td>
      <td className="px-4 py-3">
        <RoleSelect userId={user.id} currentRole={user.role} />
      </td>
      <td className="px-4 py-3">
        <BanButton userId={user.id} isBanned={user.isBanned} />
      </td>
    </tr>
  )
}

export function UsersPage(): React.ReactElement {
  const [searchInput, setSearchInput] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const [allUsers, setAllUsers] = useState<AdminUserSummary[]>([])
  const isFirstLoad = useRef(true)

  const debouncedSearch = useDebounce(searchInput, 400)

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      return
    }
    setAllUsers([])
    setCursor(null)
  }, [debouncedSearch])

  const queryParams = new URLSearchParams({
    q: debouncedSearch,
    limit: '30',
    ...(cursor ? { cursor } : {}),
  })

  const { data, isLoading, isError, error, refetch } = useQuery<AdminUsersPage>({
    queryKey: ['admin', 'users', debouncedSearch, cursor],
    queryFn: () => adminFetch<AdminUsersPage>(`/api/admin/users?${queryParams.toString()}`),
    staleTime: 30_000,
  })

  useEffect(() => {
    if (data?.users) {
      setAllUsers(prev => {
        if (cursor === null) return data.users
        const existingIds = new Set(prev.map(u => u.id))
        return [...prev, ...data.users.filter(u => !existingIds.has(u.id))]
      })
    }
  }, [data, cursor])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold tracking-tight">Пользователи</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            Все зарегистрированные пользователи
            {data?.total != null ? ` · всего ${data.total}` : ''}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-surface rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Поиск</label>
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-zinc-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Имя, email или телефон..."
                className="w-full bg-surface-2 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-accent/40 border-none transition-all duration-150"
              />
            </div>
          </div>
          {searchInput && (
            <Button variant="ghost" size="md" onClick={() => { setSearchInput(''); setAllUsers([]); setCursor(null) }}>
              Сбросить
            </Button>
          )}
        </div>
        <div className="mt-3 text-zinc-500 text-xs">
          {isLoading && allUsers.length === 0
            ? 'Загрузка...'
            : `Показано ${allUsers.length} пользователей`}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default/45 bg-[#141416]/50">
                <th className="px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold">Пользователь</th>
                <th className="px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold">ID</th>
                <th className="px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold">Роль</th>
                <th className="px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold">Язык</th>
                <th className="px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold whitespace-nowrap">Дата рег.</th>
                <th className="px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold">Изменить роль</th>
                <th className="px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold">Блокировка</th>
              </tr>
            </thead>

            {isLoading && allUsers.length === 0 ? (
              <UserSkeleton />
            ) : isError ? (
              <tbody>
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="space-y-3">
                      <p className="text-red-400 text-sm">
                        {error instanceof Error ? error.message : 'Ошибка загрузки'}
                      </p>
                      <Button variant="secondary" size="sm" onClick={() => void refetch()}>Повторить</Button>
                    </div>
                  </td>
                </tr>
              </tbody>
            ) : allUsers.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <p className="text-zinc-500 text-sm">
                      {searchInput ? 'Пользователи не найдены.' : 'Нет пользователей.'}
                    </p>
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {allUsers.map(user => (
                  <UserRow key={user.id} user={user} />
                ))}
              </tbody>
            )}
          </table>
        </div>

        {data?.nextCursor && (
          <div className="px-4 py-4 border-t border-border-default/45 flex items-center justify-center">
            <Button variant="secondary" onClick={() => setCursor(data.nextCursor ?? null)} loading={isLoading}>
              Загрузить ещё
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
