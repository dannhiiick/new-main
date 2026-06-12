import { Heart, ListMusic, Disc3, Users, Play, Clock } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from './AuthContext';
import { useLibrary } from './libraryStore';
import { useApi } from './useApi';
import { api, type Track } from './api';

function fmt(s: number) {
  if (!s) return '—';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function TrackRow({ track, index }: { track: Track; index: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary cursor-pointer group transition-colors border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground w-5 text-center group-hover:hidden">{index + 1}</span>
      <Play size={13} className="text-primary hidden group-hover:block w-5" />
      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
        {track.coverUrl ? <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" /> : track.title.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
      </div>
      <span className="text-xs text-muted-foreground hidden md:inline">{track.genre}</span>
      <span className="text-xs text-muted-foreground tabular-nums w-12 text-right" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        <Clock size={10} className="inline mr-1 opacity-50" />{fmt(track.duration)}
      </span>
    </div>
  );
}

export function LibraryPage() {
  const { user } = useAuth();
  const { liked, recent, followed, saved } = useLibrary();
  const artistsApi = useApi(() => api.artists());
  const playlistsApi = useApi(() => api.playlists());

  const followedArtists = (artistsApi.data ?? []).filter(a => followed.includes(a.id));
  const savedPlaylists = (playlistsApi.data ?? []).filter(p => saved.includes(p.id));

  const stats = [
    { icon: Heart, label: 'Избранные треки', count: liked.length, color: '#EC4899' },
    { icon: ListMusic, label: 'Сохранённые плейлисты', count: savedPlaylists.length, color: '#8B5CF6' },
    { icon: Disc3, label: 'Недавно прослушано', count: recent.length, color: '#06B6D4' },
    { icon: Users, label: 'Подписки', count: followedArtists.length, color: '#10B981' },
  ];

  const empty = liked.length === 0 && recent.length === 0 && savedPlaylists.length === 0 && followedArtists.length === 0;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ icon: Icon, label, count, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 hover:border-primary/30 transition-colors">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>{count}</p>
              <p className="text-xs text-muted-foreground truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {empty && (
        <div className="bg-card border border-border rounded-2xl p-10 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Heart size={28} className="text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Привет, {user?.displayName || user?.username}!
            </p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Ваша библиотека пуста. Откройте трек и нажмите на сердечко в плеере, чтобы добавить его в избранное.
            </p>
          </div>
          <Link to="/tracks" className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
            Перейти к трекам
          </Link>
        </div>
      )}

      {recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Недавно прослушанное
            </h3>
            <span className="text-xs text-muted-foreground">{recent.length}</span>
          </div>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {recent.slice(0, 8).map((t, i) => <TrackRow key={`r-${t.id}-${i}`} track={t} index={i} />)}
          </div>
        </section>
      )}

      {liked.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Избранные треки
            </h3>
            <span className="text-xs text-muted-foreground">{liked.length}</span>
          </div>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {liked.map((t, i) => <TrackRow key={`l-${t.id}`} track={t} index={i} />)}
          </div>
        </section>
      )}

      {followedArtists.length > 0 && (
        <section>
          <h3 className="text-base font-semibold text-foreground mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Подписки на артистов
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {followedArtists.map(a => (
              <div key={a.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)' }}>
                  {a.image ? <img src={a.image} alt={a.name} className="w-full h-full object-cover" /> : a.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.genre}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {savedPlaylists.length > 0 && (
        <section>
          <h3 className="text-base font-semibold text-foreground mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Сохранённые плейлисты
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {savedPlaylists.map(p => (
              <div key={p.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="w-full h-32 flex items-center justify-center text-2xl font-bold text-white/80"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.tracks?.length ?? 0} треков</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
