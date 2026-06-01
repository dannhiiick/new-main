import React, { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminFetch } from '../../lib/api'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useToastContext } from '../../lib/toastContext'

interface ArtistDetail {
  id: string
  name: string
  slug: string
  bio: string | null
  coverUrl: string | null
  isLocal: boolean
  isVerified: boolean
  isPublished: boolean
  type: string
  trackCount: number
  followerCount: number
  createdAt: string
  updatedAt: string
}

interface TrackSummary {
  id: string
  title: string
  durationMs: number
  artists: { id: string; name: string; slug: string }[]
  coverUrl: string | null
  playbackStatus: string
  offlineEligible: boolean
  isLocal: boolean
  playCount?: number
}

interface ArtistStats {
  totalReleases: number
  totalTracks: number
  totalPlays: number
  createdAt: string
  topTracks: (TrackSummary & { playCount: number })[]
  releases: {
    id: string
    title: string
    releaseType: string
    releaseDate: string | null
    coverAssetUrl: string | null
    tracks: TrackSummary[]
  }[]
}

const RELEASE_TYPE_LABELS: Record<string, string> = {
  ALBUM: 'Альбом', SINGLE: 'Сингл', EP: 'EP', COMPILATION: 'Сборник',
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function formatPlays(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

// ── Inline text editor ────────────────────────────────────────────────────────

interface InlineEditProps {
  value: string
  onSave: (val: string) => Promise<void>
  placeholder?: string
  multiline?: boolean
}

function InlineEdit({ value, onSave, placeholder, multiline }: InlineEditProps): React.ReactElement {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null)

  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  async function save() {
    if (draft === value) { setEditing(false); return }
    setSaving(true)
    try { await onSave(draft); setEditing(false) }
    finally { setSaving(false) }
  }

  function cancel() { setDraft(value); setEditing(false) }

  if (editing) {
    const cls = 'bg-[#202024] border border-[#1C1C1F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent w-full transition-colors'
    return (
      <span className="flex flex-col gap-1.5">
        {multiline
          ? <textarea ref={ref as React.Ref<HTMLTextAreaElement>} value={draft} onChange={e => setDraft(e.target.value)}
              disabled={saving} rows={4} placeholder={placeholder} className={cls} />
          : <input ref={ref as React.Ref<HTMLInputElement>} value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') cancel() }}
              disabled={saving} placeholder={placeholder} className={cls} />
        }
        <span className="flex gap-2">
          <button onClick={() => void save()} disabled={saving} className="text-white hover:text-[#D4D1CA] text-xs font-medium disabled:opacity-50">
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button onClick={cancel} className="text-zinc-500 text-xs hover:text-white transition-colors">Отмена</button>
        </span>
      </span>
    )
  }

  return (
    <span className="group inline-flex items-start gap-1.5 cursor-pointer hover:text-accent transition-colors"
      onClick={() => { setDraft(value); setEditing(true) }} title="Нажмите чтобы редактировать">
      {value || <span className="text-zinc-600 italic">{placeholder ?? '—'}</span>}
      <span className="opacity-0 group-hover:opacity-100 text-zinc-500 transition-opacity shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 mt-0.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.83 20.013a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
        </svg>
      </span>
    </span>
  )
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: () => void; label: string }): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[#1C1C1F]/40 last:border-0">
      <span className="text-zinc-500 text-sm">{label}</span>
      <button onClick={onChange}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? 'bg-white' : 'bg-[#202024]'}`}>
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform ${value ? 'translate-x-4 bg-black' : 'translate-x-1 bg-zinc-500'}`} />
      </button>
    </div>
  )
}

// ── Expandable release row ────────────────────────────────────────────────────

