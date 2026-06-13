import { useState } from 'react';
import { Play, Clock } from 'lucide-react';
import { useApi } from './useApi';
import { api, type Track } from './api';

interface TracksPageProps {
  onPlayTrack: (track: Track) => void;
}

function fmt(s: number) {
  if (!s) return '—';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export function TracksPage({ onPlayTrack }: TracksPageProps) {
  const { data, loading, error } = useApi(() => api.tracks());
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');

  const genres = [...new Set(data?.map(t => t.genre).filter(Boolean) ?? [])];
  const filtered = (data ?? []).filter(t => {
    const q = search.toLowerCase();
    return (
      (!q || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)) &&
      (!genre || t.genre === genre)
    );
  });

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex-1 overflow-y-auto p-6">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по треку или артисту..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-input-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />
        <select
          value={genre}
          onChange={e => setGenre(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-input-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Все жанры</option>
          {genres.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {loading && <div className="text-muted-foreground text-sm py-8 text-center">Загрузка треков...</div>}
      {error && <div className="text-muted-foreground text-sm py-8 text-center">{error}</div>}

      {!loading && !error && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[auto_1fr_1fr_auto_auto] items-center gap-4 px-5 py-3 border-b border-border text-xs text-muted-foreground font-medium uppercase tracking-wider">
            <span className="w-6">#</span>
            <span>Название</span>
            <span>Жанр / Язык</span>
            <span>Прослушиваний</span>
            <span><Clock size={12} /></span>
          </div>
          {filtered.map((track, i) => (
            <div
              key={track.id}
              onClick={() => onPlayTrack(track)}
              className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_1fr_auto_auto] items-center gap-3 md:gap-4 px-4 md:px-5 py-3 hover:bg-secondary cursor-pointer group transition-colors border-b border-border last:border-0"
            >
              <span className="w-6 text-xs text-muted-foreground group-hover:hidden text-center">{i + 1}</span>
              <Play size={13} className="text-primary hidden group-hover:block w-6" />
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
                  {track.coverUrl ? <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" /> : track.title.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                </div>
              </div>
              <div className="hidden md:block">
                <p className="text-sm text-foreground">{track.genre || '—'}</p>
                <p className="text-xs text-muted-foreground">{track.language}</p>
              </div>
              <span className="hidden md:inline text-sm text-muted-foreground">{track.plays?.toLocaleString() || '—'}</span>
              <span className="text-sm text-muted-foreground tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(track.duration)}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-12">Треков не найдено</div>
          )}
        </div>
      )}
    </div>
  );
}
