import { useApi } from './useApi';
import { api } from './api';

const GENRE_COLORS: Record<string, string> = {
  'Pop': 'linear-gradient(135deg, #EC4899, #8B5CF6)',
  'Hip-Hop': 'linear-gradient(135deg, #F59E0B, #EF4444)',
  'Electronic': 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
  'Rock': 'linear-gradient(135deg, #EF4444, #7C3AED)',
  'R&B': 'linear-gradient(135deg, #8B5CF6, #EC4899)',
  'Jazz': 'linear-gradient(135deg, #F59E0B, #10B981)',
  'Classical': 'linear-gradient(135deg, #94A3B8, #475569)',
  'Folk': 'linear-gradient(135deg, #10B981, #F59E0B)',
  'Казахская': 'linear-gradient(135deg, #06B6D4, #10B981)',
  'default': 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
};

export function GenresPage() {
  const { data, loading } = useApi(() => api.tracks());

  const genreCounts: Record<string, number> = {};
  for (const t of data ?? []) {
    if (t.genre) genreCounts[t.genre] = (genreCounts[t.genre] ?? 0) + 1;
  }
  const genres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex-1 overflow-y-auto p-6">
      {loading && <div className="text-muted-foreground text-sm text-center py-12">Загрузка...</div>}

      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          {genres.map(([genre, count]) => (
            <div
              key={genre}
              className="relative h-32 rounded-2xl overflow-hidden cursor-pointer group"
              style={{ background: GENRE_COLORS[genre] ?? GENRE_COLORS.default }}
            >
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
              <div className="absolute inset-0 p-5 flex flex-col justify-between">
                <span className="text-lg font-bold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>{genre}</span>
                <span className="text-sm text-white/70">{count} треков</span>
              </div>
            </div>
          ))}
          {genres.length === 0 && (
            <div className="col-span-3 text-center text-muted-foreground text-sm py-12">Жанры не найдены</div>
          )}
        </div>
      )}
    </div>
  );
}
