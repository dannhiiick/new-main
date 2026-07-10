import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, type Track } from './api';

interface PlaybackContextType {
  queue: Track[];
  currentIndex: number;
  playing: boolean;
  shuffle: boolean;
  repeat: 'none' | 'all' | 'one';
  currentTrack: Track | undefined;
  setQueue: (q: Track[]) => void;
  setCurrentIndex: (i: number) => void;
  setPlaying: (p: boolean) => void;
  setShuffle: (s: boolean) => void;
  setRepeat: (r: 'none' | 'all' | 'one') => void;
  playTrack: (track: Track, newQueue?: Track[]) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  togglePlay: () => void;
}

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [playing, setPlaying] = useState<boolean>(false);
  const [shuffle, setShuffle] = useState<boolean>(false);
  const [repeat, setRepeat] = useState<'none' | 'all' | 'one'>('none');

  const currentTrack = currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : undefined;

  const playTrack = (track: Track, newQueue?: Track[]) => {
    let activeQueue = queue;
    if (newQueue && newQueue.length > 0) {
      activeQueue = newQueue;
      setQueue(newQueue);
    } else if (!queue.some(t => t.id === track.id)) {
      activeQueue = [...queue, track];
      setQueue(activeQueue);
    }
    
    const idx = activeQueue.findIndex(t => t.id === track.id);
    setCurrentIndex(idx >= 0 ? idx : 0);
    setPlaying(true);

    // Call the backend endpoint to record play count asynchronously
    if (track.id) {
      fetch(`/api/tracks/${track.id}/play`, { method: 'POST' }).catch(() => {});
      // Also push to recents locally and on server
      import('./libraryStore').then(store => {
        store.pushRecent(track);
      });
    }
  };

  const nextTrack = () => {
    if (queue.length === 0) return;
    if (shuffle) {
      const rand = Math.floor(Math.random() * queue.length);
      setCurrentIndex(rand);
    } else {
      if (currentIndex < queue.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (repeat === 'all') {
        setCurrentIndex(0);
      } else {
        setPlaying(false);
      }
    }
  };

  const prevTrack = () => {
    if (queue.length === 0) return;
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (repeat === 'all') {
      setCurrentIndex(queue.length - 1);
    }
  };

  const togglePlay = () => {
    if (currentIndex >= 0 && currentIndex < queue.length) {
      setPlaying(!playing);
    }
  };

  return (
    <PlaybackContext.Provider
      value={{
        queue,
        currentIndex,
        playing,
        shuffle,
        repeat,
        currentTrack,
        setQueue,
        setCurrentIndex,
        setPlaying,
        setShuffle,
        setRepeat,
        playTrack,
        nextTrack,
        prevTrack,
        togglePlay,
      }}
    >
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error('usePlayback must be used within PlaybackProvider');
  }
  return context;
}
