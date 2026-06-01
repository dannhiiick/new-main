import { useState, useCallback } from 'react';
export function useToast() {
    const [toasts, setToasts] = useState([]);
    const addToast = useCallback((message, variant = 'info') => {
        const id = Math.random().toString(36).slice(2);
        const toast = { id, message, variant };
        setToasts(prev => [...prev, toast]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);
    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);
    return { toasts, addToast, removeToast };
}
