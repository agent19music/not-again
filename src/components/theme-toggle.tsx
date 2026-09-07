import { MoonIcon, SunIcon } from 'phosphor-react-native';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Motion, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useResolvedScheme, useThemeMode } from '@/hooks/use-theme-mode';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export function ThemeToggle() {
  const colors = useTheme();
  const scheme = useResolvedScheme();
  const { setPreference } = useThemeMode();
  const scale = useSharedValue(1);

  const toggle = () => {
    setPreference(scheme === 'dark' ? 'light' : 'dark');
  };

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  return (
    <Pressable
      onPress={toggle}
      onPressIn={() => {
        scale.set(withTiming(Motion.scale.press, { duration: 100, easing: EASE_OUT }));
      }}
      onPressOut={() => {
        scale.set(withTiming(1, { duration: 150, easing: EASE_OUT }));
      }}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={scheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
      <Animated.View style={[styles.button, { backgroundColor: colors.surfaceAlt }, containerStyle]}>
        {scheme === 'dark' ? (
          <Animated.View key="moon" entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)}>
            <MoonIcon size={20} color={colors.text} weight="regular" />
          </Animated.View>
        ) : (
          <Animated.View key="sun" entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)}>
            <SunIcon size={20} color={colors.text} weight="regular" />
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
