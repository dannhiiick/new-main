import React, { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminFetch } from '../../lib/api'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useToastContext } from '../../lib/toastContext'
import type { TrackDetails } from '../../lib/types'
import type { BadgeVariant } from '../../components/ui/Badge'

type PlaybackStatus = TrackDetails['playbackStatus']

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function playbackBadgeVariant(status: PlaybackStatus): BadgeVariant {
  switch (status) {
    case 'PLAYABLE': return 'green'
    case 'PROCESSING': return 'yellow'
    case 'BLOCKED': return 'red'
    case 'REMOVED': return 'gray'
  }
}

// ── Inline text editor ────────────────────────────────────────────────────────

interface InlineEditProps {
  value: string
  onSave: (val: string) => Promise<void>
  placeholder?: string
  className?: string
}

function InlineEdit({ value, onSave, placeholder, className }: InlineEditProps): React.ReactElement {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  async function save() {
    if (draft.trim() === value) { setEditing(false); return }
    setSaving(true)
    try { await onSave(draft.trim()); setEditing(false) }
    finally { setSaving(false) }
  }

  function cancel() { setDraft(value); setEditing(false) }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') cancel() }}
          placeholder={placeholder}
          disabled={saving}
          className={`bg-surface-2 border border-accent rounded px-2 py-0.5 text-white focus:outline-none text-sm ${className ?? ''}`}
          style={{ minWidth: '180px' }}
        />
        <button onClick={() => void save()} disabled={saving}
          className="text-accent text-xs hover:opacity-80 disabled:opacity-50">
          {saving ? '...' : '✓'}
        </button>
        <button onClick={cancel} className="text-zinc-500 text-xs hover:text-white">✕</button>
      </span>
    )
  }

  return (
    <span
      className={`group inline-flex items-center gap-1.5 cursor-pointer hover:text-accent transition-colors ${className ?? ''}`}
      onClick={() => { setDraft(value); setEditing(true) }}
      title="Нажмите чтобы редактировать"
    >
      {value || <span className="text-zinc-600">{placeholder ?? '—'}</span>}
      <span className="opacity-0 group-hover:opacity-100 text-zinc-600 text-xs transition-opacity">✎</span>
    </span>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function DetailSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border-default rounded-xl p-6">
        <div className="flex gap-6">
          <div className="w-32 h-32 rounded-lg bg-surface-2 animate-pulse shrink-0" />
          <div className="space-y-3 flex-1">
            <div className="h-6 w-64 bg-surface-2 rounded animate-pulse" />
            <div className="h-4 w-40 bg-surface-2 rounded animate-pulse" />
            <div className="h-4 w-32 bg-surface-2 rounded animate-pulse" />
            <div className="flex gap-2 mt-4">
              <div className="h-8 w-28 bg-surface-2 rounded animate-pulse" />
              <div className="h-8 w-28 bg-surface-2 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div key={i} className="bg-surface border border-border-default rounded-xl p-6">
            <div className="h-4 w-32 bg-surface-2 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map(j => (
                <div key={j} className="flex justify-between">
                  <div className="h-3.5 w-24 bg-surface-2 rounded animate-pulse" />
                  <div className="h-3.5 w-32 bg-surface-2 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

interface SectionProps { title: string; children: React.ReactNode }
function Section({ title, children }: SectionProps): React.ReactElement {
  return (
    <div className="bg-surface border border-border-default rounded-xl p-6">
      <h2 className="text-zinc-400 text-xs uppercase tracking-widest font-semibold mb-4">{title}</h2>
      {children}
    </div>
  )
}

interface FieldProps { label: string; value: React.ReactNode }
function Field({ label, value }: FieldProps): React.ReactElement {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border-default last:border-0">
      <span className="text-zinc-500 text-sm shrink-0">{label}</span>
      <span className="text-white text-sm text-right">{value ?? <span className="text-zinc-700">—</span>}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function CatalogDetail(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const { addToast } = useToastContext()
  const queryClient = useQueryClient()

  const [localPublished, setLocalPublished] = useState<boolean | null>(null)
  const [localPlayback, setLocalPlayback] = useState<PlaybackStatus | null>(null)
  const [localTitle, setLocalTitle] = useState<string | null>(null)
  const [localGenre, setLocalGenre] = useState<string | null | undefined>(undefined)
  const [localIsLocal, setLocalIsLocal] = useState<boolean | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [playbackSelectOpen, setPlaybackSelectOpen] = useState(false)

  const { data: track, isLoading, isError, error, refetch } = useQuery<TrackDetails>({
    queryKey: ['catalog', 'track', id],
    queryFn: () => adminFetch<TrackDetails>(`/api/admin/catalog/tracks/${id ?? ''}`),
    enabled: !!id,
    staleTime: 30_000,
  })

  const effectivePublished = localPublished ?? track?.isPublished ?? false
  const effectivePlayback = localPlayback ?? track?.playbackStatus ?? 'PROCESSING'
  const effectiveTitle = localTitle ?? track?.title ?? ''
  const effectiveGenre = localGenre !== undefined ? localGenre : (track?.genre ?? null)
  const effectiveIsLocal = localIsLocal ?? track?.isLocal ?? false

  async function patch(fields: Record<string, unknown>) {
    await adminFetch(`/api/admin/catalog/tracks/${id ?? ''}`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    })
    void queryClient.invalidateQueries({ queryKey: ['catalog', 'track', id] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'tracks'] })
  }

  async function handleTogglePublished() {
    if (!track) return
    const next = !effectivePublished
    if (!window.confirm(`Вы хотите ${next ? 'опубликовать' : 'снять с публикации'} трек "${effectiveTitle}"?`)) return
    setActionLoading('publish')
    setLocalPublished(next)
    try {
      await patch({ isPublished: next })
      addToast(`Трек ${next ? 'опубликован' : 'снят с публикации'}`, 'success')
    } catch (err) {
      setLocalPublished(track.isPublished)
      addToast(err instanceof Error ? err.message : 'Ошибка', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleSetPlayback(next: PlaybackStatus) {
    if (!track) return
    setPlaybackSelectOpen(false)
    if (next === effectivePlayback) return
    setActionLoading('playback')
    setLocalPlayback(next)
    try {
      await patch({ playbackStatus: next })
      addToast(`Playback → ${next}`, 'success')
    } catch (err) {
      setLocalPlayback(track.playbackStatus)
      addToast(err instanceof Error ? err.message : 'Ошибка', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleSaveTitle(val: string) {
    if (!val) { addToast('Название не может быть пустым', 'error'); return }
    const prev = effectiveTitle
    setLocalTitle(val)
    try {
      await patch({ title: val })
      addToast('Название сохранено', 'success')
    } catch (err) {
      setLocalTitle(prev)
      addToast(err instanceof Error ? err.message : 'Ошибка', 'error')
    }
  }

  async function handleSaveGenre(val: string) {
    const prev = effectiveGenre
    const next = val.trim() || null
    setLocalGenre(next)
    try {
      await patch({ genre: next })
      addToast('Жанр сохранён', 'success')
    } catch (err) {
      setLocalGenre(prev)
      addToast(err instanceof Error ? err.message : 'Ошибка', 'error')
    }
  }

  async function handleToggleIsLocal() {
    if (!track) return
    const next = !effectiveIsLocal
    setLocalIsLocal(next)
    try {
      await patch({ isLocal: next })
      addToast(`Локальный: ${next ? 'Да (KZ)' : 'Нет'}`, 'success')
    } catch (err) {
      setLocalIsLocal(track.isLocal)
      addToast(err instanceof Error ? err.message : 'Ошибка', 'error')
    }
  }

  if (isLoading) return <DetailSkeleton />

  if (isError || !track) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-red-400 text-sm">
          {isError ? (error instanceof Error ? error.message : 'Ошибка загрузки трека') : 'Трек не найден'}
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => void refetch()}>Повторить</Button>
          <Link to="/catalog"><Button variant="ghost">← Назад</Button></Link>
        </div>
      </div>
    )
  }

  const artistNames = track.artists.map(a => a.name).join(', ')
  const PLAYBACK_STATUSES: PlaybackStatus[] = ['PLAYABLE', 'PROCESSING', 'BLOCKED', 'REMOVED']

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Back */}
      <Link to="/catalog" className="inline-flex items-center gap-1.5 text-zinc-500 text-sm hover:text-white transition-colors">
        ← Каталог треков
      </Link>

      {/* Hero card */}
      <div className="bg-surface border border-border-default rounded-xl p-6">
        <div className="flex gap-6 items-start">
          {/* Cover */}
          {track.coverUrl ? (
            <img src={track.coverUrl} alt={effectiveTitle} className="w-32 h-32 rounded-lg object-cover shrink-0 shadow-lg" />
          ) : (
            <div className="w-32 h-32 rounded-lg bg-surface-2 flex items-center justify-center text-zinc-700 text-4xl shrink-0">♪</div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Editable title */}
            <h1 className="text-white text-2xl font-bold leading-tight">
              <InlineEdit value={effectiveTitle} onSave={handleSaveTitle} placeholder="Название трека" className="text-2xl font-bold" />
            </h1>
            <p className="text-zinc-400 mt-1">{artistNames || '—'}</p>
            <p className="text-zinc-600 text-sm mt-0.5">{formatDuration(track.durationMs)}</p>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge label={effectivePublished ? 'Опубликован' : 'Черновик'} variant={effectivePublished ? 'green' : 'gray'} />
              <Badge label={effectivePlayback} variant={playbackBadgeVariant(effectivePlayback)} />
              {effectiveIsLocal && <Badge label="KZ" variant="blue" />}
              {track.tagStatus && (
                <Badge label={track.tagStatus} variant={track.tagStatus === 'VERIFIED' ? 'green' : track.tagStatus === 'PENDING' ? 'yellow' : 'red'} />
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                variant={effectivePublished ? 'secondary' : 'primary'}
                onClick={() => void handleTogglePublished()}
                loading={actionLoading === 'publish'}
              >
                {effectivePublished ? 'Снять с публикации' : 'Опубликовать'}
              </Button>

              {/* Playback status selector */}
              <div className="relative">
                <Button
                  variant="secondary"
                  loading={actionLoading === 'playback'}
                  onClick={() => setPlaybackSelectOpen(o => !o)}
                >
                  Playback: {effectivePlayback} ▾
                </Button>
                {playbackSelectOpen && (
                  <div className="absolute top-full left-0 mt-1 z-20 bg-surface border border-border-default rounded-lg overflow-hidden shadow-xl min-w-[160px]">
                    {PLAYBACK_STATUSES.map(s => (
                      <button
                        key={s}
                        onClick={() => void handleSetPlayback(s)}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-surface-2 ${
                          s === effectivePlayback ? 'text-accent font-medium' : 'text-white'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* General info with editable fields */}
        <Section title="Основное">
          <Field label="ID" value={<code className="text-xs text-zinc-400 font-mono">{track.id}</code>} />
          <Field label="Длительность" value={formatDuration(track.durationMs)} />
          <Field label="Источник" value={track.sourcePolicy || '—'} />

          {/* Editable genre */}
          <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border-default">
            <span className="text-zinc-500 text-sm shrink-0">Жанр</span>
            <span className="text-white text-sm text-right">
              <InlineEdit
                value={effectiveGenre ?? ''}
                onSave={handleSaveGenre}
                placeholder="Жанр..."
              />
            </span>
          </div>

          {/* isLocal toggle */}
          <div className="flex items-center justify-between gap-4 py-2.5 border-b border-border-default">
            <span className="text-zinc-500 text-sm shrink-0">Локальный (KZ)</span>
            <button
              onClick={() => void handleToggleIsLocal()}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                effectiveIsLocal ? 'bg-accent' : 'bg-zinc-700'
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                effectiveIsLocal ? 'translate-x-4' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <Field label="Offline" value={track.offlineEligible ? 'Да' : 'Нет'} />
          {track.release && (
            <Field label="Релиз" value={
              <Link to="/releases" className="text-accent hover:underline">{track.release.title}</Link>
            } />
          )}
        </Section>

        {/* Transparency */}
        <Section title="Transparency">
          {track.transparency ? (
            <>
              <Field label="Причина видимости" value={track.transparency.visibilityReason ?? <span className="text-zinc-700">—</span>} />
              <Field label="Подтверждено" value={
                track.transparency.lastConfirmedAt
                  ? new Date(track.transparency.lastConfirmedAt).toLocaleString('ru-RU')
                  : <span className="text-zinc-700">—</span>
              } />
              <Field label="Source ID" value={
                track.transparency.sourceId
                  ? <code className="text-xs text-zinc-400 font-mono">{track.transparency.sourceId}</code>
                  : <span className="text-zinc-700">—</span>
              } />
            </>
          ) : (
            <p className="text-zinc-600 text-sm py-2">Данные недоступны</p>
          )}
        </Section>

        {/* Availability */}
        <Section title="Availability">
          {track.availability?.territories && track.availability.territories.length > 0 ? (
            <div className="space-y-1">
              {track.availability.territories.map(t => (
                <div key={t.code} className="flex items-center justify-between py-1.5 border-b border-border-default last:border-0">
                  <span className="text-zinc-400 text-sm font-mono">{t.code}</span>
                  <Badge label={t.status} variant={t.status === 'AVAILABLE' ? 'green' : t.status === 'BLOCKED' ? 'red' : 'gray'} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-600 text-sm py-2">Нет данных о территориях</p>
          )}
        </Section>

        {/* Artists */}
        {track.artists.length > 0 && (
          <Section title="Артисты">
            {track.artists.map(artist => (
              <div key={artist.id} className="flex items-center justify-between py-2.5 border-b border-border-default last:border-0">
                <span className="text-white text-sm">{artist.name}</span>
                <code className="text-zinc-600 text-xs font-mono">{artist.slug}</code>
              </div>
            ))}
          </Section>
        )}
      </div>
    </div>
  )
}
