import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { ChartBarIcon, PlusCircleIcon } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomFade } from '@/components/bottom-fade';
import { TAB_BAR_BOTTOM_OFFSET, TAB_BAR_ICON_SIZE } from '@/constants/tab-bar';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useResolvedScheme } from '@/hooks/use-theme-mode';

function TabIcon({
  name,
  isFocused,
  color,
}: {
  name: string;
  isFocused: boolean;
  color: string;
}) {
  const weight = isFocused ? 'fill' : 'regular';
  if (name === 'index') return <PlusCircleIcon size={TAB_BAR_ICON_SIZE} color={color} weight={weight} />;
  if (name === 'stats') return <ChartBarIcon size={TAB_BAR_ICON_SIZE} color={color} weight={weight} />;
  return null;
}

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const colors = useTheme();
  const scheme = useResolvedScheme();
  const insets = useSafeAreaInsets();

  return (
    <>
      <BottomFade />
      <View style={[styles.container, { bottom: insets.bottom + TAB_BAR_BOTTOM_OFFSET }]}>
        <View style={[styles.pill, { borderColor: colors.border }]}>
          <BlurView
            intensity={100}
            tint={scheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface, opacity: 0.7 }]}
          />
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const color = isFocused ? colors.accent : colors.textMuted;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}>
                <TabIcon name={route.name} isFocused={isFocused} color={color} />
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  );
}

export default function AppTabs() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="stats" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 100,
  },
  pill: {
    flexDirection: 'row',
    borderRadius: Radius.pill,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.s12,
    paddingHorizontal: Spacing.s8,
  },
  tab: {
    paddingHorizontal: Spacing.s24,
    paddingVertical: Spacing.s8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPressed: {
    opacity: 0.6,
  },
});
