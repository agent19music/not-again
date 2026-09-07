import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import SafeText from '@/components/safe-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DAY_LABELS } from '@/lib/digest';

const MAX_BAR_HEIGHT = 96;

export function WeekBars({ byDay }: { byDay: number[] }) {
  const colors = useTheme();
  const max = Math.max(1, ...byDay);

  return (
    <View style={styles.chart}>
      {byDay.map((count, index) => {
        const height = count === 0 ? 4 : Math.max(6, (count / max) * MAX_BAR_HEIGHT);
        return (
          <View key={DAY_LABELS[index]} style={styles.column}>
            <View style={styles.track}>
              <Animated.View layout={LinearTransition.duration(250)}>
                <Animated.View
                  entering={FadeIn.delay(index * 40).duration(220)}
                  style={[
                    styles.bar,
                    { height, backgroundColor: count > 0 ? colors.accent : colors.surfaceAlt },
                  ]}
                />
              </Animated.View>
            </View>
            <SafeText variant="caption" color="textMuted">
              {DAY_LABELS[index]}
            </SafeText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  column: {
    alignItems: 'center',
    gap: Spacing.s8,
    flex: 1,
  },
  track: {
    height: MAX_BAR_HEIGHT,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 20,
    borderRadius: Radius.xs,
  },
});
