import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { Search, Play, TrendingUp, Sparkles, Disc, Music2, Users, ListMusic } from 'lucide-react';
import { api, type Track, type Artist, type Album, type Playlist } from './api';
import { usePlayback } from './PlaybackContext';
import { useTranslation } from './i18n';

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { playTrack } = usePlayback();
  const { t } = useTranslation();

  const [query, setQuery] = useState(params.get('q') ?? '');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = params.get('q');
    if (q) setQuery(q);
  }, [params]);

  useEffect(() => {
    if (!query.trim()) {
      setTracks([]);
      setArtists([]);
      setAlbums([]);
      setPlaylists([]);
      return;
    }
    
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.search(query.trim());
        setTracks(res.tracks || []);
        setArtists(res.artists || []);
        setAlbums(res.albums || []);
        setPlaylists(res.playlists || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }, 400);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setParams(e.target.value ? { q: e.target.value } : {});
  };

  const hasResults = tracks.length > 0 || artists.length > 0 || albums.length > 0 || playlists.length > 0;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex-1 overflow-y-auto p-6 bg-background">
      {/* Search Input bar */}
      <div className="relative max-w-xl mb-8 shadow-sm">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={handleSearch}
          autoFocus
          placeholder={t('search_placeholder')}
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-input-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />
      </div>

      {loading && <div className="text-muted-foreground text-sm py-4">{t('loading')}</div>}

      {!loading && query && (
        <div className="flex flex-col gap-8">
          
          {/* Artists */}
          {artists.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <Users size={15} className="text-primary" /> {t('followedArtists')}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {artists.slice(0, 4).map(a => (
                  <div
                    key={a.id}
                    onClick={() => navigate(`/artists/${a.id}`)}
                    className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-2xl hover:border-primary/30 hover:scale-[1.01] transition-all cursor-pointer shadow-sm text-center"
                  >
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white overflow-hidden shadow"
                      style={{ background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)' }}>
                      {a.image ? <img src={a.image} alt={a.name} className="w-full h-full object-cover" /> : a.name.slice(0, 2).toUpperCase()}
                    </div>
                    <p className="text-sm font-bold text-foreground truncate w-full">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.genre}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Tracks */}
          {tracks.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <Music2 size={15} className="text-primary" /> {t('tracks')}
              </h3>
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
                {tracks.slice(0, 8).map((t, i) => (
                  <div
                    key={t.id}
                    onClick={() => playTrack(t, tracks)}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/40 cursor-pointer group transition-all border-b border-border last:border-0"
                  >
                    <span className="text-xs text-muted-foreground w-5 text-center group-hover:hidden">{i + 1}</span>
                    <Play size={13} className="text-primary hidden group-hover:block w-5" />
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
                      style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
                      {t.coverUrl ? <img src={t.coverUrl} alt={t.title} className="w-full h-full object-cover" /> : t.title.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.artist}</p>
                    </div>
                    <span className="hidden sm:inline text-xs text-muted-foreground">{t.genre}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Albums */}
          {albums.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <Disc size={15} className="text-primary" /> {t('albums')}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {albums.slice(0, 4).map(al => (
                  <div
                    key={al.id}
                    onClick={() => navigate(`/albums/${al.id}`)}
                    className="bg-card border border-border rounded-2xl p-4 hover:border-primary/30 hover:scale-[1.01] transition-all cursor-pointer shadow-sm group"
                  >
                    <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/10 border border-border flex items-center justify-center text-xl font-bold text-white mb-3 overflow-hidden shadow">
                      {al.cover ? <img src={al.cover} alt={al.title} className="w-full h-full object-cover" /> : al.title.slice(0, 2).toUpperCase()}
                    </div>
                    <p className="text-sm font-bold text-foreground truncate">{al.title}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{al.artist}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Playlists */}
          {playlists.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <ListMusic size={15} className="text-primary" /> {t('playlists')}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {playlists.slice(0, 4).map(pl => (
                  <div
                    key={pl.id}
                    onClick={() => navigate(`/playlists/${pl.id}`)}
                    className="bg-card border border-border rounded-2xl p-4 hover:border-primary/30 hover:scale-[1.01] transition-all cursor-pointer shadow-sm group"
                  >
                    <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-border flex items-center justify-center text-xl font-bold text-white mb-3 overflow-hidden shadow">
                      {pl.cover ? <img src={pl.cover} alt={pl.name} className="w-full h-full object-cover" /> : pl.name.slice(0, 2).toUpperCase()}
                    </div>
                    <p className="text-sm font-bold text-foreground truncate">{pl.name}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">от {pl.creator || 'QMusic'}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!hasResults && (
            <div className="text-center text-muted-foreground text-sm py-12">
              Ничего не найдено по запросу «{query}»
            </div>
          )}
        </div>
      )}

      {!query && <SearchSuggestions onPick={(q) => { setQuery(q); setParams({ q }); }} />}
    </div>
  );
}

const POPULAR_QUERIES = ['Dimash', 'Иманбек', 'Скриптонит', 'Молданазар', 'Jah Khalib', 'Роза Рымбаева'];
const POPULAR_GENRES = [
  { name: 'Казахская', grad: 'linear-gradient(135deg, #06B6D4, #10B981)' },
  { name: 'Hip-Hop', grad: 'linear-gradient(135deg, #F59E0B, #EF4444)' },
  { name: 'Electronic', grad: 'linear-gradient(135deg, #06B6D4, #8B5CF6)' },
  { name: 'Pop', grad: 'linear-gradient(135deg, #EC4899, #8B5CF6)' },
  { name: 'R&B', grad: 'linear-gradient(135deg, #8B5CF6, #EC4899)' },
  { name: 'Rock', grad: 'linear-gradient(135deg, #EF4444, #7C3AED)' },
];

function SearchSuggestions({ onPick }: { onPick: (q: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <TrendingUp size={14} className="text-primary" /> {t('popular_queries')}
        </h3>
        <div className="flex flex-wrap gap-2">
          {POPULAR_QUERIES.map(q => (
            <button
              key={q}
              onClick={() => onPick(q)}
              className="px-4 py-2 rounded-xl bg-card border border-border text-sm text-foreground hover:border-primary/40 hover:bg-secondary transition-all cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <Sparkles size={14} className="text-accent" /> {t('genres_explore')}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {POPULAR_GENRES.map(g => (
            <button
              key={g.name}
              onClick={() => onPick(g.name)}
              className="relative h-24 rounded-2xl overflow-hidden cursor-pointer group text-left"
              style={{ background: g.grad }}
            >
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
              <span className="absolute bottom-3 left-4 text-base font-bold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {g.name}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
