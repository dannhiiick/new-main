import { useEffect, useState } from 'react';
import { fetchAlbums } from '../api/catalog';
import type { Album } from '../types';
import './Albums.css';

export function AlbumsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchAlbums();
        if (mounted) setAlbums(data);
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
      <div className="albums-page">
        <h2>Альбомы</h2>
        <div style={{ padding: 12 }}>Загрузка...</div>
      </div>
    );

  if (error)
    return (
      <div className="albums-page">
        <h2>Альбомы</h2>
        <div style={{ padding: 12, color: 'crimson', fontWeight: 700 }}>{error}</div>
      </div>
    );

  return (
    <div className="albums-page">
      <h2>Альбомы</h2>
      <div className="albums-list">
        {albums.map((album) => (
          <div key={album.id} className="album-item">
            <div className="album-cover">{album.cover || '—'}</div>
            <div className="album-content">
              <h4>{album.title}</h4>
              <p className="artist">{album.artist}</p>
              <p className="year">{album.year}</p>
              <p className="tracks">{album.tracks.length} треков</p>
              <button className="play-btn" type="button">
                Слушать альбом
              </button>
            </div>
            <div className="album-stats">
              <div className="stat">
                <span className="label">Треки</span>
                <span className="value">{album.tracks.length}</span>
              </div>
              <div className="stat">
                <span className="label">Длительность</span>
                <span className="value">
                  {(album.tracks.reduce((acc, t) => acc + t.duration, 0) / 60).toFixed(0)} мин
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

