import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { EntryActionsDialog } from '@/components/entry-actions-dialog';
import SafeText from '@/components/safe-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatClock, formatDayLabel } from '@/lib/digest';
import { deleteEntry, restoreEntry, type GoonEntry } from '@/lib/goon-store';
import { toast } from '@/lib/toast';

export function EntryRow({
  entry,
  now,
  onEdit,
}: {
  entry: GoonEntry;
  now: number;
  onEdit: (entry: GoonEntry) => void;
}) {
  const colors = useTheme();
  const [actionsVisible, setActionsVisible] = useState(false);

  const handleEdit = () => {
    setActionsVisible(false);
    onEdit(entry);
  };

  const handleDelete = () => {
    setActionsVisible(false);
    deleteEntry(entry.id);
    toast.success('Entry deleted', {
      action: { label: 'Undo', onClick: () => restoreEntry(entry) },
    });
  };

  return (
    <Animated.View layout={LinearTransition.duration(220)}>
      <EntryActionsDialog
        visible={actionsVisible}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCancel={() => setActionsVisible(false)}
      />
      <Pressable
        onLongPress={() => setActionsVisible(true)}
        delayLongPress={450}
        style={({ pressed }) => [styles.row, { borderColor: colors.divider }, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Goon logged ${formatDayLabel(entry.occurredAt, now)} at ${formatClock(entry.occurredAt)}`}
        accessibilityHint="Long press to edit or delete this entry">
        <View style={styles.header}>
          <SafeText variant="bodySm">{formatDayLabel(entry.occurredAt, now)}</SafeText>
          <SafeText variant="bodySm" color="textMuted" tabular>
            {formatClock(entry.occurredAt)}
          </SafeText>
        </View>

        {entry.site || entry.subject ? (
          <View style={styles.tags}>
            {entry.site ? (
              <View style={[styles.tag, { backgroundColor: colors.accentSoft }]}>
                <SafeText variant="caption" color="accentSoftText">
                  {entry.site}
                </SafeText>
              </View>
            ) : null}
            {entry.subject ? (
              <View style={[styles.tag, { backgroundColor: colors.surfaceAlt }]}>
                <SafeText variant="caption" color="textSecondary">
                  {entry.subject}
                </SafeText>
              </View>
            ) : null}
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.s12,
    gap: Spacing.s8,
  },
  pressed: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s8,
  },
  tag: {
    paddingHorizontal: Spacing.s12,
    paddingVertical: Spacing.s4,
    borderRadius: Radius.pill,
  },
});
