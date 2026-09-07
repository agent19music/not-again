import { Modal, Pressable, StyleSheet, View } from 'react-native';

import SafeText from '@/components/safe-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function EntryActionsDialog({
  visible,
  onEdit,
  onDelete,
  onCancel,
}: {
  visible: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const colors = useTheme();

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onCancel}>
        <Pressable
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={(event) => event.stopPropagation()}>
          <Pressable
            onPress={onEdit}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceAlt }]}>
            <SafeText variant="body">Edit</SafeText>
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <Pressable
            onPress={onDelete}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceAlt }]}>
            <SafeText variant="body" color="dangerSoftText">
              Delete
            </SafeText>
          </Pressable>
        </Pressable>

        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [
            styles.cancelCard,
            { backgroundColor: colors.surface },
            pressed && { backgroundColor: colors.surfaceAlt },
          ]}>
          <SafeText variant="body" color="textSecondary">
            Cancel
          </SafeText>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.s16,
    gap: Spacing.s8,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  cancelCard: {
    borderRadius: Radius.md,
    alignItems: 'center',
    paddingVertical: Spacing.s16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    alignItems: 'center',
    paddingVertical: Spacing.s16,
  },
});
