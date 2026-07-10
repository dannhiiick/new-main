import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { Play, Disc, ArrowLeft, Clock } from 'lucide-react';
import { api, type Album, type Track } from './api';
import { usePlayback } from './PlaybackContext';
import { useTranslation } from './i18n';

export function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { playTrack } = usePlayback();
  const { t } = useTranslation();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.album(id)
      .then(data => {
        setAlbum(data);
        setError(null);
      })
      .catch(err => {
        setError(err.message || "Error loading album details");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handlePlayAll = () => {
    if (album && album.tracks && album.tracks.length > 0) {
      playTrack(album.tracks[0], album.tracks);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="flex-1 p-6 bg-background">
        <Link to="/albums" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm">
          <ArrowLeft size={16} /> {t('albums')}
        </Link>
        <div className="text-center text-muted-foreground py-12">
          {error || "Альбом не найден"}
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex-1 overflow-y-auto p-6 bg-background">
      <Link to="/albums" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm w-fit transition-colors">
        <ArrowLeft size={16} /> {t('albums')}
      </Link>

      {/* Album Header */}
      <div className="relative rounded-3xl overflow-hidden mb-8 border border-border bg-gradient-to-r from-pink-900/40 via-purple-900/20 to-card p-6 md:p-8 flex flex-col sm:flex-row gap-6 items-center sm:items-end">
        <div className="w-36 h-36 md:w-44 md:h-44 rounded-2xl shrink-0 flex items-center justify-center text-4xl font-bold text-white overflow-hidden shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #EC4899, #8B5CF6)' }}>
          {album.cover ? <img src={album.cover} alt={album.title} className="w-full h-full object-cover" /> : album.title.slice(0, 2).toUpperCase()}
        </div>

        <div className="flex-1 text-center sm:text-left min-w-0">
          <span className="px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-semibold uppercase tracking-wider">
            Альбом • {album.year}
          </span>
          <h1 className="text-2xl md:text-4xl font-extrabold text-foreground mt-2 mb-2 tracking-tight truncate">
            {album.title}
          </h1>
          <p className="text-sm font-semibold text-primary hover:underline cursor-pointer mb-4">
            {album.artist}
          </p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
            <button
              onClick={handlePlayAll}
              disabled={!album.tracks || album.tracks.length === 0}
              className="px-6 py-3 bg-primary hover:bg-primary/95 text-white rounded-full text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={16} className="fill-white" />
              <span>Слушать все</span>
            </button>
            <span className="text-xs text-muted-foreground">
              {album.tracks ? album.tracks.length : 0} треков
            </span>
          </div>
        </div>
      </div>

      {/* Tracklist Table */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Disc size={18} className="text-accent" /> Список треков
          </h2>
        </div>

        {album.tracks && album.tracks.length > 0 ? (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
            <div className="hidden sm:flex items-center px-6 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span className="w-8 text-center">#</span>
              <span className="flex-1 ml-4">Название</span>
              <span className="w-32">Жанр</span>
              <span className="w-20 text-right"><Clock size={14} className="inline" /></span>
            </div>

            {album.tracks.map((track, i) => (
              <div
                key={track.id}
                onClick={() => playTrack(track, album.tracks)}
                className="flex items-center gap-3 sm:gap-0 px-5 sm:px-6 py-3.5 hover:bg-secondary/40 cursor-pointer group transition-colors border-b border-border last:border-0"
              >
                <span className="text-xs text-muted-foreground w-8 text-center group-hover:hidden">{i + 1}</span>
                <Play size={13} className="text-primary hidden group-hover:block w-8 text-center" />
                
                <div className="flex-1 min-w-0 sm:ml-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #EC4899, #8B5CF6)' }}>
                    {track.coverUrl ? <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" /> : track.title.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                  </div>
                </div>

                <span className="hidden sm:inline w-32 text-xs text-muted-foreground truncate">{track.genre}</span>
                <span className="w-20 text-right text-xs text-muted-foreground tabular-nums ml-auto sm:ml-0">
                  {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-12 border border-dashed border-border rounded-2xl">
            В этом альбоме пока нет треков.
          </div>
        )}
      </section>
    </div>
  );
}
