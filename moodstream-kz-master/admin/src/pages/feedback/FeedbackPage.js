import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '../../lib/api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useToastContext } from '../../lib/toastContext';
const STATUS_OPTIONS = ['', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const CATEGORY_OPTIONS = ['', 'BUG', 'COMPLAINT', 'FEATURE_REQUEST', 'OTHER'];
const STATUS_LABELS = {
    OPEN: 'Открыто',
    IN_PROGRESS: 'В работе',
    RESOLVED: 'Решено',
    CLOSED: 'Закрыто',
};
const CATEGORY_LABELS = {
    BUG: 'Баг',
    COMPLAINT: 'Жалоба',
    FEATURE_REQUEST: 'Фича',
    OTHER: 'Другое',
};
function statusVariant(s) {
    switch (s) {
        case 'OPEN': return 'red';
        case 'IN_PROGRESS': return 'yellow';
        case 'RESOLVED': return 'green';
        case 'CLOSED': return 'gray';
        default: return 'gray';
    }
}
function categoryVariant(c) {
    switch (c) {
        case 'BUG': return 'red';
        case 'COMPLAINT': return 'yellow';
        case 'FEATURE_REQUEST': return 'blue';
        default: return 'gray';
    }
}
export function FeedbackPage() {
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [updatingId, setUpdatingId] = useState(null);
    const { addToast } = useToastContext();
    const queryClient = useQueryClient();
    const params = new URLSearchParams({ limit: '50' });
    if (statusFilter)
        params.set('status', statusFilter);
    if (categoryFilter)
        params.set('category', categoryFilter);
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['admin', 'feedback', statusFilter, categoryFilter],
        queryFn: () => adminFetch(`/api/admin/feedback?${params.toString()}`),
        staleTime: 30000,
    });
    async function updateStatus(id, status) {
        setUpdatingId(id);
        try {
            await adminFetch(`/api/admin/feedback/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status }),
            });
            addToast('Статус обновлён', 'success');
            void queryClient.invalidateQueries({ queryKey: ['admin', 'feedback'] });
        }
        catch {
            addToast('Ошибка при обновлении', 'error');
        }
        finally {
            setUpdatingId(null);
        }
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsxs("div", { children: [_jsx("h1", { className: "text-white text-xl font-bold", children: "\u041E\u0431\u0440\u0430\u0442\u043D\u0430\u044F \u0441\u0432\u044F\u0437\u044C" }), _jsxs("p", { className: "text-zinc-500 text-sm mt-0.5", children: ["\u0416\u0430\u043B\u043E\u0431\u044B, \u0431\u0430\u0433\u0438 \u0438 \u0437\u0430\u043F\u0440\u043E\u0441\u044B \u043E\u0442 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439", data?.total != null ? ` · всего ${data.total}` : ''] })] }) }), _jsx("div", { className: "bg-surface rounded-2xl p-5 shadow-sm", children: _jsxs("div", { className: "flex flex-wrap gap-4", children: [_jsxs("div", { className: "min-w-[180px]", children: [_jsx("label", { className: "text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block", children: "\u0421\u0442\u0430\u0442\u0443\u0441" }), _jsxs("div", { className: "relative", children: [_jsxs("select", { value: statusFilter, onChange: e => setStatusFilter(e.target.value), className: "w-full appearance-none bg-surface-2 text-white text-sm rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-1 focus:ring-accent/40 border-none transition-all duration-150 cursor-pointer shadow-sm", children: [_jsx("option", { value: "", className: "bg-[#141416]", children: "\u0412\u0441\u0435 \u0441\u0442\u0430\u0442\u0443\u0441\u044B" }), STATUS_OPTIONS.filter(Boolean).map(s => (_jsx("option", { value: s, className: "bg-[#141416]", children: STATUS_LABELS[s] }, s)))] }), _jsx("div", { className: "absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-500", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 2, stroke: "currentColor", className: "w-4 h-4", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M19.5 8.25l-7.5 7.5-7.5-7.5" }) }) })] })] }), _jsxs("div", { className: "min-w-[180px]", children: [_jsx("label", { className: "text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block", children: "\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F" }), _jsxs("div", { className: "relative", children: [_jsxs("select", { value: categoryFilter, onChange: e => setCategoryFilter(e.target.value), className: "w-full appearance-none bg-surface-2 text-white text-sm rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-1 focus:ring-accent/40 border-none transition-all duration-150 cursor-pointer shadow-sm", children: [_jsx("option", { value: "", className: "bg-[#141416]", children: "\u0412\u0441\u0435 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438" }), CATEGORY_OPTIONS.filter(Boolean).map(c => (_jsx("option", { value: c, className: "bg-[#141416]", children: CATEGORY_LABELS[c] }, c)))] }), _jsx("div", { className: "absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-500", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 2, stroke: "currentColor", className: "w-4 h-4", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M19.5 8.25l-7.5 7.5-7.5-7.5" }) }) })] })] })] }) }), _jsx("div", { className: "bg-surface rounded-2xl overflow-hidden shadow-sm", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border-default/45 bg-[#141416]/50", children: [_jsx("th", { className: "px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold", children: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C" }), _jsx("th", { className: "px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold", children: "\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F" }), _jsx("th", { className: "px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold", children: "\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435" }), _jsx("th", { className: "px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold", children: "\u041F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0430" }), _jsx("th", { className: "px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold", children: "\u0414\u0430\u0442\u0430" }), _jsx("th", { className: "px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold", children: "\u0421\u0442\u0430\u0442\u0443\u0441" }), _jsx("th", { className: "px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold", children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435" })] }) }), _jsx("tbody", { children: isLoading ? (Array.from({ length: 5 }).map((_, i) => (_jsx("tr", { className: "border-b border-border-default/45", children: Array.from({ length: 7 }).map((__, j) => (_jsx("td", { className: "px-4 py-3", children: _jsx("div", { className: "h-4 bg-surface-2 rounded animate-pulse" }) }, j))) }, i)))) : isError ? (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "px-4 py-12 text-center", children: _jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-red-400 text-sm", children: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438" }), _jsx(Button, { variant: "secondary", size: "sm", onClick: () => void refetch(), children: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C" })] }) }) })) : (data?.items.length ?? 0) === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "px-4 py-12 text-center text-zinc-500 text-sm", children: "\u041E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u0439 \u043D\u0435\u0442" }) })) : (data.items.map((item) => (_jsxs("tr", { className: "border-b border-border-default/45 hover:bg-surface-2/30 transition-all duration-150", children: [_jsxs("td", { className: "px-4 py-3", children: [_jsx("p", { className: "text-white text-sm font-medium", children: item.user?.displayName ?? 'Анонимно' }), item.user?.email && _jsx("p", { className: "text-zinc-500 text-xs mt-0.5", children: item.user.email })] }), _jsx("td", { className: "px-4 py-3", children: _jsx(Badge, { label: CATEGORY_LABELS[item.category] ?? item.category, variant: categoryVariant(item.category) }) }), _jsx("td", { className: "px-4 py-3 max-w-xs", children: _jsx("p", { className: "text-zinc-300 text-sm line-clamp-2", children: item.message }) }), _jsx("td", { className: "px-4 py-3 text-zinc-400 text-xs", children: item.platform ?? '—' }), _jsx("td", { className: "px-4 py-3 text-zinc-400 text-xs tabular-nums whitespace-nowrap", children: new Date(item.createdAt).toLocaleDateString('ru-RU') }), _jsx("td", { className: "px-4 py-3", children: _jsx(Badge, { label: STATUS_LABELS[item.status] ?? item.status, variant: statusVariant(item.status) }) }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "relative inline-block w-full min-w-[120px]", children: [_jsx("select", { value: item.status, disabled: updatingId === item.id, onChange: e => void updateStatus(item.id, e.target.value), className: "w-full appearance-none bg-surface-2 hover:bg-[#2C2C32] text-white text-xs rounded-md pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm", children: STATUS_OPTIONS.filter(Boolean).map(s => (_jsx("option", { value: s, className: "bg-surface", children: STATUS_LABELS[s] }, s))) }), _jsx("div", { className: "absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-zinc-500", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 2, stroke: "currentColor", className: "w-3.5 h-3.5", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M19.5 8.25l-7.5 7.5-7.5-7.5" }) }) })] }) })] }, item.id)))) })] }) }) })] }));
}
