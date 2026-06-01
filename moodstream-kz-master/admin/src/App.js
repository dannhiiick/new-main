import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { CatalogList } from './pages/catalog/CatalogList';
import { CatalogDetail } from './pages/catalog/CatalogDetail';
import { ArtistList } from './pages/artists/ArtistList';
import { ArtistDetail } from './pages/artists/ArtistDetail';
import { ReleaseList } from './pages/releases/ReleaseList';
import { ReleaseDetail } from './pages/releases/ReleaseDetail';
import { IngestionPage } from './pages/ingestion/IngestionPage';
import { UsersPage } from './pages/users/UsersPage';
import { AnalyticsPage } from './pages/analytics/AnalyticsPage';
import { FeedbackPage } from './pages/feedback/FeedbackPage';
import { ToastProvider } from './lib/toastContext';
export default function App() {
    return (_jsx(ToastProvider, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsxs(Route, { element: _jsx(Layout, {}), children: [_jsx(Route, { index: true, element: _jsx(Navigate, { to: "/catalog", replace: true }) }), _jsx(Route, { path: "/catalog", element: _jsx(CatalogList, {}) }), _jsx(Route, { path: "/catalog/:id", element: _jsx(CatalogDetail, {}) }), _jsx(Route, { path: "/artists", element: _jsx(ArtistList, {}) }), _jsx(Route, { path: "/artists/:id", element: _jsx(ArtistDetail, {}) }), _jsx(Route, { path: "/releases", element: _jsx(ReleaseList, {}) }), _jsx(Route, { path: "/releases/:id", element: _jsx(ReleaseDetail, {}) }), _jsx(Route, { path: "/ingestion", element: _jsx(IngestionPage, {}) }), _jsx(Route, { path: "/users", element: _jsx(UsersPage, {}) }), _jsx(Route, { path: "/analytics", element: _jsx(AnalyticsPage, {}) }), _jsx(Route, { path: "/feedback", element: _jsx(FeedbackPage, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/catalog", replace: true }) })] })] }) }));
}
