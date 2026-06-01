import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminFetch } from '../../lib/api'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useToastContext } from '../../lib/toastContext'
import type { FeedbackItem, FeedbackPage } from '../../lib/types'
import type { BadgeVariant } from '../../components/ui/Badge'

const STATUS_OPTIONS = ['', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const
const CATEGORY_OPTIONS = ['', 'BUG', 'COMPLAINT', 'FEATURE_REQUEST', 'OTHER'] as const

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Открыто',
  IN_PROGRESS: 'В работе',
  RESOLVED: 'Решено',
  CLOSED: 'Закрыто',
}

const CATEGORY_LABELS: Record<string, string> = {
  BUG: 'Баг',
  COMPLAINT: 'Жалоба',
  FEATURE_REQUEST: 'Фича',
  OTHER: 'Другое',
}

function statusVariant(s: string): BadgeVariant {
  switch (s) {
    case 'OPEN': return 'red'
    case 'IN_PROGRESS': return 'yellow'
    case 'RESOLVED': return 'green'
    case 'CLOSED': return 'gray'
    default: return 'gray'
  }
}

function categoryVariant(c: string): BadgeVariant {
  switch (c) {
    case 'BUG': return 'red'
    case 'COMPLAINT': return 'yellow'
    case 'FEATURE_REQUEST': return 'blue'
    default: return 'gray'
  }
}

export function FeedbackPage(): React.ReactElement {
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const { addToast } = useToastContext()
  const queryClient = useQueryClient()

  const params = new URLSearchParams({ limit: '50' })
  if (statusFilter) params.set('status', statusFilter)
  if (categoryFilter) params.set('category', categoryFilter)

  const { data, isLoading, isError, refetch } = useQuery<FeedbackPage>({
    queryKey: ['admin', 'feedback', statusFilter, categoryFilter],
    queryFn: () => adminFetch<FeedbackPage>(`/api/admin/feedback?${params.toString()}`),
    staleTime: 30_000,
  })

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id)
    try {
      await adminFetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      addToast('Статус обновлён', 'success')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'feedback'] })
    } catch {
      addToast('Ошибка при обновлении', 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold">Обратная связь</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            Жалобы, баги и запросы от пользователей
            {data?.total != null ? ` · всего ${data.total}` : ''}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[180px]">
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Статус</label>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full appearance-none bg-surface-2 text-white text-sm rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-1 focus:ring-accent/40 border-none transition-all duration-150 cursor-pointer shadow-sm"
              >
                <option value="" className="bg-[#141416]">Все статусы</option>
                {STATUS_OPTIONS.filter(Boolean).map(s => (
                  <option key={s} value={s} className="bg-[#141416]">{STATUS_LABELS[s]}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>
          </div>
          <div className="min-w-[180px]">
            <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block">Категория</label>
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full appearance-none bg-surface-2 text-white text-sm rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-1 focus:ring-accent/40 border-none transition-all duration-150 cursor-pointer shadow-sm"
              >
                <option value="" className="bg-[#141416]">Все категории</option>
                {CATEGORY_OPTIONS.filter(Boolean).map(c => (
                  <option key={c} value={c} className="bg-[#141416]">{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default/45 bg-[#141416]/50">
                <th className="px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold">Пользователь</th>
                <th className="px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold">Категория</th>
                <th className="px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold">Сообщение</th>
                <th className="px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold">Платформа</th>
                <th className="px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold">Дата</th>
                <th className="px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold">Статус</th>
                <th className="px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold">Действие</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-default/45">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-surface-2 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="space-y-3">
                      <p className="text-red-400 text-sm">Ошибка загрузки</p>
                      <Button variant="secondary" size="sm" onClick={() => void refetch()}>Повторить</Button>
                    </div>
                  </td>
                </tr>
              ) : (data?.items.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-500 text-sm">
                    Обращений нет
                  </td>
                </tr>
              ) : (
                data!.items.map((item: FeedbackItem) => (
                  <tr key={item.id} className="border-b border-border-default/45 hover:bg-surface-2/30 transition-all duration-150">
                    <td className="px-4 py-3">
                      <p className="text-white text-sm font-medium">{item.user?.displayName ?? 'Анонимно'}</p>
                      {item.user?.email && <p className="text-zinc-500 text-xs mt-0.5">{item.user.email}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={CATEGORY_LABELS[item.category] ?? item.category} variant={categoryVariant(item.category)} />
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-zinc-300 text-sm line-clamp-2">{item.message}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{item.platform ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs tabular-nums whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={STATUS_LABELS[item.status] ?? item.status} variant={statusVariant(item.status)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative inline-block w-full min-w-[120px]">
                        <select
                          value={item.status}
                          disabled={updatingId === item.id}
                          onChange={e => void updateStatus(item.id, e.target.value)}
                          className="w-full appearance-none bg-surface-2 hover:bg-[#2C2C32] text-white text-xs rounded-md pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                          {STATUS_OPTIONS.filter(Boolean).map(s => (
                            <option key={s} value={s} className="bg-surface">{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-zinc-500">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
