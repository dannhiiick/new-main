import { useEffect, useState } from 'react';
import { fetchArtists } from '../api/catalog';
import type { Artist } from '../types';
import './Artists.css';

export function ArtistsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchArtists();
        if (mounted) setArtists(data);
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
      <div className="artists-page">
        <h2>Артисты</h2>
        <div style={{ padding: 12 }}>Загрузка...</div>
      </div>
    );

  if (error)
    return (
      <div className="artists-page">
        <h2>Артисты</h2>
        <div style={{ padding: 12, color: 'crimson', fontWeight: 700 }}>{error}</div>
      </div>
    );

  return (
    <div className="artists-page">
      <h2>Артисты</h2>
      <div className="artists-list">
        {artists.map((artist) => (
          <div key={artist.id} className="artist-profile-card">
            <div className="artist-header">
              <div className="artist-cover">{artist.image || '—'}</div>
              <div className="artist-info">
                <h3>{artist.name}</h3>
                <p className="bio">{artist.bio}</p>
                <div className="artist-meta">
                  <span>
                    {artist.city}, {artist.country}
                  </span>
                  <span>{artist.genre}</span>
                  <span>{(artist.followers / 1000000).toFixed(1)} млн подписчиков</span>
                </div>
                <div className="artist-actions">
                  <button className="action-btn play" type="button">
                    Слушать
                  </button>
                  <button className="action-btn follow" type="button">
                    Подписаться
                  </button>
                  <button className="action-btn more" type="button">
                    ⋯
                  </button>
                </div>
              </div>
            </div>

            <div className="artist-section">
              <h4>Популярные треки</h4>
              <div className="songs-list">
                {artist.tracks.slice(0, 3).map((track, idx) => (
                  <div key={track.id} className="song-item">
                    <span className="rank">{idx + 1}</span>
                    <div className="song-info">
                      <p className="song-title">{track.title}</p>
                      <p className="song-meta">
                        {track.artist} • {(track.duration / 60).toFixed(1)} мин
                      </p>
                    </div>
                    <span className="plays">{(track.plays / 1000000).toFixed(1)} млн</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

