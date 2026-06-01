import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminFetch } from '../../lib/api'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useToastContext } from '../../lib/toastContext'
import type { TrackSummary } from '../../lib/types'
import type { BadgeVariant } from '../../components/ui/Badge'

interface AdminTracksPage {
  tracks: TrackSummary[]
  nextCursor: string | null
  total: number
}

const PLAYBACK_STATUS_OPTIONS = [
  { value: '', label: 'Все статусы' },
  { value: 'PLAYABLE', label: 'PLAYABLE' },
  { value: 'PROCESSING', label: 'PROCESSING' },
  { value: 'BLOCKED', label: 'BLOCKED' },
  { value: 'REMOVED', label: 'REMOVED' },
] as const

const PUBLISH_STATUS_OPTIONS = [
  { value: '', label: 'Все' },
  { value: 'published', label: 'Опубликованные' },
  { value: 'unpublished', label: 'Неопубликованные' },
] as const

const SOURCE_OPTIONS = [
  { value: '', label: 'Все источники' },
  { value: 'CURATED', label: 'CURATED' },
  { value: 'PROMOTED_IMPORT', label: 'PROMOTED_IMPORT' },
  { value: 'HIDDEN_IMPORT', label: 'HIDDEN_IMPORT' },
] as const

const SORT_OPTIONS = [
  { value: 'newest', label: 'Новые сначала' },
  { value: 'oldest', label: 'Старые сначала' },
  { value: 'title', label: 'По названию' },
] as const

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function playbackBadgeVariant(status: TrackSummary['playbackStatus']): BadgeVariant {
  switch (status) {
    case 'PLAYABLE': return 'green'
    case 'PROCESSING': return 'yellow'
    case 'BLOCKED': return 'red'
    case 'REMOVED': return 'gray'
  }
}

function tagStatusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case 'VERIFIED': return 'green'
    case 'PENDING': return 'yellow'
    case 'REJECTED': return 'red'
    default: return 'gray'
  }
}

function TableSkeleton(): React.ReactElement {
  return (
    <tbody>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-border-default">
          <td className="px-3 py-3 w-10"><div className="w-4 h-4 rounded bg-surface-2 animate-pulse" /></td>
          <td className="px-4 py-3"><div className="w-10 h-10 rounded bg-surface-2 animate-pulse" /></td>
          <td className="px-4 py-3"><div className="space-y-1.5"><div className="h-3.5 w-40 bg-surface-2 rounded animate-pulse" /><div className="h-3 w-28 bg-surface-2 rounded animate-pulse" /></div></td>
          <td className="px-4 py-3"><div className="h-3.5 w-12 bg-surface-2 rounded animate-pulse" /></td>
          <td className="px-4 py-3"><div className="h-3.5 w-16 bg-surface-2 rounded animate-pulse" /></td>
          <td className="px-4 py-3"><div className="h-5 w-20 bg-surface-2 rounded animate-pulse" /></td>
          <td className="px-4 py-3"><div className="h-5 w-20 bg-surface-2 rounded animate-pulse" /></td>
          <td className="px-4 py-3"><div className="h-5 w-16 bg-surface-2 rounded animate-pulse" /></td>
          <td className="px-4 py-3"><div className="h-5 w-8 bg-surface-2 rounded animate-pulse" /></td>
          <td className="px-4 py-3"><div className="h-7 w-24 bg-surface-2 rounded animate-pulse" /></td>
        </tr>
      ))}
    </tbody>
  )
}

interface TrackRowProps {
  track: TrackSummary
  selected: boolean
  onToggle: () => void
  onAction: (id: string, action: 'publish' | 'unpublish') => void
  actionLoading: string | null
}