function ReleaseRow({ release }: { release: ArtistStats['releases'][0] }): React.ReactElement {
  const [open, setOpen] = useState(false)
  const totalMs = release.tracks.reduce((s, t) => s + t.durationMs, 0)

  return (
    <div className="border border-[#1C1C1F]/50 rounded-xl overflow-hidden bg-[#101012]">
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#202024]/40 transition-colors text-left"
        onClick={() => setOpen(v => !v)}
      >
        {release.coverAssetUrl
          ? <img src={release.coverAssetUrl} className="w-10 h-10 rounded-lg object-cover shrink-0" alt="" />
          : <div className="w-10 h-10 rounded-lg bg-[#202024] flex items-center justify-center shrink-0 border border-[#1C1C1F]">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-zinc-600">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
        }
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{release.title}</p>
          <p className="text-zinc-500 text-xs">
            {RELEASE_TYPE_LABELS[release.releaseType] ?? release.releaseType}
            {release.releaseDate ? ` · ${new Date(release.releaseDate).getFullYear()}` : ''}
            {` · ${release.tracks.length} тр. · ${formatMs(totalMs)}`}
          </p>
        </div>
        <Link
          to={`/releases/${release.id}`}
          className="text-zinc-500 hover:text-[#D4D1CA] text-xs font-medium px-2 py-1 rounded transition-colors flex items-center gap-1 shrink-0"
          onClick={e => e.stopPropagation()}
        >
          Открыть
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
        <span className="text-zinc-500 shrink-0 ml-1">
          {open ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          )}
        </span>
      </button>

      {open && (
        <div className="border-t border-[#1C1C1F] divide-y divide-[#1C1C1F]/60 bg-[#141416]/20">
          {release.tracks.length === 0 && (
            <p className="text-zinc-500 text-xs text-center py-3">Нет треков</p>
          )}
          {release.tracks.map((track, idx) => (
            <div key={track.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#202024]/30 transition-colors">
              <span className="text-zinc-600 text-xs w-5 text-right shrink-0">{idx + 1}</span>
              {track.coverUrl
                ? <img src={track.coverUrl} className="w-8 h-8 rounded-lg object-cover shrink-0" alt="" />
                : <div className="w-8 h-8 rounded bg-[#202024] flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-zinc-700">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 0v15m0-15l-10.5 3M9 9V21m0-12a3 3 0 100-6 3 3 0 000 6zm10.5-3a3 3 0 100-6 3 3 0 000 6z" />
                    </svg>
                  </div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">{track.title}</p>
                <p className="text-zinc-500 text-xs">{track.artists.map(a => a.name).join(', ')}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-right">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  track.playbackStatus === 'PLAYABLE' ? 'bg-green-950/30 text-green-300' :
                  track.playbackStatus === 'PROCESSING' ? 'bg-yellow-950/30 text-yellow-300' :
                  'bg-red-950/30 text-red-300'
                }`}>
                  {track.playbackStatus === 'PLAYABLE' ? '● Воспр.' :
                   track.playbackStatus === 'PROCESSING' ? '⏳ Обраб.' : '✕ Заблок.'}
                </span>
                <span className="text-zinc-500 text-xs font-mono">{formatMs(track.durationMs)}</span>
                {track.isLocal && <Badge label="KZ" variant="blue" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Skeleton(): React.ReactElement {
  return (
    <div className="space-y-4">
      <div className="bg-[#141416] border border-[#1C1C1F]/40 rounded-2xl p-6 animate-pulse">
        <div className="flex gap-5">
          <div className="w-24 h-24 rounded-full bg-[#202024] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-48 bg-[#202024] rounded" />
            <div className="h-4 w-32 bg-[#202024] rounded" />
            <div className="flex gap-2 mt-3">
              {[1,2,3].map(i => <div key={i} className="h-5 w-16 bg-[#202024] rounded" />)}
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="h-20 bg-[#141416] border border-[#1C1C1F]/40 rounded-xl animate-pulse" />)}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ArtistDetail(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const { addToast } = useToastContext()
  const queryClient = useQueryClient()
  const [local, setLocal] = useState<Partial<ArtistDetail>>({})

  const { data: artist, isLoading, isError, error, refetch } = useQuery<ArtistDetail>({
    queryKey: ['admin', 'artist', id],
    queryFn: () => adminFetch<ArtistDetail>(`/api/admin/catalog/artists/${id ?? ''}`),
    enabled: !!id,
    staleTime: 30_000,
  })

  const { data: stats } = useQuery<ArtistStats>({
    queryKey: ['admin', 'artist-stats', id],
    queryFn: () => adminFetch<ArtistStats>(`/api/v1/catalog/artists/${id ?? ''}/stats`),
    enabled: !!id,
    staleTime: 60_000,
  })

  async function patch(fields: Partial<ArtistDetail>) {
    try {
      await adminFetch(`/api/admin/catalog/artists/${id ?? ''}`, {
        method: 'PATCH',
        body: JSON.stringify(fields),
      })
      setLocal(prev => ({ ...prev, ...fields }))
      void queryClient.invalidateQueries({ queryKey: ['admin', 'artist', id] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'artists'] })
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Ошибка', 'error')
      throw err
    }
  }

  if (isLoading) return <Skeleton />
  if (isError || !artist) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-red-400 text-sm">{isError ? (error instanceof Error ? error.message : 'Ошибка') : 'Артист не найден'}</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => void refetch()}>Повторить</Button>
          <Link to="/artists">
            <Button variant="ghost" className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Назад
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const a = { ...artist, ...local }

  return (
    <div className="space-y-4 max-w-4xl font-sans">
      <Link to="/artists" className="inline-flex items-center gap-2 text-zinc-500 text-sm hover:text-white transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Артисты
      </Link>

      {/* ── Hero ── */}
      <div className="bg-[#141416] rounded-2xl p-6 border border-[#1C1C1F]/40 shadow-sm">
        <div className="flex gap-5 items-start">
          {a.coverUrl
            ? <img src={a.coverUrl} alt={a.name} className="w-24 h-24 rounded-full object-cover shrink-0 shadow-lg border border-[#1C1C1F]" />
            : <div className="w-24 h-24 rounded-full bg-[#202024] flex items-center justify-center shrink-0 border border-[#2C2C32]">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-zinc-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
          }
          <div className="flex-1 min-w-0">
            <h1 className="text-white text-2xl font-bold leading-tight">
              <InlineEdit value={a.name} placeholder="Имя артиста"
                onSave={async val => { await patch({ name: val }); addToast('Имя сохранено', 'success') }} />
            </h1>
            <p className="text-zinc-500 text-xs font-mono mt-1">/{a.slug}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {a.isLocal && <Badge label="KZ" variant="blue" />}
              {a.isVerified && <Badge label="Verified" variant="yellow" />}
              <Badge label={a.isPublished ? 'Опубликован' : 'Черновик'} variant={a.isPublished ? 'green' : 'gray'} />
              <Badge label={a.type} variant="gray" />
            </div>
            <p className="text-zinc-600 text-xs mt-2">{a.trackCount} треков · {a.followerCount} подписчиков</p>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-[#1C1C1F]">
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold mb-2">Биография</p>
          <div className="text-sm text-zinc-300 leading-relaxed">
            <InlineEdit value={a.bio ?? ''} placeholder="Добавить биографию..." multiline
              onSave={async val => { await patch({ bio: val || null }); addToast('Биография сохранена', 'success') }} />
          </div>
        </div>
      </div>

      {/* ── Статистика ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Релизов',
              value: stats.totalReleases,
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-zinc-500 mx-auto">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )
            },
            {
              label: 'Треков',
              value: stats.totalTracks,
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-zinc-500 mx-auto">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 0v15m0-15l-10.5 3M9 9V21m0-12a3 3 0 100-6 3 3 0 000 6zm10.5-3a3 3 0 100-6 3 3 0 000 6z" />
                </svg>
              )
            },
            {
              label: 'Прослушиваний',
              value: formatPlays(stats.totalPlays),
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-zinc-500 mx-auto">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
              )
            },
            {
              label: 'На сервисе с',
              value: new Date(stats.createdAt).getFullYear(),
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-zinc-500 mx-auto">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              )
            },
          ].map(stat => (
            <div key={stat.label} className="bg-[#141416] border border-[#1C1C1F]/40 rounded-2xl p-4 text-center shadow-sm">
              <div className="mb-2">{stat.icon}</div>
              <div className="text-white text-lg font-bold">{stat.value}</div>
              <div className="text-zinc-500 text-[10px] uppercase mt-1 tracking-wider font-semibold">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Топ 3 трека ── */}
      {stats && stats.topTracks.length > 0 && (
        <div className="bg-[#141416] border border-[#1C1C1F]/40 rounded-2xl p-6 shadow-sm">
          <h2 className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold mb-4">Топ треки</h2>
          <div className="space-y-1.5">
            {stats.topTracks.map((track, idx) => (
              <div key={track.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#202024]/40 transition-colors">
                <span className="text-zinc-500 text-sm font-bold w-4 text-center">{idx + 1}</span>
                {track.coverUrl
                  ? <img src={track.coverUrl} className="w-9 h-9 rounded-lg object-cover shrink-0 shadow-sm" alt="" />
                  : <div className="w-9 h-9 rounded-lg bg-[#202024] flex items-center justify-center shrink-0 border border-[#1C1C1F]">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-zinc-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 0v15m0-15l-10.5 3M9 9V21m0-12a3 3 0 100-6 3 3 0 000 6zm10.5-3a3 3 0 100-6 3 3 0 000 6z" />
                      </svg>
                    </div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{track.title}</p>
                  <p className="text-zinc-500 text-xs">{track.artists.map(a => a.name).join(', ')}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-right">
                  <div className="leading-tight">
                    <p className="text-white text-sm font-bold">{formatPlays(track.playCount ?? 0)}</p>
                    <p className="text-zinc-500 text-[10px] uppercase font-semibold">прослуш.</p>
                  </div>
                  <span className="text-zinc-500 text-xs font-mono">{formatMs(track.durationMs)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Настройки ── */}
      <div className="bg-[#141416] border border-[#1C1C1F]/40 rounded-2xl p-6 shadow-sm">
        <h2 className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold mb-4">Настройки</h2>
        <Toggle value={a.isPublished} label="Опубликован"
          onChange={() => void patch({ isPublished: !a.isPublished }).then(() => addToast(`Публикация: ${!a.isPublished ? 'Да' : 'Нет'}`, 'success'))} />
        <Toggle value={a.isLocal} label="Локальный (KZ)"
          onChange={() => void patch({ isLocal: !a.isLocal }).then(() => addToast(`KZ: ${!a.isLocal ? 'Да' : 'Нет'}`, 'success'))} />
        <Toggle value={a.isVerified} label="Верифицирован"
          onChange={() => void patch({ isVerified: !a.isVerified }).then(() => addToast(`Verified: ${!a.isVerified ? 'Да' : 'Нет'}`, 'success'))} />

        <div className="flex items-start justify-between gap-4 py-3 mt-1">
          <span className="text-zinc-500 text-sm">ID</span>
          <code className="text-zinc-500 text-xs font-mono">{a.id}</code>
        </div>
        <div className="flex items-start justify-between gap-4 py-3 border-t border-[#1C1C1F]/50">
          <span className="text-zinc-500 text-sm">Создан</span>
          <span className="text-zinc-400 text-sm font-medium">{new Date(a.createdAt).toLocaleString('ru-RU')}</span>
        </div>
        <div className="flex items-start justify-between gap-4 py-3 border-t border-[#1C1C1F]/50">
          <span className="text-zinc-500 text-sm">Обновлён</span>
          <span className="text-zinc-400 text-sm font-medium">{new Date(a.updatedAt).toLocaleString('ru-RU')}</span>
        </div>
        <div className="pt-3.5 mt-1 border-t border-[#1C1C1F]/50">
          <p className="text-zinc-500 text-xs italic flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-zinc-500 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            Система регистрации артистов в разработке — дата регистрации будет доступна после запуска.
          </p>
        </div>
      </div>

      {/* ── Дискография ── */}
      {stats && stats.releases.length > 0 && (
        <div className="bg-[#141416] border border-[#1C1C1F]/40 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold">
              Дискография
            </h2>
            <span className="text-zinc-500 text-xs font-medium">{stats.totalReleases} релизов · {stats.totalTracks} треков</span>
          </div>
          <div className="space-y-2">
            {stats.releases.map(release => (
              <ReleaseRow key={release.id} release={release} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
