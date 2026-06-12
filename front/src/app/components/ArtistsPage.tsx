import { useState } from 'react';
import { Users, UserPlus, UserCheck } from 'lucide-react';
import { useApi } from './useApi';
import { api, type Artist } from './api';
import { useLibrary } from './libraryStore';

function ArtistCard({ artist }: { artist: Artist }) {
  const { followed, toggleFollowArtist } = useLibrary();
  const isFollowed = followed.includes(artist.id);
  const initials = artist.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const gradients = [
    'linear-gradient(135deg, #8B5CF6, #06B6D4)',
    'linear-gradient(135deg, #EC4899, #8B5CF6)',
    'linear-gradient(135deg, #F59E0B, #EF4444)',
    'linear-gradient(135deg, #10B981, #06B6D4)',
  ];
  const grad = gradients[parseInt(artist.id) % gradients.length] ?? gradients[0];

  return (
    <div className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-all cursor-pointer group">
      <div className="flex items-center gap-4 mb-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 overflow-hidden"
          style={{ background: grad }}
        >
          {artist.image ? <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" /> : initials}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>{artist.name}</p>
          <p className="text-xs text-muted-foreground">{artist.genre} · {artist.country}</p>
        </div>
      </div>
      {artist.bio && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{artist.bio}</p>
      )}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users size={11} />
          {artist.followers?.toLocaleString() ?? 0}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); toggleFollowArtist(artist.id); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isFollowed
              ? 'bg-primary/15 text-primary hover:bg-primary/25'
              : 'bg-primary text-white hover:bg-primary/90'
          }`}
        >
          {isFollowed ? <><UserCheck size={12} /> Подписан</> : <><UserPlus size={12} /> Подписаться</>}
        </button>
      </div>
    </div>
  );
}

export function ArtistsPage() {
  const { data, loading, error } = useApi(() => api.artists());
  const [search, setSearch] = useState('');

  const filtered = (data ?? []).filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex-1 overflow-y-auto p-6">
      <div className="mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск артиста..."
          className="w-full max-w-sm px-4 py-2.5 rounded-xl bg-input-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />
      </div>

      {loading && <div className="text-muted-foreground text-sm text-center py-12">Загрузка...</div>}
      {error && <div className="text-muted-foreground text-sm text-center py-12">{error}</div>}

      {!loading && !error && (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map(a => <ArtistCard key={a.id} artist={a} />)}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center text-muted-foreground text-sm py-12">Артисты не найдены</div>
          )}
        </div>
      )}
    </div>
  );
}
