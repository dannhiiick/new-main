import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api, type Album } from './api';
import { useTranslation } from './i18n';

const GRADIENTS = [
  'linear-gradient(135deg, #EC4899, #8B5CF6)',
  'linear-gradient(135deg, #8B5CF6, #06B6D4)',
  'linear-gradient(135deg, #F59E0B, #EC4899)',
  'linear-gradient(135deg, #10B981, #8B5CF6)',
  'linear-gradient(135deg, #06B6D4, #10B981)',
  'linear-gradient(135deg, #EF4444, #F59E0B)',
];

export function AlbumsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [search, setSearch] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize] = useState(8);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlbums = async () => {
    setLoading(true);
    try {
      const res = await api.albums({ page, page_size: pageSize });
      if (res && res.results) {
        setAlbums(res.results);
        setCount(res.count);
        setHasNext(Boolean(res.next));
        setHasPrev(Boolean(res.previous));
      } else if (Array.isArray(res)) {
        setAlbums(res);
        setCount(res.length);
        setHasNext(false);
        setHasPrev(false);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки альбомов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbums();
  }, [page]);

  const filtered = albums.filter(a =>
    !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.artist.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(count / pageSize) || 1;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex-1 overflow-y-auto p-6 bg-background flex flex-col justify-between">
      <div>
        <div className="mb-6">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск альбома или артиста на текущей странице..."
            className="w-full px-4 py-2.5 rounded-xl bg-input-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
        </div>

        {loading && <div className="text-muted-foreground text-sm text-center py-12">{t('loading')}</div>}
        {error && <div className="text-muted-foreground text-sm text-center py-12">{error}</div>}

        {!loading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {filtered.map((album, i) => (
              <div
                key={album.id}
                onClick={() => navigate(`/albums/${album.id}`)}
                className="bg-card border border-border rounded-2xl p-4 hover:border-primary/30 hover:scale-[1.01] transition-all cursor-pointer group shadow-sm"
              >
                <div
                  className="w-full aspect-square rounded-xl flex items-center justify-center text-2xl font-bold text-white mb-4 overflow-hidden shadow"
                  style={{ background: GRADIENTS[i % GRADIENTS.length] }}
                >
                  {album.cover ? (
                    <img src={album.cover} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : album.title.slice(0, 2).toUpperCase()}
                </div>
                <p className="font-bold text-foreground truncate text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{album.title}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{album.artist}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{album.year} · {album.tracks?.length ?? 0} треков</p>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground text-sm py-12">Альбомы не найдены</div>
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
