import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '../../lib/api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
const RELEASE_TYPE_LABELS = {
    SINGLE: 'Сингл',
    EP: 'EP',
    ALBUM: 'Альбом',
    COMPILATION: 'Сборник',
    LIVE: 'Live',
};
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}
function ReleaseSkeleton() {
    return (_jsx("div", { className: "space-y-2", children: Array.from({ length: 6 }).map((_, i) => (_jsxs("div", { className: "flex items-center gap-4 px-4 py-3.5 bg-[#141416] rounded-xl", children: [_jsx("div", { className: "w-12 h-12 rounded-lg bg-[#202024] animate-pulse shrink-0" }), _jsxs("div", { className: "space-y-1.5 flex-1", children: [_jsx("div", { className: "h-3.5 w-44 bg-[#202024] rounded animate-pulse" }), _jsx("div", { className: "h-3 w-28 bg-[#202024] rounded animate-pulse" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("div", { className: "h-5 w-14 bg-[#202024] rounded animate-pulse" }), _jsx("div", { className: "h-5 w-20 bg-[#202024] rounded animate-pulse" })] })] }, i))) }));
}
function ReleaseRow({ release }) {
    const typeLabel = RELEASE_TYPE_LABELS[release.releaseType] ?? release.releaseType;
    return (_jsxs(Link, { to: `/releases/${release.id}`, className: "flex items-center gap-4 px-5 py-3.5 bg-[#141416] rounded-xl hover:bg-[#202024] transition-all duration-150 border border-transparent hover:border-[#1C1C1F]/20", children: [release.coverUrl ? (_jsx("img", { src: release.coverUrl, alt: release.title, className: "w-12 h-12 rounded-lg object-cover shrink-0 shadow-sm" })) : (_jsx("div", { className: "w-12 h-12 rounded-lg bg-[#202024] flex items-center justify-center shrink-0 border border-[#2C2C32]", children: _jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-5 h-5 text-zinc-500", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("circle", { cx: "12", cy: "12", r: "3" })] }) })), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-white text-sm font-medium truncate", children: release.title }), _jsx("p", { className: "text-zinc-500 text-xs truncate mt-0.5", children: release.artistName || '—' })] }), _jsxs("div", { className: "text-zinc-500 text-xs shrink-0 mr-2 font-medium", children: [release.trackCount, " \u0442\u0440\u0435\u043A\u043E\u0432"] }), _jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [_jsx(Badge, { label: typeLabel, variant: "blue" }), _jsx(Badge, { label: release.isPublished ? 'Опубликован' : 'Черновик', variant: release.isPublished ? 'green' : 'gray' }), _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-4 h-4 text-zinc-500 ml-1", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" }) })] })] }));
}
export function ReleaseList() {
    const [searchInput, setSearchInput] = useState('');
    const [cursor, setCursor] = useState(null);
    const [allReleases, setAllReleases] = useState([]);
    const isFirstLoad = useRef(true);
    const debouncedSearch = useDebounce(searchInput, 400);
    useEffect(() => {
        if (isFirstLoad.current) {
            isFirstLoad.current = false;
            return;
        }
        setAllReleases([]);
        setCursor(null);
    }, [debouncedSearch]);
    const queryParams = new URLSearchParams({
        q: debouncedSearch,
        limit: '30',
        ...(cursor ? { cursor } : {}),
    });
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['admin', 'releases', debouncedSearch, cursor],
        queryFn: () => adminFetch(`/api/admin/catalog/releases?${queryParams.toString()}`),
        staleTime: 60000,
    });
    useEffect(() => {
        if (data?.releases) {
            setAllReleases(prev => {
                if (cursor === null)
                    return data.releases;
                const existingIds = new Set(prev.map(r => r.id));
                return [...prev, ...data.releases.filter(r => !existingIds.has(r.id))];
            });
        }
    }, [data, cursor]);
    return (_jsxs("div", { className: "space-y-4 max-w-3xl", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-white text-xl font-bold", children: "\u0420\u0435\u043B\u0438\u0437\u044B" }), _jsx("p", { className: "text-zinc-500 text-sm mt-0.5", children: data?.total != null ? `Всего ${data.total}` : 'Все релизы каталога' })] }), _jsxs("div", { className: "bg-[#141416] rounded-2xl p-5 border border-[#1C1C1F]/40 shadow-sm", children: [_jsxs("div", { className: "flex flex-wrap gap-3 items-end", children: [_jsxs("div", { className: "flex-1 min-w-[200px]", children: [_jsx("label", { className: "text-zinc-500 text-xs uppercase tracking-wide mb-1.5 block font-semibold", children: "\u041F\u043E\u0438\u0441\u043A" }), _jsx("input", { type: "text", value: searchInput, onChange: e => setSearchInput(e.target.value), placeholder: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0440\u0435\u043B\u0438\u0437\u0430...", className: "w-full bg-[#202024] border border-[#1C1C1F] rounded-lg px-3.5 py-2.5 text-white placeholder-zinc-700 text-sm focus:outline-none focus:border-[#D4D1CA]/80 focus:ring-1 focus:ring-[#D4D1CA]/80 transition-all duration-200" })] }), searchInput && (_jsx(Button, { variant: "ghost", size: "md", onClick: () => { setSearchInput(''); setAllReleases([]); setCursor(null); }, children: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C" }))] }), _jsx("div", { className: "mt-3 text-zinc-500 text-xs font-medium", children: isLoading && allReleases.length === 0 ? 'Загрузка...' : `Показано: ${allReleases.length}` })] }), isLoading && allReleases.length === 0 ? (_jsx(ReleaseSkeleton, {})) : isError ? (_jsxs("div", { className: "bg-surface border border-border-default rounded-xl px-6 py-10 text-center space-y-3", children: [_jsx("p", { className: "text-red-400 text-sm", children: error instanceof Error ? error.message : 'Ошибка загрузки' }), _jsx(Button, { variant: "secondary", size: "sm", onClick: () => void refetch(), children: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C" })] })) : allReleases.length === 0 ? (_jsx("div", { className: "bg-surface border border-border-default rounded-xl px-6 py-10 text-center", children: _jsx("p", { className: "text-zinc-500 text-sm", children: searchInput ? 'Релизы не найдены.' : 'Нет релизов в каталоге.' }) })) : (_jsxs("div", { className: "space-y-2", children: [allReleases.map((release) => (_jsx(ReleaseRow, { release: release }, release.id))), data?.nextCursor && (_jsx("div", { className: "pt-2 flex justify-center", children: _jsx(Button, { variant: "secondary", onClick: () => setCursor(data.nextCursor ?? null), loading: isLoading, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0435\u0449\u0451" }) }))] }))] }));
}
