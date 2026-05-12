import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminFetch } from '../../lib/api'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import type { AdminReleaseSummary, AdminReleasesPage } from '../../lib/types'

const RELEASE_TYPE_LABELS: Record<string, string> = {
  SINGLE: 'Сингл',
  EP: 'EP',
  ALBUM: 'Альбом',
  COMPILATION: 'Сборник',
  LIVE: 'Live',
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

function ReleaseSkeleton(): React.ReactElement {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 bg-surface border border-border-default rounded-lg"
        >
          <div className="w-12 h-12 rounded-md bg-surface-2 animate-pulse shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-44 bg-surface-2 rounded animate-pulse" />
            <div className="h-3 w-28 bg-surface-2 rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-5 w-14 bg-surface-2 rounded animate-pulse" />
            <div className="h-5 w-20 bg-surface-2 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ReleaseRow({ release }: { release: AdminReleaseSummary }): React.ReactElement {
  const typeLabel = RELEASE_TYPE_LABELS[release.releaseType] ?? release.releaseType

  return (
    <Link to={`/releases/${release.id}`}
      className="flex items-center gap-4 px-4 py-3 bg-surface border border-border-default rounded-lg hover:border-zinc-600 hover:bg-surface-2/30 transition-colors">
      {release.coverUrl ? (
        <img src={release.coverUrl} alt={release.title} className="w-12 h-12 rounded-md object-cover shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-md bg-surface-2 flex items-center justify-center text-zinc-600 text-xl shrink-0">💿</div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{release.title}</p>
        <p className="text-zinc-500 text-xs truncate">{release.artistName || '—'}</p>
      </div>

      <div className="text-zinc-500 text-xs shrink-0 mr-2">{release.trackCount} тр.</div>

      <div className="flex items-center gap-2 shrink-0">
        <Badge label={typeLabel} variant="blue" />
        <Badge label={release.isPublished ? 'Опубликован' : 'Черновик'} variant={release.isPublished ? 'green' : 'gray'} />
        <span className="text-zinc-600 text-xs ml-1">→</span>
      </div>
    </Link>
  )
}

export function ReleaseList(): React.ReactElement {
  const [searchInput, setSearchInput] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const [allReleases, setAllReleases] = useState<AdminReleaseSummary[]>([])
  const isFirstLoad = useRef(true)

  const debouncedSearch = useDebounce(searchInput, 400)

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      return
    }
    setAllReleases([])
    setCursor(null)
  }, [debouncedSearch])

  const queryParams = new URLSearchParams({
    q: debouncedSearch,
    limit: '30',
    ...(cursor ? { cursor } : {}),
  })

  const { data, isLoading, isError, error, refetch } = useQuery<AdminReleasesPage>({
    queryKey: ['admin', 'releases', debouncedSearch, cursor],
    queryFn: () => adminFetch<AdminReleasesPage>(`/api/admin/catalog/releases?${queryParams.toString()}`),
    staleTime: 60_000,
  })

  useEffect(() => {
    if (data?.releases) {
      setAllReleases(prev => {
        if (cursor === null) return data.releases
        const existingIds = new Set(prev.map(r => r.id))
        return [...prev, ...data.releases.filter(r => !existingIds.has(r.id))]
      })
    }
  }, [data, cursor])

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-white text-xl font-bold">Релизы</h1>
        <p className="text-zinc-500 text-sm mt-0.5">
          {data?.total != null ? `Всего ${data.total}` : 'Все релизы каталога'}
        </p>
      </div>

      {/* Search */}
      <div className="bg-surface border border-border-default rounded-xl p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-zinc-500 text-xs uppercase tracking-wide mb-1.5 block">Поиск</label>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Название релиза..."
              className="w-full bg-surface-2 border border-border-default rounded-md px-3 py-2 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          {searchInput && (
            <Button variant="ghost" size="md" onClick={() => { setSearchInput(''); setAllReleases([]); setCursor(null) }}>
              Сбросить
            </Button>
          )}
        </div>
        <div className="mt-3 text-zinc-500 text-xs">
          {isLoading && allReleases.length === 0 ? 'Загрузка...' : `Показано: ${allReleases.length}`}
        </div>
      </div>

      {isLoading && allReleases.length === 0 ? (
        <ReleaseSkeleton />
      ) : isError ? (
        <div className="bg-surface border border-border-default rounded-xl px-6 py-10 text-center space-y-3">
          <p className="text-red-400 text-sm">
            {error instanceof Error ? error.message : 'Ошибка загрузки'}
          </p>
          <Button variant="secondary" size="sm" onClick={() => void refetch()}>
            Повторить
          </Button>
        </div>
      ) : allReleases.length === 0 ? (
        <div className="bg-surface border border-border-default rounded-xl px-6 py-10 text-center">
          <p className="text-zinc-500 text-sm">
            {searchInput ? 'Релизы не найдены.' : 'Нет релизов в каталоге.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {allReleases.map((release) => (
            <ReleaseRow key={release.id} release={release} />
          ))}
          {data?.nextCursor && (
            <div className="pt-2 flex justify-center">
              <Button variant="secondary" onClick={() => setCursor(data.nextCursor ?? null)} loading={isLoading}>
                Загрузить ещё
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
