import { HStack, Rectangle, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  offset,
  padding,
  rotationEffect,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import { ConfettiColors } from '@/constants/theme';

import type { StreakWidgetProps } from './hour-grid';

export type { StreakWidgetProps } from './hour-grid';

/**
 * Concept C "Hour grid". The app writes a timeline (see sync-streak-widget.ts)
 * with one entry per streak minute plus confetti frames, so this view only draws
 * what the entry says. It is serialised to a string by expo-widgets, so it
 * cannot import helpers: the confetti generator below is a copy of
 * confettiPieces in hour-grid.ts and a test keeps them identical.
 */
const StreakWidgetView = (props: StreakWidgetProps, environment: WidgetEnvironment) => {
  'widget';

  // Colors: src/constants/theme.ts (a test checks these match).
  const dark = environment.colorScheme === 'dark';
  const background = dark ? '#0a0a0a' : '#fafafa';
  const ink = dark ? '#fafafa' : '#171717';
  const muted = dark ? '#a3a3a3' : '#737373';
  const empty = dark ? '#404040' : '#e5e5e5';
  const accent = dark ? '#E85A6F' : '#D83C55';
  // Orange and yellow are theme.ts confettiOrange/confettiYellow, passed in props.
  const palette = [accent, ink, ...(props.confettiColors ?? [accent, ink])];

  const family = environment.widgetFamily ?? 'systemSmall';
  const size =
    family === 'systemLarge' ? 'l' : family === 'systemMedium' ? 'm' : 's';
  // Nominal family sizes from the Spec frame; confetti positions are fractions of these.
  const W = size === 's' ? 158 : 338;
  const H = size === 'l' ? 354 : 158;

  const logged = props.lastOccurredAt != null;
  const clock = logged ? props.clock : '00:00';
  const filled = logged ? props.filled : 0;
  const caption = logged ? 'since last goon' : 'Nothing logged yet.';
  const pixel = (s: number) => font({ family: 'GeistPixel-Square', size: s });
  const label = (s: number) => font({ family: 'Geist-Medium', size: s });

  const grid = (cell: number, gap: number) => (
    <VStack spacing={gap}>
      {[0, 1, 2, 3, 4, 5].map((row) => (
        <HStack key={row} spacing={gap}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((col) => (
            <Rectangle
              key={col}
              modifiers={[
                frame({ width: cell, height: cell }),
                foregroundStyle(row * 10 + col < filled ? accent : empty),
              ]}
            />
          ))}
        </HStack>
      ))}
    </VStack>
  );

  // <confetti-gen>
  const confettiPieces = (phase: string, frame: number, seed: number) => {
    if (phase !== 'burst' && phase !== 'drift' && phase !== 'settle') return [];
    const kind = phase === 'burst' ? 1 : phase === 'drift' ? 2 : 3;
    let s = (Math.abs(Math.floor(seed)) * 7919 + kind * 104729) % 2147483647;
    if (s <= 0) s += 2147483646;
    const r = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    const n = kind === 1 ? 36 : kind === 2 ? 16 : 14;
    const round3 = (v: number) => Math.round(v * 1000) / 1000;
    const out: { x: number; y: number; w: number; h: number; rot: number; color: number }[] = [];
    for (let i = 0; i < n; i++) {
      const size = 4 + Math.floor(r() * 3);
      const strip = kind !== 3 && r() < 0.3;
      const rot = Math.floor(r() * 360);
      let x = 0;
      let y = 0;
      if (kind === 1) {
        const a = r() * Math.PI * 2;
        const d = 0.15 + r() * 0.45;
        const p = (frame + 1) / 5;
        x = 0.5 + Math.cos(a) * d * p;
        y = 0.45 + Math.sin(a) * d * 0.7 * p - 0.2 * p + 0.5 * p * p;
      } else if (kind === 2) {
        x = r();
        y = ((r() + frame * 0.2) % 1) * 1.1 - 0.05;
      } else {
        x = 0.03 + r() * 0.92;
        y = 0.93 - r() * 0.05;
      }
      out.push({
        x: round3(x),
        y: round3(y),
        w: size,
        h: strip ? Math.round(size * 2.2) : size,
        rot,
        color: i % 4,
      });
    }
    return out;
  };
  // </confetti-gen>

  const scale = size === 's' ? 1.3 : 1.6;
  const pieces = logged ? confettiPieces(props.phase, props.frame, props.seed) : [];

  let content;
  if (size === 's') {
    content = (
      <VStack alignment="leading" spacing={0}>
        {grid(10, 3)}
        <Spacer />
        <Text modifiers={[pixel(40), foregroundStyle(ink), lineLimit(1)]}>{clock}</Text>
        <HStack spacing={4}>
          <Text modifiers={[label(12), foregroundStyle(muted)]}>{logged ? props.dayShort : ''}</Text>
          <Spacer />
          <Text modifiers={[label(12), foregroundStyle(muted), lineLimit(1)]}>{caption}</Text>
        </HStack>
      </VStack>
    );
  } else if (size === 'm') {
    content = (
      <HStack spacing={16}>
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[label(13), foregroundStyle(muted)]}>{logged ? props.days : ''}</Text>
          <Text modifiers={[label(13), foregroundStyle(muted)]}>{caption}</Text>
          <Spacer />
          <Text modifiers={[pixel(40), foregroundStyle(ink), lineLimit(1)]}>{clock}</Text>
        </VStack>
        <Spacer />
        {grid(11, 3)}
      </HStack>
    );
  } else {
    content = (
      <VStack alignment="leading" spacing={0}>
        <HStack>
          <Text modifiers={[label(13), foregroundStyle(muted)]}>{logged ? props.days : ''}</Text>
          <Spacer />
          <Text modifiers={[label(13), foregroundStyle(muted)]}>{caption}</Text>
        </HStack>
        <Text modifiers={[pixel(62), foregroundStyle(ink), lineLimit(1), padding({ top: 14, bottom: 18 })]}>
          {clock}
        </Text>
        {grid(26, 4)}
        <Spacer />
        <HStack>
          <Text modifiers={[label(13), foregroundStyle(muted)]}>This hour</Text>
          <Spacer />
          <Text modifiers={[pixel(18), foregroundStyle(muted)]}>{`${String(filled).padStart(2, '0')}/60`}</Text>
        </HStack>
      </VStack>
    );
  }

  return (
    <ZStack
      alignment="topLeading"
      modifiers={[containerBackground(background, 'widget'), widgetURL('gooned://')]}>
      <VStack alignment="leading" modifiers={[
          padding({ all: 16 }),
          frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' }),
        ]}>
        {content}
      </VStack>
      {pieces.map((p, i) => (
        <Rectangle
          key={`c${i}`}
          modifiers={[
            frame({ width: p.w * scale, height: p.h * scale }),
            foregroundStyle(palette[p.color]),
            rotationEffect(p.rot),
            offset({ x: p.x * W, y: p.y * H }),
          ]}
        />
      ))}
    </ZStack>
  );
};

export default createWidget<StreakWidgetProps>('StreakWidget', StreakWidgetView, {
  lastOccurredAt: null,
  clock: '00:00',
  days: '0 days',
  dayShort: '0d',
  filled: 0,
  phase: 'none',
  frame: 0,
  seed: 0,
  confettiColors: ConfettiColors,
});
