import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const variantClasses = {
    success: 'bg-green-900/80 border-green-700 text-green-100',
    error: 'bg-red-900/80 border-red-700 text-red-100',
    info: 'bg-[#1e1e1e] border-[#2a2a2a] text-white',
};
const variantIcon = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
};
function ToastItem({ toast, onRemove }) {
    return (_jsxs("div", { className: `
        flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl
        backdrop-blur-sm min-w-[280px] max-w-[400px]
        animate-in slide-in-from-right-5 fade-in duration-200
        ${variantClasses[toast.variant]}
      `, children: [_jsx("span", { className: "text-sm font-bold shrink-0", children: variantIcon[toast.variant] }), _jsx("span", { className: "text-sm flex-1", children: toast.message }), _jsx("button", { onClick: () => onRemove(toast.id), className: "text-current opacity-50 hover:opacity-100 transition-opacity shrink-0 text-xs", "aria-label": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C", children: "\u2715" })] }));
}
export function ToastContainer({ toasts, onRemove }) {
    return (_jsx("div", { className: "fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end pointer-events-none", children: toasts.map(toast => (_jsx("div", { className: "pointer-events-auto", children: _jsx(ToastItem, { toast: toast, onRemove: onRemove }) }, toast.id))) }));
}
