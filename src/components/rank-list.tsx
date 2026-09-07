import { StyleSheet, View } from 'react-native';

import SafeText from '@/components/safe-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RankedLabel } from '@/lib/digest';

export function RankList({ title, items }: { title: string; items: RankedLabel[] }) {
  const colors = useTheme();

  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <SafeText variant="label" color="textSecondary">
        {title}
      </SafeText>
      <View style={styles.chips}>
        {items.slice(0, 6).map((item) => (
          <View key={item.label} style={[styles.chip, { backgroundColor: colors.surfaceAlt }]}>
            <SafeText variant="bodySm">{item.label}</SafeText>
            <SafeText variant="caption" color="textMuted" tabular>
              {item.count}
            </SafeText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.s12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s8,
    paddingHorizontal: Spacing.s12,
    paddingVertical: Spacing.s8,
    borderRadius: Radius.pill,
  },
});
