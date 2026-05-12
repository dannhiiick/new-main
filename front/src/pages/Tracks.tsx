import { useEffect, useState } from 'react';
import { fetchTracks } from '../api/catalog';
import type { Track } from '../types';
import { Download, Heart, Play, Share2 } from 'lucide-react';
import './Tracks.css';

interface TracksPageProps {
  onPlayTrack?: (track: Track) => void;
}

export function TracksPage({ onPlayTrack }: TracksPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchTracks();
        if (mounted) setTracks(data);
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
      <div className="tracks-page">
        <h2>Треки</h2>
        <div style={{ padding: 12 }}>Загрузка...</div>
      </div>
    );

  if (error)
    return (
      <div className="tracks-page">
        <h2>Треки</h2>
        <div style={{ padding: 12, color: 'crimson', fontWeight: 700 }}>{error}</div>
      </div>
    );

  return (
    <div className="tracks-page">
      <h2>Треки</h2>
      <div className="tracks-table">
        <div className="table-header">
          <div>#</div>
          <div>Название</div>
          <div>Артист</div>
          <div>Жанр</div>
          <div>Длительность</div>
          <div>Прослушивания</div>
          <div>Действия</div>
        </div>
        {tracks.map((track, idx) => (
          <div
            key={track.id}
            className="table-row"
            onDoubleClick={() => {
              if (track.audioUrl) onPlayTrack?.(track);
            }}
          >
            <div className="cell">{idx + 1}</div>
            <div className="cell track-cell">
              <span className="track-cover">{track.cover || '—'}</span>
              <span>{track.title}</span>
            </div>
            <div className="cell">{track.artist}</div>
            <div className="cell">
              <span className="track-genre-badge">{track.genre}</span>
            </div>
            <div className="cell">{(track.duration / 60).toFixed(1)} мин</div>
            <div className="cell plays">{(track.plays / 1000000).toFixed(1)} млн</div>
            <div className="cell actions">
              <button
                className="icon-btn"
                type="button"
                aria-label="play"
                onClick={() => onPlayTrack?.(track)}
                disabled={!track.audioUrl}
              >
                <Play size={16} />
              </button>
              <button className="icon-btn" type="button" aria-label="like">
                <Heart size={16} />
              </button>
              <button className="icon-btn" type="button" aria-label="download">
                <Download size={16} />
              </button>
              <button className="icon-btn" type="button" aria-label="share">
                <Share2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
