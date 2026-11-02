import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeftIcon, TrashIcon } from 'phosphor-react-native';

import SafeText from '@/components/safe-text';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useNotifPrefs } from '@/hooks/use-notif-prefs';
import { useTheme } from '@/hooks/use-theme';
import {
  DEFAULT_QUOTES,
  FAMILY_GROUPS,
  FAMILY_LABELS,
  openExactAlarmSettings,
  openNotificationSettings,
  replan,
  requestNotificationPermission,
  getPermissionSnapshot,
  scheduleTestInSeconds,
} from '@/lib/notifications';
import * as prefsStore from '@/lib/notifications/prefs-store';
import type { FamilyId } from '@/lib/notifications/types';
import { toast } from '@/lib/toast';

function minutesToLabel(mins: number) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  const colors = useTheme();
  return (
    <View style={styles.stepperRow}>
      <SafeText variant="body">{label}</SafeText>
      <View style={styles.stepperControls}>
        <Pressable
          onPress={() => onChange(Math.max(min, value - step))}
          style={[styles.stepBtn, { backgroundColor: colors.surfaceAlt }]}
          accessibilityLabel={`Decrease ${label}`}>
          <SafeText variant="headline">−</SafeText>
        </Pressable>
        <SafeText variant="label" style={styles.stepValue}>
          {typeof value === 'number' && label.toLowerCase().includes('quiet')
            ? minutesToLabel(value)
            : String(value)}
        </SafeText>
        <Pressable
          onPress={() => onChange(Math.min(max, value + step))}
          style={[styles.stepBtn, { backgroundColor: colors.surfaceAlt }]}
          accessibilityLabel={`Increase ${label}`}>
          <SafeText variant="headline">+</SafeText>
        </Pressable>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useTheme();
  const router = useRouter();
  const prefs = useNotifPrefs();
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [draftQuote, setDraftQuote] = useState('');

  const refreshPermission = useCallback(async () => {
    const snap = await getPermissionSnapshot();
    setPermissionGranted(snap.granted);
    return snap.granted;
  }, []);

  const patch = async (partial: Parameters<typeof prefsStore.setPrefs>[0]) => {
    await prefsStore.setPrefs(partial);
    await replan();
  };

  const quotes = prefs.quotes.length > 0 ? prefs.quotes : [];
  const permissionLabel =
    permissionGranted == null ? 'Not checked yet' : permissionGranted ? 'Granted' : 'Not granted';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={[styles.iconBtn, { backgroundColor: colors.surfaceAlt }]}>
          <ArrowLeftIcon size={20} color={colors.text} />
        </Pressable>
        <SafeText variant="title">Settings</SafeText>
        <View style={styles.iconBtnSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <SafeText variant="label" color="textSecondary">
            Notifications
          </SafeText>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <SafeText variant="headline">Local engine</SafeText>
                <SafeText variant="caption" color="textMuted">
                  1–{prefs.dailyMax} planned pings a day, plus post-log care.
                </SafeText>
              </View>
              <Switch
                value={prefs.enabled}
                onValueChange={(enabled) => void patch({ enabled })}
                trackColor={{ false: colors.border, true: colors.accentMuted }}
                thumbColor={prefs.enabled ? colors.accent : colors.handle}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <Stepper
              label="Daily max"
              value={prefs.dailyMax}
              min={3}
              max={5}
              onChange={(dailyMax) => void patch({ dailyMax: dailyMax as 3 | 4 | 5 })}
            />

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <Stepper
              label="Quiet starts"
              value={prefs.quietStartMinutes}
              min={0}
              max={23 * 60}
              step={30}
              onChange={(quietStartMinutes) => void patch({ quietStartMinutes })}
            />
            <Stepper
              label="Quiet ends"
              value={prefs.quietEndMinutes}
              min={0}
              max={23 * 60 + 30}
              step={30}
              onChange={(quietEndMinutes) => void patch({ quietEndMinutes })}
            />

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <View style={styles.row}>
              <View style={styles.rowText}>
                <SafeText variant="headline">After-log chain</SafeText>
                <SafeText variant="caption" color="textMuted">
                  Encourage at +1m, hydrate at +1h.
                </SafeText>
              </View>
              <Switch
                value={prefs.chainAfterLog}
                onValueChange={(chainAfterLog) => void patch({ chainAfterLog })}
                trackColor={{ false: colors.border, true: colors.accentMuted }}
                thumbColor={prefs.chainAfterLog ? colors.accent : colors.handle}
              />
            </View>
          </View>
          <SafeText variant="caption" color="textMuted">
            Some phones delay exact alarms under battery savers. If timing drifts, allow exact alarms
            and disable aggressive battery optimization for Gooned.
          </SafeText>
        </View>

        <View style={styles.section}>
          <SafeText variant="label" color="textSecondary">
            Permissions
          </SafeText>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SafeText variant="bodySm" color="textSecondary">
              Status: {permissionLabel}
            </SafeText>
            <Pressable
              onPress={async () => {
                await requestNotificationPermission();
                await refreshPermission();
                await replan();
              }}
              style={[styles.btn, { backgroundColor: colors.surfaceAlt }]}>
              <SafeText variant="label">Request permission</SafeText>
            </Pressable>
            <Pressable
              onPress={() => void refreshPermission()}
              style={[styles.btn, { backgroundColor: colors.surfaceAlt }]}>
              <SafeText variant="label">Refresh status</SafeText>
            </Pressable>
            <Pressable
              onPress={() => void openNotificationSettings()}
              style={[styles.btn, { backgroundColor: colors.surfaceAlt }]}>
              <SafeText variant="label">Open notification settings</SafeText>
            </Pressable>
            <Pressable
              onPress={async () => {
                await prefsStore.setPrefs({ exactAlarmPromptedAt: Date.now() });
                await openExactAlarmSettings();
              }}
              style={[styles.btn, { backgroundColor: colors.surfaceAlt }]}>
              <SafeText variant="label">Open exact alarm settings</SafeText>
            </Pressable>
            <Pressable
              onPress={async () => {
                const id = await scheduleTestInSeconds(5);
                toast(id ? 'Test in 5 seconds' : 'Could not schedule test');
              }}
              style={[styles.btn, { backgroundColor: colors.accent }]}>
              <SafeText variant="label" color="onAccent">
                Send test notification
              </SafeText>
            </Pressable>
          </View>
        </View>

        {FAMILY_GROUPS.map((group) => (
          <View key={group.title} style={styles.section}>
            <SafeText variant="label" color="textSecondary">
              {group.title}
            </SafeText>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {group.families.map((family, index) => (
                <View key={family}>
                  {index > 0 ? (
                    <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                  ) : null}
                  <View style={styles.row}>
                    <SafeText variant="body" style={styles.flex}>
                      {FAMILY_LABELS[family]}
                    </SafeText>
                    <Switch
                      value={prefs.families[family] !== false}
                      onValueChange={(enabled) => {
                        void prefsStore.setFamilyEnabled(family as FamilyId, enabled).then(() => replan());
                      }}
                      trackColor={{ false: colors.border, true: colors.accentMuted }}
                      thumbColor={prefs.families[family] !== false ? colors.accent : colors.handle}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.section}>
          <SafeText variant="label" color="textSecondary">
            Quote bank
          </SafeText>
          <SafeText variant="caption" color="textMuted">
            Custom lines replace the defaults. Leave empty to use the built-in bank (
            {DEFAULT_QUOTES.length} lines).
          </SafeText>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              value={draftQuote}
              onChangeText={setDraftQuote}
              placeholder="Add a line…"
              placeholderTextColor={colors.textMuted}
              style={[styles.quoteInput, { color: colors.text, borderColor: colors.border }]}
              onSubmitEditing={async () => {
                const next = draftQuote.trim();
                if (!next) return;
                await prefsStore.setQuotes([...quotes, next]);
                setDraftQuote('');
                await replan();
              }}
              returnKeyType="done"
            />
            <Pressable
              onPress={async () => {
                const next = draftQuote.trim();
                if (!next) return;
                await prefsStore.setQuotes([...quotes, next]);
                setDraftQuote('');
                await replan();
              }}
              style={[styles.btn, { backgroundColor: colors.surfaceAlt }]}>
              <SafeText variant="label">Add quote</SafeText>
            </Pressable>

            {quotes.length === 0 ? (
              <SafeText variant="caption" color="textMuted">
                Using defaults until you add your own.
              </SafeText>
            ) : (
              quotes.map((q, i) => (
                <View key={`${q}-${i}`} style={styles.quoteRow}>
                  <SafeText variant="bodySm" style={styles.flex}>
                    {q}
                  </SafeText>
                  <Pressable
                    onPress={async () => {
                      const next = quotes.filter((_, idx) => idx !== i);
                      await prefsStore.setQuotes(next);
                      await replan();
                    }}
                    hitSlop={8}
                    accessibilityLabel="Delete quote">
                    <TrashIcon size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.s20,
    paddingVertical: Spacing.s12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnSpacer: { width: 40, height: 40 },
  content: {
    padding: Spacing.s20,
    gap: Spacing.s24,
    paddingBottom: Spacing.s80,
  },
  section: { gap: Spacing.s8 },
  card: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.s16,
    gap: Spacing.s12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s12,
  },
  rowText: { flex: 1, gap: 2 },
  flex: { flex: 1 },
  divider: { height: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.s12,
  },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s8 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { minWidth: 52, textAlign: 'center' },
  btn: {
    borderRadius: Radius.sm,
    paddingVertical: Spacing.s12,
    paddingHorizontal: Spacing.s16,
    alignItems: 'center',
  },
  quoteInput: {
    ...Typography.body,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.s12,
    paddingVertical: Spacing.s12,
    minHeight: 48,
  },
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s12,
  },
});
