import { useEffect, useState } from 'react';
import type { Artist, Playlist, Track } from '../types';
import { fetchArtists, fetchPlaylists, fetchTracks } from '../api/catalog';
import { Heart, Play } from 'lucide-react';
import './Home.css';

interface HomeProps {
  onPlayTrack?: (track: Track) => void;
}

export function Home({ onPlayTrack }: HomeProps) {
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [t, p, a] = await Promise.all([fetchTracks(), fetchPlaylists(), fetchArtists()]);
        if (!mounted) return;
        setTracks(t);
        setPlaylists(p);
        setArtists(a);
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
      <div className="home">
        <div style={{ padding: 12 }}>Загрузка...</div>
      </div>
    );

  if (error)
    return (
      <div className="home">
        <div style={{ padding: 12, color: 'crimson', fontWeight: 700 }}>{error}</div>
      </div>
    );

  return (
    <div className="home">
      <section className="hero-section">
        <div className="hero-content">
          <h2>Добро пожаловать</h2>
          <p>Откройте новые хиты и свежие релизы Казахстана: {tracks.length} треков в каталоге</p>
        </div>
        <div className="hero-gradient" />
      </section>

      <section className="content-section">
        <div className="section-header">
          <h3>Тренды сейчас</h3>
          <a href="/charts" className="see-all">Смотреть все</a>
        </div>
        <div className="tracks-grid">
          {tracks.slice(0, 8).map((track) => (
            <div key={track.id} className="track-card">
              <div className="card-image">{track.cover || '—'}</div>
              <div className="card-content">
                <h4>{track.title}</h4>
                <p>{track.artist}</p>
                <div className="card-actions">
                  <button
                    className="action-btn play"
                    type="button"
                    aria-label="play"
                    onClick={() => onPlayTrack?.(track)}
                    disabled={!track.audioUrl}
                  >
                    <Play size={16} />
                  </button>
                  <button className="action-btn like" type="button" aria-label="like">
                    <Heart size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="content-section">
        <div className="section-header">
          <h3>Новые релизы</h3>
          <a href="/albums" className="see-all">Смотреть все</a>
        </div>
        <div className="albums-grid">
          {playlists.slice(0, 3).map((playlist) => (
            <div key={playlist.id} className="album-card">
              <div className="album-cover">{playlist.cover || '—'}</div>
              <h4>{playlist.name}</h4>
              <p>{playlist.description}</p>
              <button
                className="album-play-btn"
                type="button"
                onClick={() => {
                  const firstTrack = playlist.tracks.find((track) => track.audioUrl);
                  if (firstTrack) onPlayTrack?.(firstTrack);
                }}
                disabled={!playlist.tracks.some((track) => track.audioUrl)}
              >
                <Play size={18} />
                Слушать
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="content-section">
        <div className="section-header">
          <h3>Артисты Казахстана</h3>
          <a href="/artists" className="see-all">Смотреть все</a>
        </div>
        <div className="artists-grid">
          {artists.map((artist) => (
            <div key={artist.id} className="artist-card">
              <div className="artist-image">{artist.image || '—'}</div>
              <h4>{artist.name}</h4>
              <p>{artist.genre}</p>
              <p className="followers">{(artist.followers / 1000000).toFixed(1)} млн подписчиков</p>
              <button className="follow-btn" type="button">
                Подписаться
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="content-section">
        <div className="section-header">
          <h3>Рекомендации для вас</h3>
          <a href="#" className="see-all">Смотреть все</a>
        </div>
        <div className="playlist-row">
          {playlists.map((playlist) => (
            <div key={playlist.id} className="playlist-mini-card">
              <div className="mini-cover">{playlist.cover || '—'}</div>
              <div className="mini-info">
                <h5>{playlist.name}</h5>
                <p>{playlist.tracks.length} треков</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
