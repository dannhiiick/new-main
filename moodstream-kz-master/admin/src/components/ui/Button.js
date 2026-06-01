import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const variantClasses = {
    primary: 'bg-white text-black hover:bg-[#E5E5E7] active:bg-[#C8C8CA] disabled:bg-white/40 disabled:text-black/40 font-medium shadow-sm',
    secondary: 'bg-[#202024] text-white hover:bg-[#2C2C32] active:bg-[#18181C] disabled:bg-[#141416] disabled:text-zinc-600',
    danger: 'bg-red-950/40 text-red-400 hover:bg-red-900/35 active:bg-red-950/60 disabled:bg-red-950/10 disabled:text-red-900/50',
    ghost: 'bg-transparent text-zinc-400 hover:text-white hover:bg-[#202024]/50 disabled:text-zinc-600',
};
const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-md',
    md: 'px-4 py-2.5 text-sm rounded-lg',
};
export function Button({ variant = 'secondary', size = 'md', loading = false, disabled, className = '', children, ...rest }) {
    return (_jsxs("button", { className: `
        inline-flex items-center justify-center gap-2 transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-[#D4D1CA]/30
        cursor-pointer disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `, disabled: disabled ?? loading, ...rest, children: [loading && (_jsxs("svg", { className: "animate-spin h-3.5 w-3.5", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" })] })), children] }));
}
