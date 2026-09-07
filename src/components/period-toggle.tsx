import { Pressable, StyleSheet, View } from 'react-native';

import SafeText from '@/components/safe-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PeriodKey } from '@/lib/digest';

const OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
  { key: 'all', label: 'All time' },
];

export function PeriodToggle({
  value,
  onChange,
}: {
  value: PeriodKey;
  onChange: (period: PeriodKey) => void;
}) {
  const colors = useTheme();

  return (
    <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
      {OPTIONS.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[styles.option, active && { backgroundColor: colors.surface }]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}>
            <SafeText variant="label" color={active ? 'text' : 'textSecondary'}>
              {option.label}
            </SafeText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: Radius.pill,
    padding: Spacing.s4,
    gap: Spacing.s4,
  },
  option: {
    flex: 1,
    paddingVertical: Spacing.s8,
    borderRadius: Radius.pill,
    alignItems: 'center',
  },
});
