import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useState } from 'react';
import { AuthProvider } from './components/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Player } from './components/Player';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
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
import type { Track } from './components/api';
import { pushRecent } from './components/libraryStore';

function AppLayout() {
  const [currentTrack, setCurrentTrack] = useState<Track | undefined>();

  const handlePlay = (track: Track) => {
    setCurrentTrack({ ...track });
    pushRecent(track);
  };

  return (
    <div
      style={{ fontFamily: "'Inter', sans-serif" }}
      className="flex h-screen bg-background overflow-hidden"
    >
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <div className="flex-1 overflow-hidden flex flex-col">
          <Routes>
            <Route path="/" element={<HomePage onPlayTrack={handlePlay} />} />
            <Route path="/search" element={<SearchPage onPlayTrack={handlePlay} />} />
            <Route path="/tracks" element={<TracksPage onPlayTrack={handlePlay} />} />
            <Route path="/artists" element={<ArtistsPage />} />
            <Route path="/albums" element={<AlbumsPage />} />
            <Route path="/playlists" element={<PlaylistsPage />} />
            <Route path="/genres" element={<GenresPage />} />
            <Route path="/charts" element={<ChartsPage onPlayTrack={handlePlay} />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <Player currentTrack={currentTrack} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/*" element={<AppLayout />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
