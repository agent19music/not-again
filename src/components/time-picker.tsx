import { XIcon } from 'phosphor-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import SafeText from '@/components/safe-text';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatClock, formatDayLabel, startOfDay, DAY_MS } from '@/lib/digest';

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

type DateChip = 'today' | 'yesterday';

function clampToNow(ts: number) {
  const now = Date.now();
  return ts > now ? now : ts;
}

function decompose(ts: number) {
  const d = new Date(ts);
  let hour24 = d.getHours();
  const minute = d.getMinutes();
  const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute, period, dayStart: startOfDay(ts) };
}

function compose(dayStart: number, hour12: number, minute: number, period: 'AM' | 'PM') {
  let hour24 = hour12 % 12;
  if (period === 'PM') hour24 += 12;
  return clampToNow(dayStart + hour24 * 3600_000 + minute * 60_000);
}

function WheelColumn({
  items,
  selectedIndex,
  onSelect,
}: {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const colors = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const padding = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    onSelect(clamped);
    scrollRef.current?.scrollTo({ y: clamped * ITEM_HEIGHT, animated: true });
  };

  return (
    <View style={styles.wheelCol}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumEnd}
        contentContainerStyle={{ paddingVertical: padding }}>
        {items.map((item, index) => {
          const selected = index === selectedIndex;
          return (
            <Pressable
              key={`${item}-${index}`}
              onPress={() => {
                onSelect(index);
                scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
              }}
              style={styles.wheelItem}>
              <SafeText
                variant={selected ? 'label' : 'bodySm'}
                color={selected ? 'text' : 'textMuted'}
                tabular
                style={styles.wheelText}>
                {item}
              </SafeText>
            </Pressable>
          );
        })}
      </ScrollView>
      <View
        pointerEvents="none"
        style={[styles.selectionWindow, { borderColor: colors.accent }]}
      />
    </View>
  );
}

export function TimePicker({
  value,
  onChange,
}: {
  /** null means "Now" (no custom time). */
  value: number | null;
  onChange: (next: number | null) => void;
}) {
  const colors = useTheme();
  const [open, setOpen] = useState(false);
  const expand = useSharedValue(0);

  const initial = useMemo(() => decompose(value ?? Date.now()), []);
  const [hour12, setHour12] = useState(initial.hour12);
  const [minute, setMinute] = useState(initial.minute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(initial.period);
  const [dayChip, setDayChip] = useState<DateChip>(() => {
    const today = startOfDay(Date.now());
    if (value !== null && startOfDay(value) === today - DAY_MS) return 'yesterday';
    return 'today';
  });

  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')), []);
  const periods = ['AM', 'PM'];

  const syncFromParts = (h: number, m: number, p: 'AM' | 'PM', chip: DateChip) => {
    const start = startOfDay(Date.now()) - (chip === 'yesterday' ? DAY_MS : 0);
    onChange(compose(start, h, m, p));
  };

  const openPicker = () => {
    if (value === null) {
      const now = decompose(Date.now());
      setHour12(now.hour12);
      setMinute(now.minute);
      setPeriod(now.period);
      setDayChip('today');
      onChange(compose(startOfDay(Date.now()), now.hour12, now.minute, now.period));
    } else {
      const parts = decompose(value);
      setHour12(parts.hour12);
      setMinute(parts.minute);
      setPeriod(parts.period);
      const today = startOfDay(Date.now());
      setDayChip(parts.dayStart === today - DAY_MS ? 'yesterday' : 'today');
    }
    setOpen(true);
    expand.set(withSpring(1, Motion.spring.sheet));
  };

  const closePicker = () => {
    setOpen(false);
    expand.set(withSpring(0, Motion.spring.sheet));
  };

  const clearToNow = () => {
    onChange(null);
    closePicker();
  };

  const panelStyle = useAnimatedStyle(() => ({
    opacity: expand.value,
    maxHeight: expand.value * 280,
    overflow: 'hidden' as const,
  }));

  const displayLabel =
    value === null
      ? null
      : `${formatDayLabel(value, Date.now())} · ${formatClock(value)}`;

  return (
    <View style={styles.block}>
      <SafeText variant="label" color="textSecondary">
        When
      </SafeText>

      <View
        style={[
          styles.field,
          { backgroundColor: colors.surface, borderColor: open ? colors.accent : colors.border },
        ]}>
        <Pressable
          onPress={open ? closePicker : openPicker}
          style={styles.fieldMain}
          accessibilityRole="button"
          accessibilityLabel="When">
          <SafeText
            variant="body"
            color={displayLabel ? 'text' : 'textMuted'}
            style={styles.fieldText}>
            {displayLabel ?? 'Now'}
          </SafeText>
        </Pressable>
        {value !== null ? (
          <Pressable
            onPress={clearToNow}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear to now"
            style={styles.clearButton}>
            <XIcon size={16} color={colors.textMuted} weight="regular" />
          </Pressable>
        ) : null}
      </View>

      {open ? (
        <Animated.View style={[styles.panel, { borderColor: colors.border }, panelStyle]}>
          <View style={styles.chips}>
            {(['today', 'yesterday'] as DateChip[]).map((chip) => {
              const active = dayChip === chip;
              return (
                <Pressable
                  key={chip}
                  onPress={() => {
                    setDayChip(chip);
                    syncFromParts(hour12, minute, period, chip);
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.accentSoft : colors.surfaceAlt,
                    },
                  ]}>
                  <SafeText
                    variant="caption"
                    color={active ? 'accentSoftText' : 'textSecondary'}>
                    {chip === 'today' ? 'Today' : 'Yesterday'}
                  </SafeText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.wheels}>
            <WheelColumn
              items={hours}
              selectedIndex={hour12 - 1}
              onSelect={(index) => {
                const next = index + 1;
                setHour12(next);
                syncFromParts(next, minute, period, dayChip);
              }}
            />
            <WheelColumn
              items={minutes}
              selectedIndex={minute}
              onSelect={(index) => {
                setMinute(index);
                syncFromParts(hour12, index, period, dayChip);
              }}
            />
            <WheelColumn
              items={periods}
              selectedIndex={period === 'AM' ? 0 : 1}
              onSelect={(index) => {
                const next = index === 0 ? 'AM' : 'PM';
                setPeriod(next);
                syncFromParts(hour12, minute, next, dayChip);
              }}
            />
          </View>
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
  fieldMain: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  fieldText: {
    flexShrink: 1,
  },
  clearButton: {
    padding: Spacing.s4,
  },
  panel: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.s12,
    gap: Spacing.s12,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.s8,
  },
  chip: {
    paddingHorizontal: Spacing.s12,
    paddingVertical: Spacing.s8,
    borderRadius: Radius.pill,
  },
  wheels: {
    flexDirection: 'row',
    height: WHEEL_HEIGHT,
    gap: Spacing.s8,
  },
  wheelCol: {
    flex: 1,
    height: WHEEL_HEIGHT,
    overflow: 'hidden',
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelText: {
    textAlign: 'center',
  },
  selectionWindow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
    height: ITEM_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
