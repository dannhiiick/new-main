import { useEffect, useState } from 'react';
import { fetchConcerts } from '../api/catalog';
import type { Concert } from '../types';
import './Events.css';

export function EventsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [concerts, setConcerts] = useState<Concert[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchConcerts();
        if (mounted) setConcerts(data);
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
      <div className="events-page">
        <h2>События</h2>
        <div style={{ padding: 12 }}>Загрузка...</div>
      </div>
    );

  if (error)
    return (
      <div className="events-page">
        <h2>События</h2>
        <div style={{ padding: 12, color: 'crimson', fontWeight: 700 }}>{error}</div>
      </div>
    );

  return (
    <div className="events-page">
      <h2>События</h2>
      <div className="events-grid">
        {concerts.map((c) => (
          <div key={c.id} className="event-card">
            <div className="event-image">{c.image || '—'}</div>
            <div className="event-content">
              <div className="event-title">
                {c.artist} <span className="event-city">• {c.city}</span>
              </div>
              <div className="event-meta">
                {c.date} • {c.time}
              </div>
              <div className="event-price">{c.ticketPrice} ₸</div>
              <button className="event-btn" type="button">
                Купить билет
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

