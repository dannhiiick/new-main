import { useMemo } from 'react';
import type { Artist, Playlist, Track } from '../types';
import './Library.css';

// Пока в библиотеке не реализована авторизованная часть (endpoint'ы).
// Оставляем структуру UI, но убираем мок-данные.
export function LibraryPage() {
  const empty = useMemo(() => {
    return {
      tracks: [] as Track[],
      playlists: [] as Playlist[],
      artists: [] as Artist[],
    };
  }, []);

  return (
    <div className="library-page">
      <h2>Моя музыка</h2>

      <div className="library-tabs">
        <button className="tab-btn active" type="button">
          Избранное
        </button>
        <button className="tab-btn" type="button">
          Плейлисты
        </button>
        <button className="tab-btn" type="button">
          Загружки
        </button>
        <button className="tab-btn" type="button">
          Подписки
        </button>
      </div>

      <section className="library-section">
        <div className="section-header">
          <h3>Любимые треки</h3>
          <span className="count">{empty.tracks.length} треков</span>
        </div>
        <div className="tracks-list">
          {empty.tracks.map((track, idx) => (
            <div key={track.id} className="library-track">
              <span className="track-num">{idx + 1}</span>
              <span className="track-cover">{track.cover}</span>
              <div className="track-info">
                <p className="track-title">{track.title}</p>
                <p className="track-artist">{track.artist}</p>
              </div>
              <span className="duration">{(track.duration / 60).toFixed(1)} мин</span>
              <button className="remove-btn" type="button">
                ×
              </button>
            </div>
          ))}

          {empty.tracks.length === 0 ? (
            <div style={{ padding: 12, color: 'var(--text-secondary)' }}>Нет данных</div>
          ) : null}
        </div>
      </section>

      <section className="library-section">
        <div className="section-header">
          <h3>Мои плейлисты</h3>
          <button className="create-btn" type="button">
            + Создать
          </button>
        </div>
        <div className="my-playlists">
          {empty.playlists.map((playlist) => (
            <div key={playlist.id} className="my-playlist">
              <div className="playlist-icon">{playlist.cover}</div>
              <div className="playlist-info">
                <h4>{playlist.name}</h4>
                <p>{playlist.tracks.length} треков</p>
              </div>
            </div>
          ))}

          {empty.playlists.length === 0 ? (
            <div style={{ padding: 12, color: 'var(--text-secondary)' }}>Плейлистов пока нет</div>
          ) : null}
        </div>
      </section>

      <section className="library-section">
        <div className="section-header">
          <h3>Подписки на артистов</h3>
          <span className="count">{empty.artists.length} артистов</span>
        </div>
        <div className="following-artists">
          {empty.artists.map((artist) => (
            <div key={artist.id} className="following-artist">
              <div className="artist-avatar">{artist.image}</div>
              <div className="artist-details">
                <h4>{artist.name}</h4>
                <p>{artist.genre}</p>
              </div>
              <button className="unfollow-btn" type="button">
                Отписаться
              </button>
            </div>
          ))}

          {empty.artists.length === 0 ? (
            <div style={{ padding: 12, color: 'var(--text-secondary)' }}>Подписок пока нет</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

