import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useCallback, useRef, useState } from 'react';
import { getAdminToken, adminFetch, ApiError } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
const EMPTY_FORM = {
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
};
const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3000';
const BATCH_CONCURRENCY = 5;
// ─── Helpers ──────────────────────────────────────────────────────────────────
async function uploadForAnalyze(file) {
    const token = getAdminToken();
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${BASE_URL}/api/admin/ingestion/analyze`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
    });
    if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
            const b = (await res.json());
            if (b.message)
                msg = b.message;
        }
        catch { /* ignore */ }
        throw new Error(msg);
    }
    return res.json();
}
async function uploadCoverFile(file) {
    const token = getAdminToken();
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${BASE_URL}/api/admin/ingestion/cover`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
    });
    if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
            const b = (await res.json());
            if (b.message)
                msg = b.message;
        }
        catch { /* ignore */ }
        throw new Error(msg);
    }
    const data = (await res.json());
    return data.coverUrl;
}
async function autoIngestFile(file) {
    const token = getAdminToken();
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${BASE_URL}/api/admin/ingestion/auto`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
    });
    if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
            const b = (await res.json());
            if (b.message)
                msg = b.message;
        }
        catch { /* ignore */ }
        throw new Error(msg);
    }
    return res.json();
}
function formatDuration(ms) {
    const s = Math.round(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
}
function useDebounce(value, delay) {
    const [debounced, setDebounced] = React.useState(value);
    React.useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}
// ─── Root component ───────────────────────────────────────────────────────────
export function IngestionPage() {
    const [mode, setMode] = useState('single');
    return (_jsxs("div", { className: "max-w-2xl mx-auto space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-semibold text-white", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0442\u0440\u0435\u043A\u043E\u0432" }), _jsx("p", { className: "text-zinc-500 text-sm mt-1", children: mode === 'single'
                                    ? 'Загрузи MP3 — метаданные заполнятся из тегов автоматически'
                                    : 'Загрузи сразу все файлы — треки создадутся автоматически' })] }), _jsxs("div", { className: "flex bg-[#141416] border border-[#1C1C1F] rounded-xl p-0.5 gap-0.5", children: [_jsx("button", { onClick: () => setMode('single'), className: `px-3 py-1.5 text-xs rounded-lg transition-all duration-150 font-medium ${mode === 'single' ? 'bg-[#202024] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`, children: "\u041E\u0434\u0438\u043D \u0444\u0430\u0439\u043B" }), _jsx("button", { onClick: () => setMode('batch'), className: `px-3 py-1.5 text-xs rounded-lg transition-all duration-150 font-medium ${mode === 'batch' ? 'bg-[#202024] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`, children: "\u041F\u0430\u043A\u0435\u0442\u043D\u0430\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0430" })] })] }), mode === 'single' ? _jsx(SingleIngestion, {}) : _jsx(BatchIngestion, {})] }));
}
// ─── Single ingestion ─────────────────────────────────────────────────────────
function SingleIngestion() {
    const [file, setFile] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [analyzeError, setAnalyzeError] = useState(null);
    const [analyzeResult, setAnalyzeResult] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [artistSearch, setArtistSearch] = useState('');
    const [artistOptions, setArtistOptions] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const artistDebounced = useDebounce(artistSearch, 300);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState(null);
    const [createResult, setCreateResult] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const fileInputRef = useRef(null);
    const coverInputRef = useRef(null);
    React.useEffect(() => {
        if (!artistDebounced.trim()) {
            setArtistOptions([]);
            return;
        }
        adminFetch(`/api/admin/ingestion/artists?q=${encodeURIComponent(artistDebounced)}`)
            .then(r => setArtistOptions(r.artists))
            .catch(() => setArtistOptions([]));
    }, [artistDebounced]);
    const handleFile = useCallback(async (f) => {
        const audioExts = ['mp3', 'flac', 'aac', 'ogg', 'opus', 'wav', 'wave', 'ape', 'wma', 'm4a', 'alac', 'aiff', 'aif', 'dsf', 'dsd'];
        const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
        if (!f.type.startsWith('audio/') && !audioExts.includes(ext)) {
            setAnalyzeError('Только аудио файлы (MP3, FLAC, APE, AAC, WAV, WMA и др.)');
            return;
        }
        setFile(f);
        setAnalyzeResult(null);
        setAnalyzeError(null);
        setCreateResult(null);
        setAnalyzing(true);
        try {
            const result = await uploadForAnalyze(f);
            setAnalyzeResult(result);
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
            });
            setArtistSearch(result.suggestions.artistName);
        }
        catch (err) {
            setAnalyzeError(err instanceof Error ? err.message : 'Ошибка анализа файла');
        }
        finally {
            setAnalyzing(false);
        }
    }, []);
    function onInputChange(e) {
        const f = e.target.files?.[0];
        if (f)
            void handleFile(f);
    }
    function onDrop(e) {
        e.preventDefault();
        setIsDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f)
            void handleFile(f);
    }
    async function handleCoverFile(f) {
        if (!f.type.startsWith('image/'))
            return;
        setUploadingCover(true);
        try {
            const coverUrl = await uploadCoverFile(f);
            setForm(p => ({ ...p, coverUrl }));
        }
        catch { /* silent */ }
        finally {
            setUploadingCover(false);
        }
    }
    function selectArtist(a) {
        setForm(prev => ({ ...prev, artistId: a.id, artistName: a.name, isLocal: a.isLocal }));
        setArtistSearch(a.name);
        setShowDropdown(false);
    }
    async function handleCreate(e) {
        e.preventDefault();
        if (!form.trackTitle || !form.artistName || form.durationMs < 1)
            return;
        setCreating(true);
        setCreateError(null);
        try {
            const result = await adminFetch('/api/admin/ingestion/create', {
                method: 'POST',
                body: JSON.stringify(form),
            });
            setCreateResult(result);
        }
        catch (err) {
            setCreateError(err instanceof ApiError ? err.message : 'Ошибка создания трека');
        }
        finally {
            setCreating(false);
        }
    }
    function handleReset() {
        setFile(null);
        setAnalyzeResult(null);
        setAnalyzeError(null);
        setCreateResult(null);
        setCreateError(null);
        setForm(EMPTY_FORM);
        setArtistSearch('');
        setUploadingCover(false);
        if (fileInputRef.current)
            fileInputRef.current.value = '';
        if (coverInputRef.current)
            coverInputRef.current.value = '';
    }
    if (createResult) {
        return (_jsxs("div", { className: "max-w-lg mx-auto mt-16 text-center font-sans", children: [_jsx("div", { className: "w-16 h-16 rounded-full bg-green-950/20 border border-green-800/40 flex items-center justify-center mx-auto mb-4 text-green-400", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 2, stroke: "currentColor", className: "w-8 h-8", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M4.5 12.75l6 6 9-13.5" }) }) }), _jsx("h2", { className: "text-xl font-semibold text-white mb-2", children: "\u0422\u0440\u0435\u043A \u0441\u043E\u0437\u0434\u0430\u043D!" }), _jsxs("p", { className: "text-zinc-400 text-sm mb-6 font-medium", children: ["\u00AB", createResult.trackTitle, "\u00BB \u2014 ", createResult.artistName] }), _jsxs("div", { className: "bg-[#141416] border border-[#1C1C1F] rounded-xl p-5 text-left text-xs text-zinc-500 space-y-1.5 mb-6", children: [_jsxs("div", { children: [_jsx("span", { className: "text-zinc-500", children: "Track ID:" }), " ", _jsx("span", { className: "font-mono text-zinc-300", children: createResult.trackId })] }), _jsxs("div", { children: [_jsx("span", { className: "text-zinc-500", children: "Release ID:" }), " ", _jsx("span", { className: "font-mono text-zinc-300", children: createResult.releaseId })] }), _jsxs("div", { children: [_jsx("span", { className: "text-zinc-500", children: "Artist ID:" }), " ", _jsx("span", { className: "font-mono text-zinc-300", children: createResult.artistId })] })] }), _jsx(Button, { onClick: handleReset, variant: "primary", size: "md", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0435\u0449\u0451" })] }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { onDragOver: e => { e.preventDefault(); setIsDragOver(true); }, onDragLeave: () => setIsDragOver(false), onDrop: onDrop, onClick: () => fileInputRef.current?.click(), className: `border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-150 ${isDragOver
                    ? 'border-white bg-[#202024]/40'
                    : file
                        ? 'border-green-800/40 bg-green-950/5'
                        : 'border-[#1C1C1F] hover:border-zinc-500 bg-[#141416]'}`, children: [_jsx("input", { ref: fileInputRef, type: "file", accept: "audio/*,.mp3,.flac,.aac,.ogg,.opus,.wav,.ape,.wma,.m4a,.aiff,.alac,.dsf", className: "hidden", onChange: onInputChange }), analyzing ? (_jsxs("div", { className: "space-y-3 py-2", children: [_jsx("div", { className: "w-8 h-8 border-2 border-[#D4D1CA] border-t-transparent rounded-full animate-spin mx-auto" }), _jsx("p", { className: "text-zinc-400 text-sm font-medium", children: "\u0410\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0443\u044E \u043C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0438 \u043E\u0431\u043B\u043E\u0436\u043A\u0443\u2026" })] })) : file ? (_jsxs("div", { className: "space-y-1.5", children: [_jsx("p", { className: "text-white text-sm font-medium", children: file.name }), _jsxs("p", { className: "text-zinc-500 text-xs", children: [(file.size / 1024 / 1024).toFixed(2), " MB"] }), _jsx("p", { className: "text-zinc-600 text-xs mt-2", children: "\u041A\u043B\u0438\u043A\u043D\u0438 \u0434\u043B\u044F \u0437\u0430\u043C\u0435\u043D\u044B" })] })) : (_jsxs("div", { className: "space-y-3", children: [_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.2, stroke: "currentColor", className: "w-10 h-10 text-zinc-600 mx-auto", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" }) }), _jsx("p", { className: "text-zinc-400 text-sm", children: "\u041F\u0435\u0440\u0435\u0442\u0430\u0449\u0438 MP3 \u0438\u043B\u0438 \u043A\u043B\u0438\u043A\u043D\u0438 \u0434\u043B\u044F \u0432\u044B\u0431\u043E\u0440\u0430" }), _jsx("p", { className: "text-zinc-600 text-xs", children: "MP3, FLAC, AAC, OGG, WAV \u00B7 \u0434\u043E 50 MB" })] }))] }), analyzeError && (_jsx("div", { className: "bg-red-900/20 border border-red-800/40 rounded-lg px-4 py-3 text-red-400 text-sm", children: analyzeError })), analyzeResult && (_jsxs("div", { className: "bg-accent/5 border border-accent/20 rounded-lg px-4 py-3", children: [_jsx("p", { className: "text-accent text-xs font-semibold uppercase tracking-wider mb-2", children: "\u0422\u0435\u0433\u0438 \u0438\u0437 \u0444\u0430\u0439\u043B\u0430" }), _jsxs("div", { className: "grid grid-cols-3 gap-3 text-xs", children: [analyzeResult.extracted.durationMs && (_jsxs("div", { children: [_jsx("span", { className: "text-zinc-600", children: "\u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C" }), _jsx("p", { className: "text-zinc-300", children: formatDuration(analyzeResult.extracted.durationMs) })] })), analyzeResult.extracted.genre && (_jsxs("div", { children: [_jsx("span", { className: "text-zinc-600", children: "\u0416\u0430\u043D\u0440" }), _jsx("p", { className: "text-zinc-300", children: analyzeResult.extracted.genre })] })), analyzeResult.extracted.date && (_jsxs("div", { children: [_jsx("span", { className: "text-zinc-600", children: "\u0414\u0430\u0442\u0430" }), _jsx("p", { className: "text-zinc-300", children: analyzeResult.extracted.date })] })), analyzeResult.tempCoverUrl && (_jsxs("div", { children: [_jsx("span", { className: "text-zinc-600", children: "\u041E\u0431\u043B\u043E\u0436\u043A\u0430" }), _jsx("p", { className: "text-green-400", children: "\u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u0432 MP3" })] })), analyzeResult.suggestions.matchedArtist && (_jsxs("div", { className: "col-span-3", children: [_jsx("span", { className: "text-zinc-600", children: "\u0410\u0440\u0442\u0438\u0441\u0442 \u043D\u0430\u0439\u0434\u0435\u043D \u0432 \u0411\u0414 \u2192 " }), _jsx("span", { className: "text-green-400", children: analyzeResult.suggestions.matchedArtist.name })] }))] })] })), analyzeResult && (_jsxs("form", { onSubmit: e => void handleCreate(e), className: "space-y-4", children: [_jsxs("div", { className: "bg-surface border border-border-default rounded-xl p-5 space-y-4", children: [_jsx("h2", { className: "text-sm font-semibold text-zinc-300", children: "\u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u0442\u0440\u0435\u043A\u0430" }), _jsx(Field, { label: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0442\u0440\u0435\u043A\u0430 *", children: _jsx("input", { className: "input", value: form.trackTitle, onChange: e => setForm(p => ({ ...p, trackTitle: e.target.value })), placeholder: "\u0412\u0432\u0435\u0434\u0438 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435\u2026", required: true }) }), _jsxs(Field, { label: "\u0410\u0440\u0442\u0438\u0441\u0442 *", children: [_jsxs("div", { className: "relative", children: [_jsx("input", { className: "input", value: artistSearch, onChange: e => { setArtistSearch(e.target.value); setForm(p => ({ ...p, artistName: e.target.value, artistId: null })); setShowDropdown(true); }, onFocus: () => setShowDropdown(true), onBlur: () => setTimeout(() => setShowDropdown(false), 150), placeholder: "\u041F\u043E\u0438\u0441\u043A \u0438\u043B\u0438 \u043D\u043E\u0432\u044B\u0439 \u0430\u0440\u0442\u0438\u0441\u0442\u2026", required: true }), form.artistId && (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 2.5, stroke: "currentColor", className: "w-4 h-4 text-green-400 absolute right-3.5 top-1/2 -translate-y-1/2 shrink-0", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M4.5 12.75l6 6 9-13.5" }) })), showDropdown && artistOptions.length > 0 && (_jsx("ul", { className: "absolute z-20 left-0 right-0 top-full mt-1.5 bg-[#141416] border border-[#1C1C1F] rounded-xl shadow-2xl overflow-hidden divide-y divide-[#1C1C1F]/40", children: artistOptions.map(a => (_jsx("li", { children: _jsxs("button", { type: "button", onMouseDown: () => selectArtist(a), className: "w-full text-left px-4 py-2.5 text-sm hover:bg-[#202024] flex items-center justify-between text-zinc-300 hover:text-white transition-colors", children: [_jsx("span", { children: a.name }), a.isLocal && _jsx(Badge, { label: "KZ", variant: "blue" })] }) }, a.id))) }))] }), !form.artistId && artistSearch && _jsx("p", { className: "text-zinc-500 text-xs mt-1", children: "\u041D\u043E\u0432\u044B\u0439 \u0430\u0440\u0442\u0438\u0441\u0442 \u0431\u0443\u0434\u0435\u0442 \u0441\u043E\u0437\u0434\u0430\u043D" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(Field, { label: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0440\u0435\u043B\u0438\u0437\u0430 *", children: _jsx("input", { className: "input", value: form.releaseTitle, onChange: e => setForm(p => ({ ...p, releaseTitle: e.target.value })), required: true }) }), _jsx(Field, { label: "\u0422\u0438\u043F \u0440\u0435\u043B\u0438\u0437\u0430", children: _jsxs("select", { className: "input", value: form.releaseType, onChange: e => setForm(p => ({ ...p, releaseType: e.target.value })), children: [_jsx("option", { value: "SINGLE", children: "Single" }), _jsx("option", { value: "EP", children: "EP" }), _jsx("option", { value: "ALBUM", children: "Album" })] }) })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(Field, { label: "\u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C (\u043C\u0441) *", children: _jsx("input", { className: "input", type: "number", min: 1, value: form.durationMs || '', onChange: e => setForm(p => ({ ...p, durationMs: Number(e.target.value) })), required: true }) }), _jsx(Field, { label: "\u041D\u043E\u043C\u0435\u0440 \u0442\u0440\u0435\u043A\u0430", children: _jsx("input", { className: "input", type: "number", min: 1, value: form.trackNumber ?? '', onChange: e => setForm(p => ({ ...p, trackNumber: e.target.value ? Number(e.target.value) : null })), placeholder: "\u2014" }) })] }), _jsx(Field, { label: "\u0414\u0430\u0442\u0430 \u0440\u0435\u043B\u0438\u0437\u0430", children: _jsx("input", { className: "input", type: "date", value: form.releaseDate ?? '', onChange: e => setForm(p => ({ ...p, releaseDate: e.target.value || null })) }) }), _jsx(Field, { label: "\u041E\u0431\u043B\u043E\u0436\u043A\u0430", children: _jsxs("div", { className: "flex items-center gap-3", children: [form.coverUrl ? (_jsx("img", { src: form.coverUrl, alt: "cover", className: "w-16 h-16 rounded-xl object-cover border border-[#1C1C1F]" })) : (_jsx("div", { className: "w-16 h-16 rounded-xl bg-[#202024] flex items-center justify-center border border-[#1C1C1F]", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-5 h-5 text-zinc-600", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 9l10.5-3m0 0v15m0-15l-10.5 3M9 9V21m0-12a3 3 0 100-6 3 3 0 000 6zm10.5-3a3 3 0 100-6 3 3 0 000 6z" }) }) })), _jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("button", { type: "button", onClick: () => coverInputRef.current?.click(), disabled: uploadingCover, className: "text-xs text-zinc-400 hover:text-white border border-[#1C1C1F] rounded-lg px-3 py-1.5 hover:bg-[#202024] transition-colors disabled:opacity-50 font-medium", children: uploadingCover ? 'Загружаю…' : form.coverUrl ? 'Заменить' : 'Загрузить обложку' }), form.coverUrl && _jsx("button", { type: "button", onClick: () => setForm(p => ({ ...p, coverUrl: null })), className: "text-xs text-zinc-500 hover:text-red-400 transition-colors font-medium", children: "\u0423\u0431\u0440\u0430\u0442\u044C" })] }), _jsx("input", { ref: coverInputRef, type: "file", accept: "image/*", className: "hidden", onChange: e => { const f = e.target.files?.[0]; if (f)
                                                void handleCoverFile(f); } })] }) }), _jsxs("div", { className: "flex gap-6 pt-1", children: [_jsx(Toggle, { label: "\u041A\u0430\u0437\u0430\u0445\u0441\u043A\u0438\u0439 \u0430\u0440\u0442\u0438\u0441\u0442 (KZ)", checked: form.isLocal, onChange: v => setForm(p => ({ ...p, isLocal: v })) }), _jsx(Toggle, { label: "\u041E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u0442\u044C \u0441\u0440\u0430\u0437\u0443", checked: form.isPublished, onChange: v => setForm(p => ({ ...p, isPublished: v })) })] })] }), createError && (_jsx("div", { className: "bg-red-900/20 border border-red-800/40 rounded-lg px-4 py-3 text-red-400 text-sm", children: createError })), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { type: "submit", disabled: creating, className: "flex-1 py-2.5 bg-accent text-black font-semibold text-sm rounded-md hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors", children: creating ? 'Создаю…' : 'Создать трек' }), _jsx("button", { type: "button", onClick: handleReset, className: "px-4 py-2.5 text-zinc-400 hover:text-white text-sm border border-border-default rounded-md hover:bg-white/5 transition-colors", children: "\u0421\u0431\u0440\u043E\u0441" })] })] }))] }));
}
// ─── Batch ingestion ──────────────────────────────────────────────────────────
function BatchIngestion() {
    const [files, setFiles] = useState([]);
    const [running, setRunning] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef(null);
    const abortRef = useRef(false);
    const doneCount = files.filter(f => f.status === 'done').length;
    const errorCount = files.filter(f => f.status === 'error').length;
    const pendingCount = files.filter(f => f.status === 'pending').length;
    const uploadingCount = files.filter(f => f.status === 'uploading').length;
    const totalCount = files.length;
    const finishedCount = doneCount + errorCount;
    const AUDIO_EXTS = new Set(['mp3', 'flac', 'aac', 'ogg', 'opus', 'wav', 'wave', 'ape', 'wma', 'm4a', 'alac', 'aiff', 'aif', 'dsf', 'dsd']);
    function addFiles(newFiles) {
        const arr = Array.from(newFiles).filter(f => {
            const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
            return f.type.startsWith('audio/') || AUDIO_EXTS.has(ext);
        });
        setFiles(prev => [
            ...prev,
            ...arr.map(f => ({ id: crypto.randomUUID(), file: f, status: 'pending' })),
        ]);
    }
    function onDrop(e) {
        e.preventDefault();
        setIsDragOver(false);
        addFiles(e.dataTransfer.files);
    }
    function onInputChange(e) {
        if (e.target.files)
            addFiles(e.target.files);
    }
    function removeFile(id) {
        setFiles(prev => prev.filter(f => f.id !== id));
    }
    function clearAll() {
        setFiles([]);
        if (fileInputRef.current)
            fileInputRef.current.value = '';
    }
    async function startBatch() {
        if (running)
            return;
        abortRef.current = false;
        setRunning(true);
        // Collect pending items
        const queue = files.filter(f => f.status === 'pending').map(f => f.id);
        let idx = 0;
        async function processOne(id) {
            if (abortRef.current)
                return;
            setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'uploading' } : f));
            try {
                const batchFile = files.find(f => f.id === id);
                if (!batchFile)
                    return;
                const result = await autoIngestFile(batchFile.file);
                setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'done', result } : f));
            }
            catch (err) {
                const error = err instanceof Error ? err.message : 'Ошибка загрузки';
                setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'error', error } : f));
            }
        }
        // Sliding window concurrency
        const active = new Set();
        while (idx < queue.length && !abortRef.current) {
            const id = queue[idx++];
            const p = processOne(id).finally(() => active.delete(p));
            active.add(p);
            if (active.size >= BATCH_CONCURRENCY) {
                await Promise.race(active);
            }
        }
        await Promise.all(active);
        setRunning(false);
    }
    function stopBatch() {
        abortRef.current = true;
        setRunning(false);
    }
    const allDone = totalCount > 0 && pendingCount === 0 && uploadingCount === 0 && !running;
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { onDragOver: e => { e.preventDefault(); setIsDragOver(true); }, onDragLeave: () => setIsDragOver(false), onDrop: onDrop, onClick: () => !running && fileInputRef.current?.click(), className: `border-2 border-dashed rounded-xl p-8 text-center transition-colors ${running ? 'cursor-default opacity-60' : 'cursor-pointer'} ${isDragOver ? 'border-accent bg-accent/5' : files.length > 0 ? 'border-zinc-600 bg-zinc-900/50' : 'border-border-default hover:border-zinc-600 bg-surface'}`, children: [_jsx("input", { ref: fileInputRef, type: "file", accept: "audio/*,.mp3,.flac,.aac,.ogg,.opus,.wav,.ape,.wma,.m4a,.aiff,.alac,.dsf", multiple: true, className: "hidden", onChange: onInputChange, disabled: running }), files.length === 0 ? (_jsxs("div", { className: "space-y-3", children: [_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.2, stroke: "currentColor", className: "w-10 h-10 text-zinc-600 mx-auto", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" }) }), _jsx("p", { className: "text-zinc-300 text-sm font-medium", children: "\u041F\u0435\u0440\u0435\u0442\u0430\u0449\u0438 \u0432\u0441\u0435 MP3 \u0441\u044E\u0434\u0430 \u0438\u043B\u0438 \u043A\u043B\u0438\u043A\u043D\u0438 \u0434\u043B\u044F \u0432\u044B\u0431\u043E\u0440\u0430" }), _jsx("p", { className: "text-zinc-600 text-xs", children: "\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u0438\u0445 \u0444\u0430\u0439\u043B\u043E\u0432 \u00B7 MP3, FLAC, AAC \u00B7 \u0434\u043E 50 MB \u043A\u0430\u0436\u0434\u044B\u0439" }), _jsx("p", { className: "text-zinc-700 text-xs mt-2", children: "\u0422\u0435\u0433\u0438 (\u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435, \u0430\u0440\u0442\u0438\u0441\u0442, \u0436\u0430\u043D\u0440, \u043E\u0431\u043B\u043E\u0436\u043A\u0430) \u0438\u0437\u0432\u043B\u0435\u043A\u0443\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438" })] })) : (_jsxs("div", { className: "space-y-1", children: [_jsxs("p", { className: "text-white text-sm font-medium", children: [totalCount, " \u0444\u0430\u0439\u043B", totalCount === 1 ? '' : totalCount < 5 ? 'а' : 'ов', " \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E"] }), _jsx("p", { className: "text-zinc-500 text-xs", children: running ? 'Кликни для добавления ещё' : 'Кликни для добавления ещё файлов' })] }))] }), totalCount > 0 && (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-zinc-500", children: [_jsxs("span", { children: [finishedCount, " / ", totalCount, " \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u043E"] }), _jsxs("div", { className: "flex gap-3", children: [doneCount > 0 && _jsxs("span", { className: "text-green-400", children: [doneCount, " \u043E\u043A"] }), errorCount > 0 && _jsxs("span", { className: "text-red-400", children: [errorCount, " \u043E\u0448\u0438\u0431\u043E\u043A"] }), uploadingCount > 0 && _jsxs("span", { className: "text-accent", children: [uploadingCount, " \u0437\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u0442\u0441\u044F"] }), pendingCount > 0 && _jsxs("span", { className: "text-zinc-600", children: [pendingCount, " \u043E\u0436\u0438\u0434\u0430\u0435\u0442"] })] })] }), _jsx("div", { className: "w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden", children: _jsx("div", { className: "h-full bg-accent rounded-full transition-all duration-300", style: { width: totalCount > 0 ? `${(finishedCount / totalCount) * 100}%` : '0%' } }) })] })), totalCount > 0 && (_jsxs("div", { className: "flex gap-3", children: [!allDone && (running ? (_jsx("button", { onClick: stopBatch, className: "flex-1 py-2.5 bg-red-600 text-white font-semibold text-sm rounded-md hover:bg-red-500 transition-colors", children: "\u041E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C" })) : (_jsx("button", { onClick: () => void startBatch(), disabled: pendingCount === 0, className: "flex-1 py-2.5 bg-accent text-black font-semibold text-sm rounded-md hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors", children: pendingCount > 0 ? `Загрузить ${pendingCount} файл${pendingCount === 1 ? '' : pendingCount < 5 ? 'а' : 'ов'}` : 'Все загружены' }))), allDone && (_jsxs("div", { className: "flex-1 py-2.5 bg-green-900/30 border border-green-700/40 text-green-400 font-semibold text-sm rounded-md text-center", children: ["\u0413\u043E\u0442\u043E\u0432\u043E! ", doneCount, " \u0442\u0440\u0435\u043A", doneCount === 1 ? '' : doneCount < 5 ? 'а' : 'ов', " \u0441\u043E\u0437\u0434\u0430\u043D\u043E"] })), _jsx("button", { onClick: clearAll, disabled: running, className: "px-4 py-2.5 text-zinc-400 hover:text-white text-sm border border-border-default rounded-md hover:bg-white/5 transition-colors disabled:opacity-50", children: "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C" })] })), files.length > 0 && (_jsx("div", { className: "bg-surface border border-border-default rounded-xl overflow-hidden", children: _jsx("div", { className: "max-h-96 overflow-y-auto divide-y divide-border-default", children: files.map(item => (_jsx(BatchRow, { item: item, onRemove: () => removeFile(item.id), canRemove: !running || item.status === 'pending' }, item.id))) }) }))] }));
}
function BatchRow({ item, onRemove, canRemove, }) {
    return (_jsxs("div", { className: "flex items-center gap-3 px-4 py-3", children: [_jsxs("div", { className: "w-5 flex-shrink-0 flex items-center justify-center", children: [item.status === 'pending' && _jsx("span", { className: "w-2 h-2 rounded-full bg-zinc-600 block" }), item.status === 'uploading' && _jsx("div", { className: "w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" }), item.status === 'done' && (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 2.5, stroke: "currentColor", className: "w-4 h-4 text-green-400", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M4.5 12.75l6 6 9-13.5" }) })), item.status === 'error' && (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 2.5, stroke: "currentColor", className: "w-4 h-4 text-red-400", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M6 18L18 6M6 6l12 12" }) }))] }), _jsx("div", { className: "flex-1 min-w-0", children: item.status === 'done' && item.result ? (_jsxs("div", { children: [_jsx("p", { className: "text-white text-sm truncate", children: item.result.trackTitle }), _jsx("p", { className: "text-zinc-500 text-xs truncate", children: item.result.artistName })] })) : (_jsxs("div", { children: [_jsx("p", { className: `text-sm truncate ${item.status === 'error' ? 'text-red-300' : 'text-zinc-300'}`, children: item.file.name }), item.status === 'error' && item.error && (_jsx("p", { className: "text-red-500 text-xs truncate", children: item.error })), item.status === 'uploading' && (_jsx("p", { className: "text-zinc-600 text-xs", children: "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u0442\u0441\u044F\u2026" })), item.status === 'pending' && (_jsxs("p", { className: "text-zinc-700 text-xs", children: [(item.file.size / 1024 / 1024).toFixed(1), " MB"] }))] })) }), canRemove && (_jsx("button", { onClick: onRemove, className: "text-zinc-700 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0", children: "\u00D7" }))] }));
}
// ─── Sub-components ───────────────────────────────────────────────────────────
function Field({ label, children }) {
    return (_jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { className: "block text-xs text-zinc-500 font-medium", children: label }), children] }));
}
function Toggle({ label, checked, onChange }) {
    return (_jsxs("label", { className: "flex items-center gap-2.5 cursor-pointer select-none", children: [_jsx("button", { type: "button", onClick: () => onChange(!checked), className: `relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-white' : 'bg-[#202024]'}`, children: _jsx("span", { className: `absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${checked ? 'translate-x-4 bg-black' : 'translate-x-0 bg-zinc-500'}` }) }), _jsx("span", { className: "text-sm text-zinc-400 font-medium", children: label })] }));
}
