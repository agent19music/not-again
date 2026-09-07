import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useEffect, useState } from 'react';

import SafeText from '@/components/safe-text';
import { Motion, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  EMPTY_STREAK,
  formatStreak,
  formatStreakDigits,
  type StreakParts,
} from '@/lib/streak';

export function StreakTimer({ lastGoonAt, now }: { lastGoonAt: number | null; now: number }) {
  const colors = useTheme();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  const empty = lastGoonAt === null;
  const parts: StreakParts = empty ? EMPTY_STREAK : formatStreak(now - lastGoonAt);
  const digits = formatStreakDigits(parts);

  return (
    <View style={styles.wrap}>
      <Animated.View
        key={parts.tier}
        entering={reduceMotion ? undefined : FadeIn.duration(Motion.timing.gentle)}
        exiting={reduceMotion ? undefined : FadeOut.duration(Motion.timing.gentle)}
        style={styles.digitsRow}>
        <View style={styles.unitCol}>
          <SafeText variant="timer" tabular style={styles.digit}>
            {digits[0]}
          </SafeText>
          <SafeText variant="caption" color="textMuted" style={styles.unitLabel}>
            {parts.labels[0]}
          </SafeText>
        </View>
        <SafeText variant="timer" color="textMuted" style={styles.colon}>
          :
        </SafeText>
        <View style={styles.unitCol}>
          <SafeText variant="timer" tabular style={styles.digit}>
            {digits[1]}
          </SafeText>
          <SafeText variant="caption" color="textMuted" style={styles.unitLabel}>
            {parts.labels[1]}
          </SafeText>
        </View>
        <SafeText variant="timer" color="textMuted" style={styles.colon}>
          :
        </SafeText>
        <View style={styles.unitCol}>
          <SafeText variant="timer" tabular style={styles.digit}>
            {digits[2]}
          </SafeText>
          <SafeText variant="caption" color="textMuted" style={styles.unitLabel}>
            {parts.labels[2]}
          </SafeText>
        </View>
      </Animated.View>

      <SafeText variant="body" color="textSecondary" style={styles.caption}>
        {empty ? 'Nothing logged yet.' : 'since last goon'}
      </SafeText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: Spacing.s12,
    paddingVertical: Spacing.s8,
  },
  digitsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  unitCol: {
    alignItems: 'center',
    minWidth: 72,
  },
  digit: {
    textAlign: 'center',
  },
  colon: {
    marginTop: 0,
    paddingHorizontal: Spacing.s4,
  },
  unitLabel: {
    marginTop: Spacing.s4,
  },
  caption: {
    textAlign: 'center',
  },
});
