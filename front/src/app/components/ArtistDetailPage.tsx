import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { Play, UserCheck, UserPlus, Disc, ArrowLeft } from 'lucide-react';
import { api, type Artist, type Track } from './api';
import { useLibrary } from './libraryStore';
import { usePlayback } from './PlaybackContext';
import { useTranslation } from './i18n';

export function ArtistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { followed, toggleFollowArtist } = useLibrary();
  const { playTrack } = usePlayback();
  const { t } = useTranslation();

  const isFollowed = id ? followed.includes(id) : false;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    // Fetch details
    api.artist(id)
      .then(data => {
        setArtist(data);
        setError(null);
      })
      .catch(err => {
        setError(err.message || "Error loading artist details");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="flex-1 p-6 bg-background">
        <Link to="/artists" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm">
          <ArrowLeft size={16} /> {t('artists')}
        </Link>
        <div className="text-center text-muted-foreground py-12">
          {error || "Артист не найден"}
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex-1 overflow-y-auto p-6 bg-background">
      <Link to="/artists" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm w-fit transition-colors">
        <ArrowLeft size={16} /> {t('artists')}
      </Link>

      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden mb-8 border border-border bg-gradient-to-r from-purple-900/40 via-cyan-900/20 to-card p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center">
        <div className="w-28 h-28 md:w-36 md:h-36 rounded-full shrink-0 flex items-center justify-center text-3xl font-bold text-white overflow-hidden shadow-xl"
          style={{ background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)' }}>
          {artist.image ? <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" /> : artist.name.slice(0, 2).toUpperCase()}
        </div>

        <div className="flex-1 text-center md:text-left min-w-0">
          <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
            {artist.genre}
          </span>
          <h1 className="text-2xl md:text-4xl font-extrabold text-foreground mt-2 mb-2 tracking-tight">
            {artist.name}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground max-w-2xl leading-relaxed mb-4">
            {artist.bio || "Биография артиста пока не заполнена."}
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 text-xs text-muted-foreground">
            {artist.country && <span>📍 {artist.country}{artist.city ? `, ${artist.city}` : ''}</span>}
            <span>👥 {artist.followers.toLocaleString()} {t('followedArtists').toLowerCase()}</span>
          </div>
        </div>

        <button
          onClick={() => id && toggleFollowArtist(id)}
          className={`px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow ${
            isFollowed 
              ? 'bg-secondary text-foreground border border-border hover:bg-secondary/80' 
              : 'bg-primary text-white hover:bg-primary/90'
          }`}
        >
          {isFollowed ? (
            <>
              <UserCheck size={16} />
              <span>Подписка ✓</span>
            </>
          ) : (
            <>
              <UserPlus size={16} />
              <span>Подписаться</span>
            </>
          )}
        </button>
      </div>

      {/* Tracks Section */}
      <section>
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Disc size={18} className="text-primary" /> Популярные треки
        </h2>

        {artist.tracks && artist.tracks.length > 0 ? (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
            {artist.tracks.map((track, i) => (
              <div
                key={track.id}
                onClick={() => playTrack(track, artist.tracks)}
                className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/40 cursor-pointer group transition-colors border-b border-border last:border-0"
              >
                <span className="text-xs text-muted-foreground w-5 text-center group-hover:hidden">{i + 1}</span>
                <Play size={13} className="text-primary hidden group-hover:block w-5" />
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
                  {track.coverUrl ? <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" /> : track.title.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                </div>
                <span className="hidden sm:inline text-xs text-muted-foreground">{track.genre}</span>
                <span className="text-xs text-muted-foreground tabular-nums ml-auto">
                  {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8 border border-dashed border-border rounded-2xl">
            У этого артиста пока нет опубликованных треков.
          </div>
        )}
      </section>
    </div>
  );
}
