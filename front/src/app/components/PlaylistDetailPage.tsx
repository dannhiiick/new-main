import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { Play, Disc, ArrowLeft, Trash2, ArrowUp, ArrowDown, Plus, Bookmark, BookmarkCheck } from 'lucide-react';
import { api, type Playlist, type Track } from './api';
import { useAuth } from './AuthContext';
import { usePlayback } from './PlaybackContext';
import { useLibrary } from './libraryStore';
import { useTranslation } from './i18n';

export function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playTrack } = usePlayback();
  const { saved, toggleSavedPlaylist } = useLibrary();
  const { t } = useTranslation();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [catalogTracks, setCatalogTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingTrack, setAddingTrack] = useState(false);

  const isSaved = id ? saved.includes(id) : false;
  const isOwner = playlist?.creator === user?.username || playlist?.user === user?.id;

  const fetchPlaylist = () => {
    if (!id) return;
    setLoading(true);
    // Fetch playlist detail from API (to get the exact current DB state)
    fetch(`/api/playlists/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("Playlist not found");
        return res.json() as Promise<Playlist>;
      })
      .then(data => {
        setPlaylist(data);
        setError(null);
      })
      .catch(err => {
        setError(err.message || "Error loading playlist");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPlaylist();
    // Also fetch catalog tracks for the "Add Track" feature
    api.tracks().then(setCatalogTracks).catch(() => {});
  }, [id]);

  const handlePlayAll = () => {
    if (playlist && playlist.tracks && playlist.tracks.length > 0) {
      playTrack(playlist.tracks[0], playlist.tracks);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!playlist || !window.confirm("Удалить этот плейлист?")) return;
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`/api/playlists/${playlist.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      navigate('/playlists');
    } catch {
      alert("Не удалось удалить плейлист");
    }
  };

  const handleAddTrack = async (trackId: string) => {
    if (!playlist) return;
    setAddingTrack(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/playlists/${playlist.id}/tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'add', track_id: trackId })
      });
      if (res.ok) {
        const updated = await res.json();
        setPlaylist(updated);
      }
    } catch {
      alert("Не удалось добавить трек");
    } finally {
      setAddingTrack(false);
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    if (!playlist) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/playlists/${playlist.id}/tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'remove', track_id: trackId })
      });
      if (res.ok) {
        const updated = await res.json();
        setPlaylist(updated);
      }
    } catch {
      alert("Не удалось удалить трек");
    }
  };

  const handleReorderTrack = async (trackId: string, currentIndex: number, direction: 'up' | 'down') => {
    if (!playlist) return;
    const targetOrder = direction === 'up' ? currentIndex : currentIndex + 2; // order is 1-indexed, so index 0 becomes 1
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === playlist.tracks.length - 1) return;

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/playlists/${playlist.id}/tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'reorder', track_id: trackId, order: targetOrder })
      });
      if (res.ok) {
        const updated = await res.json();
        setPlaylist(updated);
      }
    } catch {
      alert("Не удалось переместить трек");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="flex-1 p-6 bg-background">
        <Link to="/playlists" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm">
          <ArrowLeft size={16} /> {t('playlists')}
        </Link>
        <div className="text-center text-muted-foreground py-12">
          {error || "Плейлист не найден"}
        </div>
      </div>
    );
  }

  // Filter out tracks that are already in the playlist for the "Add Track" catalog view
  const playlistTrackIds = new Set(playlist.tracks.map(t => t.id));
  const availableTracks = catalogTracks.filter(t => !playlistTrackIds.has(t.id));

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex-1 overflow-y-auto p-6 bg-background">
      <Link to="/playlists" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm w-fit transition-colors">
        <ArrowLeft size={16} /> {t('playlists')}
      </Link>

      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden mb-8 border border-border bg-gradient-to-r from-blue-900/40 via-purple-900/20 to-card p-6 md:p-8 flex flex-col sm:flex-row gap-6 items-center sm:items-end">
        <div className="w-36 h-36 md:w-44 md:h-44 rounded-2xl shrink-0 flex items-center justify-center text-4xl font-bold text-white overflow-hidden shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #2563EB, #8B5CF6)' }}>
          {playlist.cover ? <img src={playlist.cover} alt={playlist.name} className="w-full h-full object-cover" /> : playlist.name.slice(0, 2).toUpperCase()}
        </div>

        <div className="flex-1 text-center sm:text-left min-w-0">
          <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            Плейлист • {playlist.type}
          </span>
          <h1 className="text-2xl md:text-4xl font-extrabold text-foreground mt-2 mb-2 tracking-tight truncate">
            {playlist.name}
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            {playlist.description || "Нет описания."}
          </p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
            <button
              onClick={handlePlayAll}
              disabled={!playlist.tracks || playlist.tracks.length === 0}
              className="px-6 py-3 bg-primary hover:bg-primary/95 text-white rounded-full text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50"
            >
              <Play size={16} className="fill-white" />
              <span>Слушать</span>
            </button>

            {id && (
              <button
                onClick={() => toggleSavedPlaylist(id)}
                className={`px-4 py-2.5 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-all border border-border cursor-pointer ${
                  isSaved ? 'bg-secondary text-primary' : 'bg-transparent text-foreground hover:bg-secondary'
                }`}
              >
                {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                <span>{isSaved ? 'Сохранено ✓' : 'Сохранить'}</span>
              </button>
            )}

            {isOwner && (
              <button
                onClick={handleDeletePlaylist}
                className="px-4 py-2.5 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-all border border-destructive/20 text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                <Trash2 size={16} />
                <span>Удалить плейлист</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tracks Section */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
          <Disc size={18} className="text-primary" /> Треки
        </h2>

        {playlist.tracks && playlist.tracks.length > 0 ? (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
            {playlist.tracks.map((track, i) => (
              <div
                key={track.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/40 group border-b border-border last:border-0"
              >
                {/* Play action when clicking track info */}
                <div onClick={() => playTrack(track, playlist.tracks)} className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                  <span className="text-xs text-muted-foreground w-5 text-center group-hover:hidden">{i + 1}</span>
                  <Play size={13} className="text-primary hidden group-hover:block w-5" />
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #2563EB, #8B5CF6)' }}>
                    {track.coverUrl ? <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" /> : track.title.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                  </div>
                </div>

                {/* Track Order Reordering (Owner only) */}
                {isOwner && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleReorderTrack(track.id, i, 'up')}
                      disabled={i === 0}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 cursor-pointer transition-colors"
                      title="Переместить вверх"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => handleReorderTrack(track.id, i, 'down')}
                      disabled={i === playlist.tracks.length - 1}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 cursor-pointer transition-colors"
                      title="Переместить вниз"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                )}

                {/* Remove Track (Owner only) */}
                {isOwner && (
                  <button
                    onClick={() => handleRemoveTrack(track.id)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                    title="Удалить из плейлиста"
                  >
                    <Trash2 size={15} />
                  </button>
                )}

                <span className="text-xs text-muted-foreground tabular-nums select-none">
                  {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-12 border border-dashed border-border rounded-2xl">
            В этом плейлисте пока нет треков.
          </div>
        )}
      </section>

      {/* Add Track Catalog Panel (Owner only) */}
      {isOwner && availableTracks.length > 0 && (
        <section className="mt-8 border-t border-border pt-8">
          <h3 className="text-lg font-bold text-foreground mb-4">Добавить треки в плейлист</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableTracks.slice(0, 10).map(track => (
              <div
                key={track.id}
                className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #10B981, #06B6D4)' }}>
                  {track.coverUrl ? <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" /> : track.title.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{track.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                </div>
                <button
                  disabled={addingTrack}
                  onClick={() => handleAddTrack(track.id)}
                  className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white cursor-pointer transition-all flex items-center justify-center"
                >
                  <Plus size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
