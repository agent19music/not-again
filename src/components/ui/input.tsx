import React, { useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import SafeText from '@/components/safe-text';
import { Fonts, Motion, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type InputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Guidance below the field; replaced by `error` when present. */
  helper?: string;
  /** Error message — switches the field into its critical state. */
  error?: string;
  disabled?: boolean;
  /** Static leading text inside the field, e.g. a currency ("KSh"). */
  prefix?: string;
} & Pick<
  TextInputProps,
  'keyboardType' | 'secureTextEntry' | 'autoCapitalize' | 'autoComplete' | 'maxLength' | 'multiline' | 'autoFocus'
>;

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  helper,
  error,
  disabled = false,
  prefix,
  multiline = false,
  ...inputProps
}: InputProps) {
  const colors = useTheme();
  const [focused, setFocused] = useState(false);
  const focus = useSharedValue(0);

  const hasError = Boolean(error);

  // Border animates surface-border -> accent on focus; error overrides both.
  const borderStyle = useAnimatedStyle(() => ({
    borderColor: hasError
      ? colors.danger
      : interpolateColor(focus.value, [0, 1], [colors.border, colors.accent]),
  }));

  return (
    <View style={[styles.block, disabled && styles.disabled]}>
      <SafeText style={[styles.label, { color: colors.textSecondary }]}>{label}</SafeText>

      <Animated.View
        style={[
          styles.field,
          { backgroundColor: colors.surface },
          multiline && styles.fieldMultiline,
          borderStyle,
        ]}
      >
        {prefix ? (
          <SafeText style={[styles.prefix, { color: colors.textSecondary }]}>{prefix}</SafeText>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          editable={!disabled}
          multiline={multiline}
          accessibilityLabel={label}
          accessibilityState={{ disabled }}
          onFocus={() => {
            setFocused(true);
            focus.set(withTiming(1, { duration: Motion.timing.fast }));
          }}
          onBlur={() => {
            setFocused(false);
            focus.set(withTiming(0, { duration: Motion.timing.base }));
          }}
          style={[
            styles.input,
            { color: colors.text },
            multiline && styles.inputMultiline,
          ]}
          selectionColor={hasError ? colors.danger : colors.accent}
          {...inputProps}
        />
      </Animated.View>

      {error ? (
        <SafeText style={[styles.helper, { color: colors.dangerSoftText }]}>{error}</SafeText>
      ) : helper ? (
        <SafeText
          style={[styles.helper, { color: focused ? colors.textSecondary : colors.textMuted }]}
        >
          {helper}
        </SafeText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.s8,
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...Typography.label,
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
  fieldMultiline: {
    minHeight: 96,
    alignItems: 'flex-start',
    paddingVertical: Spacing.s12,
  },
  prefix: {
    ...Typography.body,
    fontFamily: Fonts.emphasis,
  },
  input: {
    flex: 1,
    ...Typography.body,
    paddingVertical: 0, // Android adds vertical padding by default
  },
  inputMultiline: {
    textAlignVertical: 'top',
    minHeight: 72,
  },
  helper: {
    ...Typography.caption,
  },
});
