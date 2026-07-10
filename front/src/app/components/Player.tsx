import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Heart, Shuffle, Repeat, Repeat1 } from 'lucide-react';
import { api, type Track } from './api';
import { useLibrary } from './libraryStore';
import { usePlayback } from './PlaybackContext';

function fmt(s: number) {
  if (!Number.isFinite(s) || s <= 0) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export function Player() {
  const {
    currentTrack,
    playing,
    queue,
    currentIndex,
    nextTrack,
    prevTrack,
    shuffle,
    repeat,
    setShuffle,
    setRepeat,
    setPlaying,
    togglePlay,
  } = usePlayback();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const { isLiked, toggleLike } = useLibrary();
  const liked = currentTrack ? isLiked(currentTrack.id) : false;
  const hasAudio = Boolean(currentTrack?.audioUrl);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const getAudioSource = () => {
    if (!currentTrack?.audioUrl) return undefined;
    
    // If it's a full URL that's not local, use it as is
    if (currentTrack.audioUrl.startsWith('http') && !currentTrack.audioUrl.includes('localhost') && !currentTrack.audioUrl.includes('127.0.0.1')) {
      return currentTrack.audioUrl;
    }
    
    // Extract the filename (e.g. "/media/filename.wav" -> "filename.wav")
    const parts = currentTrack.audioUrl.split('/');
    const filename = parts[parts.length - 1];
    
    // Use the custom serving endpoint
    return api.audioUrl(filename);
  };

  const audioSrc = getAudioSource();

  // Sync audio element play/pause with context's playing state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) return;
    if (playing) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [playing, audioSrc]);

  // Load new track when currentTrack changes
  useEffect(() => {
    setCurrentTime(0);
    setDuration(currentTrack?.duration || 0);
    if (!audioSrc || !audioRef.current) { setPlaying(false); return; }
    const audio = audioRef.current;
    audio.load();
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack, audioSrc]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume / 100;
    }
  }, [volume, muted]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a || !hasAudio) return;
    togglePlay();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || duration <= 0) return;
    const { left, width } = e.currentTarget.getBoundingClientRect();
    const t = Math.max(0, Math.min(duration, ((e.clientX - left) / width) * duration));
    a.currentTime = t;
    setCurrentTime(t);
  };

  const handleEnded = () => {
    if (repeat === 'one') {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    } else {
      nextTrack();
    }
  };

  const handleRepeatCycle = () => {
    if (repeat === 'none') setRepeat('all');
    else if (repeat === 'all') setRepeat('one');
    else setRepeat('none');
  };

  const coverLabel = currentTrack?.cover || (currentTrack ? currentTrack.title.slice(0, 2).toUpperCase() : '♫');
  const queueInfo = queue.length > 1 ? `${currentIndex + 1} / ${queue.length}` : null;

  return (
    <div
      style={{ fontFamily: "'Inter', sans-serif" }}
      className="bg-card border-t border-border shrink-0"
    >
      <audio
        ref={audioRef}
        src={audioSrc}
        onLoadedMetadata={e => setDuration(e.currentTarget.duration || currentTrack?.duration || 0)}
        onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onEnded={handleEnded}
      />

      {/* Mobile top progress bar */}
      <div className="sm:hidden h-0.5 bg-secondary cursor-pointer" onClick={seek}>
        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex items-center justify-between px-3 h-[64px] sm:h-[76px] sm:px-6">
        {/* Track info */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 sm:w-[240px] sm:flex-none">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold text-white overflow-hidden"
            style={{ background: currentTrack ? 'linear-gradient(135deg, #8B5CF6, #EC4899)' : '#1E1E30' }}>
            {currentTrack?.coverUrl ? (
              <img src={currentTrack.coverUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
            ) : coverLabel}
          </div>
          <div className="min-w-0 flex-1 sm:flex-none">
            <p className="text-sm font-medium text-foreground truncate">{currentTrack?.title || 'Выберите трек'}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground truncate">{currentTrack?.artist || '—'}</p>
              {queueInfo && (
                <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{queueInfo}</span>
              )}
            </div>
          </div>
          <button
            onClick={() => currentTrack && toggleLike(currentTrack)}
            className={`ml-1 shrink-0 transition-colors ${liked ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Heart size={15} className={liked ? 'fill-accent' : ''} />
          </button>
        </div>

        {/* Mobile compact controls */}
        <div className="flex sm:hidden items-center gap-2 ml-2 shrink-0">
          <button onClick={prevTrack} className="text-muted-foreground hover:text-foreground transition-colors">
            <SkipBack size={16} />
          </button>
          <button
            onClick={toggle}
            disabled={!hasAudio}
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>
          <button onClick={nextTrack} className="text-muted-foreground hover:text-foreground transition-colors">
            <SkipForward size={16} />
          </button>
        </div>

        {/* Desktop center controls */}
        <div className="hidden sm:flex flex-col items-center gap-1.5 flex-1 max-w-[480px]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShuffle(!shuffle)}
              className={`transition-colors ${shuffle ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Shuffle size={15} />
            </button>
            <button onClick={prevTrack} className="text-muted-foreground hover:text-foreground transition-colors">
              <SkipBack size={18} />
            </button>
            <button
              onClick={toggle}
              disabled={!hasAudio}
              className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>
            <button onClick={nextTrack} className="text-muted-foreground hover:text-foreground transition-colors">
              <SkipForward size={18} />
            </button>
            <button
              onClick={handleRepeatCycle}
              className={`transition-colors ${repeat !== 'none' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {repeat === 'one' ? <Repeat1 size={15} /> : <Repeat size={15} />}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full">
            <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">{fmt(currentTime)}</span>
            <div
              className="flex-1 h-1 rounded-full bg-secondary cursor-pointer relative group"
              onClick={seek}
            >
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2"
                style={{ left: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground w-8 tabular-nums">{fmt(duration)}</span>
          </div>
        </div>

        {/* Volume (desktop only) */}
        <div className="hidden sm:flex items-center gap-2 w-[200px] justify-end">
          <button
            onClick={() => setMuted(m => !m)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : volume}
            onChange={e => { setVolume(Number(e.target.value)); setMuted(false); }}
            className="w-24 h-1 accent-primary cursor-pointer"
            style={{ accentColor: '#8B5CF6' }}
          />
        </div>
      </div>
    </div>
  );
}
