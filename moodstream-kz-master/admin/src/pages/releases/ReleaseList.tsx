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
          className="flex items-center gap-4 px-4 py-3.5 bg-[#141416] rounded-xl"
        >
          <div className="w-12 h-12 rounded-lg bg-[#202024] animate-pulse shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-44 bg-[#202024] rounded animate-pulse" />
            <div className="h-3 w-28 bg-[#202024] rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-5 w-14 bg-[#202024] rounded animate-pulse" />
            <div className="h-5 w-20 bg-[#202024] rounded animate-pulse" />
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
      className="flex items-center gap-4 px-5 py-3.5 bg-[#141416] rounded-xl hover:bg-[#202024] transition-all duration-150 border border-transparent hover:border-[#1C1C1F]/20">
      {release.coverUrl ? (
        <img src={release.coverUrl} alt={release.title} className="w-12 h-12 rounded-lg object-cover shrink-0 shadow-sm" />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-[#202024] flex items-center justify-center shrink-0 border border-[#2C2C32]">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-zinc-500">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{release.title}</p>
        <p className="text-zinc-500 text-xs truncate mt-0.5">{release.artistName || '—'}</p>
      </div>

      <div className="text-zinc-500 text-xs shrink-0 mr-2 font-medium">{release.trackCount} треков</div>

      <div className="flex items-center gap-2 shrink-0">
        <Badge label={typeLabel} variant="blue" />
        <Badge label={release.isPublished ? 'Опубликован' : 'Черновик'} variant={release.isPublished ? 'green' : 'gray'} />
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-zinc-500 ml-1">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
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
      <div className="bg-[#141416] rounded-2xl p-5 border border-[#1C1C1F]/40 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-zinc-500 text-xs uppercase tracking-wide mb-1.5 block font-semibold">Поиск</label>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Название релиза..."
              className="w-full bg-[#202024] border border-[#1C1C1F] rounded-lg px-3.5 py-2.5 text-white placeholder-zinc-700 text-sm focus:outline-none focus:border-[#D4D1CA]/80 focus:ring-1 focus:ring-[#D4D1CA]/80 transition-all duration-200"
            />
          </div>
          {searchInput && (
            <Button variant="ghost" size="md" onClick={() => { setSearchInput(''); setAllReleases([]); setCursor(null) }}>
              Сбросить
            </Button>
          )}
        </div>
        <div className="mt-3 text-zinc-500 text-xs font-medium">
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
