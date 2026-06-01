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
          className="flex items-center gap-4 px-4 py-3.5 bg-[#141416] rounded-xl"
        >
          <div className="w-10 h-10 rounded-full bg-[#202024] animate-pulse shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-36 bg-[#202024] rounded animate-pulse" />
            <div className="h-3 w-20 bg-[#202024] rounded animate-pulse" />
          </div>
          <div className="h-5 w-10 bg-[#202024] rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

function ArtistRow({ artist }: { artist: AdminArtistSummary }): React.ReactElement {
  return (
    <Link to={`/artists/${artist.id}`} className="flex items-center gap-4 px-5 py-3.5 bg-[#141416] rounded-xl hover:bg-[#202024] transition-all duration-150 border border-transparent hover:border-[#1C1C1F]/20">
      {artist.coverUrl ? (
        <img src={artist.coverUrl} alt={artist.name} className="w-10 h-10 rounded-full object-cover shrink-0 shadow-sm" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-[#202024] flex items-center justify-center shrink-0 border border-[#2C2C32]">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-zinc-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{artist.name}</p>
        <p className="text-zinc-600 text-[10px] font-semibold uppercase tracking-wider mt-0.5">/{artist.slug}</p>
      </div>

      <div className="text-zinc-500 text-xs shrink-0 mr-2 font-medium">
        {artist.trackCount} треков
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {artist.isLocal && <Badge label="KZ" variant="blue" />}
        {artist.isVerified && <Badge label="Verified" variant="yellow" />}
        <Badge
          label={artist.isPublished ? 'Опубликован' : 'Черновик'}
          variant={artist.isPublished ? 'green' : 'gray'}
        />
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-zinc-500 ml-1">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
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
      <div className="bg-[#141416] rounded-2xl p-5 border border-[#1C1C1F]/40 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-zinc-500 text-xs uppercase tracking-wide mb-1.5 block font-semibold">Поиск</label>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Имя артиста..."
              className="w-full bg-[#202024] border border-[#1C1C1F] rounded-lg px-3.5 py-2.5 text-white placeholder-zinc-700 text-sm focus:outline-none focus:border-[#D4D1CA]/80 focus:ring-1 focus:ring-[#D4D1CA]/80 transition-all duration-200"
            />
          </div>
          {searchInput && (
            <Button variant="ghost" size="md" onClick={() => { setSearchInput(''); setAllArtists([]); setCursor(null) }}>
              Сбросить
            </Button>
          )}
        </div>
        <div className="mt-3 text-zinc-500 text-xs font-medium">
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
