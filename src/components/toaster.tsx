import { CheckCircleIcon, XCircleIcon } from 'phosphor-react-native';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SafeText from '@/components/safe-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dismissToast, getSnapshot, subscribe, type ToastItem } from '@/lib/toast-store';

const SWIPE_DISMISS_DISTANCE = 80;
const SWIPE_DISMISS_VELOCITY = 800;

export function Toaster() {
  const toasts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + 92 }]}>
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </View>
  );
}

function ToastCard({ item }: { item: ToastItem }) {
  const colors = useTheme();
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const dismiss = useCallback(() => dismissToast(item.id), [item.id]);

  useEffect(() => {
    if (item.duration === Infinity) return undefined;
    const timer = setTimeout(dismiss, item.duration);
    return () => clearTimeout(timer);
  }, [dismiss, item.duration]);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      translateX.set(event.translationX);
    })
    .onEnd((event) => {
      const shouldDismiss =
        Math.abs(event.translationX) > SWIPE_DISMISS_DISTANCE ||
        Math.abs(event.velocityX) > SWIPE_DISMISS_VELOCITY;
      if (shouldDismiss) {
        const direction = event.translationX >= 0 ? 1 : -1;
        translateX.set(withTiming(direction * 400, { duration: 180 }));
        opacity.set(
          withTiming(0, { duration: 180 }, (finished) => {
            if (finished) scheduleOnRN(dismiss);
          })
        );
      } else {
        translateX.set(withSpring(0, { duration: 300, dampingRatio: 0.8 }));
      }
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const palette =
    item.variant === 'success'
      ? { bg: colors.successSoft, fg: colors.successSoftText }
      : item.variant === 'error'
        ? { bg: colors.dangerSoft, fg: colors.dangerSoftText }
        : { bg: colors.surface, fg: colors.text };

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        layout={LinearTransition.duration(200)}
        style={[
          styles.card,
          { backgroundColor: palette.bg, borderColor: colors.border, shadowColor: colors.shadow },
          style,
        ]}>
        <Pressable onPress={dismiss} style={styles.pressable}>
          {item.variant === 'success' ? (
            <CheckCircleIcon size={20} color={palette.fg} weight="fill" />
          ) : item.variant === 'error' ? (
            <XCircleIcon size={20} color={palette.fg} weight="fill" />
          ) : null}
          <View style={styles.textBlock}>
            <SafeText variant="bodySm" style={{ color: palette.fg }}>
              {item.title}
            </SafeText>
            {item.description ? (
              <SafeText variant="caption" style={[styles.description, { color: palette.fg }]}>
                {item.description}
              </SafeText>
            ) : null}
          </View>
        </Pressable>
        {item.action ? (
          <Pressable
            onPress={() => {
              item.action?.onClick();
              dismiss();
            }}
            hitSlop={8}
            style={styles.actionButton}>
            <SafeText variant="label" style={{ color: palette.fg }}>
              {item.action.label}
            </SafeText>
          </Pressable>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: Spacing.s16,
    right: Spacing.s16,
    gap: Spacing.s8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.s16,
    paddingVertical: Spacing.s12,
    gap: Spacing.s12,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  pressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s12,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  description: {
    opacity: 0.8,
  },
  actionButton: {
    paddingHorizontal: Spacing.s12,
    paddingVertical: Spacing.s8,
  },
});
