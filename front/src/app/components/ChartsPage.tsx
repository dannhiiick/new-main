import { TrendingUp, Play } from 'lucide-react';
import { useApi } from './useApi';
import { api, type Track } from './api';

interface ChartsPageProps {
  onPlayTrack: (track: Track) => void;
}

export function ChartsPage({ onPlayTrack }: ChartsPageProps) {
  const { data, loading, error } = useApi(() => api.tracks());

  const sorted = [...(data ?? [])].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 20);

  function fmt(s: number) {
    if (!s) return '—';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp size={16} className="text-primary" />
        <span className="text-sm text-muted-foreground">Топ {sorted.length} треков по прослушиваниям</span>
      </div>

      {loading && <div className="text-muted-foreground text-sm text-center py-12">Загрузка...</div>}
      {error && <div className="text-muted-foreground text-sm text-center py-12">{error}</div>}

      {!loading && !error && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {sorted.map((track, i) => (
            <div
              key={track.id}
              onClick={() => onPlayTrack(track)}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-secondary cursor-pointer group transition-colors border-b border-border last:border-0"
            >
              <div className="w-8 text-center shrink-0">
                {i < 3 ? (
                  <span className="text-sm font-bold" style={{ color: i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : '#CD7C2F' }}>
                    {i + 1}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground group-hover:hidden">{i + 1}</span>
                )}
                <Play size={13} className="text-primary hidden group-hover:block mx-auto" />
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
                {track.coverUrl ? <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" /> : track.title.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
                <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
              </div>
              <span className="hidden sm:inline text-sm text-muted-foreground">{track.genre || '—'}</span>
              <span className="hidden md:inline text-sm text-muted-foreground w-20 text-right">{track.plays?.toLocaleString() ?? '—'}</span>
              <span className="text-sm text-muted-foreground w-12 text-right tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(track.duration)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
