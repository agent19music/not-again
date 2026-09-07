import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EntryRow } from '@/components/entry-row';
import { GoonCta } from '@/components/goon-cta';
import { LogGoonDialog } from '@/components/log-goon-dialog';
import { ScreenHeader } from '@/components/screen-header';
import SafeText from '@/components/safe-text';
import { StreakTimer } from '@/components/streak-timer';
import { Spacing } from '@/constants/theme';
import { useGoonEntries } from '@/hooks/use-goon-entries';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import type { GoonEntry } from '@/lib/goon-store';

const RECENT_LIMIT = 20;

type DialogState = { entry: GoonEntry | null; mode: 'create' | 'edit' };

export default function LogScreen() {
  const colors = useTheme();
  const now = useNow(1000);
  const { entries } = useGoonEntries();
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [openToken, setOpenToken] = useState(0);

  const openCreate = useCallback(() => {
    setDialog({ entry: null, mode: 'create' });
    setOpenToken((token) => token + 1);
  }, []);

  const handleEdit = useCallback((entry: GoonEntry) => {
    setDialog({ entry, mode: 'edit' });
    setOpenToken((token) => token + 1);
  }, []);

  const lastEntry = entries[0];
  const recent = entries.slice(0, RECENT_LIMIT);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <ScreenHeader title="Not again" />
        </View>

        <StreakTimer lastGoonAt={lastEntry?.occurredAt ?? null} now={now} />

        <View style={styles.buttonWrap}>
          <GoonCta onPress={openCreate} />
        </View>

        <View style={styles.recentSection}>
          <SafeText variant="label" color="textSecondary">
            Recent
          </SafeText>
          {recent.length === 0 ? (
            <SafeText variant="bodySm" color="textMuted" style={styles.emptyText}>
              Entries you log will show up here.
            </SafeText>
          ) : (
            recent.map((entry) => (
              <EntryRow key={entry.id} entry={entry} now={now} onEdit={handleEdit} />
            ))
          )}
        </View>
      </ScrollView>

      <LogGoonDialog
        key={openToken}
        visible={dialog !== null}
        entry={dialog?.entry ?? null}
        mode={dialog?.mode}
        onClose={() => setDialog(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: Spacing.s20,
    gap: Spacing.s24,
    paddingBottom: Spacing.s64,
  },
  header: {
    gap: Spacing.s8,
  },
  buttonWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.s16,
  },
  recentSection: {
    gap: Spacing.s4,
  },
  emptyText: {
    paddingVertical: Spacing.s12,
  },
});
