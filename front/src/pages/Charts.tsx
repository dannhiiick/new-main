import { useEffect, useState } from 'react';
import type { Track } from '../types';
import { fetchTracks } from '../api/catalog';
import './Charts.css';
import { Heart, Play } from 'lucide-react';

interface ChartsPageProps {
  onPlayTrack?: (track: Track) => void;
}

export function ChartsPage({ onPlayTrack }: ChartsPageProps) {
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
      <div className="charts-page">
        <h2>Чарты</h2>
        <div style={{ padding: 12 }}>Загрузка...</div>
      </div>
    );

  if (error)
    return (
      <div className="charts-page">
        <h2>Чарты</h2>
        <div style={{ padding: 12, color: 'crimson', fontWeight: 700 }}>{error}</div>
      </div>
    );

  const chartSections = [
    { title: 'Топ-100 Казахстан', tracks: tracks.slice(0, 8) },
    { title: 'Вирусные треки Казахстана', tracks: tracks.slice(0, 6) },
    { title: 'Растущие артисты', tracks: tracks.slice(2, 10) },
  ];

  return (
    <div className="charts-page">
      <h2>Чарты</h2>
      {chartSections.map((section) => (
        <section key={section.title} className="chart-section">
          <div className="section-header">
            <h3>{section.title}</h3>
          </div>
          <div className="chart-grid">
            {section.tracks.map((track, idx) => (
              <div key={track.id} className="chart-card">
                <div className="chart-top">
                  <div className="chart-rank">{idx + 1}</div>
                  <div className="chart-cover">{track.cover || '—'}</div>
                </div>
                <div className="chart-info">
                  <h4>{track.title}</h4>
                  <p className="muted">{track.artist}</p>
                </div>
                <div className="chart-actions">
                  <button
                    className="chart-btn play"
                    type="button"
                    aria-label="play"
                    onClick={() => onPlayTrack?.(track)}
                    disabled={!track.audioUrl}
                  >
                    <Play size={16} />
                  </button>
                  <button className="chart-btn" type="button" aria-label="like">
                    <Heart size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
