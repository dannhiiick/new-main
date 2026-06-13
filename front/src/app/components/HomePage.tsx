import { Play, TrendingUp, Music2, Users } from 'lucide-react';
import { useApi } from './useApi';
import { api, type Track, type Artist, type Album } from './api';

interface HomePageProps {
  onPlayTrack: (track: Track) => void;
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon size={18} className="text-primary" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function TrackRow({ track, index, onPlay }: { track: Track; index: number; onPlay: () => void }) {
  return (
    <div
      onClick={onPlay}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary cursor-pointer group transition-colors"
    >
      <span className="text-xs text-muted-foreground w-5 text-center group-hover:hidden">{index + 1}</span>
      <Play size={14} className="text-primary hidden group-hover:block w-5" />
      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
        {track.coverUrl ? <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" /> : track.title.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
      </div>
      <span className="text-xs text-muted-foreground">{track.genre}</span>
    </div>
  );
}

function ArtistCard({ artist }: { artist: Artist }) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors cursor-pointer group">
      <div className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold text-white overflow-hidden shrink-0"
        style={{ background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)' }}>
        {artist.image ? <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" /> : artist.name.slice(0, 2).toUpperCase()}
      </div>
      <p className="text-sm font-medium text-foreground text-center truncate w-full">{artist.name}</p>
      <p className="text-xs text-muted-foreground">{artist.genre}</p>
    </div>
  );
}

function AlbumCard({ album }: { album: Album }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 hover:border-primary/30 transition-colors cursor-pointer group">
      <div className="w-full aspect-square rounded-xl flex items-center justify-center text-2xl font-bold text-white mb-3 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #EC4899, #8B5CF6)' }}>
        {album.cover ? <img src={album.cover} alt={album.title} className="w-full h-full object-cover" /> : album.title.slice(0, 2).toUpperCase()}
      </div>
      <p className="text-sm font-medium text-foreground truncate">{album.title}</p>
      <p className="text-xs text-muted-foreground truncate">{album.artist} · {album.year}</p>
    </div>
  );
}

export function HomePage({ onPlayTrack }: HomePageProps) {
  const tracks = useApi(() => api.tracks());
  const artists = useApi(() => api.artists());
  const albums = useApi(() => api.albums());

  const topTracks = tracks.data?.slice(0, 8) ?? [];
  const topArtists = artists.data?.slice(0, 6) ?? [];
  const newAlbums = albums.data?.slice(0, 4) ?? [];

  return (
    <div
      style={{ fontFamily: "'Inter', sans-serif" }}
      className="flex-1 overflow-y-auto p-6 flex flex-col gap-8"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Music2} label="Треков" value={tracks.data ? `${tracks.data.length}` : '—'} />
        <StatCard icon={Users} label="Артистов" value={artists.data ? `${artists.data.length}` : '—'} />
        <StatCard icon={TrendingUp} label="Альбомов" value={albums.data ? `${albums.data.length}` : '—'} />
      </div>

      {/* Hero banner */}
      <div className="relative rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #16213e 50%, #0f0f23 100%)', minHeight: 160 }}>
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #8B5CF6 0%, transparent 60%)' }} />
        <div className="relative p-5 sm:p-8">
          <p className="text-xs font-medium text-primary uppercase tracking-widest mb-2">Новинки недели</p>
          <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.02em' }}>
            {topTracks[0]?.title ?? 'Свежая музыка'}
          </h2>
          <p className="text-sm text-white/60 mb-5">{topTracks[0]?.artist ?? 'Уже на платформе'}</p>
          {topTracks[0] && (
            <button
              onClick={() => onPlayTrack(topTracks[0])}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Play size={14} />
              Слушать
            </button>
          )}
        </div>
      </div>

      {/* Top tracks */}
      <section>
        <h3 className="text-base font-semibold text-foreground mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Популярные треки
        </h3>
        {tracks.loading ? (
          <div className="text-sm text-muted-foreground py-4">Загрузка...</div>
        ) : tracks.error ? (
          <div className="text-sm text-muted-foreground py-4">{tracks.error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {topTracks.map((t, i) => (
              <TrackRow key={t.id} track={t} index={i} onPlay={() => onPlayTrack(t)} />
            ))}
          </div>
        )}
      </section>

      {/* Artists */}
      <section>
        <h3 className="text-base font-semibold text-foreground mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Популярные артисты
        </h3>
        {artists.loading ? (
          <div className="text-sm text-muted-foreground">Загрузка...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {topArtists.map(a => <ArtistCard key={a.id} artist={a} />)}
          </div>
        )}
      </section>

      {/* Albums */}
      <section>
        <h3 className="text-base font-semibold text-foreground mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Новые альбомы
        </h3>
        {albums.loading ? (
          <div className="text-sm text-muted-foreground">Загрузка...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {newAlbums.map(a => <AlbumCard key={a.id} album={a} />)}
          </div>
        )}
      </section>
    </div>
  );
}
