import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '../../lib/api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useToastContext } from '../../lib/toastContext';
const RELEASE_TYPE_LABELS = {
    ALBUM: 'Альбом', SINGLE: 'Сингл', EP: 'EP', COMPILATION: 'Сборник',
};
function formatMs(ms) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function formatPlays(n) {
    if (n >= 1000000)
        return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000)
        return `${(n / 1000).toFixed(1)}K`;
    return String(n);
}
function InlineEdit({ value, onSave, placeholder, multiline }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const [saving, setSaving] = useState(false);
    const ref = useRef(null);
    useEffect(() => { if (editing)
        ref.current?.focus(); }, [editing]);
    async function save() {
        if (draft === value) {
            setEditing(false);
            return;
        }
        setSaving(true);
        try {
            await onSave(draft);
            setEditing(false);
        }
        finally {
            setSaving(false);
        }
    }
    function cancel() { setDraft(value); setEditing(false); }
    if (editing) {
        const cls = 'bg-[#202024] border border-[#1C1C1F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent w-full transition-colors';
        return (_jsxs("span", { className: "flex flex-col gap-1.5", children: [multiline
                    ? _jsx("textarea", { ref: ref, value: draft, onChange: e => setDraft(e.target.value), disabled: saving, rows: 4, placeholder: placeholder, className: cls })
                    : _jsx("input", { ref: ref, value: draft, onChange: e => setDraft(e.target.value), onKeyDown: e => { if (e.key === 'Enter')
                            void save(); if (e.key === 'Escape')
                            cancel(); }, disabled: saving, placeholder: placeholder, className: cls }), _jsxs("span", { className: "flex gap-2", children: [_jsx("button", { onClick: () => void save(), disabled: saving, className: "text-white hover:text-[#D4D1CA] text-xs font-medium disabled:opacity-50", children: saving ? 'Сохранение...' : 'Сохранить' }), _jsx("button", { onClick: cancel, className: "text-zinc-500 text-xs hover:text-white transition-colors", children: "\u041E\u0442\u043C\u0435\u043D\u0430" })] })] }));
    }
    return (_jsxs("span", { className: "group inline-flex items-start gap-1.5 cursor-pointer hover:text-accent transition-colors", onClick: () => { setDraft(value); setEditing(true); }, title: "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0447\u0442\u043E\u0431\u044B \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C", children: [value || _jsx("span", { className: "text-zinc-600 italic", children: placeholder ?? '—' }), _jsx("span", { className: "opacity-0 group-hover:opacity-100 text-zinc-500 transition-opacity shrink-0", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-3.5 h-3.5 mt-0.5", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.83 20.013a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" }) }) })] }));
}
function Toggle({ value, onChange, label }) {
    return (_jsxs("div", { className: "flex items-center justify-between gap-4 py-3 border-b border-[#1C1C1F]/40 last:border-0", children: [_jsx("span", { className: "text-zinc-500 text-sm", children: label }), _jsx("button", { onClick: onChange, className: `relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? 'bg-white' : 'bg-[#202024]'}`, children: _jsx("span", { className: `inline-block h-3.5 w-3.5 transform rounded-full transition-transform ${value ? 'translate-x-4 bg-black' : 'translate-x-1 bg-zinc-500'}` }) })] }));
}
// ── Expandable release row ────────────────────────────────────────────────────
function ReleaseRow({ release }) {
    const [open, setOpen] = useState(false);
    const totalMs = release.tracks.reduce((s, t) => s + t.durationMs, 0);
    return (_jsxs("div", { className: "border border-[#1C1C1F]/50 rounded-xl overflow-hidden bg-[#101012]", children: [_jsxs("button", { className: "w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#202024]/40 transition-colors text-left", onClick: () => setOpen(v => !v), children: [release.coverAssetUrl
                        ? _jsx("img", { src: release.coverAssetUrl, className: "w-10 h-10 rounded-lg object-cover shrink-0", alt: "" })
                        : _jsx("div", { className: "w-10 h-10 rounded-lg bg-[#202024] flex items-center justify-center shrink-0 border border-[#1C1C1F]", children: _jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-5 h-5 text-zinc-600", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("circle", { cx: "12", cy: "12", r: "3" })] }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-white text-sm font-medium truncate", children: release.title }), _jsxs("p", { className: "text-zinc-500 text-xs", children: [RELEASE_TYPE_LABELS[release.releaseType] ?? release.releaseType, release.releaseDate ? ` · ${new Date(release.releaseDate).getFullYear()}` : '', ` · ${release.tracks.length} тр. · ${formatMs(totalMs)}`] })] }), _jsxs(Link, { to: `/releases/${release.id}`, className: "text-zinc-500 hover:text-[#D4D1CA] text-xs font-medium px-2 py-1 rounded transition-colors flex items-center gap-1 shrink-0", onClick: e => e.stopPropagation(), children: ["\u041E\u0442\u043A\u0440\u044B\u0442\u044C", _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-3.5 h-3.5", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" }) })] }), _jsx("span", { className: "text-zinc-500 shrink-0 ml-1", children: open ? (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-4 h-4", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M4.5 15.75l7.5-7.5 7.5 7.5" }) })) : (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-4 h-4", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M19.5 8.25l-7.5 7.5-7.5-7.5" }) })) })] }), open && (_jsxs("div", { className: "border-t border-[#1C1C1F] divide-y divide-[#1C1C1F]/60 bg-[#141416]/20", children: [release.tracks.length === 0 && (_jsx("p", { className: "text-zinc-500 text-xs text-center py-3", children: "\u041D\u0435\u0442 \u0442\u0440\u0435\u043A\u043E\u0432" })), release.tracks.map((track, idx) => (_jsxs("div", { className: "flex items-center gap-3 px-4 py-3 hover:bg-[#202024]/30 transition-colors", children: [_jsx("span", { className: "text-zinc-600 text-xs w-5 text-right shrink-0", children: idx + 1 }), track.coverUrl
                                ? _jsx("img", { src: track.coverUrl, className: "w-8 h-8 rounded-lg object-cover shrink-0", alt: "" })
                                : _jsx("div", { className: "w-8 h-8 rounded bg-[#202024] flex items-center justify-center shrink-0", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-3.5 h-3.5 text-zinc-700", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 9l10.5-3m0 0v15m0-15l-10.5 3M9 9V21m0-12a3 3 0 100-6 3 3 0 000 6zm10.5-3a3 3 0 100-6 3 3 0 000 6z" }) }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-white text-sm truncate", children: track.title }), _jsx("p", { className: "text-zinc-500 text-xs", children: track.artists.map(a => a.name).join(', ') })] }), _jsxs("div", { className: "flex items-center gap-3 shrink-0 text-right", children: [_jsx("span", { className: `text-[10px] px-2 py-0.5 rounded-full font-medium ${track.playbackStatus === 'PLAYABLE' ? 'bg-green-950/30 text-green-300' :
                                            track.playbackStatus === 'PROCESSING' ? 'bg-yellow-950/30 text-yellow-300' :
                                                'bg-red-950/30 text-red-300'}`, children: track.playbackStatus === 'PLAYABLE' ? '● Воспр.' :
                                            track.playbackStatus === 'PROCESSING' ? '⏳ Обраб.' : '✕ Заблок.' }), _jsx("span", { className: "text-zinc-500 text-xs font-mono", children: formatMs(track.durationMs) }), track.isLocal && _jsx(Badge, { label: "KZ", variant: "blue" })] })] }, track.id)))] }))] }));
}
function Skeleton() {
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "bg-[#141416] border border-[#1C1C1F]/40 rounded-2xl p-6 animate-pulse", children: _jsxs("div", { className: "flex gap-5", children: [_jsx("div", { className: "w-24 h-24 rounded-full bg-[#202024] shrink-0" }), _jsxs("div", { className: "flex-1 space-y-2", children: [_jsx("div", { className: "h-6 w-48 bg-[#202024] rounded" }), _jsx("div", { className: "h-4 w-32 bg-[#202024] rounded" }), _jsx("div", { className: "flex gap-2 mt-3", children: [1, 2, 3].map(i => _jsx("div", { className: "h-5 w-16 bg-[#202024] rounded" }, i)) })] })] }) }), _jsx("div", { className: "grid grid-cols-4 gap-3", children: [1, 2, 3, 4].map(i => _jsx("div", { className: "h-20 bg-[#141416] border border-[#1C1C1F]/40 rounded-xl animate-pulse" }, i)) })] }));
}
// ── Main ──────────────────────────────────────────────────────────────────────
export function ArtistDetail() {
    const { id } = useParams();
    const { addToast } = useToastContext();
    const queryClient = useQueryClient();
    const [local, setLocal] = useState({});
    const { data: artist, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['admin', 'artist', id],
        queryFn: () => adminFetch(`/api/admin/catalog/artists/${id ?? ''}`),
        enabled: !!id,
        staleTime: 30000,
    });
    const { data: stats } = useQuery({
        queryKey: ['admin', 'artist-stats', id],
        queryFn: () => adminFetch(`/api/v1/catalog/artists/${id ?? ''}/stats`),
        enabled: !!id,
        staleTime: 60000,
    });
    async function patch(fields) {
        try {
            await adminFetch(`/api/admin/catalog/artists/${id ?? ''}`, {
                method: 'PATCH',
                body: JSON.stringify(fields),
            });
            setLocal(prev => ({ ...prev, ...fields }));
            void queryClient.invalidateQueries({ queryKey: ['admin', 'artist', id] });
            void queryClient.invalidateQueries({ queryKey: ['admin', 'artists'] });
        }
        catch (err) {
            addToast(err instanceof Error ? err.message : 'Ошибка', 'error');
            throw err;
        }
    }
    if (isLoading)
        return _jsx(Skeleton, {});
    if (isError || !artist) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center py-20 gap-4", children: [_jsx("p", { className: "text-red-400 text-sm", children: isError ? (error instanceof Error ? error.message : 'Ошибка') : 'Артист не найден' }), _jsxs("div", { className: "flex gap-3", children: [_jsx(Button, { variant: "secondary", onClick: () => void refetch(), children: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C" }), _jsx(Link, { to: "/artists", children: _jsxs(Button, { variant: "ghost", className: "flex items-center gap-1.5", children: [_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-4 h-4", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" }) }), "\u041D\u0430\u0437\u0430\u0434"] }) })] })] }));
    }
    const a = { ...artist, ...local };
    return (_jsxs("div", { className: "space-y-4 max-w-4xl font-sans", children: [_jsxs(Link, { to: "/artists", className: "inline-flex items-center gap-2 text-zinc-500 text-sm hover:text-white transition-colors", children: [_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-4 h-4", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" }) }), "\u0410\u0440\u0442\u0438\u0441\u0442\u044B"] }), _jsxs("div", { className: "bg-[#141416] rounded-2xl p-6 border border-[#1C1C1F]/40 shadow-sm", children: [_jsxs("div", { className: "flex gap-5 items-start", children: [a.coverUrl
                                ? _jsx("img", { src: a.coverUrl, alt: a.name, className: "w-24 h-24 rounded-full object-cover shrink-0 shadow-lg border border-[#1C1C1F]" })
                                : _jsx("div", { className: "w-24 h-24 rounded-full bg-[#202024] flex items-center justify-center shrink-0 border border-[#2C2C32]", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-8 h-8 text-zinc-600", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" }) }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h1", { className: "text-white text-2xl font-bold leading-tight", children: _jsx(InlineEdit, { value: a.name, placeholder: "\u0418\u043C\u044F \u0430\u0440\u0442\u0438\u0441\u0442\u0430", onSave: async (val) => { await patch({ name: val }); addToast('Имя сохранено', 'success'); } }) }), _jsxs("p", { className: "text-zinc-500 text-xs font-mono mt-1", children: ["/", a.slug] }), _jsxs("div", { className: "flex flex-wrap gap-2 mt-3", children: [a.isLocal && _jsx(Badge, { label: "KZ", variant: "blue" }), a.isVerified && _jsx(Badge, { label: "Verified", variant: "yellow" }), _jsx(Badge, { label: a.isPublished ? 'Опубликован' : 'Черновик', variant: a.isPublished ? 'green' : 'gray' }), _jsx(Badge, { label: a.type, variant: "gray" })] }), _jsxs("p", { className: "text-zinc-600 text-xs mt-2", children: [a.trackCount, " \u0442\u0440\u0435\u043A\u043E\u0432 \u00B7 ", a.followerCount, " \u043F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A\u043E\u0432"] })] })] }), _jsxs("div", { className: "mt-5 pt-5 border-t border-[#1C1C1F]", children: [_jsx("p", { className: "text-zinc-500 text-[10px] uppercase tracking-widest font-semibold mb-2", children: "\u0411\u0438\u043E\u0433\u0440\u0430\u0444\u0438\u044F" }), _jsx("div", { className: "text-sm text-zinc-300 leading-relaxed", children: _jsx(InlineEdit, { value: a.bio ?? '', placeholder: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0431\u0438\u043E\u0433\u0440\u0430\u0444\u0438\u044E...", multiline: true, onSave: async (val) => { await patch({ bio: val || null }); addToast('Биография сохранена', 'success'); } }) })] })] }), stats && (_jsx("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3", children: [
                    {
                        label: 'Релизов',
                        value: stats.totalReleases,
                        icon: (_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-5 h-5 text-zinc-500 mx-auto", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("circle", { cx: "12", cy: "12", r: "3" })] }))
                    },
                    {
                        label: 'Треков',
                        value: stats.totalTracks,
                        icon: (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-5 h-5 text-zinc-500 mx-auto", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 9l10.5-3m0 0v15m0-15l-10.5 3M9 9V21m0-12a3 3 0 100-6 3 3 0 000 6zm10.5-3a3 3 0 100-6 3 3 0 000 6z" }) }))
                    },
                    {
                        label: 'Прослушиваний',
                        value: formatPlays(stats.totalPlays),
                        icon: (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-5 h-5 text-zinc-500 mx-auto", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" }) }))
                    },
                    {
                        label: 'На сервисе с',
                        value: new Date(stats.createdAt).getFullYear(),
                        icon: (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-5 h-5 text-zinc-500 mx-auto", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" }) }))
                    },
                ].map(stat => (_jsxs("div", { className: "bg-[#141416] border border-[#1C1C1F]/40 rounded-2xl p-4 text-center shadow-sm", children: [_jsx("div", { className: "mb-2", children: stat.icon }), _jsx("div", { className: "text-white text-lg font-bold", children: stat.value }), _jsx("div", { className: "text-zinc-500 text-[10px] uppercase mt-1 tracking-wider font-semibold", children: stat.label })] }, stat.label))) })), stats && stats.topTracks.length > 0 && (_jsxs("div", { className: "bg-[#141416] border border-[#1C1C1F]/40 rounded-2xl p-6 shadow-sm", children: [_jsx("h2", { className: "text-zinc-500 text-[10px] uppercase tracking-widest font-semibold mb-4", children: "\u0422\u043E\u043F \u0442\u0440\u0435\u043A\u0438" }), _jsx("div", { className: "space-y-1.5", children: stats.topTracks.map((track, idx) => (_jsxs("div", { className: "flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#202024]/40 transition-colors", children: [_jsx("span", { className: "text-zinc-500 text-sm font-bold w-4 text-center", children: idx + 1 }), track.coverUrl
                                    ? _jsx("img", { src: track.coverUrl, className: "w-9 h-9 rounded-lg object-cover shrink-0 shadow-sm", alt: "" })
                                    : _jsx("div", { className: "w-9 h-9 rounded-lg bg-[#202024] flex items-center justify-center shrink-0 border border-[#1C1C1F]", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-4 h-4 text-zinc-600", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 9l10.5-3m0 0v15m0-15l-10.5 3M9 9V21m0-12a3 3 0 100-6 3 3 0 000 6zm10.5-3a3 3 0 100-6 3 3 0 000 6z" }) }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-white text-sm font-medium truncate", children: track.title }), _jsx("p", { className: "text-zinc-500 text-xs", children: track.artists.map(a => a.name).join(', ') })] }), _jsxs("div", { className: "flex items-center gap-3 shrink-0 text-right", children: [_jsxs("div", { className: "leading-tight", children: [_jsx("p", { className: "text-white text-sm font-bold", children: formatPlays(track.playCount ?? 0) }), _jsx("p", { className: "text-zinc-500 text-[10px] uppercase font-semibold", children: "\u043F\u0440\u043E\u0441\u043B\u0443\u0448." })] }), _jsx("span", { className: "text-zinc-500 text-xs font-mono", children: formatMs(track.durationMs) })] })] }, track.id))) })] })), _jsxs("div", { className: "bg-[#141416] border border-[#1C1C1F]/40 rounded-2xl p-6 shadow-sm", children: [_jsx("h2", { className: "text-zinc-500 text-[10px] uppercase tracking-widest font-semibold mb-4", children: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438" }), _jsx(Toggle, { value: a.isPublished, label: "\u041E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D", onChange: () => void patch({ isPublished: !a.isPublished }).then(() => addToast(`Публикация: ${!a.isPublished ? 'Да' : 'Нет'}`, 'success')) }), _jsx(Toggle, { value: a.isLocal, label: "\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 (KZ)", onChange: () => void patch({ isLocal: !a.isLocal }).then(() => addToast(`KZ: ${!a.isLocal ? 'Да' : 'Нет'}`, 'success')) }), _jsx(Toggle, { value: a.isVerified, label: "\u0412\u0435\u0440\u0438\u0444\u0438\u0446\u0438\u0440\u043E\u0432\u0430\u043D", onChange: () => void patch({ isVerified: !a.isVerified }).then(() => addToast(`Verified: ${!a.isVerified ? 'Да' : 'Нет'}`, 'success')) }), _jsxs("div", { className: "flex items-start justify-between gap-4 py-3 mt-1", children: [_jsx("span", { className: "text-zinc-500 text-sm", children: "ID" }), _jsx("code", { className: "text-zinc-500 text-xs font-mono", children: a.id })] }), _jsxs("div", { className: "flex items-start justify-between gap-4 py-3 border-t border-[#1C1C1F]/50", children: [_jsx("span", { className: "text-zinc-500 text-sm", children: "\u0421\u043E\u0437\u0434\u0430\u043D" }), _jsx("span", { className: "text-zinc-400 text-sm font-medium", children: new Date(a.createdAt).toLocaleString('ru-RU') })] }), _jsxs("div", { className: "flex items-start justify-between gap-4 py-3 border-t border-[#1C1C1F]/50", children: [_jsx("span", { className: "text-zinc-500 text-sm", children: "\u041E\u0431\u043D\u043E\u0432\u043B\u0451\u043D" }), _jsx("span", { className: "text-zinc-400 text-sm font-medium", children: new Date(a.updatedAt).toLocaleString('ru-RU') })] }), _jsx("div", { className: "pt-3.5 mt-1 border-t border-[#1C1C1F]/50", children: _jsxs("p", { className: "text-zinc-500 text-xs italic flex items-center gap-2", children: [_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-4 h-4 text-zinc-500 shrink-0", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" }) }), "\u0421\u0438\u0441\u0442\u0435\u043C\u0430 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438 \u0430\u0440\u0442\u0438\u0441\u0442\u043E\u0432 \u0432 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u043A\u0435 \u2014 \u0434\u0430\u0442\u0430 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438 \u0431\u0443\u0434\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u043F\u043E\u0441\u043B\u0435 \u0437\u0430\u043F\u0443\u0441\u043A\u0430."] }) })] }), stats && stats.releases.length > 0 && (_jsxs("div", { className: "bg-[#141416] border border-[#1C1C1F]/40 rounded-2xl p-6 shadow-sm", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-zinc-500 text-[10px] uppercase tracking-widest font-semibold", children: "\u0414\u0438\u0441\u043A\u043E\u0433\u0440\u0430\u0444\u0438\u044F" }), _jsxs("span", { className: "text-zinc-500 text-xs font-medium", children: [stats.totalReleases, " \u0440\u0435\u043B\u0438\u0437\u043E\u0432 \u00B7 ", stats.totalTracks, " \u0442\u0440\u0435\u043A\u043E\u0432"] })] }), _jsx("div", { className: "space-y-2", children: stats.releases.map(release => (_jsx(ReleaseRow, { release: release }, release.id))) })] }))] }));
}
