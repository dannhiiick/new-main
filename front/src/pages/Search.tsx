import { useEffect, useState } from 'react';
import type { Artist, Album, Playlist, Track } from '../types';
import { fetchAlbums, fetchArtists, fetchPlaylists, fetchTracks } from '../api/catalog';
import { Search } from 'lucide-react';
import type { CSSProperties } from 'react';
import './Search.css';

const categories = [
  { name: 'Q-pop', emoji: 'QP', color: '#1d4ed8' },
  { name: 'Хип-хоп KZ', emoji: 'HH', color: '#7c3aed' },
  { name: 'Казахский поп', emoji: 'KP', color: '#0f766e' },
  { name: 'Этно', emoji: 'ET', color: '#d97706' },
  { name: 'Танцевальная', emoji: 'DN', color: '#0ea5a5' },
  { name: 'Инди', emoji: 'IN', color: '#475569' },
];

export function SearchPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [t, a, al, p] = await Promise.all([
          fetchTracks(),
          fetchArtists(),
          fetchAlbums(),
          fetchPlaylists(),
        ]);
        if (!mounted) return;
        setTracks(t);
        setArtists(a);
        setAlbums(al);
        setPlaylists(p);
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

  return (
    <div className="search-page">
      <div className="search-hero">
        <h2>Поиск музыки</h2>
        <div className="search-input-group">
          <Search size={20} />
          <input type="text" placeholder="Введите артиста, трек, альбом, жанр или плейлист..." />
        </div>
      </div>

      {error ? (
        <div style={{ padding: 12, color: 'crimson', fontWeight: 700 }}>{error}</div>
      ) : null}

      <section className="categories-section">
        <h3>Популярные категории</h3>
        <div className="categories-grid">
          {categories.map((cat) => (
            <div
              key={cat.name}
              className="category-card"
              style={{ '--accent-color': cat.color } as CSSProperties}
            >
              <div className="category-emoji">{cat.emoji}</div>
              <h4>{cat.name}</h4>
            </div>
          ))}
        </div>
      </section>

      <section className="browse-section">
        <h3>Обзор разделов</h3>
        <div className="browse-grid">
          <div className="browse-item">Все треки{loading ? '' : ` (${tracks.length})`}</div>
          <div className="browse-item">Все артисты{loading ? '' : ` (${artists.length})`}</div>
          <div className="browse-item">Все альбомы{loading ? '' : ` (${albums.length})`}</div>
          <div className="browse-item">Все плейлисты{loading ? '' : ` (${playlists.length})`}</div>
        </div>
      </section>
    </div>
  );
}

