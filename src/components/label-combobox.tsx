import { CaretDownIcon } from 'phosphor-react-native';
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import SafeText from '@/components/safe-text';
import { Motion, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RankedLabel } from '@/lib/digest';

const MAX_VISIBLE_SUGGESTIONS = 5;
const BLUR_CLOSE_DELAY = 150;

export function LabelCombobox({
  value,
  onChangeText,
  suggestions,
  label,
  placeholder,
}: {
  value: string;
  onChangeText: (text: string) => void;
  suggestions: RankedLabel[];
  label: string;
  placeholder?: string;
}) {
  const colors = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const focus = useSharedValue(0);
  const openProgress = useSharedValue(0);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(() => {
    const query = value.trim().toLowerCase();
    const pool = query ? suggestions.filter((s) => s.label.toLowerCase().includes(query)) : suggestions;
    return pool.slice(0, MAX_VISIBLE_SUGGESTIONS);
  }, [suggestions, value]);

  const trimmed = value.trim();
  const hasExactMatch = filtered.some((s) => s.label.toLowerCase() === trimmed.toLowerCase());
  const showNewRow = trimmed.length > 0 && !hasExactMatch;
  const isOpen = menuOpen && (filtered.length > 0 || showNewRow);

  const openMenu = () => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
    setMenuOpen(true);
    focus.set(withTiming(1, { duration: Motion.timing.fast }));
    openProgress.set(withTiming(1, { duration: Motion.timing.base }));
  };

  const scheduleCloseMenu = () => {
    focus.set(withTiming(0, { duration: Motion.timing.base }));
    openProgress.set(withTiming(0, { duration: Motion.timing.fast }));
    closeTimeout.current = setTimeout(() => setMenuOpen(false), BLUR_CLOSE_DELAY);
  };

  const selectSuggestion = (next: string) => {
    onChangeText(next);
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    setMenuOpen(false);
    focus.set(withTiming(0, { duration: Motion.timing.base }));
    openProgress.set(withTiming(0, { duration: Motion.timing.fast }));
  };

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [colors.border, colors.accent]),
  }));

  const caretStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${openProgress.value * 180}deg` }],
  }));

  const menuStyle = useAnimatedStyle(() => ({
    opacity: openProgress.value,
    transform: [{ translateY: (1 - openProgress.value) * -6 }],
  }));

  return (
    <View style={styles.block}>
      <SafeText variant="label" color="textSecondary">
        {label}
      </SafeText>

      <Animated.View style={[styles.field, { backgroundColor: colors.surface }, borderStyle]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={label}
          autoCapitalize="none"
          onFocus={openMenu}
          onBlur={scheduleCloseMenu}
          style={[styles.input, Typography.body, { color: colors.text }]}
          selectionColor={colors.accent}
        />
        <Animated.View style={caretStyle}>
          <CaretDownIcon size={16} color={colors.textMuted} weight="regular" />
        </Animated.View>
      </Animated.View>

      {isOpen ? (
        <Animated.View
          style={[styles.menu, { backgroundColor: colors.surface, borderColor: colors.border }, menuStyle]}>
          {filtered.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => selectSuggestion(item.label)}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceAlt }]}>
              <SafeText variant="bodySm" numberOfLines={1} style={styles.rowLabel}>
                {item.label}
              </SafeText>
              <SafeText variant="caption" color="textMuted" tabular>
                {item.count}
              </SafeText>
            </Pressable>
          ))}
          {showNewRow ? (
            <Pressable
              onPress={() => selectSuggestion(trimmed)}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceAlt }]}>
              <SafeText variant="bodySm" color="accentSoftText" numberOfLines={1}>
                Add &quot;{trimmed}&quot; as new
              </SafeText>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.s8,
    alignSelf: 'stretch',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.s16,
    minHeight: 48,
    gap: Spacing.s8,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  menu: {
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.s16,
    paddingVertical: Spacing.s12,
    gap: Spacing.s8,
  },
  rowLabel: {
    flexShrink: 1,
  },
});