function TrackRow({ track, selected, onToggle, onAction, actionLoading }: TrackRowProps): React.ReactElement {
  const artistNames = track.artists.map(a => a.name).join(', ')
  const isThisLoading = actionLoading === track.id

  return (
    <tr className="border-b border-[#1C1C1F] hover:bg-[#202024]/30 transition-all duration-150">
      <td className="px-3 py-3 w-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="w-4 h-4 rounded border-zinc-700 bg-[#202024] accent-white cursor-pointer"
        />
      </td>
      <td className="px-4 py-3 w-14">
        {track.coverUrl ? (
          <img src={track.coverUrl} alt={track.title} className="w-10 h-10 rounded-lg object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-[#202024] flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-zinc-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 0v15m0-15l-10.5 3M9 9V21m0-12a3 3 0 100-6 3 3 0 000 6zm10.5-3a3 3 0 100-6 3 3 0 000 6z" />
            </svg>
          </div>
        )}
      </td>
      <td className="px-4 py-3 min-w-[200px]">
        <Link to={`/catalog/${track.id}`} className="text-white text-sm font-medium hover:text-[#D4D1CA] transition-colors line-clamp-1">
          {track.title}
        </Link>
        <p className="text-zinc-500 text-xs mt-0.5 line-clamp-1">{artistNames || '—'}</p>
      </td>
      <td className="px-4 py-3 text-zinc-400 text-sm tabular-nums whitespace-nowrap">
        {formatDuration(track.durationMs)}
      </td>
      <td className="px-4 py-3 text-zinc-400 text-xs">{track.genre ?? '—'}</td>
      <td className="px-4 py-3">
        <Badge label={track.isPublished ? 'Опубликован' : 'Черновик'} variant={track.isPublished ? 'green' : 'gray'} />
      </td>
      <td className="px-4 py-3">
        <Badge label={track.playbackStatus} variant={playbackBadgeVariant(track.playbackStatus)} />
      </td>
      <td className="px-4 py-3">
        <Badge label={track.tagStatus || 'N/A'} variant={tagStatusBadgeVariant(track.tagStatus)} />
      </td>
      <td className="px-4 py-3">
        {track.isLocal ? <Badge label="KZ" variant="blue" /> : <span className="text-zinc-700 text-xs">—</span>}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          {track.isPublished ? (
            <Button variant="ghost" size="sm" loading={isThisLoading}
              onClick={() => { if (window.confirm(`Снять трек "${track.title}" с публикации?`)) onAction(track.id, 'unpublish') }}>
              Снять
            </Button>
          ) : (
            <Button variant="primary" size="sm" loading={isThisLoading}
              onClick={() => { if (window.confirm(`Опубликовать трек "${track.title}"?`)) onAction(track.id, 'publish') }}>
              Опубликовать
            </Button>
          )}
          <Link to={`/catalog/${track.id}`}>
            <Button variant="secondary" size="sm" className="w-8 h-8 !p-0">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Button>
          </Link>
        </div>
      </td>
    </tr>
  )
}

export function CatalogList(): React.ReactElement {
  // ── Persist filters in URL so they survive navigation ──────────────────────
  const [searchParams, setSearchParams] = useSearchParams()
  const searchInput = searchParams.get('q') ?? ''
  const publishFilter = searchParams.get('pub') ?? ''
  const playbackFilter = searchParams.get('pb') ?? ''
  const sourceFilter = searchParams.get('src') ?? ''
  const sortOrder = (searchParams.get('sort') ?? 'newest') as 'newest' | 'oldest' | 'title'

  function setParam(key: string, value: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    }, { replace: true })
  }

  const [cursor, setCursor] = useState<string | null>(null)
  const [allTracks, setAllTracks] = useState<TrackSummary[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [genreFilter, setGenreFilter] = useState<string[]>([])
  const [bulkLoading, setBulkLoading] = useState<string | null>(null)
  const isFirstLoad = useRef(true)

  const { addToast } = useToastContext()
  const queryClient = useQueryClient()

  const debouncedSearch = useDebounce(searchInput, 400)

  useEffect(() => {
    if (isFirstLoad.current) { isFirstLoad.current = false; return }
    setAllTracks([])
    setCursor(null)
    setSelectedIds(new Set())
  }, [debouncedSearch, publishFilter, playbackFilter, sourceFilter])

  const queryParams = new URLSearchParams({ q: debouncedSearch, limit: '50', ...(cursor ? { cursor } : {}) })

  const { data, isLoading, isError, error, refetch } = useQuery<AdminTracksPage>({
    queryKey: ['admin', 'tracks', debouncedSearch, publishFilter, playbackFilter, sourceFilter, cursor],
    queryFn: () => adminFetch<AdminTracksPage>(`/api/admin/catalog/tracks?${queryParams.toString()}`),
    staleTime: 30_000,
  })

  useEffect(() => {
    if (data?.tracks) {
      setAllTracks(prev => {
        if (cursor === null) return data.tracks
        const existingIds = new Set(prev.map(t => t.id))
        return [...prev, ...data.tracks.filter(t => !existingIds.has(t.id))]
      })
    }
  }, [data, cursor])

  function resetFilters() {
    setSearchParams({}, { replace: true })
    setCursor(null)
    setAllTracks([])
    setSelectedIds(new Set())
    setGenreFilter([])
  }

  const allGenres = useMemo(() => {
    const genres = new Set(allTracks.map(t => t.genre).filter(Boolean))
    return Array.from(genres).sort() as string[]
  }, [allTracks])

  function toggleGenre(genre: string) {
    setGenreFilter(prev => prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre])
    setSelectedIds(new Set())
  }

  // Client-side filtering
  const filteredTracks = useMemo(() => {
    let tracks = allTracks.filter(track => {
      if (publishFilter === 'published' && !track.isPublished) return false
      if (publishFilter === 'unpublished' && track.isPublished) return false
      // Hide REMOVED by default unless explicitly filtered
      if (!playbackFilter && track.playbackStatus === 'REMOVED') return false
      if (playbackFilter && track.playbackStatus !== playbackFilter) return false
      if (sourceFilter && track.sourcePolicy !== sourceFilter) return false
      if (genreFilter.length > 0 && !genreFilter.includes(track.genre ?? '')) return false
      return true
    })

    // Sort
    if (sortOrder === 'oldest') {
      tracks = [...tracks].reverse()
    } else if (sortOrder === 'title') {
      tracks = [...tracks].sort((a, b) => a.title.localeCompare(b.title, 'ru'))
    }

    return tracks
  }, [allTracks, publishFilter, playbackFilter, sourceFilter, genreFilter, sortOrder])

  const allVisibleSelected = filteredTracks.length > 0 && filteredTracks.every(t => selectedIds.has(t.id))
  const someSelected = filteredTracks.some(t => selectedIds.has(t.id)) && !allVisibleSelected

  function toggleSelectAll() {
    if (allVisibleSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredTracks.map(t => t.id)))
  }

  function toggleTrack(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleAction(id: string, action: 'publish' | 'unpublish') {
    setActionLoading(id)
    try {
      await adminFetch(`/api/admin/catalog/tracks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPublished: action === 'publish' }),
      })
      addToast(action === 'publish' ? 'Трек опубликован' : 'Трек снят с публикации', 'success')
      setAllTracks(prev => prev.map(t => t.id === id ? { ...t, isPublished: action === 'publish' } : t))
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tracks'] })
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Ошибка', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleBulkPublish(isPublished: boolean) {
    const ids = Array.from(selectedIds)
    setBulkLoading(isPublished ? 'publish' : 'unpublish')
    try {
      await adminFetch('/api/admin/catalog/tracks/bulk-publish', {
        method: 'PATCH',
        body: JSON.stringify({ ids, isPublished }),
      })
      addToast(`${ids.length} треков ${isPublished ? 'опубликовано' : 'снято'}`, 'success')
      setSelectedIds(new Set())
      setAllTracks(prev => prev.map(t => selectedIds.has(t.id) ? { ...t, isPublished } : t))
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Ошибка', 'error')
    } finally {
      setBulkLoading(null)
    }
  }

  async function handleBulkSetPlayable() {
    const ids = Array.from(selectedIds)
    setBulkLoading('playable')
    try {
      await adminFetch('/api/admin/catalog/tracks/bulk-set-playable', {
        method: 'PATCH',
        body: JSON.stringify({ ids }),
      })
      addToast(`${ids.length} треков → PLAYABLE`, 'success')
      setSelectedIds(new Set())
      setAllTracks(prev => prev.map(t => selectedIds.has(t.id) ? { ...t, playbackStatus: 'PLAYABLE' as const } : t))
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Ошибка', 'error')
    } finally {
      setBulkLoading(null)
    }
  }

  async function handleBulkArchive() {
    const ids = Array.from(selectedIds)
    if (!window.confirm(`Архивировать ${ids.length} треков? Они будут скрыты из каталога.`)) return
    setBulkLoading('archive')
    try {
      await adminFetch('/api/admin/catalog/tracks/bulk-archive', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      })
      addToast(`${ids.length} треков архивировано`, 'success')
      setSelectedIds(new Set())
      setAllTracks(prev => prev.filter(t => !selectedIds.has(t.id)))
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Ошибка', 'error')
    } finally {
      setBulkLoading(null)
    }
  }

  const hasActiveFilters = searchInput !== '' || publishFilter !== '' || playbackFilter !== '' || sourceFilter !== '' || genreFilter.length > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold">Каталог треков</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {data?.total != null ? `Всего ${data.total} треков` : 'Все треки включая черновики'}
          </p>
        </div>
        <Link to="/ingestion">
          <Button variant="primary" size="sm">+ Загрузить</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border-default rounded-xl p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-zinc-500 text-xs uppercase tracking-wide mb-1.5 block">Поиск</label>
            <input
              type="text"
              value={searchInput}
              onChange={e => setParam('q', e.target.value)}
              placeholder="Название или артист..."
              className="w-full bg-surface-2 border border-border-default rounded-md px-3 py-2 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-accent transition-colors"
              autoFocus
            />
          </div>
          <div className="min-w-[160px]">
            <label className="text-zinc-500 text-xs uppercase tracking-wide mb-1.5 block">Публикация</label>
            <select value={publishFilter} onChange={e => setParam('pub', e.target.value)}
              className="w-full bg-surface-2 border border-border-default rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-accent transition-colors">
              {PUBLISH_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="text-zinc-500 text-xs uppercase tracking-wide mb-1.5 block">Воспроизведение</label>
            <select value={playbackFilter} onChange={e => setParam('pb', e.target.value)}
              className="w-full bg-surface-2 border border-border-default rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-accent transition-colors">
              {PLAYBACK_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="text-zinc-500 text-xs uppercase tracking-wide mb-1.5 block">Сортировка</label>
            <select value={sortOrder} onChange={e => setParam('sort', e.target.value)}
              className="w-full bg-surface-2 border border-border-default rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-accent transition-colors">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="md" onClick={resetFilters}>Сбросить</Button>
          )}
        </div>

        {/* Genre pills */}
        {allGenres.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {allGenres.map(genre => (
              <button key={genre} onClick={() => toggleGenre(genre)}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  genreFilter.includes(genre)
                    ? 'bg-accent/20 border-accent text-accent'
                    : 'border-border-default text-zinc-400 hover:border-zinc-500'
                }`}>
                {genre}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 text-zinc-500 text-xs">
          {isLoading && allTracks.length === 0 ? 'Загрузка...' : `Показано ${filteredTracks.length} треков`}
          {!playbackFilter && <span className="ml-2 text-zinc-700">(REMOVED скрыты)</span>}
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="bg-surface-2 border border-border-default rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-white text-sm font-medium">Выбрано: {selectedIds.size}</span>
          <button onClick={() => void handleBulkPublish(true)} disabled={bulkLoading !== null}
            className="px-3 py-1.5 rounded-md bg-accent/20 text-accent text-xs font-medium hover:bg-accent/30 transition-colors disabled:opacity-50">
            {bulkLoading === 'publish' ? '...' : `Опубликовать (${selectedIds.size})`}
          </button>
          <button onClick={() => void handleBulkPublish(false)} disabled={bulkLoading !== null}
            className="px-3 py-1.5 rounded-md bg-zinc-700/50 text-zinc-300 text-xs font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50">
            {bulkLoading === 'unpublish' ? '...' : `Снять (${selectedIds.size})`}
          </button>
          <button onClick={() => void handleBulkSetPlayable()} disabled={bulkLoading !== null}
            className="px-3 py-1.5 rounded-md bg-blue-900/20 text-blue-400 text-xs font-medium hover:bg-blue-900/40 transition-colors disabled:opacity-50">
            {bulkLoading === 'playable' ? '...' : `→ PLAYABLE (${selectedIds.size})`}
          </button>
          <button onClick={() => void handleBulkArchive()} disabled={bulkLoading !== null}
            className="px-3 py-1.5 rounded-md bg-red-900/20 text-red-400 text-xs font-medium hover:bg-red-900/40 transition-colors disabled:opacity-50">
            {bulkLoading === 'archive' ? '...' : `Архивировать (${selectedIds.size})`}
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-zinc-500 hover:text-white text-xs transition-colors">
            Снять выделение
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface border border-border-default rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1C1C1F] bg-[#141416]/50">
                <th className="px-3 py-3 w-10">
                  <input type="checkbox" checked={allVisibleSelected}
                    ref={el => { if (el) el.indeterminate = someSelected }}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-zinc-700 bg-[#202024] accent-white cursor-pointer" />
                </th>
                <th className="px-4 py-3 text-left text-zinc-500 text-xs uppercase tracking-wider w-14"></th>
                <th className="px-4 py-3 text-left text-zinc-500 text-xs uppercase tracking-wider">Трек</th>
                <th className="px-4 py-3 text-left text-zinc-500 text-xs uppercase tracking-wider whitespace-nowrap">Длит.</th>
                <th className="px-4 py-3 text-left text-zinc-500 text-xs uppercase tracking-wider">Жанр</th>
                <th className="px-4 py-3 text-left text-zinc-500 text-xs uppercase tracking-wider whitespace-nowrap">Публикация</th>
                <th className="px-4 py-3 text-left text-zinc-500 text-xs uppercase tracking-wider whitespace-nowrap">Playback</th>
                <th className="px-4 py-3 text-left text-zinc-500 text-xs uppercase tracking-wider whitespace-nowrap">Теги</th>
                <th className="px-4 py-3 text-left text-zinc-500 text-xs uppercase tracking-wider">Локал</th>
                <th className="px-4 py-3 text-left text-zinc-500 text-xs uppercase tracking-wider">Действия</th>
              </tr>
            </thead>

            {isLoading && allTracks.length === 0 ? (
              <TableSkeleton />
            ) : isError ? (
              <tbody>
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <div className="space-y-3">
                      <p className="text-red-400 text-sm">{error instanceof Error ? error.message : 'Ошибка загрузки'}</p>
                      <Button variant="secondary" size="sm" onClick={() => void refetch()}>Повторить</Button>
                    </div>
                  </td>
                </tr>
              </tbody>
            ) : filteredTracks.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <p className="text-zinc-500 text-sm">
                      {hasActiveFilters ? 'Треки не найдены. Попробуйте изменить фильтры.' : 'Треков нет.'}
                    </p>
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {filteredTracks.map(track => (
                  <TrackRow key={track.id} track={track} selected={selectedIds.has(track.id)}
                    onToggle={() => toggleTrack(track.id)}
                    onAction={(id, action) => void handleAction(id, action)}
                    actionLoading={actionLoading} />
                ))}
              </tbody>
            )}
          </table>
        </div>

        {data?.nextCursor && (
          <div className="px-4 py-4 border-t border-border-default flex items-center justify-center">
            <Button variant="secondary" onClick={() => setCursor(data.nextCursor ?? null)} loading={isLoading}>
              Загрузить ещё
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
