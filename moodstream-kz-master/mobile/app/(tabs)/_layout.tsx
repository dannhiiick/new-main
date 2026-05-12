import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { FullPlayer } from '../../components/player/FullPlayer';
import { MiniPlayer } from '../../components/player/MiniPlayer';
import { TestModeBanner } from '../../components/testmode/TestModeBanner';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { usePlayerStore } from '../../store/player';
import { useThemeStore } from '../../store/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export default function TabsLayout() {
  const { t } = useTranslation();
  const { currentTrack } = usePlayerStore();
  const [fullPlayerVisible, setFullPlayerVisible] = useState(false);
  const palette = useThemeStore(s => s.palette);

  return (
    <ErrorBoundary>
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: palette.bg,
            borderTopColor: palette.border,
            borderTopWidth: 1,
            paddingTop: 6,
            paddingBottom: 8,
            height: 64,
          },
          tabBarActiveTintColor: palette.accent,
          tabBarInactiveTintColor: palette.textMuted,
          tabBarShowLabel: true,
          tabBarLabelPosition: 'below-icon',
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('tabs.home'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={'home' as IoniconName} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: t('tabs.search'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={'search' as IoniconName} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: t('tabs.library'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={'library' as IoniconName} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('tabs.profile'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={'person' as IoniconName} size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      {currentTrack && (
        <MiniPlayer onExpand={() => setFullPlayerVisible(true)} />
      )}

      <FullPlayer
        visible={fullPlayerVisible}
        onClose={() => setFullPlayerVisible(false)}
      />

      {/* Floating pill — absolutely positioned, must be last for z-order */}
      <TestModeBanner />
    </View>
    </ErrorBoundary>
  );
}
