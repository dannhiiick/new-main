import { Play, Pause, SkipBack, SkipForward, Volume2, Heart } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Track } from '../types';
import './Player.css';

interface PlayerProps {
  currentTrack?: Track;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';

  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

export function Player({ currentTrack }: PlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(currentTrack?.duration || 0);
  const hasAudio = Boolean(currentTrack?.audioUrl);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    setCurrentTime(0);
    setDuration(currentTrack?.duration || 0);

    if (!currentTrack?.audioUrl || !audioRef.current) {
      setIsPlaying(false);
      return;
    }

    const audio = audioRef.current;
    audio.muted = false; // Force unmute
    audio.load();
    
    const playAudio = async () => {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.error("Playback failed:", err);
        setIsPlaying(false);
      }
    };
    
    void playAudio();
  }, [currentTrack]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio || !hasAudio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    void audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  };

  const seekTo = (nextProgress: number) => {
    const audio = audioRef.current;
    if (!audio || duration <= 0) return;

    const nextTime = Math.max(0, Math.min(duration, (duration * nextProgress) / 100));
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  return (
    <div className="player">
      <audio
        ref={audioRef}
        src={currentTrack?.audioUrl || undefined}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || currentTrack?.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />

      <div className="player-track-info">
        <div className="player-cover">{currentTrack?.cover || 'MS'}</div>
        <div className="track-details">
          <h4 className="track-name">{currentTrack?.title || 'Выберите трек'}</h4>
          <p className="artist-name">{currentTrack?.artist || 'Музыка появится здесь'}</p>
        </div>
        <button className="like-btn" title="В избранное" type="button">
          <Heart size={18} />
        </button>
      </div>

      <div className="player-controls">
        <div className="controls-top">
          <button className="control-btn prev" title="Предыдущий трек" type="button">
            <SkipBack size={18} />
          </button>
          <button
            className={`control-btn play ${isPlaying ? 'playing' : ''}`}
            onClick={togglePlayback}
            title={isPlaying ? 'Пауза' : 'Воспроизвести'}
            type="button"
            disabled={!hasAudio}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <button className="control-btn next" title="Следующий трек" type="button">
            <SkipForward size={18} />
          </button>
        </div>

        <div className="progress-bar">
          <span className="time">{formatTime(currentTime)}</span>
          <div
            className="progress-track"
            onClick={(e) => {
              const { left, width } = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - left;
              seekTo(Math.max(0, Math.min(100, (clickX / width) * 100)));
            }}
            role="slider"
            aria-label="Позиция трека"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            tabIndex={0}
          >
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            <div className="progress-handle" style={{ left: `${progress}%` }}></div>
          </div>
          <span className="time">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="player-right">
        <button className="control-btn volume" title="Громкость" type="button">
          <Volume2 size={18} />
        </button>
        <input
          type="range"
          className="volume-slider"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          min="0"
          max="100"
          aria-label="Громкость"
          style={{ backgroundSize: `${volume}% 100%` }}
        />
      </div>
    </div>
  );
}
