import { useMemo } from 'react';
import { Text, View } from 'react-native';

// Genre keyword → [dark, light] color pair
const GENRE_PALETTES: Record<string, [string, string]> = {
  pop:          ['#5A1A6B', '#C84ECD'],
  rock:         ['#6B1C1C', '#C84E4E'],
  metal:        ['#2A2A2A', '#7A7A7A'],
  'hip-hop':    ['#6B3D1C', '#C87B4E'],
  rap:          ['#6B3D1C', '#C87B4E'],
  jazz:         ['#1C3D6B', '#4E7BC8'],
  blues:        ['#1C2D6B', '#4E5EC8'],
  electronic:   ['#1A1A6B', '#4E4ECD'],
  edm:          ['#1A1A6B', '#4ECDC4'],
  dance:        ['#1A1A6B', '#4ECDC4'],
  classical:    ['#4A3A1A', '#C8B44E'],
  folk:         ['#1A4A2A', '#4EC87B'],
  acoustic:     ['#1A4A2A', '#4EC87B'],
  country:      ['#4A2A1A', '#C8844E'],
  soul:         ['#4A1A3A', '#C84E8A'],
  'r&b':        ['#4A1A3A', '#C84E8A'],
  reggae:       ['#1A4A1A', '#4EC84E'],
  latin:        ['#6B1C2A', '#C84E5A'],
  indie:        ['#2A3A4A', '#6A8AA0'],
  alternative:  ['#3A2A4A', '#8A6AC8'],
};

// 8 fallback palettes for unknown genres (cycled by artist name hash)
const FALLBACK_PALETTES: [string, string][] = [
  ['#0D1326', '#C87B4E'], // brand copper
  ['#1A2640', '#4E7BC8'], // navy blue
  ['#261A0D', '#C8A44E'], // warm gold
  ['#1A2618', '#4EC87B'], // forest
  ['#261A26', '#C84EC8'], // violet
  ['#26181A', '#C84E6A'], // rose
  ['#181A26', '#4E4EC8'], // indigo
  ['#1A2626', '#4EC8C8'], // teal
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getPalette(artistName: string, isLocal: boolean): [string, string] {
  if (isLocal) return ['#0D1326', '#C87B4E'];
  const idx = hashString(artistName) % FALLBACK_PALETTES.length;
  return FALLBACK_PALETTES[idx]!;
}

function getInitials(artistName: string): string {
  const parts = artistName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

interface CoverPlaceholderProps {
  artistName: string;
  isLocal?: boolean;
  size: number;
  borderRadius?: number;
}

export function CoverPlaceholder({ artistName, isLocal = false, size, borderRadius = 8 }: CoverPlaceholderProps) {
  const [dark, light] = useMemo(
    () => getPalette(artistName, isLocal),
    [artistName, isLocal],
  );

  const initials = useMemo(() => getInitials(artistName || '?'), [artistName]);
  const fontSize = Math.round(size * 0.3);
  const dotSize = Math.round(size * 0.55);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius,
        backgroundColor: dark,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Decorative blob — simulates gradient */}
      <View
        style={{
          position: 'absolute',
          top: -dotSize * 0.3,
          right: -dotSize * 0.3,
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: light,
          opacity: 0.35,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -dotSize * 0.4,
          left: -dotSize * 0.2,
          width: dotSize * 0.7,
          height: dotSize * 0.7,
          borderRadius: dotSize * 0.35,
          backgroundColor: light,
          opacity: 0.18,
        }}
      />
      {/* Initials */}
      <Text
        style={{
          fontSize,
          fontWeight: '700',
          color: light,
          letterSpacing: 1,
          zIndex: 1,
        }}
        numberOfLines={1}
      >
        {initials}
      </Text>
    </View>
  );
}
