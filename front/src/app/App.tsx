import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useState } from 'react';
import { AuthProvider } from './components/AuthContext';
import { I18nProvider } from './components/i18n';
import { PlaybackProvider } from './components/PlaybackContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Player } from './components/Player';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { HomePage } from './components/HomePage';
import { TracksPage } from './components/TracksPage';
import { ArtistsPage } from './components/ArtistsPage';
import { AlbumsPage } from './components/AlbumsPage';
import { PlaylistsPage } from './components/PlaylistsPage';
import { GenresPage } from './components/GenresPage';
import { ChartsPage } from './components/ChartsPage';
import { EventsPage } from './components/EventsPage';
import { LibraryPage } from './components/LibraryPage';
import { SearchPage } from './components/SearchPage';
import { ProfilePage } from './components/ProfilePage';
import { SettingsPage } from './components/SettingsPage';
import { HelpPage } from './components/HelpPage';
import { ArtistDetailPage } from './components/ArtistDetailPage';
import { AlbumDetailPage } from './components/AlbumDetailPage';
import { PlaylistDetailPage } from './components/PlaylistDetailPage';
import { PremiumPage } from './components/PremiumPage';

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      style={{ fontFamily: "'Inter', sans-serif" }}
      className="flex h-screen bg-background overflow-hidden"
    >
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <div className="flex-1 overflow-hidden flex flex-col">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/tracks" element={<TracksPage />} />
            <Route path="/artists" element={<ArtistsPage />} />
            <Route path="/artists/:id" element={<ArtistDetailPage />} />
            <Route path="/albums" element={<AlbumsPage />} />
            <Route path="/albums/:id" element={<AlbumDetailPage />} />
            <Route path="/playlists" element={<PlaylistsPage />} />
            <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
            <Route path="/genres" element={<GenresPage />} />
            <Route path="/charts" element={<ChartsPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/premium" element={<PremiumPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <Player />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <I18nProvider>
          <PlaybackProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/*" element={<AppLayout />} />
              </Route>
            </Routes>
          </PlaybackProvider>
        </I18nProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
