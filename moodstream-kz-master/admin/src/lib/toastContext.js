import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useContext } from 'react';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/ui/Toast';
const ToastContext = createContext(null);
export function ToastProvider({ children }) {
    const { toasts, addToast, removeToast } = useToast();
    return (_jsxs(ToastContext.Provider, { value: { addToast }, children: [children, _jsx(ToastContainer, { toasts: toasts, onRemove: removeToast })] }));
}
export function useToastContext() {
    const ctx = useContext(ToastContext);
    if (!ctx)
        throw new Error('useToastContext must be used within ToastProvider');
    return ctx;
}
