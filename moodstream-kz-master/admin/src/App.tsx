import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { CatalogList } from './pages/catalog/CatalogList'
import { CatalogDetail } from './pages/catalog/CatalogDetail'
import { ArtistList } from './pages/artists/ArtistList'
import { ArtistDetail } from './pages/artists/ArtistDetail'
import { ReleaseList } from './pages/releases/ReleaseList'
import { ReleaseDetail } from './pages/releases/ReleaseDetail'
import { IngestionPage } from './pages/ingestion/IngestionPage'
import { UsersPage } from './pages/users/UsersPage'
import { AnalyticsPage } from './pages/analytics/AnalyticsPage'
import { FeedbackPage } from './pages/feedback/FeedbackPage'
import { ToastProvider } from './lib/toastContext'

export default function App(): React.ReactElement {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/catalog" replace />} />
          <Route path="/catalog" element={<CatalogList />} />
          <Route path="/catalog/:id" element={<CatalogDetail />} />
          <Route path="/artists" element={<ArtistList />} />
          <Route path="/artists/:id" element={<ArtistDetail />} />
          <Route path="/releases" element={<ReleaseList />} />
          <Route path="/releases/:id" element={<ReleaseDetail />} />
          <Route path="/ingestion" element={<IngestionPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="*" element={<Navigate to="/catalog" replace />} />
        </Route>
      </Routes>
    </ToastProvider>
  )
}
