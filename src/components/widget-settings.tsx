import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { PlusIcon } from 'phosphor-react-native';

import SafeText from '@/components/safe-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { requestStreakWidget } from '@/widgets/add-streak-widget';

export default function WidgetSettings() {
  const colors = useTheme();
  const requesting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'requested' | 'manual' | 'error'>('idle');

  const addWidget = async () => {
    if (requesting.current) return;
    requesting.current = true;
    setBusy(true);
    try {
      setStatus(await requestStreakWidget());
    } catch {
      setStatus('error');
    } finally {
      requesting.current = false;
      setBusy(false);
    }
  };

  const showGuide = status === 'manual' || status === 'error';

  return (
    <View style={styles.section}>
      <SafeText variant="label" color="textSecondary">Home Screen</SafeText>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.description}>
          <SafeText variant="headline">Streak widget</SafeText>
          <SafeText variant="bodySm" color="textSecondary">
            Keep your streak and hour grid on your Home Screen.
          </SafeText>
        </View>
        <Pressable
          onPress={() => void addWidget()}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Add streak widget to Home Screen"
          accessibilityState={{ disabled: busy, busy }}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.surfaceAlt, opacity: busy || pressed ? 0.6 : 1 },
          ]}>
          {busy ? <ActivityIndicator size="small" color={colors.text} /> : <PlusIcon size={18} color={colors.text} />}
          <SafeText variant="label">{busy ? 'Opening…' : 'Add widget'}</SafeText>
        </Pressable>
        {status === 'requested' ? (
          <SafeText variant="caption" color="textSecondary" accessibilityLiveRegion="polite">
            Confirm in your launcher to add the widget. If no prompt appears, touch and hold an empty
            spot on your Home Screen, open Widgets, then find Gooned.
          </SafeText>
        ) : null}
        {showGuide ? (
          <View style={styles.guide} accessibilityLiveRegion="polite">
            {status === 'error' ? (
              <SafeText variant="bodySm" color="textSecondary">
                Couldn’t open the widget prompt. Try again or add it from your Home Screen.
              </SafeText>
            ) : null}
            {Platform.OS !== 'ios' ? (
              <SafeText variant="bodySm" color="textSecondary">
                {Platform.OS === 'web' ? 'On Android: ' : ''}Touch and hold an empty spot on your Home
                Screen. Open Widgets, find Gooned, then touch and hold the Streak widget to place it.
              </SafeText>
            ) : null}
            {Platform.OS !== 'android' ? (
              <SafeText variant="bodySm" color="textSecondary">
                {Platform.OS === 'web' ? 'On iPhone: ' : ''}Touch and hold an empty spot on your Home
                Screen. Tap Edit, then Add Widget (or +). Search for Gooned, choose a size, then tap Add Widget.
              </SafeText>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.s8 },
  card: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.s16,
    gap: Spacing.s16,
  },
  description: { gap: Spacing.s8 },
  button: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.s8,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.s12,
    paddingHorizontal: Spacing.s16,
  },
  guide: { gap: Spacing.s12 },
});
