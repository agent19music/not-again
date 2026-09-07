import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_BOTTOM_OFFSET, TAB_BAR_HEIGHT } from '@/constants/tab-bar';
import { useTheme } from '@/hooks/use-theme';
import { useResolvedScheme } from '@/hooks/use-theme-mode';

/**
 * Stacked, bottom-anchored blur bands. Because each BlurView blurs whatever
 * is composited beneath it (including earlier bands), overlapping bands near
 * the bottom compound into a stronger blur while the topmost sliver — the
 * only band that reaches that high — stays barely perceptible. That's what
 * gives the ramp its progressive feel without a masked/gradient blur API.
 */
const BLUR_BANDS = [
  { heightRatio: 1, intensity: 10 },
  { heightRatio: 0.72, intensity: 14 },
  { heightRatio: 0.48, intensity: 20 },
  { heightRatio: 0.26, intensity: 28 },
];

/** Full-width fade sitting behind the floating tab bar, starting at its vertical midpoint. */
export function BottomFade() {
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const scheme = useResolvedScheme();

  const zoneHeight = insets.bottom + TAB_BAR_BOTTOM_OFFSET + TAB_BAR_HEIGHT / 2;

  return (
    <View pointerEvents="none" style={[styles.container, { height: zoneHeight }]}>
      {BLUR_BANDS.map((band, index) => (
        <BlurView
          key={index}
          tint={scheme === 'dark' ? 'dark' : 'light'}
          intensity={band.intensity}
          style={[styles.band, { height: zoneHeight * band.heightRatio }]}
        />
      ))}
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.background} stopOpacity={0} />
            <Stop offset="1" stopColor={colors.background} stopOpacity={0.55} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bottomFade)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
