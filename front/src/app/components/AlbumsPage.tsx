import { useState } from 'react';
import { useApi } from './useApi';
import { api } from './api';

export function AlbumsPage() {
  const { data, loading, error } = useApi(() => api.albums());
  const [search, setSearch] = useState('');

  const filtered = (data ?? []).filter(a =>
    !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.artist.toLowerCase().includes(search.toLowerCase())
  );

  const gradients = [
    'linear-gradient(135deg, #EC4899, #8B5CF6)',
    'linear-gradient(135deg, #8B5CF6, #06B6D4)',
    'linear-gradient(135deg, #F59E0B, #EC4899)',
    'linear-gradient(135deg, #10B981, #8B5CF6)',
    'linear-gradient(135deg, #06B6D4, #10B981)',
    'linear-gradient(135deg, #EF4444, #F59E0B)',
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex-1 overflow-y-auto p-6">
      <div className="mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск альбома или артиста..."
          className="w-full max-w-sm px-4 py-2.5 rounded-xl bg-input-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />
      </div>

      {loading && <div className="text-muted-foreground text-sm text-center py-12">Загрузка...</div>}
      {error && <div className="text-muted-foreground text-sm text-center py-12">{error}</div>}

      {!loading && !error && (
        <div className="grid grid-cols-4 gap-5">
          {filtered.map((album, i) => (
            <div key={album.id} className="bg-card border border-border rounded-2xl p-4 hover:border-primary/30 transition-all cursor-pointer group">
              <div
                className="w-full aspect-square rounded-xl flex items-center justify-center text-2xl font-bold text-white mb-4 overflow-hidden"
                style={{ background: gradients[i % gradients.length] }}
              >
                {album.cover ? (
                  <img src={album.cover} alt={album.title} className="w-full h-full object-cover" />
                ) : album.title.slice(0, 2).toUpperCase()}
              </div>
              <p className="font-semibold text-foreground truncate text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{album.title}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{album.artist}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{album.year} · {album.tracks?.length ?? 0} треков</p>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-4 text-center text-muted-foreground text-sm py-12">Альбомы не найдены</div>
          )}
        </div>
      )}
    </div>
  );
}
