import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '../../lib/api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useToastContext } from '../../lib/toastContext';
function formatDuration(ms) {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
}
function playbackBadgeVariant(status) {
    switch (status) {
        case 'PLAYABLE': return 'green';
        case 'PROCESSING': return 'yellow';
        case 'BLOCKED': return 'red';
        case 'REMOVED': return 'gray';
    }
}
function InlineEdit({ value, onSave, placeholder, className }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const [saving, setSaving] = useState(false);
    const inputRef = useRef(null);
    useEffect(() => { if (editing)
        inputRef.current?.focus(); }, [editing]);
    async function save() {
        if (draft.trim() === value) {
            setEditing(false);
            return;
        }
        setSaving(true);
        try {
            await onSave(draft.trim());
            setEditing(false);
        }
        finally {
            setSaving(false);
        }
    }
    function cancel() { setDraft(value); setEditing(false); }
    if (editing) {
        return (_jsxs("span", { className: "inline-flex items-center gap-2", children: [_jsx("input", { ref: inputRef, value: draft, onChange: e => setDraft(e.target.value), onKeyDown: e => { if (e.key === 'Enter')
                        void save(); if (e.key === 'Escape')
                        cancel(); }, placeholder: placeholder, disabled: saving, className: `bg-surface-2 border border-accent rounded px-2 py-0.5 text-white focus:outline-none text-sm ${className ?? ''}`, style: { minWidth: '180px' } }), _jsx("button", { onClick: () => void save(), disabled: saving, className: "text-accent text-xs hover:opacity-80 disabled:opacity-50", children: saving ? '...' : '✓' }), _jsx("button", { onClick: cancel, className: "text-zinc-500 text-xs hover:text-white", children: "\u2715" })] }));
    }
    return (_jsxs("span", { className: `group inline-flex items-center gap-1.5 cursor-pointer hover:text-accent transition-colors ${className ?? ''}`, onClick: () => { setDraft(value); setEditing(true); }, title: "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0447\u0442\u043E\u0431\u044B \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C", children: [value || _jsx("span", { className: "text-zinc-600", children: placeholder ?? '—' }), _jsx("span", { className: "opacity-0 group-hover:opacity-100 text-zinc-500 transition-opacity", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-3.5 h-3.5", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.83 20.013a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" }) }) })] }));
}
// ── Skeleton ──────────────────────────────────────────────────────────────────
function DetailSkeleton() {
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "bg-surface border border-border-default rounded-xl p-6", children: _jsxs("div", { className: "flex gap-6", children: [_jsx("div", { className: "w-32 h-32 rounded-lg bg-surface-2 animate-pulse shrink-0" }), _jsxs("div", { className: "space-y-3 flex-1", children: [_jsx("div", { className: "h-6 w-64 bg-surface-2 rounded animate-pulse" }), _jsx("div", { className: "h-4 w-40 bg-surface-2 rounded animate-pulse" }), _jsx("div", { className: "h-4 w-32 bg-surface-2 rounded animate-pulse" }), _jsxs("div", { className: "flex gap-2 mt-4", children: [_jsx("div", { className: "h-8 w-28 bg-surface-2 rounded animate-pulse" }), _jsx("div", { className: "h-8 w-28 bg-surface-2 rounded animate-pulse" })] })] })] }) }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [1, 2].map(i => (_jsxs("div", { className: "bg-surface border border-border-default rounded-xl p-6", children: [_jsx("div", { className: "h-4 w-32 bg-surface-2 rounded animate-pulse mb-4" }), _jsx("div", { className: "space-y-3", children: [1, 2, 3].map(j => (_jsxs("div", { className: "flex justify-between", children: [_jsx("div", { className: "h-3.5 w-24 bg-surface-2 rounded animate-pulse" }), _jsx("div", { className: "h-3.5 w-32 bg-surface-2 rounded animate-pulse" })] }, j))) })] }, i))) })] }));
}
function Section({ title, children }) {
    return (_jsxs("div", { className: "bg-[#141416] rounded-2xl p-6 shadow-sm border border-[#1C1C1F]/30", children: [_jsx("h2", { className: "text-zinc-500 text-[10px] uppercase tracking-widest font-semibold mb-4", children: title }), children] }));
}
function Field({ label, value }) {
    return (_jsxs("div", { className: "flex items-start justify-between gap-4 py-3 border-b border-[#1C1C1F]/50 last:border-0", children: [_jsx("span", { className: "text-zinc-500 text-sm shrink-0", children: label }), _jsx("span", { className: "text-white text-sm text-right font-medium", children: value ?? _jsx("span", { className: "text-zinc-700", children: "\u2014" }) })] }));
}
// ── Main component ────────────────────────────────────────────────────────────
export function CatalogDetail() {
    const { id } = useParams();
    const { addToast } = useToastContext();
    const queryClient = useQueryClient();
    const [localPublished, setLocalPublished] = useState(null);
    const [localPlayback, setLocalPlayback] = useState(null);
    const [localTitle, setLocalTitle] = useState(null);
    const [localGenre, setLocalGenre] = useState(undefined);
    const [localIsLocal, setLocalIsLocal] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [playbackSelectOpen, setPlaybackSelectOpen] = useState(false);
    const { data: track, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['catalog', 'track', id],
        queryFn: () => adminFetch(`/api/admin/catalog/tracks/${id ?? ''}`),
        enabled: !!id,
        staleTime: 30000,
    });
    const effectivePublished = localPublished ?? track?.isPublished ?? false;
    const effectivePlayback = localPlayback ?? track?.playbackStatus ?? 'PROCESSING';
    const effectiveTitle = localTitle ?? track?.title ?? '';
    const effectiveGenre = localGenre !== undefined ? localGenre : (track?.genre ?? null);
    const effectiveIsLocal = localIsLocal ?? track?.isLocal ?? false;
    async function patch(fields) {
        await adminFetch(`/api/admin/catalog/tracks/${id ?? ''}`, {
            method: 'PATCH',
            body: JSON.stringify(fields),
        });
        void queryClient.invalidateQueries({ queryKey: ['catalog', 'track', id] });
        void queryClient.invalidateQueries({ queryKey: ['admin', 'tracks'] });
    }
    async function handleTogglePublished() {
        if (!track)
            return;
        const next = !effectivePublished;
        if (!window.confirm(`Вы хотите ${next ? 'опубликовать' : 'снять с публикации'} трек "${effectiveTitle}"?`))
            return;
        setActionLoading('publish');
        setLocalPublished(next);
        try {
            await patch({ isPublished: next });
            addToast(`Трек ${next ? 'опубликован' : 'снят с публикации'}`, 'success');
        }
        catch (err) {
            setLocalPublished(track.isPublished);
            addToast(err instanceof Error ? err.message : 'Ошибка', 'error');
        }
        finally {
            setActionLoading(null);
        }
    }
    async function handleSetPlayback(next) {
        if (!track)
            return;
        setPlaybackSelectOpen(false);
        if (next === effectivePlayback)
            return;
        setActionLoading('playback');
        setLocalPlayback(next);
        try {
            await patch({ playbackStatus: next });
            addToast(`Playback → ${next}`, 'success');
        }
        catch (err) {
            setLocalPlayback(track.playbackStatus);
            addToast(err instanceof Error ? err.message : 'Ошибка', 'error');
        }
        finally {
            setActionLoading(null);
        }
    }
    async function handleSaveTitle(val) {
        if (!val) {
            addToast('Название не может быть пустым', 'error');
            return;
        }
        const prev = effectiveTitle;
        setLocalTitle(val);
        try {
            await patch({ title: val });
            addToast('Название сохранено', 'success');
        }
        catch (err) {
            setLocalTitle(prev);
            addToast(err instanceof Error ? err.message : 'Ошибка', 'error');
        }
    }
    async function handleSaveGenre(val) {
        const prev = effectiveGenre;
        const next = val.trim() || null;
        setLocalGenre(next);
        try {
            await patch({ genre: next });
            addToast('Жанр сохранён', 'success');
        }
        catch (err) {
            setLocalGenre(prev);
            addToast(err instanceof Error ? err.message : 'Ошибка', 'error');
        }
    }
    async function handleToggleIsLocal() {
        if (!track)
            return;
        const next = !effectiveIsLocal;
        setLocalIsLocal(next);
        try {
            await patch({ isLocal: next });
            addToast(`Локальный: ${next ? 'Да (KZ)' : 'Нет'}`, 'success');
        }
        catch (err) {
            setLocalIsLocal(track.isLocal);
            addToast(err instanceof Error ? err.message : 'Ошибка', 'error');
        }
    }
    if (isLoading)
        return _jsx(DetailSkeleton, {});
    if (isError || !track) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center py-20 gap-4", children: [_jsx("p", { className: "text-red-400 text-sm", children: isError ? (error instanceof Error ? error.message : 'Ошибка загрузки трека') : 'Трек не найден' }), _jsxs("div", { className: "flex gap-3", children: [_jsx(Button, { variant: "secondary", onClick: () => void refetch(), children: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C" }), _jsx(Link, { to: "/catalog", children: _jsxs(Button, { variant: "ghost", className: "flex items-center gap-1.5", children: [_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-4 h-4", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" }) }), "\u041D\u0430\u0437\u0430\u0434"] }) })] })] }));
    }
    const artistNames = track.artists.map(a => a.name).join(', ');
    const PLAYBACK_STATUSES = ['PLAYABLE', 'PROCESSING', 'BLOCKED', 'REMOVED'];
    return (_jsxs("div", { className: "space-y-4 max-w-4xl", children: [_jsxs(Link, { to: "/catalog", className: "inline-flex items-center gap-2 text-zinc-500 text-sm hover:text-white transition-colors", children: [_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-4 h-4", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" }) }), "\u041A\u0430\u0442\u0430\u043B\u043E\u0433 \u0442\u0440\u0435\u043A\u043E\u0432"] }), _jsx("div", { className: "bg-[#141416] rounded-2xl p-6 border border-[#1C1C1F]/40 shadow-lg", children: _jsxs("div", { className: "flex gap-6 items-start", children: [track.coverUrl ? (_jsx("img", { src: track.coverUrl, alt: effectiveTitle, className: "w-32 h-32 rounded-xl object-cover shrink-0 shadow-lg" })) : (_jsx("div", { className: "w-32 h-32 rounded-xl bg-[#202024] flex items-center justify-center shrink-0", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-8 h-8 text-zinc-600", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 9l10.5-3m0 0v15m0-15l-10.5 3M9 9V21m0-12a3 3 0 100-6 3 3 0 000 6zm10.5-3a3 3 0 100-6 3 3 0 000 6z" }) }) })), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h1", { className: "text-white text-2xl font-bold leading-tight", children: _jsx(InlineEdit, { value: effectiveTitle, onSave: handleSaveTitle, placeholder: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0442\u0440\u0435\u043A\u0430", className: "text-2xl font-bold" }) }), _jsx("p", { className: "text-zinc-400 mt-1", children: artistNames || '—' }), _jsx("p", { className: "text-zinc-600 text-sm mt-0.5", children: formatDuration(track.durationMs) }), _jsxs("div", { className: "flex flex-wrap gap-2 mt-3", children: [_jsx(Badge, { label: effectivePublished ? 'Опубликован' : 'Черновик', variant: effectivePublished ? 'green' : 'gray' }), _jsx(Badge, { label: effectivePlayback, variant: playbackBadgeVariant(effectivePlayback) }), effectiveIsLocal && _jsx(Badge, { label: "KZ", variant: "blue" }), track.tagStatus && (_jsx(Badge, { label: track.tagStatus, variant: track.tagStatus === 'VERIFIED' ? 'green' : track.tagStatus === 'PENDING' ? 'yellow' : 'red' }))] }), _jsxs("div", { className: "flex flex-wrap gap-2 mt-4", children: [_jsx(Button, { variant: effectivePublished ? 'secondary' : 'primary', onClick: () => void handleTogglePublished(), loading: actionLoading === 'publish', children: effectivePublished ? 'Снять с публикации' : 'Опубликовать' }), _jsxs("div", { className: "relative", children: [_jsxs(Button, { variant: "secondary", loading: actionLoading === 'playback', onClick: () => setPlaybackSelectOpen(o => !o), className: "flex items-center gap-1.5", children: ["Playback: ", effectivePlayback, _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-3.5 h-3.5 text-zinc-500", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M19.5 8.25l-7.5 7.5-7.5-7.5" }) })] }), playbackSelectOpen && (_jsx("div", { className: "absolute top-full left-0 mt-1.5 z-20 bg-[#141416] border border-[#1C1C1F] rounded-lg overflow-hidden shadow-xl min-w-[160px]", children: PLAYBACK_STATUSES.map(s => (_jsx("button", { onClick: () => void handleSetPlayback(s), className: `w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[#202024] ${s === effectivePlayback ? 'text-white font-medium bg-[#202024]/40' : 'text-zinc-400'}`, children: s }, s))) }))] })] })] })] }) }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs(Section, { title: "\u041E\u0441\u043D\u043E\u0432\u043D\u043E\u0435", children: [_jsx(Field, { label: "ID", value: _jsx("code", { className: "text-xs text-zinc-400 font-mono", children: track.id }) }), _jsx(Field, { label: "\u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C", value: formatDuration(track.durationMs) }), _jsx(Field, { label: "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A", value: track.sourcePolicy || '—' }), _jsxs("div", { className: "flex items-start justify-between gap-4 py-3 border-b border-[#1C1C1F]/50", children: [_jsx("span", { className: "text-zinc-500 text-sm shrink-0", children: "\u0416\u0430\u043D\u0440" }), _jsx("span", { className: "text-white text-sm text-right font-medium", children: _jsx(InlineEdit, { value: effectiveGenre ?? '', onSave: handleSaveGenre, placeholder: "\u0416\u0430\u043D\u0440..." }) })] }), _jsxs("div", { className: "flex items-center justify-between gap-4 py-3 border-b border-[#1C1C1F]/50", children: [_jsx("span", { className: "text-zinc-500 text-sm shrink-0", children: "\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 (KZ)" }), _jsx("button", { onClick: () => void handleToggleIsLocal(), className: `relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${effectiveIsLocal ? 'bg-white' : 'bg-[#202024]'}`, children: _jsx("span", { className: `inline-block h-3.5 w-3.5 transform rounded-full transition-transform ${effectiveIsLocal ? 'translate-x-4 bg-black' : 'translate-x-1 bg-zinc-500'}` }) })] }), _jsx(Field, { label: "Offline", value: track.offlineEligible ? 'Да' : 'Нет' }), track.release && (_jsx(Field, { label: "\u0420\u0435\u043B\u0438\u0437", value: _jsx(Link, { to: "/releases", className: "text-accent hover:underline", children: track.release.title }) }))] }), _jsx(Section, { title: "Transparency", children: track.transparency ? (_jsxs(_Fragment, { children: [_jsx(Field, { label: "\u041F\u0440\u0438\u0447\u0438\u043D\u0430 \u0432\u0438\u0434\u0438\u043C\u043E\u0441\u0442\u0438", value: track.transparency.visibilityReason ?? _jsx("span", { className: "text-zinc-700", children: "\u2014" }) }), _jsx(Field, { label: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E", value: track.transparency.lastConfirmedAt
                                        ? new Date(track.transparency.lastConfirmedAt).toLocaleString('ru-RU')
                                        : _jsx("span", { className: "text-zinc-700", children: "\u2014" }) }), _jsx(Field, { label: "Source ID", value: track.transparency.sourceId
                                        ? _jsx("code", { className: "text-xs text-zinc-400 font-mono", children: track.transparency.sourceId })
                                        : _jsx("span", { className: "text-zinc-700", children: "\u2014" }) })] })) : (_jsx("p", { className: "text-zinc-600 text-sm py-2", children: "\u0414\u0430\u043D\u043D\u044B\u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B" })) }), _jsx(Section, { title: "Availability", children: track.availability?.territories && track.availability.territories.length > 0 ? (_jsx("div", { className: "space-y-1", children: track.availability.territories.map(t => (_jsxs("div", { className: "flex items-center justify-between py-1.5 border-b border-border-default last:border-0", children: [_jsx("span", { className: "text-zinc-400 text-sm font-mono", children: t.code }), _jsx(Badge, { label: t.status, variant: t.status === 'AVAILABLE' ? 'green' : t.status === 'BLOCKED' ? 'red' : 'gray' })] }, t.code))) })) : (_jsx("p", { className: "text-zinc-600 text-sm py-2", children: "\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u043E \u0442\u0435\u0440\u0440\u0438\u0442\u043E\u0440\u0438\u044F\u0445" })) }), track.artists.length > 0 && (_jsx(Section, { title: "\u0410\u0440\u0442\u0438\u0441\u0442\u044B", children: track.artists.map(artist => (_jsxs("div", { className: "flex items-center justify-between py-2.5 border-b border-border-default last:border-0", children: [_jsx("span", { className: "text-white text-sm", children: artist.name }), _jsx("code", { className: "text-zinc-600 text-xs font-mono", children: artist.slug })] }, artist.id))) }))] })] }));
}
