import { StyleSheet, View } from 'react-native';

import SafeText from '@/components/safe-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const colors = useTheme();

  return (
    <View style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <SafeText variant="label" color="textSecondary">
        {label}
      </SafeText>
      <SafeText variant="title" tabular numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </SafeText>
      {hint ? (
        <SafeText variant="caption" color="textMuted">
          {hint}
        </SafeText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.s16,
    gap: Spacing.s4,
  },
});
