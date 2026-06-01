import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '../../lib/api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
const ROLES = ['USER', 'CATALOG_MANAGER', 'ADMIN'];
function roleBadgeVariant(role) {
    switch (role) {
        case 'ADMIN': return 'red';
        case 'CATALOG_MANAGER': return 'blue';
        default: return 'gray';
    }
}
function formatDate(iso) {
    return new Date(iso).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}
function UserSkeleton() {
    return (_jsx("tbody", { children: Array.from({ length: 8 }).map((_, i) => (_jsxs("tr", { className: "border-b border-border-default", children: [_jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "space-y-1.5", children: [_jsx("div", { className: "h-3.5 w-32 bg-surface-2 rounded animate-pulse" }), _jsx("div", { className: "h-3 w-40 bg-surface-2 rounded animate-pulse" })] }) }), _jsx("td", { className: "px-4 py-3", children: _jsx("div", { className: "h-3.5 w-24 bg-surface-2 rounded animate-pulse" }) }), _jsx("td", { className: "px-4 py-3", children: _jsx("div", { className: "h-5 w-20 bg-surface-2 rounded animate-pulse" }) }), _jsx("td", { className: "px-4 py-3", children: _jsx("div", { className: "h-3.5 w-16 bg-surface-2 rounded animate-pulse" }) }), _jsx("td", { className: "px-4 py-3", children: _jsx("div", { className: "h-3.5 w-24 bg-surface-2 rounded animate-pulse" }) }), _jsx("td", { className: "px-4 py-3", children: _jsx("div", { className: "h-7 w-32 bg-surface-2 rounded animate-pulse" }) }), _jsx("td", { className: "px-4 py-3", children: _jsx("div", { className: "h-7 w-24 bg-surface-2 rounded animate-pulse" }) })] }, i))) }));
}
function RoleSelect({ userId, currentRole, }) {
    const queryClient = useQueryClient();
    const [localRole, setLocalRole] = useState(currentRole);
    const [error, setError] = useState(null);
    const mutation = useMutation({
        mutationFn: (role) => adminFetch(`/api/admin/users/${userId}`, {
            method: 'PATCH',
            body: JSON.stringify({ role }),
        }),
        onSuccess: (updated) => {
            setLocalRole(updated.role);
            setError(null);
            void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        },
        onError: (err) => {
            setLocalRole(currentRole);
            setError(err instanceof Error ? err.message : 'Ошибка');
        },
    });
    const handleChange = (e) => {
        const newRole = e.target.value;
        setLocalRole(newRole);
        setError(null);
        mutation.mutate(newRole);
    };
    return (_jsxs("div", { className: "flex flex-col gap-0.5", children: [_jsxs("div", { className: "relative inline-block w-full min-w-[130px]", children: [_jsx("select", { value: localRole, onChange: handleChange, disabled: mutation.isPending, className: "w-full appearance-none bg-surface-2 hover:bg-[#2C2C32] text-white text-xs rounded-md pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm", children: ROLES.map(r => (_jsx("option", { value: r, className: "bg-surface", children: r }, r))) }), _jsx("div", { className: "absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-zinc-500", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 2, stroke: "currentColor", className: "w-3.5 h-3.5", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M19.5 8.25l-7.5 7.5-7.5-7.5" }) }) })] }), error && _jsx("span", { className: "text-red-400 text-[10px] mt-0.5", children: error })] }));
}
function BanButton({ userId, isBanned }) {
    const queryClient = useQueryClient();
    const [error, setError] = useState(null);
    const mutation = useMutation({
        mutationFn: (banned) => adminFetch(`/api/admin/users/${userId}`, {
            method: 'PATCH',
            body: JSON.stringify({ isBanned: banned }),
        }),
        onSuccess: () => {
            setError(null);
            void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        },
        onError: (err) => {
            setError(err instanceof Error ? err.message : 'Ошибка');
        },
    });
    return (_jsxs("div", { className: "flex flex-col gap-0.5", children: [_jsx(Button, { variant: isBanned ? 'secondary' : 'danger', size: "sm", onClick: () => mutation.mutate(!isBanned), loading: mutation.isPending, className: "whitespace-nowrap", children: isBanned ? 'Разбанить' : 'Блокировать' }), error && _jsx("span", { className: "text-red-400 text-[10px] mt-0.5", children: error })] }));
}
function UserRow({ user }) {
    const contact = user.email ?? user.phone ?? '—';
    return (_jsxs("tr", { className: [
            'border-b border-border-default/45 hover:bg-surface-2/30 transition-all duration-150',
            user.isBanned ? 'opacity-60' : '',
        ].join(' '), children: [_jsxs("td", { className: "px-4 py-3 min-w-[200px]", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "text-white text-sm font-medium", children: user.displayName }), user.isBanned && (_jsx(Badge, { variant: "red", label: "\u0431\u0430\u043D" }))] }), _jsx("p", { className: "text-zinc-500 text-xs mt-0.5", children: contact })] }), _jsxs("td", { className: "px-4 py-3 text-zinc-400 text-xs font-mono", children: [user.id.slice(0, 12), "\u2026"] }), _jsx("td", { className: "px-4 py-3", children: _jsx(Badge, { label: user.role, variant: roleBadgeVariant(user.role) }) }), _jsx("td", { className: "px-4 py-3 text-zinc-400 text-xs uppercase", children: user.preferredLocale }), _jsx("td", { className: "px-4 py-3 text-zinc-500 text-xs whitespace-nowrap", children: formatDate(user.createdAt) }), _jsx("td", { className: "px-4 py-3", children: _jsx(RoleSelect, { userId: user.id, currentRole: user.role }) }), _jsx("td", { className: "px-4 py-3", children: _jsx(BanButton, { userId: user.id, isBanned: user.isBanned }) })] }));
}
export function UsersPage() {
    const [searchInput, setSearchInput] = useState('');
    const [cursor, setCursor] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const isFirstLoad = useRef(true);
    const debouncedSearch = useDebounce(searchInput, 400);
    useEffect(() => {
        if (isFirstLoad.current) {
            isFirstLoad.current = false;
            return;
        }
        setAllUsers([]);
        setCursor(null);
    }, [debouncedSearch]);
    const queryParams = new URLSearchParams({
        q: debouncedSearch,
        limit: '30',
        ...(cursor ? { cursor } : {}),
    });
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['admin', 'users', debouncedSearch, cursor],
        queryFn: () => adminFetch(`/api/admin/users?${queryParams.toString()}`),
        staleTime: 30000,
    });
    useEffect(() => {
        if (data?.users) {
            setAllUsers(prev => {
                if (cursor === null)
                    return data.users;
                const existingIds = new Set(prev.map(u => u.id));
                return [...prev, ...data.users.filter(u => !existingIds.has(u.id))];
            });
        }
    }, [data, cursor]);
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsxs("div", { children: [_jsx("h1", { className: "text-white text-xl font-bold tracking-tight", children: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438" }), _jsxs("p", { className: "text-zinc-500 text-sm mt-0.5", children: ["\u0412\u0441\u0435 \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438", data?.total != null ? ` · всего ${data.total}` : ''] })] }) }), _jsxs("div", { className: "bg-surface rounded-2xl p-5 shadow-sm", children: [_jsxs("div", { className: "flex flex-wrap gap-3 items-end", children: [_jsxs("div", { className: "flex-1 min-w-[200px]", children: [_jsx("label", { className: "text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block", children: "\u041F\u043E\u0438\u0441\u043A" }), _jsxs("div", { className: "relative w-full", children: [_jsx("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-4 h-4 text-zinc-500", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" }) }) }), _jsx("input", { type: "text", value: searchInput, onChange: e => setSearchInput(e.target.value), placeholder: "\u0418\u043C\u044F, email \u0438\u043B\u0438 \u0442\u0435\u043B\u0435\u0444\u043E\u043D...", className: "w-full bg-surface-2 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-accent/40 border-none transition-all duration-150" })] })] }), searchInput && (_jsx(Button, { variant: "ghost", size: "md", onClick: () => { setSearchInput(''); setAllUsers([]); setCursor(null); }, children: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C" }))] }), _jsx("div", { className: "mt-3 text-zinc-500 text-xs", children: isLoading && allUsers.length === 0
                            ? 'Загрузка...'
                            : `Показано ${allUsers.length} пользователей` })] }), _jsxs("div", { className: "bg-surface rounded-2xl overflow-hidden shadow-sm", children: [_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-border-default/45 bg-[#141416]/50", children: [_jsx("th", { className: "px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold", children: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C" }), _jsx("th", { className: "px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold", children: "ID" }), _jsx("th", { className: "px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold", children: "\u0420\u043E\u043B\u044C" }), _jsx("th", { className: "px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold", children: "\u042F\u0437\u044B\u043A" }), _jsx("th", { className: "px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold whitespace-nowrap", children: "\u0414\u0430\u0442\u0430 \u0440\u0435\u0433." }), _jsx("th", { className: "px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold", children: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0440\u043E\u043B\u044C" }), _jsx("th", { className: "px-4 py-3.5 text-left text-zinc-500 text-xs uppercase tracking-wider font-semibold", children: "\u0411\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0430" })] }) }), isLoading && allUsers.length === 0 ? (_jsx(UserSkeleton, {})) : isError ? (_jsx("tbody", { children: _jsx("tr", { children: _jsx("td", { colSpan: 7, className: "px-4 py-12 text-center", children: _jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-red-400 text-sm", children: error instanceof Error ? error.message : 'Ошибка загрузки' }), _jsx(Button, { variant: "secondary", size: "sm", onClick: () => void refetch(), children: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C" })] }) }) }) })) : allUsers.length === 0 ? (_jsx("tbody", { children: _jsx("tr", { children: _jsx("td", { colSpan: 7, className: "px-4 py-12 text-center", children: _jsx("p", { className: "text-zinc-500 text-sm", children: searchInput ? 'Пользователи не найдены.' : 'Нет пользователей.' }) }) }) })) : (_jsx("tbody", { children: allUsers.map(user => (_jsx(UserRow, { user: user }, user.id))) }))] }) }), data?.nextCursor && (_jsx("div", { className: "px-4 py-4 border-t border-border-default/45 flex items-center justify-center", children: _jsx(Button, { variant: "secondary", onClick: () => setCursor(data.nextCursor ?? null), loading: isLoading, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0435\u0449\u0451" }) }))] })] }));
}
