import { BlurView } from 'expo-blur';
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LabelCombobox } from '@/components/label-combobox';
import SafeText from '@/components/safe-text';
import { TimePicker } from '@/components/time-picker';
import { Radius, Spacing } from '@/constants/theme';
import { useGoonEntries } from '@/hooks/use-goon-entries';
import { useTheme } from '@/hooks/use-theme';
import { useResolvedScheme } from '@/hooks/use-theme-mode';
import { rankLabels } from '@/lib/digest';
import {
  annotateEntry,
  logGoon,
  type GoonEntry,
} from '@/lib/goon-store';
import { toast } from '@/lib/toast';

export function LogGoonDialog({
  visible,
  entry,
  mode = 'create',
  onClose,
}: {
  visible: boolean;
  entry: GoonEntry | null;
  mode?: 'create' | 'edit';
  onClose: () => void;
}) {
  const colors = useTheme();
  const scheme = useResolvedScheme();
  const insets = useSafeAreaInsets();
  const { entries } = useGoonEntries();
  const [site, setSite] = useState(entry?.site ?? '');
  const [subject, setSubject] = useState(entry?.subject ?? '');
  const [occurredAt, setOccurredAt] = useState<number | null>(
    mode === 'edit' && entry ? entry.occurredAt : null
  );
  const [saving, setSaving] = useState(false);

  const siteSuggestions = useMemo(
    () => rankLabels(entries.map((e) => e.site ?? '')),
    [entries]
  );
  const subjectSuggestions = useMemo(
    () => rankLabels(entries.map((e) => e.subject ?? '')),
    [entries]
  );

  const handleDismiss = () => {
    onClose();
  };

  const handleSave = async () => {
    const siteValue = site.trim() || undefined;
    const subjectValue = subject.trim() || undefined;
    if (saving) return;
    setSaving(true);

    const modeSnapshot = mode;
    const entrySnapshot = entry;
    const occurredSnapshot = occurredAt;
    onClose();

    try {
      if (modeSnapshot === 'edit' && entrySnapshot) {
        await annotateEntry(entrySnapshot.id, {
          site: siteValue,
          subject: subjectValue,
          occurredAt: occurredSnapshot ?? entrySnapshot.occurredAt,
        });
        toast.success('Entry updated');
      } else {
        await logGoon({
          site: siteValue,
          subject: subjectValue,
          occurredAt: occurredSnapshot ?? undefined,
        });
        toast.success('Logged');
      }
    } catch {
      toast.error('Could not save');
    }
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={handleDismiss}
      statusBarTranslucent>
      <View style={styles.fill}>
        <BlurView
          intensity={40}
          tint={scheme === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />

        <KeyboardStickyView style={styles.stickyWrap}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.surface, paddingBottom: insets.bottom + Spacing.s20 },
            ]}>
            <View style={[styles.handle, { backgroundColor: colors.handle }]} />

            <SafeText variant="subheading">
              {mode === 'edit' ? 'Edit entry' : 'What happened'}
            </SafeText>
            <SafeText variant="bodySm" color="textSecondary">
              Site, who, and when — all optional.
            </SafeText>

            <LabelCombobox
              label="Site"
              value={site}
              onChangeText={setSite}
              suggestions={siteSuggestions}
              placeholder="rule34vault"
            />
            <LabelCombobox
              label="Who"
              value={subject}
              onChangeText={setSubject}
              suggestions={subjectSuggestions}
              placeholder="pink pawg Orihime"
            />
            <TimePicker value={occurredAt} onChange={setOccurredAt} />

            <View style={styles.actions}>
              <Pressable onPress={handleDismiss} disabled={saving} style={styles.skipButton}>
                <SafeText variant="label" color="textSecondary">
                  Dismiss
                </SafeText>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel={mode === 'edit' ? 'Save changes' : 'Save'}
                style={({ pressed }) => [
                  styles.saveButton,
                  { backgroundColor: colors.accent },
                  pressed && styles.pressed,
                ]}>
                <SafeText variant="label" color="onAccent">
                  {mode === 'edit' ? 'Save changes' : 'Save'}
                </SafeText>
              </Pressable>
            </View>
          </View>
        </KeyboardStickyView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  stickyWrap: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    padding: Spacing.s20,
    gap: Spacing.s16,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: Radius.pill,
    marginBottom: Spacing.s4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.s16,
  },
  skipButton: {
    paddingHorizontal: Spacing.s12,
    paddingVertical: Spacing.s12,
  },
  saveButton: {
    paddingHorizontal: Spacing.s20,
    paddingVertical: Spacing.s12,
    borderRadius: Radius.pill,
  },
  pressed: {
    opacity: 0.85,
  },
});
