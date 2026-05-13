import { useEffect, useState } from 'react';
import type { Album, Artist, Playlist, Track } from '../types';
import { fetchAlbums, fetchArtists, fetchPlaylists, fetchTracks } from '../api/catalog';
import { Heart, Play } from 'lucide-react';
import './Home.css';

interface HomeProps {
  onPlayTrack?: (track: Track) => void;
}

function isLikelyImageUrl(value: string | undefined): boolean {
  if (!value) return false;
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/media/');
}

function trackCoverSrc(track: Track): string | undefined {
  if (track.coverUrl) return track.coverUrl;
  if (isLikelyImageUrl(track.cover)) return track.cover;
  return undefined;
}

function albumCoverSrc(album: Album): string | undefined {
  if (isLikelyImageUrl(album.cover)) return album.cover;
  const fromTrack = album.tracks.map(trackCoverSrc).find(Boolean);
  return fromTrack;
}

function playlistCoverSrc(playlist: Playlist): string | undefined {
  if (isLikelyImageUrl(playlist.cover)) return playlist.cover;
  const fromTrack = playlist.tracks.map(trackCoverSrc).find(Boolean);
  return fromTrack;
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} млн подписчиков`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} тыс. подписчиков`;
  return `${n} подписчиков`;
}

export function Home({ onPlayTrack }: HomeProps) {
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [t, al, p, a] = await Promise.all([
          fetchTracks(),
          fetchAlbums(),
          fetchPlaylists(),
          fetchArtists(),
        ]);
        if (!mounted) return;
        setTracks(t);
        setAlbums(al);
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
          {tracks.slice(0, 8).map((track) => {
            const cover = trackCoverSrc(track);
            return (
              <div key={track.id} className="track-card">
                <div className="card-image">
                  {cover ? (
                    <img src={cover} alt="" loading="lazy" />
                  ) : (
                    track.cover || '—'
                  )}
                </div>
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
            );
          })}
        </div>
      </section>

      <section className="content-section">
        <div className="section-header">
          <h3>Новые релизы</h3>
          <a href="/albums" className="see-all">Смотреть все</a>
        </div>
        <div className="albums-grid">
          {albums.slice(0, 3).map((album) => {
            const cover = albumCoverSrc(album);
            return (
              <div key={album.id} className="album-card">
                <div className="album-cover">
                  {cover ? <img src={cover} alt="" loading="lazy" /> : album.cover || '—'}
                </div>
                <h4>{album.title}</h4>
                <p>{album.artist}</p>
                <button
                  className="album-play-btn"
                  type="button"
                  onClick={() => {
                    const firstTrack = album.tracks.find((track) => track.audioUrl);
                    if (firstTrack) onPlayTrack?.(firstTrack);
                  }}
                  disabled={!album.tracks.some((track) => track.audioUrl)}
                >
                  <Play size={18} />
                  Слушать
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="content-section">
        <div className="section-header">
          <h3>Артисты Казахстана</h3>
          <a href="/artists" className="see-all">Смотреть все</a>
        </div>
        <div className="artists-grid">
          {artists.map((artist) => {
            const img = isLikelyImageUrl(artist.image) ? artist.image : undefined;
            return (
              <div key={artist.id} className="artist-card">
                <div className="artist-image">
                  {img ? <img src={img} alt="" loading="lazy" /> : artist.image || '—'}
                </div>
                <h4>{artist.name}</h4>
                <p>{artist.genre}</p>
                <p className="followers">{formatFollowers(artist.followers)}</p>
                <button className="follow-btn" type="button">
                  Подписаться
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="content-section">
        <div className="section-header">
          <h3>Рекомендации для вас</h3>
          <a href="/playlists" className="see-all">Смотреть все</a>
        </div>
        <div className="playlist-row">
          {playlists.map((playlist) => {
            const cover = playlistCoverSrc(playlist);
            return (
              <div key={playlist.id} className="playlist-mini-card">
                <div className="mini-cover">
                  {cover ? <img src={cover} alt="" loading="lazy" /> : playlist.cover || '—'}
                </div>
                <div className="mini-info">
                  <h5>{playlist.name}</h5>
                  <p>{playlist.tracks.length} треков</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
