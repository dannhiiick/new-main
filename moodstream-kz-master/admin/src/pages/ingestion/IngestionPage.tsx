import React, { useCallback, useRef, useState } from 'react'
import { getAdminToken, adminFetch, ApiError } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyzeResult {
  extracted: {
    title: string | null
    artist: string | null
    album: string | null
    year: number | null
    date: string | null
    trackNumber: number | null
    genre: string | null
    durationMs: number | null
  }
  suggestions: {
    trackTitle: string
    releaseTitle: string
    releaseType: 'SINGLE' | 'EP' | 'ALBUM'
    isLocal: boolean
    slug: string
    matchedArtist: { id: string; name: string; slug: string; isLocal: boolean } | null
    artistName: string
  }
  tempAudioKey: string | null
  tempCoverUrl: string | null
}

interface ArtistOption {
  id: string
  name: string
  slug: string
  isLocal: boolean
}

interface CreateResult {
  trackId: string
  releaseId: string
  artistId: string
  trackTitle: string
  artistName: string
}

interface FormState {
  trackTitle: string
  releaseTitle: string
  releaseType: 'SINGLE' | 'EP' | 'ALBUM'
  artistId: string | null
  artistName: string
  isLocal: boolean
  durationMs: number
  trackNumber: number | null
  audioAssetKey: string | null
  isPublished: boolean
  releaseDate: string | null
  coverUrl: string | null
}

// ─── Batch types ──────────────────────────────────────────────────────────────

type BatchStatus = 'pending' | 'uploading' | 'done' | 'error'

interface BatchFile {
  id: string
  file: File
  status: BatchStatus
  result?: CreateResult
  error?: string
}

const EMPTY_FORM: FormState = {
  trackTitle: '',
  releaseTitle: '',
  releaseType: 'SINGLE',
  artistId: null,
  artistName: '',
  isLocal: false,
  durationMs: 0,
  trackNumber: null,
  audioAssetKey: null,
  isPublished: false,
  releaseDate: null,
  coverUrl: null,
}

const BASE_URL = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3000'
const BATCH_CONCURRENCY = 5

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function uploadForAnalyze(file: File): Promise<AnalyzeResult> {
  const token = getAdminToken()
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${BASE_URL}/api/admin/ingestion/analyze`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try { const b = (await res.json()) as { message?: string }; if (b.message) msg = b.message } catch { /* ignore */ }
    throw new Error(msg)
  }
  return res.json() as Promise<AnalyzeResult>
}

async function uploadCoverFile(file: File): Promise<string> {
  const token = getAdminToken()
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${BASE_URL}/api/admin/ingestion/cover`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try { const b = (await res.json()) as { message?: string }; if (b.message) msg = b.message } catch { /* ignore */ }
    throw new Error(msg)
  }
  const data = (await res.json()) as { coverUrl: string }
  return data.coverUrl
}

