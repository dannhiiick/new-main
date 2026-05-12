import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminFetch } from '../../lib/api'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import type { AdminArtistSummary, AdminArtistsPage } from '../../lib/types'

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

function ArtistSkeleton(): React.ReactElement {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 bg-surface border border-border-default rounded-lg"
        >
          <div className="w-10 h-10 rounded-full bg-surface-2 animate-pulse shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-36 bg-surface-2 rounded animate-pulse" />
            <div className="h-3 w-20 bg-surface-2 rounded animate-pulse" />
          </div>
          <div className="h-5 w-10 bg-surface-2 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

function ArtistRow({ artist }: { artist: AdminArtistSummary }): React.ReactElement {
  return (
    <Link to={`/artists/${artist.id}`} className="flex items-center gap-4 px-4 py-3 bg-surface border border-border-default rounded-lg hover:border-zinc-600 hover:bg-surface-2/30 transition-colors">
      <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center text-zinc-500 text-lg shrink-0">
        👤
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{artist.name}</p>
        <p className="text-zinc-600 text-xs font-mono truncate">/{artist.slug}</p>
      </div>

      <div className="text-zinc-500 text-xs shrink-0 mr-2">
        {artist.trackCount} тр.
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {artist.isLocal && <Badge label="KZ" variant="blue" />}
        {artist.isVerified && <Badge label="Verified" variant="green" />}
        <Badge
          label={artist.isPublished ? 'Опубликован' : 'Черновик'}
          variant={artist.isPublished ? 'green' : 'gray'}
        />
        <span className="text-zinc-600 text-xs ml-1">→</span>
      </div>
    </Link>
  )
}

export function ArtistList(): React.ReactElement {
  const [searchInput, setSearchInput] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const [allArtists, setAllArtists] = useState<AdminArtistSummary[]>([])
  const isFirstLoad = useRef(true)

  const debouncedSearch = useDebounce(searchInput, 400)

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      return
    }
    setAllArtists([])
    setCursor(null)
  }, [debouncedSearch])

  const queryParams = new URLSearchParams({
    q: debouncedSearch,
    limit: '30',
    ...(cursor ? { cursor } : {}),
  })

  const { data, isLoading, isError, error, refetch } = useQuery<AdminArtistsPage>({
    queryKey: ['admin', 'artists', debouncedSearch, cursor],
    queryFn: () => adminFetch<AdminArtistsPage>(`/api/admin/catalog/artists?${queryParams.toString()}`),
    staleTime: 60_000,
  })

  useEffect(() => {
    if (data?.artists) {
      setAllArtists(prev => {
        if (cursor === null) return data.artists
        const existingIds = new Set(prev.map(a => a.id))
        return [...prev, ...data.artists.filter(a => !existingIds.has(a.id))]
      })
    }
  }, [data, cursor])

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-white text-xl font-bold">Артисты</h1>
        <p className="text-zinc-500 text-sm mt-0.5">
          {data?.total != null ? `Всего ${data.total}` : 'Все артисты каталога'}
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
              placeholder="Имя артиста..."
              className="w-full bg-surface-2 border border-border-default rounded-md px-3 py-2 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          {searchInput && (
            <Button variant="ghost" size="md" onClick={() => { setSearchInput(''); setAllArtists([]); setCursor(null) }}>
              Сбросить
            </Button>
          )}
        </div>
        <div className="mt-3 text-zinc-500 text-xs">
          {isLoading && allArtists.length === 0 ? 'Загрузка...' : `Показано: ${allArtists.length}`}
        </div>
      </div>

      {isLoading && allArtists.length === 0 ? (
        <ArtistSkeleton />
      ) : isError ? (
        <div className="bg-surface border border-border-default rounded-xl px-6 py-10 text-center space-y-3">
          <p className="text-red-400 text-sm">
            {error instanceof Error ? error.message : 'Ошибка загрузки'}
          </p>
          <Button variant="secondary" size="sm" onClick={() => void refetch()}>
            Повторить
          </Button>
        </div>
      ) : allArtists.length === 0 ? (
        <div className="bg-surface border border-border-default rounded-xl px-6 py-10 text-center">
          <p className="text-zinc-500 text-sm">
            {searchInput ? 'Артисты не найдены.' : 'Нет артистов в каталоге.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {allArtists.map((artist) => (
            <ArtistRow key={artist.id} artist={artist} />
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
