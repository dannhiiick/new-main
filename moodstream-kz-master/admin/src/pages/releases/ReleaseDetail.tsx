import React, { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminFetch } from '../../lib/api'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useToastContext } from '../../lib/toastContext'
import type { BadgeVariant } from '../../components/ui/Badge'

interface ReleaseTrack {
  id: string
  title: string
  durationMs: number
  trackNumber: number | null
  isPublished: boolean
  playbackStatus: string
  artists: string[]
}

interface ReleaseDetail {
  id: string
  title: string
  slug: string
  releaseType: string
  releaseDate: string | null
  coverUrl: string | null
  isPublished: boolean
  artist: { id: string; name: string; slug: string }
  tracks: ReleaseTrack[]
  createdAt: string
  updatedAt: string
}

const RELEASE_TYPES = ['SINGLE', 'EP', 'ALBUM', 'COMPILATION', 'LIVE'] as const
const RELEASE_TYPE_LABELS: Record<string, string> = {
  SINGLE: 'Сингл', EP: 'EP', ALBUM: 'Альбом', COMPILATION: 'Сборник', LIVE: 'Live',
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function playbackVariant(status: string): BadgeVariant {
  switch (status) {
    case 'PLAYABLE': return 'green'
    case 'PROCESSING': return 'yellow'
    case 'BLOCKED': return 'red'
    default: return 'gray'
  }
}

// ── Inline edit ───────────────────────────────────────────────────────────────

interface InlineEditProps {
  value: string
  onSave: (val: string) => Promise<void>
  placeholder?: string
}

function InlineEdit({ value, onSave, placeholder }: InlineEditProps): React.ReactElement {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

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
        <input ref={ref} value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') cancel() }}
          disabled={saving} placeholder={placeholder}
          className="bg-[#202024] border border-[#1C1C1F] rounded-lg px-2.5 py-1 text-white text-sm focus:outline-none min-w-[180px]" />
        <button onClick={() => void save()} disabled={saving}
          className="text-[#D4D1CA] text-xs font-semibold hover:opacity-80 disabled:opacity-50">{saving ? '...' : 'Сохранить'}</button>
        <button onClick={cancel} className="text-zinc-500 text-xs hover:text-white">✕</button>
      </span>
    )
  }

  return (
    <span className="group inline-flex items-center gap-1.5 cursor-pointer hover:text-accent transition-colors"
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

function Skeleton(): React.ReactElement {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-surface border border-border-default rounded-xl p-6">
        <div className="flex gap-5">
          <div className="w-28 h-28 rounded-lg bg-surface-2 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-52 bg-surface-2 rounded" />
            <div className="h-4 w-32 bg-surface-2 rounded" />
            <div className="flex gap-2 mt-3">
              {[1,2].map(i => <div key={i} className="h-5 w-16 bg-surface-2 rounded" />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ReleaseDetail(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const { addToast } = useToastContext()
  const queryClient = useQueryClient()

  const [local, setLocal] = useState<Partial<ReleaseDetail>>({})
  const [typeOpen, setTypeOpen] = useState(false)

  const { data: release, isLoading, isError, error, refetch } = useQuery<ReleaseDetail>({
    queryKey: ['admin', 'release', id],
    queryFn: () => adminFetch<ReleaseDetail>(`/api/admin/catalog/releases/${id ?? ''}`),
    enabled: !!id,
    staleTime: 30_000,
  })

  async function patch(fields: Record<string, unknown>) {
    try {
      await adminFetch(`/api/admin/catalog/releases/${id ?? ''}`, {
        method: 'PATCH',
        body: JSON.stringify(fields),
      })
      setLocal(prev => ({ ...prev, ...fields }))
      void queryClient.invalidateQueries({ queryKey: ['admin', 'release', id] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'releases'] })
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Ошибка', 'error')
      throw err
    }
  }

  if (isLoading) return <Skeleton />
  if (isError || !release) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-red-400 text-sm">{isError ? (error instanceof Error ? error.message : 'Ошибка') : 'Релиз не найден'}</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => void refetch()}>Повторить</Button>
          <Link to="/releases">
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

  const r = { ...release, ...local }
  const totalMs = release.tracks.reduce((s, t) => s + t.durationMs, 0)

  return (
    <div className="space-y-4 max-w-3xl font-sans">
      <Link to="/releases" className="inline-flex items-center gap-2 text-zinc-500 text-sm hover:text-white transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Релизы
      </Link>

      {/* Hero */}
      <div className="bg-[#141416] border border-[#1C1C1F]/40 rounded-2xl p-6 shadow-sm">
        <div className="flex gap-5 items-start">
          {r.coverUrl
            ? <img src={r.coverUrl} alt={r.title} className="w-28 h-28 rounded-xl object-cover shrink-0 shadow-lg border border-[#1C1C1F]" />
            : <div className="w-28 h-28 rounded-xl bg-[#202024] flex items-center justify-center shrink-0 border border-[#2C2C32]">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-zinc-600">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
          }
          <div className="flex-1 min-w-0">
            <h1 className="text-white text-2xl font-bold leading-tight">
              <InlineEdit value={r.title} placeholder="Название релиза"
                onSave={async val => { await patch({ title: val }); addToast('Название сохранено', 'success') }} />
            </h1>
            <Link to={`/artists/${r.artist.id}`} className="text-zinc-400 text-sm hover:text-accent transition-colors mt-1.5 inline-block font-medium">
              {r.artist.name}
            </Link>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge label={RELEASE_TYPE_LABELS[r.releaseType] ?? r.releaseType} variant="blue" />
              <Badge label={r.isPublished ? 'Опубликован' : 'Черновик'} variant={r.isPublished ? 'green' : 'gray'} />
            </div>
            <p className="text-zinc-600 text-xs mt-2">
              {release.tracks.length} треков · {formatDuration(totalMs)}
            </p>
          </div>
        </div>
      </div>

      {/* Edit fields */}
      <div className="bg-[#141416] border border-[#1C1C1F]/40 rounded-2xl p-6 shadow-sm">
        <h2 className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold mb-4">Редактирование</h2>

        {/* Release type */}
        <div className="flex items-center justify-between gap-4 py-3.5 border-b border-[#1C1C1F]/50">
          <span className="text-zinc-500 text-sm">Тип</span>
          <div className="relative">
            <button onClick={() => setTypeOpen(o => !o)}
              className="flex items-center gap-1.5 text-white text-sm hover:text-[#D4D1CA] transition-colors font-medium">
              {RELEASE_TYPE_LABELS[r.releaseType] ?? r.releaseType}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-zinc-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {typeOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-20 bg-[#141416] border border-[#1C1C1F] rounded-lg overflow-hidden shadow-xl min-w-[140px]">
                {RELEASE_TYPES.map(t => (
                  <button key={t} onClick={async () => {
                    setTypeOpen(false)
                    await patch({ releaseType: t })
                    addToast(`Тип → ${RELEASE_TYPE_LABELS[t]}`, 'success')
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#202024] transition-colors ${r.releaseType === t ? 'text-white font-medium bg-[#202024]/40' : 'text-zinc-400'}`}>
                    {RELEASE_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Release date */}
        <div className="flex items-center justify-between gap-4 py-3.5 border-b border-[#1C1C1F]/50">
          <span className="text-zinc-500 text-sm">Дата выхода</span>
          <span className="text-white text-sm font-medium">
            <InlineEdit
              value={r.releaseDate ? r.releaseDate.split('T')[0]! : ''}
              placeholder="YYYY-MM-DD"
              onSave={async val => {
                await patch({ releaseDate: val || null })
                addToast('Дата сохранена', 'success')
              }}
            />
          </span>
        </div>

        {/* Published toggle */}
        <div className="flex items-center justify-between gap-4 py-3 border-b border-[#1C1C1F]/50">
          <span className="text-zinc-500 text-sm">Опубликован</span>
          <button onClick={async () => { await patch({ isPublished: !r.isPublished }); addToast(`Публикация: ${!r.isPublished ? 'Да' : 'Нет'}`, 'success') }}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${r.isPublished ? 'bg-white' : 'bg-[#202024]'}`}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform ${r.isPublished ? 'translate-x-4 bg-black' : 'translate-x-1 bg-zinc-500'}`} />
          </button>
        </div>

        <div className="flex items-start justify-between gap-4 py-3">
          <span className="text-zinc-500 text-sm">ID</span>
          <code className="text-zinc-500 text-xs font-mono">{r.id}</code>
        </div>
      </div>

      {/* Track list */}
      {release.tracks.length > 0 && (
        <div className="bg-[#141416] border border-[#1C1C1F]/40 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-[#1C1C1F]/50">
            <h2 className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold">
              Треки ({release.tracks.length})
            </h2>
          </div>
          <div className="divide-y divide-[#1C1C1F]/60">
            {release.tracks.map((track, idx) => (
              <div key={track.id}
                className="flex items-center gap-3 px-6 py-3.5 hover:bg-[#202024]/40 transition-colors">
                <span className="text-zinc-600 text-xs w-5 text-right shrink-0">
                  {track.trackNumber ?? idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <Link to={`/catalog/${track.id}`}
                    className="text-white text-sm font-medium hover:text-[#D4D1CA] transition-colors line-clamp-1">
                    {track.title}
                  </Link>
                  <p className="text-zinc-500 text-xs mt-0.5">{track.artists.join(', ') || '—'}</p>
                </div>
                <span className="text-zinc-500 text-xs font-mono tabular-nums shrink-0">{formatDuration(track.durationMs)}</span>
                <Badge label={track.playbackStatus} variant={playbackVariant(track.playbackStatus)} />
                <Badge label={track.isPublished ? 'Опубл.' : 'Черн.'} variant={track.isPublished ? 'green' : 'gray'} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
