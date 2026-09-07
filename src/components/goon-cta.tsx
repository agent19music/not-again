import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import SafeText from '@/components/safe-text';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GoonCta({ onPress }: { onPress: () => void }) {
  const colors = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.set(withTiming(Motion.scale.press, { duration: Motion.timing.fast, easing: EASE_OUT }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const handlePressOut = () => {
    scale.set(withTiming(1, { duration: Motion.timing.base, easing: EASE_OUT }));
  };

  const handlePress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.button,
        { backgroundColor: colors.accent },
        animatedStyle,
      ]}
      accessibilityRole="button"
      accessibilityLabel="gooned ?">
      <SafeText variant="headline" color="onAccent">
        gooned ?
      </SafeText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    paddingHorizontal: Spacing.s32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
