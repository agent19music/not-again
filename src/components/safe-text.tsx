import { StyleSheet, Text, type TextProps } from 'react-native';

import { Typography, type ColorToken } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SafeTextProps = TextProps & {
  variant?: keyof typeof Typography;
  color?: ColorToken;
  /** Fixed-width digits — use for counters and stats that update in place. */
  tabular?: boolean;
};

/** Themed text primitive: applies a type-scale entry and a color token, and
 * caps `maxFontSizeMultiplier` so runaway scaling never clips a numeric stat. */
export default function SafeText({
  style,
  variant = 'body',
  color,
  tabular = false,
  maxFontSizeMultiplier,
  ...rest
}: SafeTextProps) {
  const colors = useTheme();

  return (
    <Text
      style={[Typography[variant], { color: colors[color ?? 'text'] }, tabular && styles.tabular, style]}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? (tabular ? 1.3 : 2)}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});
