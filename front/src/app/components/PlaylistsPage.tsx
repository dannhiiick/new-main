import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useApi } from './useApi';
import { api } from './api';
import { useLibrary } from './libraryStore';

const TYPE_LABELS: Record<string, string> = {
  editorial: 'Редакторский',
  thematic: 'Тематический',
  user: 'Пользовательский',
};

export function PlaylistsPage() {
  const { data, loading, error } = useApi(() => api.playlists());
  const { saved, toggleSavedPlaylist } = useLibrary();

  const gradients = [
    'linear-gradient(135deg, #8B5CF6, #EC4899)',
    'linear-gradient(135deg, #06B6D4, #8B5CF6)',
    'linear-gradient(135deg, #EC4899, #F59E0B)',
    'linear-gradient(135deg, #10B981, #06B6D4)',
    'linear-gradient(135deg, #F59E0B, #EF4444)',
    'linear-gradient(135deg, #EF4444, #8B5CF6)',
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex-1 overflow-y-auto p-6">
      {loading && <div className="text-muted-foreground text-sm text-center py-12">Загрузка...</div>}
      {error && <div className="text-muted-foreground text-sm text-center py-12">{error}</div>}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(data ?? []).map((pl, i) => (
            <div key={pl.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-all cursor-pointer group">
              <div
                className="w-full h-40 flex items-center justify-center text-3xl font-bold text-white/80 relative"
                style={{ background: gradients[i % gradients.length] }}
              >
                {pl.cover ? (
                  <img src={pl.cover} alt={pl.name} className="w-full h-full object-cover absolute inset-0" />
                ) : null}
                <span className="relative z-10">{pl.name.slice(0, 2).toUpperCase()}</span>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium text-primary uppercase tracking-wider">
                    {TYPE_LABELS[pl.type] ?? pl.type}
                  </span>
                  <span className="text-xs text-muted-foreground">{pl.tracks?.length ?? 0} треков</span>
                </div>
                <p className="font-semibold text-foreground truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>{pl.name}</p>
                {pl.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{pl.description}</p>}
                <div className="flex items-center justify-between mt-3">
                  {pl.creator ? <p className="text-xs text-muted-foreground truncate">от {pl.creator}</p> : <span />}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSavedPlaylist(pl.id); }}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    {saved.includes(pl.id) ? <><BookmarkCheck size={13} /> Сохранён</> : <><Bookmark size={13} /> Сохранить</>}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {(data ?? []).length === 0 && (
            <div className="col-span-full text-center text-muted-foreground text-sm py-12">Плейлисты не найдены</div>
          )}
        </div>
      )}
    </div>
  );
}
