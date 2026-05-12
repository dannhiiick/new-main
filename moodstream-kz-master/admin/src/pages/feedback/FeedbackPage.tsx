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
      <div className="bg-surface border border-border-default rounded-xl p-4">
        <div className="flex flex-wrap gap-3">
          <div className="min-w-[160px]">
            <label className="text-zinc-500 text-xs uppercase tracking-wide mb-1.5 block">Статус</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full bg-surface-2 border border-border-default rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-accent"
            >
              <option value="">Все</option>
              {STATUS_OPTIONS.filter(Boolean).map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="text-zinc-500 text-xs uppercase tracking-wide mb-1.5 block">Категория</label>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full bg-surface-2 border border-border-default rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-accent"
            >
              <option value="">Все</option>
              {CATEGORY_OPTIONS.filter(Boolean).map(c => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border-default rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default bg-surface-2/50">
                <th className="px-4 py-3 text-left text-zinc-500 text-xs uppercase tracking-wider">Пользователь</th>
                <th className="px-4 py-3 text-left text-zinc-500 text-xs uppercase tracking-wider">Категория</th>
                <th className="px-4 py-3 text-left text-zinc-500 text-xs uppercase tracking-wider">Сообщение</th>
                <th className="px-4 py-3 text-left text-zinc-500 text-xs uppercase tracking-wider">Платформа</th>
                <th className="px-4 py-3 text-left text-zinc-500 text-xs uppercase tracking-wider">Дата</th>
                <th className="px-4 py-3 text-left text-zinc-500 text-xs uppercase tracking-wider">Статус</th>
                <th className="px-4 py-3 text-left text-zinc-500 text-xs uppercase tracking-wider">Действие</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-default">
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
                  <tr key={item.id} className="border-b border-border-default hover:bg-surface-2/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white text-sm">{item.user?.displayName ?? 'Анонимно'}</p>
                      {item.user?.email && <p className="text-zinc-500 text-xs">{item.user.email}</p>}
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
                      <select
                        value={item.status}
                        disabled={updatingId === item.id}
                        onChange={e => void updateStatus(item.id, e.target.value)}
                        className="bg-surface-2 border border-border-default rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-accent disabled:opacity-50"
                      >
                        {STATUS_OPTIONS.filter(Boolean).map(s => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
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
