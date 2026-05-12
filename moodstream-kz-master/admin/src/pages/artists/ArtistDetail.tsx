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
    const cls = 'bg-surface-2 border border-accent rounded px-2 py-1 text-white text-sm focus:outline-none w-full'
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
          <button onClick={() => void save()} disabled={saving} className="text-accent text-xs hover:opacity-80 disabled:opacity-50">
            {saving ? 'Сохранение...' : '✓ Сохранить'}
          </button>
          <button onClick={cancel} className="text-zinc-500 text-xs hover:text-white">Отмена</button>
        </span>
      </span>
    )
  }

  return (
    <span className="group inline-flex items-start gap-1.5 cursor-pointer hover:text-accent transition-colors"
      onClick={() => { setDraft(value); setEditing(true) }} title="Нажмите чтобы редактировать">
      {value || <span className="text-zinc-600 italic">{placeholder ?? '—'}</span>}
      <span className="opacity-0 group-hover:opacity-100 text-zinc-600 text-xs transition-opacity shrink-0">✎</span>
    </span>
  )
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: () => void; label: string }): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-border-default last:border-0">
      <span className="text-zinc-500 text-sm">{label}</span>
      <button onClick={onChange}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? 'bg-accent' : 'bg-zinc-700'}`}>
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${value ? 'translate-x-4' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}

// ── Expandable release row ────────────────────────────────────────────────────

function ReleaseRow({ release }: { release: ArtistStats['releases'][0] }): React.ReactElement {
  const [open, setOpen] = useState(false)
  const totalMs = release.tracks.reduce((s, t) => s + t.durationMs, 0)

  return (
    <div className="border border-border-default rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors text-left"
        onClick={() => setOpen(v => !v)}
      >
        {release.coverAssetUrl
          ? <img src={release.coverAssetUrl} className="w-10 h-10 rounded-md object-cover shrink-0" alt="" />
          : <div className="w-10 h-10 rounded-md bg-surface-2 flex items-center justify-center text-zinc-500 shrink-0">💿</div>
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
          className="text-zinc-500 hover:text-accent text-xs px-2 py-1 rounded transition-colors"
          onClick={e => e.stopPropagation()}
        >
          Открыть →
        </Link>
        <span className="text-zinc-500 text-xs ml-1">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-border-default divide-y divide-border-default">
          {release.tracks.length === 0 && (
            <p className="text-zinc-500 text-xs text-center py-3">Нет треков</p>
          )}
          {release.tracks.map((track, idx) => (
            <div key={track.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2 transition-colors">
              <span className="text-zinc-600 text-xs w-5 text-right shrink-0">{idx + 1}</span>
              {track.coverUrl
                ? <img src={track.coverUrl} className="w-8 h-8 rounded object-cover shrink-0" alt="" />
                : <div className="w-8 h-8 rounded bg-surface-2 flex items-center justify-center text-zinc-600 text-xs shrink-0">♪</div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">{track.title}</p>
                <p className="text-zinc-500 text-xs">{track.artists.map(a => a.name).join(', ')}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                  track.playbackStatus === 'PLAYABLE' ? 'bg-green-900/40 text-green-400' :
                  track.playbackStatus === 'PROCESSING' ? 'bg-yellow-900/40 text-yellow-400' :
                  'bg-red-900/40 text-red-400'
                }`}>
                  {track.playbackStatus === 'PLAYABLE' ? '● Воспр.' :
                   track.playbackStatus === 'PROCESSING' ? '⏳ Обраб.' : '✕ Заблок.'}
                </span>
                <span className="text-zinc-500 text-xs font-mono">{formatMs(track.durationMs)}</span>
                {track.isLocal && <span className="text-xs text-blue-400">🇰🇿</span>}
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
      <div className="bg-surface border border-border-default rounded-xl p-6 animate-pulse">
        <div className="flex gap-5">
          <div className="w-24 h-24 rounded-full bg-surface-2 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-48 bg-surface-2 rounded" />
            <div className="h-4 w-32 bg-surface-2 rounded" />
            <div className="flex gap-2 mt-3">
              {[1,2,3].map(i => <div key={i} className="h-5 w-16 bg-surface-2 rounded" />)}
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="h-20 bg-surface border border-border-default rounded-xl animate-pulse" />)}
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
          <Link to="/artists"><Button variant="ghost">← Назад</Button></Link>
        </div>
      </div>
    )
  }

  const a = { ...artist, ...local }

  return (
    <div className="space-y-4 max-w-4xl">
      <Link to="/artists" className="inline-flex items-center gap-1.5 text-zinc-500 text-sm hover:text-white transition-colors">
        ← Артисты
      </Link>

      {/* ── Hero ── */}
      <div className="bg-surface border border-border-default rounded-xl p-6">
        <div className="flex gap-5 items-start">
          {a.coverUrl
            ? <img src={a.coverUrl} alt={a.name} className="w-24 h-24 rounded-full object-cover shrink-0 shadow-lg" />
            : <div className="w-24 h-24 rounded-full bg-surface-2 flex items-center justify-center text-zinc-500 text-4xl shrink-0">👤</div>
          }
          <div className="flex-1 min-w-0">
            <h1 className="text-white text-2xl font-bold">
              <InlineEdit value={a.name} placeholder="Имя артиста"
                onSave={async val => { await patch({ name: val }); addToast('Имя сохранено', 'success') }} />
            </h1>
            <p className="text-zinc-500 text-sm font-mono mt-0.5">/{a.slug}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {a.isLocal && <Badge label="KZ" variant="blue" />}
              {a.isVerified && <Badge label="Verified" variant="green" />}
              <Badge label={a.isPublished ? 'Опубликован' : 'Черновик'} variant={a.isPublished ? 'green' : 'gray'} />
              <Badge label={a.type} variant="gray" />
            </div>
            <p className="text-zinc-600 text-xs mt-2">{a.trackCount} треков · {a.followerCount} подписчиков</p>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-border-default">
          <p className="text-zinc-400 text-xs uppercase tracking-widest font-semibold mb-2">Биография</p>
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
            { label: 'Релизов', value: stats.totalReleases, icon: '💿' },
            { label: 'Треков', value: stats.totalTracks, icon: '🎵' },
            { label: 'Прослушиваний', value: formatPlays(stats.totalPlays), icon: '🎧' },
            { label: 'На сервисе с', value: new Date(stats.createdAt).getFullYear(), icon: '📅' },
          ].map(stat => (
            <div key={stat.label} className="bg-surface border border-border-default rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-white text-xl font-bold">{stat.value}</div>
              <div className="text-zinc-500 text-xs mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Топ 3 трека ── */}
      {stats && stats.topTracks.length > 0 && (
        <div className="bg-surface border border-border-default rounded-xl p-6">
          <h2 className="text-zinc-400 text-xs uppercase tracking-widest font-semibold mb-4">Топ треки</h2>
          <div className="space-y-2">
            {stats.topTracks.map((track, idx) => (
              <div key={track.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-2 transition-colors">
                <span className="text-zinc-500 text-sm font-bold w-4 text-center">{idx + 1}</span>
                {track.coverUrl
                  ? <img src={track.coverUrl} className="w-9 h-9 rounded-md object-cover shrink-0" alt="" />
                  : <div className="w-9 h-9 rounded-md bg-surface-2 flex items-center justify-center text-zinc-500 shrink-0">♪</div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{track.title}</p>
                  <p className="text-zinc-500 text-xs">{track.artists.map(a => a.name).join(', ')}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-right">
                  <div>
                    <p className="text-white text-sm font-semibold">{formatPlays(track.playCount)}</p>
                    <p className="text-zinc-500 text-xs">прослуш.</p>
                  </div>
                  <span className="text-zinc-600 text-xs font-mono">{formatMs(track.durationMs)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Настройки ── */}
      <div className="bg-surface border border-border-default rounded-xl p-6">
        <h2 className="text-zinc-400 text-xs uppercase tracking-widest font-semibold mb-4">Настройки</h2>
        <Toggle value={a.isPublished} label="Опубликован"
          onChange={() => void patch({ isPublished: !a.isPublished }).then(() => addToast(`Публикация: ${!a.isPublished ? 'Да' : 'Нет'}`, 'success'))} />
        <Toggle value={a.isLocal} label="Локальный (KZ)"
          onChange={() => void patch({ isLocal: !a.isLocal }).then(() => addToast(`KZ: ${!a.isLocal ? 'Да' : 'Нет'}`, 'success'))} />
        <Toggle value={a.isVerified} label="Верифицирован"
          onChange={() => void patch({ isVerified: !a.isVerified }).then(() => addToast(`Verified: ${!a.isVerified ? 'Да' : 'Нет'}`, 'success'))} />

        <div className="flex items-start justify-between gap-4 py-2.5 mt-1">
          <span className="text-zinc-500 text-sm">ID</span>
          <code className="text-zinc-500 text-xs font-mono">{a.id}</code>
        </div>
        <div className="flex items-start justify-between gap-4 py-2.5 border-t border-border-default">
          <span className="text-zinc-500 text-sm">Создан</span>
          <span className="text-zinc-400 text-sm">{new Date(a.createdAt).toLocaleString('ru-RU')}</span>
        </div>
        <div className="flex items-start justify-between gap-4 py-2.5 border-t border-border-default">
          <span className="text-zinc-500 text-sm">Обновлён</span>
          <span className="text-zinc-400 text-sm">{new Date(a.updatedAt).toLocaleString('ru-RU')}</span>
        </div>
        <div className="pt-3 mt-1 border-t border-border-default">
          <p className="text-zinc-600 text-xs italic">
            ℹ️ Система регистрации артистов в разработке — дата регистрации будет доступна после запуска.
          </p>
        </div>
      </div>

      {/* ── Дискография ── */}
      {stats && stats.releases.length > 0 && (
        <div className="bg-surface border border-border-default rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-zinc-400 text-xs uppercase tracking-widest font-semibold">
              Дискография
            </h2>
            <span className="text-zinc-500 text-xs">{stats.totalReleases} релизов · {stats.totalTracks} треков</span>
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
