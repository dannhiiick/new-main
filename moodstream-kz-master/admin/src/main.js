import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './lib/toastContext';
import App from './App';
import './index.css';
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            staleTime: 30000,
        },
    },
});
const root = document.getElementById('root');
if (!root)
    throw new Error('Root element not found');
ReactDOM.createRoot(root).render(_jsx(React.StrictMode, { children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(BrowserRouter, { children: _jsx(ToastProvider, { children: _jsx(App, {}) }) }) }) }));
