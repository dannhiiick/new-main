import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Bookmark, BookmarkCheck, Plus, X, ListMusic, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, type Playlist } from './api';
import { useLibrary } from './libraryStore';
import { useTranslation } from './i18n';

const TYPE_LABELS: Record<string, string> = {
  editorial: 'Редакторский',
  thematic: 'Тематический',
  user: 'Пользовательский',
};

const GRADIENTS = [
  'linear-gradient(135deg, #8B5CF6, #EC4899)',
  'linear-gradient(135deg, #06B6D4, #8B5CF6)',
  'linear-gradient(135deg, #EC4899, #F59E0B)',
  'linear-gradient(135deg, #10B981, #06B6D4)',
  'linear-gradient(135deg, #F59E0B, #EF4444)',
  'linear-gradient(135deg, #EF4444, #8B5CF6)',
];

export function PlaylistsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { saved, toggleSavedPlaylist } = useLibrary();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Creation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const res = await api.playlists({ page, page_size: pageSize });
      if (res && res.results) {
        setPlaylists(res.results);
        setCount(res.count);
        setHasNext(Boolean(res.next));
        setHasPrev(Boolean(res.previous));
      } else if (Array.isArray(res)) {
        setPlaylists(res);
        setCount(res.length);
        setHasNext(false);
        setHasPrev(false);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки плейлистов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, [page]);

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    try {
      await api.playlists.create(name.trim(), description.trim(), isPublic);
      setName('');
      setDescription('');
      setIsPublic(true);
      setShowCreateModal(false);
      // reset to first page and reload
      setPage(1);
      fetchPlaylists();
    } catch {
      alert('Не удалось создать плейлист');
    } finally {
      setCreating(false);
    }
  };

  const totalPages = Math.ceil(count / pageSize) || 1;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex-1 overflow-y-auto p-6 bg-background flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm text-muted-foreground">{count} плейлистов доступно</span>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-lg shadow-primary/10"
          >
            <Plus size={15} /> {t('createPlaylist')}
          </button>
        </div>

        {loading && <div className="text-muted-foreground text-sm text-center py-12">{t('loading')}</div>}
        {error && <div className="text-muted-foreground text-sm text-center py-12">{error}</div>}

        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {playlists.map((pl, i) => (
              <div
                key={pl.id}
                onClick={() => navigate(`/playlists/${pl.id}`)}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 hover:scale-[1.01] transition-all cursor-pointer group flex flex-col shadow-sm"
              >
                <div
                  className="w-full h-40 flex items-center justify-center text-3xl font-bold text-white/80 relative overflow-hidden"
                  style={{ background: GRADIENTS[i % GRADIENTS.length] }}
                >
                  {pl.cover ? (
                    <img src={pl.cover} alt={pl.name} className="w-full h-full object-cover absolute inset-0 group-hover:scale-105 transition-transform duration-300" />
                  ) : null}
                  <span className="relative z-10 select-none">{pl.name.slice(0, 2).toUpperCase()}</span>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                        {TYPE_LABELS[pl.type] ?? pl.type}
                      </span>
                      <span className="text-xs text-muted-foreground">{pl.tracks?.length ?? 0} треков</span>
                    </div>
                    <p className="font-bold text-foreground truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>{pl.name}</p>
                    {pl.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{pl.description}</p>}
                  </div>
                  <div className="flex items-center justify-between mt-1 pt-2 border-t border-border/40">
                    {pl.creator ? (
                      <p className="text-xs text-muted-foreground truncate max-w-[120px]">от {pl.creator}</p>
                    ) : (
                      <span />
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSavedPlaylist(pl.id); }}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer font-medium"
                    >
                      {saved.includes(pl.id) ? <><BookmarkCheck size={13} /> Сохранён</> : <><Bookmark size={13} /> Сохранить</>}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {playlists.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground text-sm py-12">Плейлисты не найдены</div>
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

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div
          onClick={() => !creating && setShowCreateModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-2xl relative"
          >
            <button
              onClick={() => setShowCreateModal(false)}
              disabled={creating}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
            >
              <X size={16} />
            </button>

            <form onSubmit={handleCreatePlaylist} className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {t('createPlaylist')}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Создайте новый плейлист и добавьте в него свои любимые композиции.
                </p>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-xs font-medium text-muted-foreground">{t('name')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Любимые треки / Вечерний чилл"
                  required
                  maxLength={50}
                  className="w-full px-4 py-2.5 rounded-xl bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-xs font-medium text-muted-foreground">{t('desc')}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Введите описание плейлиста..."
                  rows={3}
                  maxLength={200}
                  className="w-full px-4 py-2.5 rounded-xl bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/20 border border-border">
                <span className="text-xs text-foreground font-medium">{t('public')} плейлист</span>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/95 text-white text-xs font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {creating ? 'Создание...' : t('createPlaylist')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
