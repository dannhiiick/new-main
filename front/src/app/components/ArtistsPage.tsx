import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Users, UserPlus, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, type Artist } from './api';
import { useLibrary } from './libraryStore';
import { useTranslation } from './i18n';

interface ArtistCardProps {
  artist: Artist;
  onClick: () => void;
}

function ArtistCard({ artist, onClick }: ArtistCardProps) {
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
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 hover:scale-[1.01] transition-all cursor-pointer group flex flex-col justify-between h-full shadow-sm"
    >
      <div>
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 overflow-hidden shadow"
            style={{ background: grad }}
          >
            {artist.image ? <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" /> : initials}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground truncate text-sm sm:text-base" style={{ fontFamily: "'DM Sans', sans-serif" }}>{artist.name}</p>
            <p className="text-xs text-muted-foreground">{artist.genre} · {artist.country}</p>
          </div>
        </div>
        {artist.bio && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">{artist.bio}</p>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/40">
        <span className="flex items-center gap-1">
          <Users size={11} />
          {artist.followers?.toLocaleString() ?? 0}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); toggleFollowArtist(artist.id); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
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
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [search, setSearch] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArtists = async () => {
    setLoading(true);
    try {
      const res = await api.artists({ page, page_size: pageSize });
      if (res && res.results) {
        setArtists(res.results);
        setCount(res.count);
        setHasNext(Boolean(res.next));
        setHasPrev(Boolean(res.previous));
      } else if (Array.isArray(res)) {
        setArtists(res);
        setCount(res.length);
        setHasNext(false);
        setHasPrev(false);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки артистов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtists();
  }, [page]);

  const filtered = artists.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(count / pageSize) || 1;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex-1 overflow-y-auto p-6 bg-background flex flex-col justify-between">
      <div>
        <div className="mb-6">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск артиста на текущей странице..."
            className="w-full px-4 py-2.5 rounded-xl bg-input-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
        </div>

        {loading && <div className="text-muted-foreground text-sm text-center py-12">{t('loading')}</div>}
        {error && <div className="text-muted-foreground text-sm text-center py-12">{error}</div>}

        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(a => (
              <ArtistCard key={a.id} artist={a} onClick={() => navigate(`/artists/${a.id}`)} />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground text-sm py-12">Артисты не найдены</div>
            )}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 px-2 text-sm text-muted-foreground border-t border-border/40 pt-4">
          <span>Страница {page} из {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!hasPrev}
              className="p-2 rounded-xl border border-border hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={!hasNext}
              className="p-2 rounded-xl border border-border hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
