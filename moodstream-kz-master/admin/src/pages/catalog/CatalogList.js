import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '../../lib/api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useToastContext } from '../../lib/toastContext';
const PLAYBACK_STATUS_OPTIONS = [
    { value: '', label: 'Все статусы' },
    { value: 'PLAYABLE', label: 'PLAYABLE' },
    { value: 'PROCESSING', label: 'PROCESSING' },
    { value: 'BLOCKED', label: 'BLOCKED' },
    { value: 'REMOVED', label: 'REMOVED' },
];
const PUBLISH_STATUS_OPTIONS = [
    { value: '', label: 'Все' },
    { value: 'published', label: 'Опубликованные' },
    { value: 'unpublished', label: 'Неопубликованные' },
];
const SOURCE_OPTIONS = [
    { value: '', label: 'Все источники' },
    { value: 'CURATED', label: 'CURATED' },
    { value: 'PROMOTED_IMPORT', label: 'PROMOTED_IMPORT' },
    { value: 'HIDDEN_IMPORT', label: 'HIDDEN_IMPORT' },
];
const SORT_OPTIONS = [
    { value: 'newest', label: 'Новые сначала' },
    { value: 'oldest', label: 'Старые сначала' },
    { value: 'title', label: 'По названию' },
];
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}
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
function tagStatusBadgeVariant(status) {
    switch (status) {
        case 'VERIFIED': return 'green';
        case 'PENDING': return 'yellow';
        case 'REJECTED': return 'red';
        default: return 'gray';
    }
}
function TableSkeleton() {
    return (_jsx("tbody", { children: Array.from({ length: 8 }).map((_, i) => (_jsxs("tr", { className: "border-b border-border-default", children: [_jsx("td", { className: "px-3 py-3 w-10", children: _jsx("div", { className: "w-4 h-4 rounded bg-surface-2 animate-pulse" }) }), _jsx("td", { className: "px-4 py-3", children: _jsx("div", { className: "w-10 h-10 rounded bg-surface-2 animate-pulse" }) }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "space-y-1.5", children: [_jsx("div", { className: "h-3.5 w-40 bg-surface-2 rounded animate-pulse" }), _jsx("div", { className: "h-3 w-28 bg-surface-2 rounded animate-pulse" })] }) }), _jsx("td", { className: "px-4 py-3", children: _jsx("div", { className: "h-3.5 w-12 bg-surface-2 rounded animate-pulse" }) }), _jsx("td", { className: "px-4 py-3", children: _jsx("div", { className: "h-3.5 w-16 bg-surface-2 rounded animate-pulse" }) }), _jsx("td", { className: "px-4 py-3", children: _jsx("div", { className: "h-5 w-20 bg-surface-2 rounded animate-pulse" }) }), _jsx("td", { className: "px-4 py-3", children: _jsx("div", { className: "h-5 w-20 bg-surface-2 rounded animate-pulse" }) }), _jsx("td", { className: "px-4 py-3", children: _jsx("div", { className: "h-5 w-16 bg-surface-2 rounded animate-pulse" }) }), _jsx("td", { className: "px-4 py-3", children: _jsx("div", { className: "h-5 w-8 bg-surface-2 rounded animate-pulse" }) }), _jsx("td", { className: "px-4 py-3", children: _jsx("div", { className: "h-7 w-24 bg-surface-2 rounded animate-pulse" }) })] }, i))) }));
}
function TrackRow({ track, selected, onToggle, onAction, actionLoading }) {
    const artistNames = track.artists.map(a => a.name).join(', ');
    const isThisLoading = actionLoading === track.id;
    return (_jsxs("tr", { className: "border-b border-[#1C1C1F] hover:bg-[#202024]/30 transition-all duration-150", children: [_jsx("td", { className: "px-3 py-3 w-10", children: _jsx("input", { type: "checkbox", checked: selected, onChange: onToggle, className: "w-4 h-4 rounded border-zinc-700 bg-[#202024] accent-white cursor-pointer" }) }), _jsx("td", { className: "px-4 py-3 w-14", children: track.coverUrl ? (_jsx("img", { src: track.coverUrl, alt: track.title, className: "w-10 h-10 rounded-lg object-cover" })) : (_jsx("div", { className: "w-10 h-10 rounded-lg bg-[#202024] flex items-center justify-center", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-4 h-4 text-zinc-600", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 9l10.5-3m0 0v15m0-15l-10.5 3M9 9V21m0-12a3 3 0 100-6 3 3 0 000 6zm10.5-3a3 3 0 100-6 3 3 0 000 6z" }) }) })) }), _jsxs("td", { className: "px-4 py-3 min-w-[200px]", children: [_jsx(Link, { to: `/catalog/${track.id}`, className: "text-white text-sm font-medium hover:text-[#D4D1CA] transition-colors line-clamp-1", children: track.title }), _jsx("p", { className: "text-zinc-500 text-xs mt-0.5 line-clamp-1", children: artistNames || '—' })] }), _jsx("td", { className: "px-4 py-3 text-zinc-400 text-sm tabular-nums whitespace-nowrap", children: formatDuration(track.durationMs) }), _jsx("td", { className: "px-4 py-3 text-zinc-400 text-xs", children: track.genre ?? '—' }), _jsx("td", { className: "px-4 py-3", children: _jsx(Badge, { label: track.isPublished ? 'Опубликован' : 'Черновик', variant: track.isPublished ? 'green' : 'gray' }) }), _jsx("td", { className: "px-4 py-3", children: _jsx(Badge, { label: track.playbackStatus, variant: playbackBadgeVariant(track.playbackStatus) }) }), _jsx("td", { className: "px-4 py-3", children: _jsx(Badge, { label: track.tagStatus || 'N/A', variant: tagStatusBadgeVariant(track.tagStatus) }) }), _jsx("td", { className: "px-4 py-3", children: track.isLocal ? _jsx(Badge, { label: "KZ", variant: "blue" }) : _jsx("span", { className: "text-zinc-700 text-xs", children: "\u2014" }) }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex items-center gap-1.5", children: [track.isPublished ? (_jsx(Button, { variant: "ghost", size: "sm", loading: isThisLoading, onClick: () => { if (window.confirm(`Снять трек "${track.title}" с публикации?`))
                                onAction(track.id, 'unpublish'); }, children: "\u0421\u043D\u044F\u0442\u044C" })) : (_jsx(Button, { variant: "primary", size: "sm", loading: isThisLoading, onClick: () => { if (window.confirm(`Опубликовать трек "${track.title}"?`))
                                onAction(track.id, 'publish'); }, children: "\u041E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u0442\u044C" })), _jsx(Link, { to: `/catalog/${track.id}`, children: _jsx(Button, { variant: "secondary", size: "sm", className: "w-8 h-8 !p-0", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-4 h-4", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" }) }) }) })] }) })] }));
}
export function CatalogList() {
    // ── Persist filters in URL so they survive navigation ──────────────────────
    const [searchParams, setSearchParams] = useSearchParams();
    const searchInput = searchParams.get('q') ?? '';
    const publishFilter = searchParams.get('pub') ?? '';
    const playbackFilter = searchParams.get('pb') ?? '';
    const sourceFilter = searchParams.get('src') ?? '';
    const sortOrder = (searchParams.get('sort') ?? 'newest');
    function setParam(key, value) {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (value)
                next.set(key, value);
            else
                next.delete(key);
            return next;
        }, { replace: true });
    }
    const [cursor, setCursor] = useState(null);
    const [allTracks, setAllTracks] = useState([]);
    const [actionLoading, setActionLoading] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [genreFilter, setGenreFilter] = useState([]);
    const [bulkLoading, setBulkLoading] = useState(null);
    const isFirstLoad = useRef(true);
    const { addToast } = useToastContext();
    const queryClient = useQueryClient();
    const debouncedSearch = useDebounce(searchInput, 400);
    useEffect(() => {
        if (isFirstLoad.current) {
            isFirstLoad.current = false;
            return;
        }
        setAllTracks([]);
        setCursor(null);
        setSelectedIds(new Set());
    }, [debouncedSearch, publishFilter, playbackFilter, sourceFilter]);
    const queryParams = new URLSearchParams({ q: debouncedSearch, limit: '50', ...(cursor ? { cursor } : {}) });
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['admin', 'tracks', debouncedSearch, publishFilter, playbackFilter, sourceFilter, cursor],
        queryFn: () => adminFetch(`/api/admin/catalog/tracks?${queryParams.toString()}`),
        staleTime: 30000,
    });
    useEffect(() => {
        if (data?.tracks) {
            setAllTracks(prev => {
                if (cursor === null)
                    return data.tracks;
                const existingIds = new Set(prev.map(t => t.id));
                return [...prev, ...data.tracks.filter(t => !existingIds.has(t.id))];
            });
        }
    }, [data, cursor]);
    function resetFilters() {
        setSearchParams({}, { replace: true });
        setCursor(null);
        setAllTracks([]);
        setSelectedIds(new Set());
        setGenreFilter([]);
    }
    const allGenres = useMemo(() => {
        const genres = new Set(allTracks.map(t => t.genre).filter(Boolean));
        return Array.from(genres).sort();
    }, [allTracks]);
    function toggleGenre(genre) {
        setGenreFilter(prev => prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]);
        setSelectedIds(new Set());
    }
    // Client-side filtering
    const filteredTracks = useMemo(() => {
        let tracks = allTracks.filter(track => {
            if (publishFilter === 'published' && !track.isPublished)
                return false;
            if (publishFilter === 'unpublished' && track.isPublished)
                return false;
            // Hide REMOVED by default unless explicitly filtered
            if (!playbackFilter && track.playbackStatus === 'REMOVED')
                return false;
            if (playbackFilter && track.playbackStatus !== playbackFilter)
                return false;
            if (sourceFilter && track.sourcePolicy !== sourceFilter)
                return false;
            if (genreFilter.length > 0 && !genreFilter.includes(track.genre ?? ''))
                return false;
            return true;
        });
        // Sort
        if (sortOrder === 'oldest') {
            tracks = [...tracks].reverse();
        }
        else if (sortOrder === 'title') {
            tracks = [...tracks].sort((a, b) => a.title.localeCompare(b.title, 'ru'));
        }
        return tracks;
    }, [allTracks, publishFilter, playbackFilter, sourceFilter, genreFilter, sortOrder]);
    const allVisibleSelected = filteredTracks.length > 0 && filteredTracks.every(t => selectedIds.has(t.id));
    const someSelected = filteredTracks.some(t => selectedIds.has(t.id)) && !allVisibleSelected;
    function toggleSelectAll() {
        if (allVisibleSelected)
            setSelectedIds(new Set());
        else
            setSelectedIds(new Set(filteredTracks.map(t => t.id)));
    }
    function toggleTrack(id) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }
    async function handleAction(id, action) {
        setActionLoading(id);
        try {
            await adminFetch(`/api/admin/catalog/tracks/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ isPublished: action === 'publish' }),
            });
            addToast(action === 'publish' ? 'Трек опубликован' : 'Трек снят с публикации', 'success');
            setAllTracks(prev => prev.map(t => t.id === id ? { ...t, isPublished: action === 'publish' } : t));
            void queryClient.invalidateQueries({ queryKey: ['admin', 'tracks'] });
        }
        catch (err) {
            addToast(err instanceof Error ? err.message : 'Ошибка', 'error');
        }
        finally {
            setActionLoading(null);
        }
    }
    async function handleBulkPublish(isPublished) {
        const ids = Array.from(selectedIds);
        setBulkLoading(isPublished ? 'publish' : 'unpublish');
        try {
            await adminFetch('/api/admin/catalog/tracks/bulk-publish', {
                method: 'PATCH',
                body: JSON.stringify({ ids, isPublished }),
            });
            addToast(`${ids.length} треков ${isPublished ? 'опубликовано' : 'снято'}`, 'success');
            setSelectedIds(new Set());
            setAllTracks(prev => prev.map(t => selectedIds.has(t.id) ? { ...t, isPublished } : t));
        }
        catch (err) {
            addToast(err instanceof Error ? err.message : 'Ошибка', 'error');
        }
        finally {
            setBulkLoading(null);
        }
    }
    async function handleBulkSetPlayable() {
        const ids = Array.from(selectedIds);
        setBulkLoading('playable');
        try {
            await adminFetch('/api/admin/catalog/tracks/bulk-set-playable', {
                method: 'PATCH',
                body: JSON.stringify({ ids }),
            });
            addToast(`${ids.length} треков → PLAYABLE`, 'success');
            setSelectedIds(new Set());
            setAllTracks(prev => prev.map(t => selectedIds.has(t.id) ? { ...t, playbackStatus: 'PLAYABLE' } : t));
        }
        catch (err) {
            addToast(err instanceof Error ? err.message : 'Ошибка', 'error');
        }
        finally {
            setBulkLoading(null);
        }
    }
    async function handleBulkArchive() {
        const ids = Array.from(selectedIds);
        if (!window.confirm(`Архивировать ${ids.length} треков? Они будут скрыты из каталога.`))
            return;
        setBulkLoading('archive');
        try {
            await adminFetch('/api/admin/catalog/tracks/bulk-archive', {
                method: 'POST',
                body: JSON.stringify({ ids }),
            });
            addToast(`${ids.length} треков архивировано`, 'success');
            setSelectedIds(new Set());
            setAllTracks(prev => prev.filter(t => !selectedIds.has(t.id)));
        }
        catch (err) {
            addToast(err instanceof Error ? err.message : 'Ошибка', 'error');
        }
        finally {
            setBulkLoading(null);
        }
    }
    const hasActiveFilters = searchInput !== '' || publishFilter !== '' || playbackFilter !== '' || sourceFilter !== '' || genreFilter.length > 0;
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-white text-xl font-bold", children: "\u041A\u0430\u0442\u0430\u043B\u043E\u0433 \u0442\u0440\u0435\u043A\u043E\u0432" }), _jsx("p", { className: "text-zinc-500 text-sm mt-0.5", children: data?.total != null ? `Всего ${data.total} треков` : 'Все треки включая черновики' })] }), _jsx(Link, { to: "/ingestion", children: _jsx(Button, { variant: "primary", size: "sm", children: "+ \u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C" }) })] }), _jsxs("div", { className: "bg-surface border border-border-default rounded-xl p-4", children: [_jsxs("div", { className: "flex flex-wrap gap-3 items-end", children: [_jsxs("div", { className: "flex-1 min-w-[200px]", children: [_jsx("label", { className: "text-zinc-500 text-xs uppercase tracking-wide mb-1.5 block", children: "\u041F\u043E\u0438\u0441\u043A" }), _jsx("input", { type: "text", value: searchInput, onChange: e => setParam('q', e.target.value), placeholder: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0438\u043B\u0438 \u0430\u0440\u0442\u0438\u0441\u0442...", className: "w-full bg-surface-2 border border-border-default rounded-md px-3 py-2 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-accent transition-colors", autoFocus: true })] }), _jsxs("div", { className: "min-w-[160px]", children: [_jsx("label", { className: "text-zinc-500 text-xs uppercase tracking-wide mb-1.5 block", children: "\u041F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u044F" }), _jsx("select", { value: publishFilter, onChange: e => setParam('pub', e.target.value), className: "w-full bg-surface-2 border border-border-default rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-accent transition-colors", children: PUBLISH_STATUS_OPTIONS.map(o => _jsx("option", { value: o.value, children: o.label }, o.value)) })] }), _jsxs("div", { className: "min-w-[160px]", children: [_jsx("label", { className: "text-zinc-500 text-xs uppercase tracking-wide mb-1.5 block", children: "\u0412\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435\u043D\u0438\u0435" }), _jsx("select", { value: playbackFilter, onChange: e => setParam('pb', e.target.value), className: "w-full bg-surface-2 border border-border-default rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-accent transition-colors", children: PLAYBACK_STATUS_OPTIONS.map(o => _jsx("option", { value: o.value, children: o.label }, o.value)) })] }), _jsxs("div", { className: "min-w-[160px]", children: [_jsx("label", { className: "text-zinc-500 text-xs uppercase tracking-wide mb-1.5 block", children: "\u0421\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0430" }), _jsx("select", { value: sortOrder, onChange: e => setParam('sort', e.target.value), className: "w-full bg-surface-2 border border-border-default rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-accent transition-colors", children: SORT_OPTIONS.map(o => _jsx("option", { value: o.value, children: o.label }, o.value)) })] }), hasActiveFilters && (_jsx(Button, { variant: "ghost", size: "md", onClick: resetFilters, children: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C" }))] }), allGenres.length > 0 && (_jsx("div", { className: "mt-3 flex flex-wrap gap-2", children: allGenres.map(genre => (_jsx("button", { onClick: () => toggleGenre(genre), className: `px-3 py-1 rounded-full text-xs border transition-colors ${genreFilter.includes(genre)
                                ? 'bg-accent/20 border-accent text-accent'
                                : 'border-border-default text-zinc-400 hover:border-zinc-500'}`, children: genre }, genre))) })), _jsxs("div", { className: "mt-3 text-zinc-500 text-xs", children: [isLoading && allTracks.length === 0 ? 'Загрузка...' : `Показано ${filteredTracks.length} треков`, !playbackFilter && _jsx("span", { className: "ml-2 text-zinc-700", children: "(REMOVED \u0441\u043A\u0440\u044B\u0442\u044B)" })] })] }), selectedIds.size > 0 && (_jsxs("div", { className: "bg-surface-2 border border-border-default rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap", children: [_jsxs("span", { className: "text-white text-sm font-medium", children: ["\u0412\u044B\u0431\u0440\u0430\u043D\u043E: ", selectedIds.size] }), _jsx("button", { onClick: () => void handleBulkPublish(true), disabled: bulkLoading !== null, className: "px-3 py-1.5 rounded-md bg-accent/20 text-accent text-xs font-medium hover:bg-accent/30 transition-colors disabled:opacity-50", children: bulkLoading === 'publish' ? '...' : `Опубликовать (${selectedIds.size})` }), _jsx("button", { onClick: () => void handleBulkPublish(false), disabled: bulkLoading !== null, className: "px-3 py-1.5 rounded-md bg-zinc-700/50 text-zinc-300 text-xs font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50", children: bulkLoading === 'unpublish' ? '...' : `Снять (${selectedIds.size})` }), _jsx("button", { onClick: () => void handleBulkSetPlayable(), disabled: bulkLoading !== null, className: "px-3 py-1.5 rounded-md bg-blue-900/20 text-blue-400 text-xs font-medium hover:bg-blue-900/40 transition-colors disabled:opacity-50", children: bulkLoading === 'playable' ? '...' : `→ PLAYABLE (${selectedIds.size})` }), _jsx("button", { onClick: () => void handleBulkArchive(), disabled: bulkLoading !== null, className: "px-3 py-1.5 rounded-md bg-red-900/20 text-red-400 text-xs font-medium hover:bg-red-900/40 transition-colors disabled:opacity-50", children: bulkLoading === 'archive' ? '...' : `Архивировать (${selectedIds.size})` }), _jsx("button", { onClick: () => setSelectedIds(new Set()), className: "ml-auto text-zinc-500 hover:text-white text-xs transition-colors", children: "\u0421\u043D\u044F\u0442\u044C \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u0438\u0435" })] })), _jsxs("div", { className: "bg-surface border border-border-default rounded-xl overflow-hidden", children: [_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-[#1C1C1F] bg-[#141416]/50", children: [_jsx("th", { className: "px-3 py-3 w-10", children: _jsx("input", { type: "checkbox", checked: allVisibleSelected, ref: el => { if (el)
                                                        el.indeterminate = someSelected; }, onChange: toggleSelectAll, className: "w-4 h-4 rounded border-zinc-700 bg-[#202024] accent-white cursor-pointer" }) }), _jsx("th", { className: "px-4 py-3 text-left text-zinc-500 text-xs uppercase tracking-wider w-14" }), _jsx("th", { className: "px-4 py-3 text-left text-zinc-500 text-xs uppercase tracking-wider", children: "\u0422\u0440\u0435\u043A" }), _jsx("th", { className: "px-4 py-3 text-left text-zinc-500 text-xs uppercase tracking-wider whitespace-nowrap", children: "\u0414\u043B\u0438\u0442." }), _jsx("th", { className: "px-4 py-3 text-left text-zinc-500 text-xs uppercase tracking-wider", children: "\u0416\u0430\u043D\u0440" }), _jsx("th", { className: "px-4 py-3 text-left text-zinc-500 text-xs uppercase tracking-wider whitespace-nowrap", children: "\u041F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u044F" }), _jsx("th", { className: "px-4 py-3 text-left text-zinc-500 text-xs uppercase tracking-wider whitespace-nowrap", children: "Playback" }), _jsx("th", { className: "px-4 py-3 text-left text-zinc-500 text-xs uppercase tracking-wider whitespace-nowrap", children: "\u0422\u0435\u0433\u0438" }), _jsx("th", { className: "px-4 py-3 text-left text-zinc-500 text-xs uppercase tracking-wider", children: "\u041B\u043E\u043A\u0430\u043B" }), _jsx("th", { className: "px-4 py-3 text-left text-zinc-500 text-xs uppercase tracking-wider", children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F" })] }) }), isLoading && allTracks.length === 0 ? (_jsx(TableSkeleton, {})) : isError ? (_jsx("tbody", { children: _jsx("tr", { children: _jsx("td", { colSpan: 10, className: "px-4 py-12 text-center", children: _jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-red-400 text-sm", children: error instanceof Error ? error.message : 'Ошибка загрузки' }), _jsx(Button, { variant: "secondary", size: "sm", onClick: () => void refetch(), children: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C" })] }) }) }) })) : filteredTracks.length === 0 ? (_jsx("tbody", { children: _jsx("tr", { children: _jsx("td", { colSpan: 10, className: "px-4 py-12 text-center", children: _jsx("p", { className: "text-zinc-500 text-sm", children: hasActiveFilters ? 'Треки не найдены. Попробуйте изменить фильтры.' : 'Треков нет.' }) }) }) })) : (_jsx("tbody", { children: filteredTracks.map(track => (_jsx(TrackRow, { track: track, selected: selectedIds.has(track.id), onToggle: () => toggleTrack(track.id), onAction: (id, action) => void handleAction(id, action), actionLoading: actionLoading }, track.id))) }))] }) }), data?.nextCursor && (_jsx("div", { className: "px-4 py-4 border-t border-border-default flex items-center justify-center", children: _jsx(Button, { variant: "secondary", onClick: () => setCursor(data.nextCursor ?? null), loading: isLoading, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0435\u0449\u0451" }) }))] })] }));
}
