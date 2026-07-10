import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { Play, Clock, Plus, ChevronLeft, ChevronRight, X, ListMusic, Check } from 'lucide-react';
import { api, type Track, type Playlist } from './api';
import { usePlayback } from './PlaybackContext';
import { useTranslation } from './i18n';

function fmt(s: number) {
  if (!s) return '—';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export function TracksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { playTrack } = usePlayback();
  const { t } = useTranslation();

  const genreParam = searchParams.get('genre') || '';
  const [tracks, setTracks] = useState<Track[]>([]);
  const [genresList, setGenresList] = useState<string[]>([]);
  const [genre, setGenre] = useState(genreParam);
  const [search, setSearch] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Playlist adding State
  const [myPlaylists, setMyPlaylists] = useState<Playlist[]>([]);
  const [addingToPlaylistTrack, setAddingToPlaylistTrack] = useState<Track | null>(null);
  const [playlistActionLoading, setPlaylistActionLoading] = useState(false);
  const [playlistAddedId, setPlaylistAddedId] = useState<string | null>(null);

  // Synchronize component genre filter state when URL changes
  useEffect(() => {
    const g = searchParams.get('genre') || '';
    setGenre(g);
    setPage(1);
  }, [searchParams]);

  // Load all tracks (unpaginated) once to extract all unique genres for filter dropdown
  useEffect(() => {
    api.tracks().then(res => {
      const raw = Array.isArray(res) ? res : res.results || [];
      const uniq = Array.from(new Set(raw.map((t: Track) => t.genre).filter(Boolean))) as string[];
      setGenresList(uniq);
    }).catch(() => {});

    // Fetch user custom playlists for adding tracks
    api.playlists().then(res => {
      const raw = Array.isArray(res) ? res : res.results || [];
      setMyPlaylists(raw.filter((p: Playlist) => p.type === 'user'));
    }).catch(() => {});
  }, []);

  // Fetch paginated tracks with filter params
  const fetchTracks = async () => {
    setLoading(true);
    try {
      const res = await api.tracks({
        page,
        page_size: pageSize,
        genre: genre || undefined,
        status: 'published',
      });
      if (res && res.results) {
        setTracks(res.results);
        setCount(res.count);
        setHasNext(Boolean(res.next));
        setHasPrev(Boolean(res.previous));
      } else if (Array.isArray(res)) {
        setTracks(res);
        setCount(res.length);
        setHasNext(false);
        setHasPrev(false);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки треков');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, [page, genre]);

  const handleGenreChange = (newGenre: string) => {
    setGenre(newGenre);
    setPage(1);
    if (newGenre) {
      setSearchParams({ genre: newGenre });
    } else {
      setSearchParams({});
    }
  };

  const handleAddTrackToPlaylist = async (playlistId: string) => {
    if (!addingToPlaylistTrack) return;
    setPlaylistActionLoading(true);
    try {
      await api.playlists.addTrack(playlistId, addingToPlaylistTrack.id);
      setPlaylistAddedId(playlistId);
      setTimeout(() => {
        setPlaylistAddedId(null);
        setAddingToPlaylistTrack(null);
      }, 1500);
    } catch {
      alert('Не удалось добавить трек в плейлист');
    } finally {
      setPlaylistActionLoading(false);
    }
  };

  // Client-side search within the current paginated results
  const filteredTracks = tracks.filter(t => {
    const q = search.toLowerCase();
    return !q || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(count / pageSize) || 1;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex-1 overflow-y-auto p-6 bg-background">
      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по названию или артисту на текущей странице..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-input-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />
        <select
          value={genre}
          onChange={e => handleGenreChange(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-input-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
        >
          <option value="">Все жанры</option>
          {genresList.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {loading && <div className="text-muted-foreground text-sm py-12 text-center">{t('loading')}</div>}
      {error && <div className="text-muted-foreground text-sm py-12 text-center">{error}</div>}

      {!loading && !error && (
        <div className="flex flex-col justify-between h-full min-h-[400px]">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
            <div className="hidden md:grid grid-cols-[auto_1fr_1fr_auto_auto_auto] items-center gap-4 px-5 py-3 border-b border-border text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              <span className="w-6 text-center">#</span>
              <span>Название</span>
              <span>Жанр / Язык</span>
              <span>Прослушиваний</span>
              <span><Clock size={12} className="mx-auto" /></span>
              <span className="w-10"></span>
            </div>
            
            {filteredTracks.map((track, i) => (
              <div
                key={track.id}
                className="grid grid-cols-[auto_1fr_auto_auto] md:grid-cols-[auto_1fr_1fr_auto_auto_auto] items-center gap-3 md:gap-4 px-4 md:px-5 py-3 hover:bg-secondary/40 group border-b border-border last:border-0"
              >
                <div onClick={() => playTrack(track, tracks)} className="w-6 text-center shrink-0 cursor-pointer">
                  <span className="text-xs text-muted-foreground group-hover:hidden">{i + 1 + (page - 1) * pageSize}</span>
                  <Play size={13} className="text-primary hidden group-hover:block mx-auto" />
                </div>
                
                <div onClick={() => playTrack(track, tracks)} className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
                    {track.coverUrl ? <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" /> : track.title.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                  </div>
                </div>
                
                <div className="hidden md:block">
                  <p className="text-sm text-foreground">{track.genre || '—'}</p>
                  <p className="text-xs text-muted-foreground">{track.language}</p>
                </div>
                
                <span className="hidden md:inline text-sm text-muted-foreground text-center">{track.plays?.toLocaleString() || '0'}</span>
                <span className="text-xs text-muted-foreground tabular-nums text-right md:text-center w-12" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {fmt(track.duration)}
                </span>

                {/* Add to Playlist trigger */}
                <button
                  onClick={(e) => { e.stopPropagation(); setAddingToPlaylistTrack(track); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                  title="Добавить в плейлист"
                >
                  <Plus size={15} />
                </button>
              </div>
            ))}
            
            {filteredTracks.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-12">Треков не найдено</div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-2 text-sm text-muted-foreground">
              <span>Страница {page} из {totalPages} (всего {count} треков)</span>
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
      )}

      {/* Add Track to Playlist Modal */}
      {addingToPlaylistTrack && (
        <div
          onClick={() => setAddingToPlaylistTrack(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-2xl relative"
          >
            <button
              onClick={() => setAddingToPlaylistTrack(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="mb-5">
              <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Добавить в плейлист
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Выберите плейлист для добавления трека <span className="font-semibold text-foreground">{addingToPlaylistTrack.title}</span>
              </p>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-border border border-border rounded-xl">
              {myPlaylists.length > 0 ? (
                myPlaylists.map(pl => (
                  <button
                    key={pl.id}
                    disabled={playlistActionLoading}
                    onClick={() => handleAddTrackToPlaylist(pl.id)}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-secondary/40 text-left text-sm text-foreground transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <ListMusic size={16} className="text-primary" />
                      <span className="font-medium">{pl.name}</span>
                    </div>
                    {playlistAddedId === pl.id && (
                      <span className="text-xs text-green-400 flex items-center gap-1 font-semibold">
                        <Check size={14} /> Добавлено
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                  Создайте сначала пользовательский плейлист в разделе «Плейлисты»
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
