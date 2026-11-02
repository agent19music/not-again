import type { ReactNode } from 'react';
import { GearIcon, MoonIcon, SunIcon } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import SafeText from '@/components/safe-text';
import { Motion, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useResolvedScheme, useThemeMode } from '@/hooks/use-theme-mode';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

function HeaderIconButton({
  onPress,
  label,
  children,
}: {
  onPress: () => void;
  label: string;
  children: ReactNode;
}) {
  const colors = useTheme();
  const scale = useSharedValue(1);
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.set(withTiming(Motion.scale.press, { duration: 100, easing: EASE_OUT }));
      }}
      onPressOut={() => {
        scale.set(withTiming(1, { duration: 150, easing: EASE_OUT }));
      }}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <Animated.View style={[styles.button, { backgroundColor: colors.surfaceAlt }, containerStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

function ThemeToggleButton() {
  const colors = useTheme();
  const scheme = useResolvedScheme();
  const { setPreference } = useThemeMode();

  return (
    <HeaderIconButton
      onPress={() => setPreference(scheme === 'dark' ? 'light' : 'dark')}
      label={scheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
      {scheme === 'dark' ? (
        <Animated.View key="moon" entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)}>
          <MoonIcon size={20} color={colors.text} weight="regular" />
        </Animated.View>
      ) : (
        <Animated.View key="sun" entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)}>
          <SunIcon size={20} color={colors.text} weight="regular" />
        </Animated.View>
      )}
    </HeaderIconButton>
  );
}

export function ScreenHeader({ title }: { title: string }) {
  const colors = useTheme();
  const router = useRouter();

  return (
    <View style={styles.row}>
      <SafeText variant="title">{title}</SafeText>
      <View style={styles.actions}>
        <HeaderIconButton onPress={() => router.push('/settings')} label="Settings">
          <GearIcon size={20} color={colors.text} weight="regular" />
        </HeaderIconButton>
        <ThemeToggleButton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
