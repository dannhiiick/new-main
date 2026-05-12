import { useEffect, useState } from 'react';
import { fetchPlaylists } from '../api/catalog';
import type { Playlist } from '../types';
import './Playlists.css';

export function PlaylistsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchPlaylists();
        if (mounted) setPlaylists(data);
      } catch (e) {
        if (mounted) setError((e as Error).message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading)
    return (
      <div className="playlists-page">
        <h2>Плейлисты</h2>
        <div style={{ padding: 12 }}>Загрузка...</div>
      </div>
    );

  if (error)
    return (
      <div className="playlists-page">
        <h2>Плейлисты</h2>
        <div style={{ padding: 12, color: 'crimson', fontWeight: 700 }}>{error}</div>
      </div>
    );

  return (
    <div className="playlists-page">
      <h2>Плейлисты</h2>
      <div className="playlists-grid">
        {playlists.map((playlist) => (
          <div key={playlist.id} className="playlist-card">
            <div className="playlist-cover">{playlist.cover || '—'}</div>
            <h4>{playlist.name}</h4>
            <p className="description">{playlist.description}</p>
            <p className="type">
              {playlist.type === 'editorial'
                ? 'Редакционный'
                : playlist.type === 'thematic'
                  ? 'Тематический'
                  : 'Пользовательский'}
            </p>
            <p className="count">{playlist.tracks.length} треков</p>
            <button className="playlist-play-btn" type="button">
              Слушать плейлист
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

