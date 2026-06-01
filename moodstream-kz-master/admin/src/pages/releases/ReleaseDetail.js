import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '../../lib/api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useToastContext } from '../../lib/toastContext';
const RELEASE_TYPES = ['SINGLE', 'EP', 'ALBUM', 'COMPILATION', 'LIVE'];
const RELEASE_TYPE_LABELS = {
    SINGLE: 'Сингл', EP: 'EP', ALBUM: 'Альбом', COMPILATION: 'Сборник', LIVE: 'Live',
};
function formatDuration(ms) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function playbackVariant(status) {
    switch (status) {
        case 'PLAYABLE': return 'green';
        case 'PROCESSING': return 'yellow';
        case 'BLOCKED': return 'red';
        default: return 'gray';
    }
}
function InlineEdit({ value, onSave, placeholder }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const [saving, setSaving] = useState(false);
    const ref = useRef(null);
    useEffect(() => { if (editing)
        ref.current?.focus(); }, [editing]);
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
        return (_jsxs("span", { className: "inline-flex items-center gap-2", children: [_jsx("input", { ref: ref, value: draft, onChange: e => setDraft(e.target.value), onKeyDown: e => { if (e.key === 'Enter')
                        void save(); if (e.key === 'Escape')
                        cancel(); }, disabled: saving, placeholder: placeholder, className: "bg-[#202024] border border-[#1C1C1F] rounded-lg px-2.5 py-1 text-white text-sm focus:outline-none min-w-[180px]" }), _jsx("button", { onClick: () => void save(), disabled: saving, className: "text-[#D4D1CA] text-xs font-semibold hover:opacity-80 disabled:opacity-50", children: saving ? '...' : 'Сохранить' }), _jsx("button", { onClick: cancel, className: "text-zinc-500 text-xs hover:text-white", children: "\u2715" })] }));
    }
    return (_jsxs("span", { className: "group inline-flex items-center gap-1.5 cursor-pointer hover:text-accent transition-colors", onClick: () => { setDraft(value); setEditing(true); }, title: "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0447\u0442\u043E\u0431\u044B \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C", children: [value || _jsx("span", { className: "text-zinc-600 italic", children: placeholder ?? '—' }), _jsx("span", { className: "opacity-0 group-hover:opacity-100 text-zinc-500 transition-opacity shrink-0", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-3.5 h-3.5 mt-0.5", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.83 20.013a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" }) }) })] }));
}
function Skeleton() {
    return (_jsx("div", { className: "space-y-4 animate-pulse", children: _jsx("div", { className: "bg-surface border border-border-default rounded-xl p-6", children: _jsxs("div", { className: "flex gap-5", children: [_jsx("div", { className: "w-28 h-28 rounded-lg bg-surface-2 shrink-0" }), _jsxs("div", { className: "flex-1 space-y-2", children: [_jsx("div", { className: "h-6 w-52 bg-surface-2 rounded" }), _jsx("div", { className: "h-4 w-32 bg-surface-2 rounded" }), _jsx("div", { className: "flex gap-2 mt-3", children: [1, 2].map(i => _jsx("div", { className: "h-5 w-16 bg-surface-2 rounded" }, i)) })] })] }) }) }));
}
export function ReleaseDetail() {
    const { id } = useParams();
    const { addToast } = useToastContext();
    const queryClient = useQueryClient();
    const [local, setLocal] = useState({});
    const [typeOpen, setTypeOpen] = useState(false);
    const { data: release, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['admin', 'release', id],
        queryFn: () => adminFetch(`/api/admin/catalog/releases/${id ?? ''}`),
        enabled: !!id,
        staleTime: 30000,
    });
    async function patch(fields) {
        try {
            await adminFetch(`/api/admin/catalog/releases/${id ?? ''}`, {
                method: 'PATCH',
                body: JSON.stringify(fields),
            });
            setLocal(prev => ({ ...prev, ...fields }));
            void queryClient.invalidateQueries({ queryKey: ['admin', 'release', id] });
            void queryClient.invalidateQueries({ queryKey: ['admin', 'releases'] });
        }
        catch (err) {
            addToast(err instanceof Error ? err.message : 'Ошибка', 'error');
            throw err;
        }
    }
    if (isLoading)
        return _jsx(Skeleton, {});
    if (isError || !release) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center py-20 gap-4", children: [_jsx("p", { className: "text-red-400 text-sm", children: isError ? (error instanceof Error ? error.message : 'Ошибка') : 'Релиз не найден' }), _jsxs("div", { className: "flex gap-3", children: [_jsx(Button, { variant: "secondary", onClick: () => void refetch(), children: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C" }), _jsx(Link, { to: "/releases", children: _jsxs(Button, { variant: "ghost", className: "flex items-center gap-1.5", children: [_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-4 h-4", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" }) }), "\u041D\u0430\u0437\u0430\u0434"] }) })] })] }));
    }
    const r = { ...release, ...local };
    const totalMs = release.tracks.reduce((s, t) => s + t.durationMs, 0);
    return (_jsxs("div", { className: "space-y-4 max-w-3xl font-sans", children: [_jsxs(Link, { to: "/releases", className: "inline-flex items-center gap-2 text-zinc-500 text-sm hover:text-white transition-colors", children: [_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-4 h-4", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" }) }), "\u0420\u0435\u043B\u0438\u0437\u044B"] }), _jsx("div", { className: "bg-[#141416] border border-[#1C1C1F]/40 rounded-2xl p-6 shadow-sm", children: _jsxs("div", { className: "flex gap-5 items-start", children: [r.coverUrl
                            ? _jsx("img", { src: r.coverUrl, alt: r.title, className: "w-28 h-28 rounded-xl object-cover shrink-0 shadow-lg border border-[#1C1C1F]" })
                            : _jsx("div", { className: "w-28 h-28 rounded-xl bg-[#202024] flex items-center justify-center shrink-0 border border-[#2C2C32]", children: _jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-8 h-8 text-zinc-600", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("circle", { cx: "12", cy: "12", r: "3" })] }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h1", { className: "text-white text-2xl font-bold leading-tight", children: _jsx(InlineEdit, { value: r.title, placeholder: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0440\u0435\u043B\u0438\u0437\u0430", onSave: async (val) => { await patch({ title: val }); addToast('Название сохранено', 'success'); } }) }), _jsx(Link, { to: `/artists/${r.artist.id}`, className: "text-zinc-400 text-sm hover:text-accent transition-colors mt-1.5 inline-block font-medium", children: r.artist.name }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 mt-3", children: [_jsx(Badge, { label: RELEASE_TYPE_LABELS[r.releaseType] ?? r.releaseType, variant: "blue" }), _jsx(Badge, { label: r.isPublished ? 'Опубликован' : 'Черновик', variant: r.isPublished ? 'green' : 'gray' })] }), _jsxs("p", { className: "text-zinc-600 text-xs mt-2", children: [release.tracks.length, " \u0442\u0440\u0435\u043A\u043E\u0432 \u00B7 ", formatDuration(totalMs)] })] })] }) }), _jsxs("div", { className: "bg-[#141416] border border-[#1C1C1F]/40 rounded-2xl p-6 shadow-sm", children: [_jsx("h2", { className: "text-zinc-500 text-[10px] uppercase tracking-widest font-semibold mb-4", children: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435" }), _jsxs("div", { className: "flex items-center justify-between gap-4 py-3.5 border-b border-[#1C1C1F]/50", children: [_jsx("span", { className: "text-zinc-500 text-sm", children: "\u0422\u0438\u043F" }), _jsxs("div", { className: "relative", children: [_jsxs("button", { onClick: () => setTypeOpen(o => !o), className: "flex items-center gap-1.5 text-white text-sm hover:text-[#D4D1CA] transition-colors font-medium", children: [RELEASE_TYPE_LABELS[r.releaseType] ?? r.releaseType, _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-3.5 h-3.5 text-zinc-500", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M19.5 8.25l-7.5 7.5-7.5-7.5" }) })] }), typeOpen && (_jsx("div", { className: "absolute right-0 top-full mt-1.5 z-20 bg-[#141416] border border-[#1C1C1F] rounded-lg overflow-hidden shadow-xl min-w-[140px]", children: RELEASE_TYPES.map(t => (_jsx("button", { onClick: async () => {
                                                setTypeOpen(false);
                                                await patch({ releaseType: t });
                                                addToast(`Тип → ${RELEASE_TYPE_LABELS[t]}`, 'success');
                                            }, className: `w-full text-left px-4 py-2.5 text-sm hover:bg-[#202024] transition-colors ${r.releaseType === t ? 'text-white font-medium bg-[#202024]/40' : 'text-zinc-400'}`, children: RELEASE_TYPE_LABELS[t] }, t))) }))] })] }), _jsxs("div", { className: "flex items-center justify-between gap-4 py-3.5 border-b border-[#1C1C1F]/50", children: [_jsx("span", { className: "text-zinc-500 text-sm", children: "\u0414\u0430\u0442\u0430 \u0432\u044B\u0445\u043E\u0434\u0430" }), _jsx("span", { className: "text-white text-sm font-medium", children: _jsx(InlineEdit, { value: r.releaseDate ? r.releaseDate.split('T')[0] : '', placeholder: "YYYY-MM-DD", onSave: async (val) => {
                                        await patch({ releaseDate: val || null });
                                        addToast('Дата сохранена', 'success');
                                    } }) })] }), _jsxs("div", { className: "flex items-center justify-between gap-4 py-3 border-b border-[#1C1C1F]/50", children: [_jsx("span", { className: "text-zinc-500 text-sm", children: "\u041E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D" }), _jsx("button", { onClick: async () => { await patch({ isPublished: !r.isPublished }); addToast(`Публикация: ${!r.isPublished ? 'Да' : 'Нет'}`, 'success'); }, className: `relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${r.isPublished ? 'bg-white' : 'bg-[#202024]'}`, children: _jsx("span", { className: `inline-block h-3.5 w-3.5 transform rounded-full transition-transform ${r.isPublished ? 'translate-x-4 bg-black' : 'translate-x-1 bg-zinc-500'}` }) })] }), _jsxs("div", { className: "flex items-start justify-between gap-4 py-3", children: [_jsx("span", { className: "text-zinc-500 text-sm", children: "ID" }), _jsx("code", { className: "text-zinc-500 text-xs font-mono", children: r.id })] })] }), release.tracks.length > 0 && (_jsxs("div", { className: "bg-[#141416] border border-[#1C1C1F]/40 rounded-2xl overflow-hidden shadow-sm", children: [_jsx("div", { className: "px-6 py-4 border-b border-[#1C1C1F]/50", children: _jsxs("h2", { className: "text-zinc-500 text-[10px] uppercase tracking-widest font-semibold", children: ["\u0422\u0440\u0435\u043A\u0438 (", release.tracks.length, ")"] }) }), _jsx("div", { className: "divide-y divide-[#1C1C1F]/60", children: release.tracks.map((track, idx) => (_jsxs("div", { className: "flex items-center gap-3 px-6 py-3.5 hover:bg-[#202024]/40 transition-colors", children: [_jsx("span", { className: "text-zinc-600 text-xs w-5 text-right shrink-0", children: track.trackNumber ?? idx + 1 }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx(Link, { to: `/catalog/${track.id}`, className: "text-white text-sm font-medium hover:text-[#D4D1CA] transition-colors line-clamp-1", children: track.title }), _jsx("p", { className: "text-zinc-500 text-xs mt-0.5", children: track.artists.join(', ') || '—' })] }), _jsx("span", { className: "text-zinc-500 text-xs font-mono tabular-nums shrink-0", children: formatDuration(track.durationMs) }), _jsx(Badge, { label: track.playbackStatus, variant: playbackVariant(track.playbackStatus) }), _jsx(Badge, { label: track.isPublished ? 'Опубл.' : 'Черн.', variant: track.isPublished ? 'green' : 'gray' })] }, track.id))) })] }))] }));
}
