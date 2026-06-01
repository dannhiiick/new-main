import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { getAdminToken, clearAdminToken } from '../lib/api';
const NAV_ITEMS = [
    {
        to: '/catalog',
        label: 'Каталог',
        icon: (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-5 h-5", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 9l10.5-3m0 0v15m0-15l-10.5 3M9 9V21m0-12a3 3 0 100-6 3 3 0 000 6zm10.5-3a3 3 0 100-6 3 3 0 000 6z" }) }))
    },
    {
        to: '/artists',
        label: 'Артисты',
        icon: (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-5 h-5", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" }) }))
    },
    {
        to: '/releases',
        label: 'Релизы',
        icon: (_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-5 h-5", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("circle", { cx: "12", cy: "12", r: "3" })] }))
    },
    {
        to: '/ingestion',
        label: 'Загрузка',
        icon: (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-5 h-5", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" }) }))
    },
    {
        to: '/users',
        label: 'Пользователи',
        icon: (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-5 h-5", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" }) }))
    },
    {
        to: '/analytics',
        label: 'Аналитика',
        icon: (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-5 h-5", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v5.25c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 013 18.375v-5.25zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125v-9.75zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v14.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" }) }))
    },
    {
        to: '/feedback',
        label: 'Обратная связь',
        icon: (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-5 h-5", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" }) }))
    },
];
const ROUTE_LABELS = {
    '/catalog': 'Каталог треков',
    '/artists': 'Артисты',
    '/releases': 'Релизы',
    '/ingestion': 'Загрузка трека',
    '/users': 'Пользователи',
    '/analytics': 'Аналитика',
    '/feedback': 'Обратная связь',
};
function getBreadcrumb(pathname) {
    if (pathname.startsWith('/catalog/'))
        return 'Детали трека';
    return ROUTE_LABELS[pathname] ?? pathname;
}
export function Layout() {
    const token = getAdminToken();
    const location = useLocation();
    if (!token) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    function handleLogout() {
        clearAdminToken();
        window.location.href = '/login';
    }
    const breadcrumb = getBreadcrumb(location.pathname);
    return (_jsxs("div", { className: "flex h-screen bg-[#09090B] text-[#E5E5E7] overflow-hidden", children: [_jsxs("aside", { className: "w-60 bg-[#141416] border-r border-[#1C1C1F] flex flex-col shrink-0", children: [_jsx("div", { className: "px-6 py-5 border-b border-[#1C1C1F]", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("svg", { viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", className: "w-6 h-6 text-accent shrink-0", children: _jsx("path", { d: "M4 12L4 12.01M8 8L8 16M12 4L12 20M16 8L16 16M20 12L20 12.01", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-white font-semibold text-sm leading-none tracking-wide", children: "MoodStream" }), _jsx("p", { className: "text-zinc-600 text-[10px] uppercase mt-1 leading-none tracking-widest font-medium", children: "Admin Panel" })] })] }) }), _jsxs("nav", { className: "flex-1 px-4 py-6 overflow-y-auto", children: [_jsx("p", { className: "text-zinc-600 text-[10px] uppercase tracking-widest px-2.5 mb-3 font-semibold", children: "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435" }), _jsx("ul", { className: "space-y-1", children: NAV_ITEMS.map(item => (_jsx("li", { children: _jsxs(NavLink, { to: item.to, className: ({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${isActive
                                            ? 'bg-[#202024] text-white font-medium'
                                            : 'text-zinc-400 hover:text-white hover:bg-[#202024]/40'}`, children: [_jsx("span", { className: "shrink-0", children: item.icon }), item.label] }) }, item.to))) })] }), _jsxs("div", { className: "px-4 py-4 border-t border-[#1C1C1F] bg-[#101012]/40", children: [_jsxs("div", { className: "flex items-center gap-3 px-2 py-2 rounded-lg bg-[#202024]/30", children: [_jsx("div", { className: "w-8 h-8 rounded-full bg-[#202024] flex items-center justify-center shrink-0 border border-[#2C2C32]", children: _jsx("span", { className: "text-[#D4D1CA] text-xs font-semibold", children: "A" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-white text-xs font-medium truncate", children: "Admin" }), _jsx("p", { className: "text-zinc-500 text-[9px] uppercase tracking-wider truncate font-semibold", children: "CATALOG_MANAGER" })] })] }), _jsxs("button", { onClick: handleLogout, className: "mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-transparent text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-all duration-150 text-xs font-medium", children: [_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", className: "w-4 h-4", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" }) }), "\u0412\u044B\u0439\u0442\u0438"] })] })] }), _jsxs("div", { className: "flex-1 flex flex-col min-w-0 overflow-hidden", children: [_jsx("header", { className: "h-14 bg-[#141416] border-b border-[#1C1C1F] flex items-center px-8 shrink-0", children: _jsxs("div", { className: "flex items-center gap-2 text-xs uppercase tracking-wider font-semibold", children: [_jsx("span", { className: "text-zinc-600", children: "Admin" }), _jsx("span", { className: "text-zinc-800", children: "/" }), _jsx("span", { className: "text-white font-bold", children: breadcrumb })] }) }), _jsx("main", { className: "flex-1 overflow-y-auto p-8", children: _jsx(Outlet, {}) })] })] }));
}
