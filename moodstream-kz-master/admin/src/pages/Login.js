import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminFetch, setAdminToken } from '../lib/api';
import { Button } from '../components/ui/Button';
export function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    async function handleLogin(e) {
        e.preventDefault();
        if (!email.trim() || !password)
            return;
        setLoading(true);
        setError(null);
        try {
            const data = await adminFetch('/api/v1/auth/email/login', {
                method: 'POST',
                body: JSON.stringify({ email: email.trim(), password }),
            });
            const allowedRoles = ['ADMIN', 'CATALOG_MANAGER'];
            if (!allowedRoles.includes(data.user.role)) {
                setError('Нет доступа. Требуется роль ADMIN или CATALOG_MANAGER.');
                return;
            }
            setAdminToken(data.accessToken);
            navigate('/catalog');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Неверный email или пароль');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("div", { className: "min-h-screen bg-[#09090B] flex items-center justify-center px-4 font-sans", children: _jsxs("div", { className: "w-full max-w-sm", children: [_jsxs("div", { className: "flex items-center justify-center gap-3 mb-8", children: [_jsx("svg", { viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", className: "w-8 h-8 text-[#D4D1CA] shrink-0", children: _jsx("path", { d: "M4 12L4 12.01M8 8L8 16M12 4L12 20M16 8L16 16M20 12L20 12.01", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-white font-semibold text-lg leading-none tracking-wide", children: "MoodStream" }), _jsx("p", { className: "text-zinc-500 text-[10px] uppercase tracking-widest mt-1.5 font-semibold", children: "Admin Panel" })] })] }), _jsx("div", { className: "bg-[#141416] rounded-2xl p-8 shadow-xl shadow-black/30 border border-[#1C1C1F]/40", children: _jsxs("form", { onSubmit: e => void handleLogin(e), className: "space-y-5", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-white font-semibold text-base uppercase tracking-wide", children: "\u0412\u0445\u043E\u0434" }), _jsx("p", { className: "text-zinc-500 text-xs mt-1", children: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 email \u0438 \u043F\u0430\u0440\u043E\u043B\u044C \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430" })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { className: "text-zinc-500 text-[10px] font-semibold uppercase tracking-wider", children: "Email" }), _jsx("input", { type: "email", value: email, onChange: e => setEmail(e.target.value), placeholder: "admin@example.com", className: "w-full bg-[#202024] border border-[#1C1C1F] rounded-lg px-3.5 py-2.5 text-white placeholder-zinc-700 text-sm focus:outline-none focus:border-[#D4D1CA]/80 focus:ring-1 focus:ring-[#D4D1CA]/80 transition-all duration-200", autoComplete: "email", autoFocus: true, required: true })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { className: "text-zinc-500 text-[10px] font-semibold uppercase tracking-wider", children: "\u041F\u0430\u0440\u043E\u043B\u044C" }), _jsx("input", { type: "password", value: password, onChange: e => setPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", className: "w-full bg-[#202024] border border-[#1C1C1F] rounded-lg px-3.5 py-2.5 text-white placeholder-zinc-700 text-sm focus:outline-none focus:border-[#D4D1CA]/80 focus:ring-1 focus:ring-[#D4D1CA]/80 transition-all duration-200", autoComplete: "current-password", required: true })] }), error && (_jsx("div", { className: "bg-red-950/20 border border-red-950/60 rounded-lg px-4 py-3 text-red-400 text-xs", children: error })), _jsx(Button, { type: "submit", variant: "primary", className: "w-full", size: "md", loading: loading, children: "\u0412\u043E\u0439\u0442\u0438" })] }) }), _jsx("p", { className: "text-center text-zinc-700 text-[10px] uppercase tracking-widest mt-8 font-semibold", children: "MoodStream KZ Admin v1.0" })] }) }));
}
