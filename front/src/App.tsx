import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Player } from './components/Player';
import { Home } from './pages/Home';
import { SearchPage } from './pages/Search';
import { ArtistsPage } from './pages/Artists';
import { TracksPage } from './pages/Tracks';
import { AlbumsPage } from './pages/Albums';
import { PlaylistsPage } from './pages/Playlists';
import { GenresPage } from './pages/Genres';
import { ChartsPage } from './pages/Charts';
import { EventsPage } from './pages/Events';
import { LibraryPage } from './pages/Library';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { ProfilePage } from './pages/Profile';
import { SettingsPage } from './pages/Settings';
import { HelpPage } from './pages/Help';
import './App.css';
import type { Track } from './types';

function AppLayout() {
  const [currentTrack, setCurrentTrack] = useState<Track | undefined>(undefined);
  const handlePlayTrack = (track: Track) => setCurrentTrack({ ...track });

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="content-area">
          <Routes>
            <Route path="/" element={<Home onPlayTrack={handlePlayTrack} />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/artists" element={<ArtistsPage />} />
            <Route path="/tracks" element={<TracksPage onPlayTrack={handlePlayTrack} />} />
            <Route path="/albums" element={<AlbumsPage />} />
            <Route path="/playlists" element={<PlaylistsPage />} />
            <Route path="/genres" element={<GenresPage />} />
            <Route path="/charts" element={<ChartsPage onPlayTrack={handlePlayTrack} />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

        </div>
      </div>
      <Player currentTrack={currentTrack} />
    </div>
  );
}

function App() {
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

export default App;
