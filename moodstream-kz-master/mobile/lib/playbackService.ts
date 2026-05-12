import TrackPlayer, { Event } from 'react-native-track-player';

/**
 * Background playback service — handles remote control events
 * (lock screen, Bluetooth headset buttons, notification controls).
 * Registered via TrackPlayer.registerPlaybackService() in _layout.tsx.
 */
export async function PlaybackService(): Promise<void> {
  TrackPlayer.addEventListener(Event.RemotePlay, () => void TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => void TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteNext, () => void TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () => void TrackPlayer.skipToPrevious());
  TrackPlayer.addEventListener(Event.RemoteStop, () => void TrackPlayer.stop());
  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) =>
    void TrackPlayer.seekTo(position),
  );
}