async function autoIngestFile(file: File): Promise<CreateResult> {
  const token = getAdminToken()
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${BASE_URL}/api/admin/ingestion/auto`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try { const b = (await res.json()) as { message?: string }; if (b.message) msg = b.message } catch { /* ignore */ }
    throw new Error(msg)
  }
  return res.json() as Promise<CreateResult>
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ─── Root component ───────────────────────────────────────────────────────────

export function IngestionPage(): React.ReactElement {
  const [mode, setMode] = useState<'single' | 'batch'>('single')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Загрузка треков</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {mode === 'single'
              ? 'Загрузи MP3 — метаданные заполнятся из тегов автоматически'
              : 'Загрузи сразу все файлы — треки создадутся автоматически'}
          </p>
        </div>
        <div className="flex bg-[#141416] border border-[#1C1C1F] rounded-xl p-0.5 gap-0.5">
          <button
            onClick={() => setMode('single')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-150 font-medium ${
              mode === 'single' ? 'bg-[#202024] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Один файл
          </button>
          <button
            onClick={() => setMode('batch')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-150 font-medium ${
              mode === 'batch' ? 'bg-[#202024] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Пакетная загрузка
          </button>
        </div>
      </div>

      {mode === 'single' ? <SingleIngestion /> : <BatchIngestion />}
    </div>
  )
}

// ─── Single ingestion ─────────────────────────────────────────────────────────

function SingleIngestion(): React.ReactElement {
  const [file, setFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null)

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [artistSearch, setArtistSearch] = useState('')
  const [artistOptions, setArtistOptions] = useState<ArtistOption[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const artistDebounced = useDebounce(artistSearch, 300)

  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createResult, setCreateResult] = useState<CreateResult | null>(null)

  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!artistDebounced.trim()) { setArtistOptions([]); return }
    adminFetch<{ artists: ArtistOption[] }>(`/api/admin/ingestion/artists?q=${encodeURIComponent(artistDebounced)}`)
      .then(r => setArtistOptions(r.artists))
      .catch(() => setArtistOptions([]))
  }, [artistDebounced])

  const handleFile = useCallback(async (f: File) => {
    const audioExts = ['mp3','flac','aac','ogg','opus','wav','wave','ape','wma','m4a','alac','aiff','aif','dsf','dsd']
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (!f.type.startsWith('audio/') && !audioExts.includes(ext)) {
      setAnalyzeError('Только аудио файлы (MP3, FLAC, APE, AAC, WAV, WMA и др.)')
      return
    }
    setFile(f); setAnalyzeResult(null); setAnalyzeError(null); setCreateResult(null); setAnalyzing(true)
    try {
      const result = await uploadForAnalyze(f)
      setAnalyzeResult(result)
      setForm({
        trackTitle: result.suggestions.trackTitle,
        releaseTitle: result.suggestions.releaseTitle,
        releaseType: result.suggestions.releaseType,
        artistId: result.suggestions.matchedArtist?.id ?? null,
        artistName: result.suggestions.artistName,
        isLocal: result.suggestions.isLocal,
        durationMs: result.extracted.durationMs ?? 0,
        trackNumber: result.extracted.trackNumber,
        audioAssetKey: result.tempAudioKey ?? null,
        isPublished: false,
        releaseDate: result.extracted.date ?? null,
        coverUrl: result.tempCoverUrl ?? null,
      })
      setArtistSearch(result.suggestions.artistName)
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Ошибка анализа файла')
    } finally {
      setAnalyzing(false)
    }
  }, [])

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) void handleFile(f)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) void handleFile(f)
  }

  async function handleCoverFile(f: File) {
    if (!f.type.startsWith('image/')) return
    setUploadingCover(true)
    try { const coverUrl = await uploadCoverFile(f); setForm(p => ({ ...p, coverUrl })) }
    catch { /* silent */ }
    finally { setUploadingCover(false) }
  }

  function selectArtist(a: ArtistOption) {
    setForm(prev => ({ ...prev, artistId: a.id, artistName: a.name, isLocal: a.isLocal }))
    setArtistSearch(a.name); setShowDropdown(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.trackTitle || !form.artistName || form.durationMs < 1) return
    setCreating(true); setCreateError(null)
    try {
      const result = await adminFetch<CreateResult>('/api/admin/ingestion/create', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setCreateResult(result)
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Ошибка создания трека')
    } finally {
      setCreating(false)
    }
  }

  function handleReset() {
    setFile(null); setAnalyzeResult(null); setAnalyzeError(null)
    setCreateResult(null); setCreateError(null); setForm(EMPTY_FORM); setArtistSearch('')
    setUploadingCover(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (coverInputRef.current) coverInputRef.current.value = ''
  }

  if (createResult) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center font-sans">
        <div className="w-16 h-16 rounded-full bg-green-950/20 border border-green-800/40 flex items-center justify-center mx-auto mb-4 text-green-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Трек создан!</h2>
        <p className="text-zinc-400 text-sm mb-6 font-medium">«{createResult.trackTitle}» — {createResult.artistName}</p>
        <div className="bg-[#141416] border border-[#1C1C1F] rounded-xl p-5 text-left text-xs text-zinc-500 space-y-1.5 mb-6">
          <div><span className="text-zinc-500">Track ID:</span> <span className="font-mono text-zinc-300">{createResult.trackId}</span></div>
          <div><span className="text-zinc-500">Release ID:</span> <span className="font-mono text-zinc-300">{createResult.releaseId}</span></div>
          <div><span className="text-zinc-500">Artist ID:</span> <span className="font-mono text-zinc-300">{createResult.artistId}</span></div>
        </div>
        <Button onClick={handleReset} variant="primary" size="md">
          Загрузить ещё
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div
        onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-150 ${
          isDragOver 
            ? 'border-white bg-[#202024]/40' 
            : file 
              ? 'border-green-800/40 bg-green-950/5' 
              : 'border-[#1C1C1F] hover:border-zinc-500 bg-[#141416]'
        }`}
      >
        <input ref={fileInputRef} type="file" accept="audio/*,.mp3,.flac,.aac,.ogg,.opus,.wav,.ape,.wma,.m4a,.aiff,.alac,.dsf" className="hidden" onChange={onInputChange} />
        {analyzing ? (
          <div className="space-y-3 py-2">
            <div className="w-8 h-8 border-2 border-[#D4D1CA] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-zinc-400 text-sm font-medium">Анализирую метаданные и обложку…</p>
          </div>
        ) : file ? (
          <div className="space-y-1.5">
            <p className="text-white text-sm font-medium">{file.name}</p>
            <p className="text-zinc-500 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            <p className="text-zinc-600 text-xs mt-2">Кликни для замены</p>
          </div>
        ) : (
          <div className="space-y-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-10 h-10 text-zinc-600 mx-auto">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
            </svg>
            <p className="text-zinc-400 text-sm">Перетащи MP3 или кликни для выбора</p>
            <p className="text-zinc-600 text-xs">MP3, FLAC, AAC, OGG, WAV · до 50 MB</p>
          </div>
        )}
      </div>

      {analyzeError && (
        <div className="bg-red-900/20 border border-red-800/40 rounded-lg px-4 py-3 text-red-400 text-sm">{analyzeError}</div>
      )}

      {analyzeResult && (
        <div className="bg-accent/5 border border-accent/20 rounded-lg px-4 py-3">
          <p className="text-accent text-xs font-semibold uppercase tracking-wider mb-2">Теги из файла</p>
          <div className="grid grid-cols-3 gap-3 text-xs">
            {analyzeResult.extracted.durationMs && (
              <div><span className="text-zinc-600">Длительность</span><p className="text-zinc-300">{formatDuration(analyzeResult.extracted.durationMs)}</p></div>
            )}
            {analyzeResult.extracted.genre && (
              <div><span className="text-zinc-600">Жанр</span><p className="text-zinc-300">{analyzeResult.extracted.genre}</p></div>
            )}
            {analyzeResult.extracted.date && (
              <div><span className="text-zinc-600">Дата</span><p className="text-zinc-300">{analyzeResult.extracted.date}</p></div>
            )}
            {analyzeResult.tempCoverUrl && (
              <div><span className="text-zinc-600">Обложка</span><p className="text-green-400">найдена в MP3</p></div>
            )}
            {analyzeResult.suggestions.matchedArtist && (
              <div className="col-span-3">
                <span className="text-zinc-600">Артист найден в БД → </span>
                <span className="text-green-400">{analyzeResult.suggestions.matchedArtist.name}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {analyzeResult && (
        <form onSubmit={e => void handleCreate(e)} className="space-y-4">
          <div className="bg-surface border border-border-default rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-300">Метаданные трека</h2>

            <Field label="Название трека *">
              <input className="input" value={form.trackTitle} onChange={e => setForm(p => ({ ...p, trackTitle: e.target.value }))} placeholder="Введи название…" required />
            </Field>

            <Field label="Артист *">
              <div className="relative">
                <input
                  className="input"
                  value={artistSearch}
                  onChange={e => { setArtistSearch(e.target.value); setForm(p => ({ ...p, artistName: e.target.value, artistId: null })); setShowDropdown(true) }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  placeholder="Поиск или новый артист…"
                  required
                />
                {form.artistId && (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-green-400 absolute right-3.5 top-1/2 -translate-y-1/2 shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
                {showDropdown && artistOptions.length > 0 && (
                  <ul className="absolute z-20 left-0 right-0 top-full mt-1.5 bg-[#141416] border border-[#1C1C1F] rounded-xl shadow-2xl overflow-hidden divide-y divide-[#1C1C1F]/40">
                    {artistOptions.map(a => (
                      <li key={a.id}>
                        <button type="button" onMouseDown={() => selectArtist(a)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#202024] flex items-center justify-between text-zinc-300 hover:text-white transition-colors">
                          <span>{a.name}</span>
                          {a.isLocal && <Badge label="KZ" variant="blue" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {!form.artistId && artistSearch && <p className="text-zinc-500 text-xs mt-1">Новый артист будет создан</p>}
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Название релиза *">
                <input className="input" value={form.releaseTitle} onChange={e => setForm(p => ({ ...p, releaseTitle: e.target.value }))} required />
              </Field>
              <Field label="Тип релиза">
                <select className="input" value={form.releaseType} onChange={e => setForm(p => ({ ...p, releaseType: e.target.value as 'SINGLE' | 'EP' | 'ALBUM' }))}>
                  <option value="SINGLE">Single</option>
                  <option value="EP">EP</option>
                  <option value="ALBUM">Album</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Длительность (мс) *">
                <input className="input" type="number" min={1} value={form.durationMs || ''} onChange={e => setForm(p => ({ ...p, durationMs: Number(e.target.value) }))} required />
              </Field>
              <Field label="Номер трека">
                <input className="input" type="number" min={1} value={form.trackNumber ?? ''} onChange={e => setForm(p => ({ ...p, trackNumber: e.target.value ? Number(e.target.value) : null }))} placeholder="—" />
              </Field>
            </div>

            <Field label="Дата релиза">
              <input className="input" type="date" value={form.releaseDate ?? ''} onChange={e => setForm(p => ({ ...p, releaseDate: e.target.value || null }))} />
            </Field>

            <Field label="Обложка">
              <div className="flex items-center gap-3">
                {form.coverUrl ? (
                  <img src={form.coverUrl} alt="cover" className="w-16 h-16 rounded-xl object-cover border border-[#1C1C1F]" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-[#202024] flex items-center justify-center border border-[#1C1C1F]">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-zinc-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 0v15m0-15l-10.5 3M9 9V21m0-12a3 3 0 100-6 3 3 0 000 6zm10.5-3a3 3 0 100-6 3 3 0 000 6z" />
                    </svg>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <button type="button" onClick={() => coverInputRef.current?.click()} disabled={uploadingCover} className="text-xs text-zinc-400 hover:text-white border border-[#1C1C1F] rounded-lg px-3 py-1.5 hover:bg-[#202024] transition-colors disabled:opacity-50 font-medium">
                    {uploadingCover ? 'Загружаю…' : form.coverUrl ? 'Заменить' : 'Загрузить обложку'}
                  </button>
                  {form.coverUrl && <button type="button" onClick={() => setForm(p => ({ ...p, coverUrl: null }))} className="text-xs text-zinc-500 hover:text-red-400 transition-colors font-medium">Убрать</button>}
                </div>
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void handleCoverFile(f) }} />
              </div>
            </Field>

            <div className="flex gap-6 pt-1">
              <Toggle label="Казахский артист (KZ)" checked={form.isLocal} onChange={v => setForm(p => ({ ...p, isLocal: v }))} />
              <Toggle label="Опубликовать сразу" checked={form.isPublished} onChange={v => setForm(p => ({ ...p, isPublished: v }))} />
            </div>
          </div>

          {createError && (
            <div className="bg-red-900/20 border border-red-800/40 rounded-lg px-4 py-3 text-red-400 text-sm">{createError}</div>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={creating} className="flex-1 py-2.5 bg-accent text-black font-semibold text-sm rounded-md hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {creating ? 'Создаю…' : 'Создать трек'}
            </button>
            <button type="button" onClick={handleReset} className="px-4 py-2.5 text-zinc-400 hover:text-white text-sm border border-border-default rounded-md hover:bg-white/5 transition-colors">
              Сброс
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ─── Batch ingestion ──────────────────────────────────────────────────────────

function BatchIngestion(): React.ReactElement {
  const [files, setFiles] = useState<BatchFile[]>([])
  const [running, setRunning] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef(false)

  const doneCount = files.filter(f => f.status === 'done').length
  const errorCount = files.filter(f => f.status === 'error').length
  const pendingCount = files.filter(f => f.status === 'pending').length
  const uploadingCount = files.filter(f => f.status === 'uploading').length
  const totalCount = files.length
  const finishedCount = doneCount + errorCount

  const AUDIO_EXTS = new Set(['mp3','flac','aac','ogg','opus','wav','wave','ape','wma','m4a','alac','aiff','aif','dsf','dsd'])

  function addFiles(newFiles: FileList | File[]) {
    const arr = Array.from(newFiles).filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
      return f.type.startsWith('audio/') || AUDIO_EXTS.has(ext)
    })
    setFiles(prev => [
      ...prev,
      ...arr.map(f => ({ id: crypto.randomUUID(), file: f, status: 'pending' as const })),
    ])
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(e.target.files)
  }

  function removeFile(id: string) {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  function clearAll() {
    setFiles([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function startBatch() {
    if (running) return
    abortRef.current = false
    setRunning(true)

    // Collect pending items
    const queue = files.filter(f => f.status === 'pending').map(f => f.id)
    let idx = 0

    async function processOne(id: string) {
      if (abortRef.current) return
      setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'uploading' } : f))
      try {
        const batchFile = files.find(f => f.id === id)
        if (!batchFile) return
        const result = await autoIngestFile(batchFile.file)
        setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'done', result } : f))
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Ошибка загрузки'
        setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'error', error } : f))
      }
    }

    // Sliding window concurrency
    const active = new Set<Promise<void>>()
    while (idx < queue.length && !abortRef.current) {
      const id = queue[idx++] as string
      const p = processOne(id).finally(() => active.delete(p))
      active.add(p)
      if (active.size >= BATCH_CONCURRENCY) {
        await Promise.race(active)
      }
    }
    await Promise.all(active)
    setRunning(false)
  }

  function stopBatch() {
    abortRef.current = true
    setRunning(false)
  }

  const allDone = totalCount > 0 && pendingCount === 0 && uploadingCount === 0 && !running

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        onClick={() => !running && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          running ? 'cursor-default opacity-60' : 'cursor-pointer'
        } ${
          isDragOver ? 'border-accent bg-accent/5' : files.length > 0 ? 'border-zinc-600 bg-zinc-900/50' : 'border-border-default hover:border-zinc-600 bg-surface'
        }`}
      >
        <input ref={fileInputRef} type="file" accept="audio/*,.mp3,.flac,.aac,.ogg,.opus,.wav,.ape,.wma,.m4a,.aiff,.alac,.dsf" multiple className="hidden" onChange={onInputChange} disabled={running} />
        {files.length === 0 ? (
          <div className="space-y-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-10 h-10 text-zinc-600 mx-auto">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
            </svg>
            <p className="text-zinc-300 text-sm font-medium">Перетащи все MP3 сюда или кликни для выбора</p>
            <p className="text-zinc-600 text-xs">Поддержка нескольких файлов · MP3, FLAC, AAC · до 50 MB каждый</p>
            <p className="text-zinc-700 text-xs mt-2">Теги (название, артист, жанр, обложка) извлекутся автоматически</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-white text-sm font-medium">{totalCount} файл{totalCount === 1 ? '' : totalCount < 5 ? 'а' : 'ов'} добавлено</p>
            <p className="text-zinc-500 text-xs">{running ? 'Кликни для добавления ещё' : 'Кликни для добавления ещё файлов'}</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>{finishedCount} / {totalCount} обработано</span>
            <div className="flex gap-3">
              {doneCount > 0 && <span className="text-green-400">{doneCount} ок</span>}
              {errorCount > 0 && <span className="text-red-400">{errorCount} ошибок</span>}
              {uploadingCount > 0 && <span className="text-accent">{uploadingCount} загружается</span>}
              {pendingCount > 0 && <span className="text-zinc-600">{pendingCount} ожидает</span>}
            </div>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: totalCount > 0 ? `${(finishedCount / totalCount) * 100}%` : '0%' }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      {totalCount > 0 && (
        <div className="flex gap-3">
          {!allDone && (
            running ? (
              <button onClick={stopBatch} className="flex-1 py-2.5 bg-red-600 text-white font-semibold text-sm rounded-md hover:bg-red-500 transition-colors">
                Остановить
              </button>
            ) : (
              <button onClick={() => void startBatch()} disabled={pendingCount === 0} className="flex-1 py-2.5 bg-accent text-black font-semibold text-sm rounded-md hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {pendingCount > 0 ? `Загрузить ${pendingCount} файл${pendingCount === 1 ? '' : pendingCount < 5 ? 'а' : 'ов'}` : 'Все загружены'}
              </button>
            )
          )}
          {allDone && (
            <div className="flex-1 py-2.5 bg-green-900/30 border border-green-700/40 text-green-400 font-semibold text-sm rounded-md text-center">
              Готово! {doneCount} трек{doneCount === 1 ? '' : doneCount < 5 ? 'а' : 'ов'} создано
            </div>
          )}
          <button onClick={clearAll} disabled={running} className="px-4 py-2.5 text-zinc-400 hover:text-white text-sm border border-border-default rounded-md hover:bg-white/5 transition-colors disabled:opacity-50">
            Очистить
          </button>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="bg-surface border border-border-default rounded-xl overflow-hidden">
          <div className="max-h-96 overflow-y-auto divide-y divide-border-default">
            {files.map(item => (
              <BatchRow key={item.id} item={item} onRemove={() => removeFile(item.id)} canRemove={!running || item.status === 'pending'} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BatchRow({
  item,
  onRemove,
  canRemove,
}: {
  item: BatchFile
  onRemove: () => void
  canRemove: boolean
}): React.ReactElement {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Status icon */}
      <div className="w-5 flex-shrink-0 flex items-center justify-center">
        {item.status === 'pending' && <span className="w-2 h-2 rounded-full bg-zinc-600 block" />}
        {item.status === 'uploading' && <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />}
        {item.status === 'done' && (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-green-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
        {item.status === 'error' && (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-red-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        {item.status === 'done' && item.result ? (
          <div>
            <p className="text-white text-sm truncate">{item.result.trackTitle}</p>
            <p className="text-zinc-500 text-xs truncate">{item.result.artistName}</p>
          </div>
        ) : (
          <div>
            <p className={`text-sm truncate ${item.status === 'error' ? 'text-red-300' : 'text-zinc-300'}`}>
              {item.file.name}
            </p>
            {item.status === 'error' && item.error && (
              <p className="text-red-500 text-xs truncate">{item.error}</p>
            )}
            {item.status === 'uploading' && (
              <p className="text-zinc-600 text-xs">Загружается…</p>
            )}
            {item.status === 'pending' && (
              <p className="text-zinc-700 text-xs">{(item.file.size / 1024 / 1024).toFixed(1)} MB</p>
            )}
          </div>
        )}
      </div>

      {/* Remove button */}
      {canRemove && (
        <button onClick={onRemove} className="text-zinc-700 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0">
          ×
        </button>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs text-zinc-500 font-medium">{label}</label>
      {children}
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-white' : 'bg-[#202024]'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${checked ? 'translate-x-4 bg-black' : 'translate-x-0 bg-zinc-500'}`} />
      </button>
      <span className="text-sm text-zinc-400 font-medium">{label}</span>
    </label>
  )
}
