import { Column, Text } from '@expo/ui/jetpack-compose';
import { fillMaxSize, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { StreakWidgetProps } from './hour-grid';

export type { StreakWidgetProps } from './hour-grid';

/**
 * Android draws the hour grid natively (plugins/withStreakHourGrid.js): a Kotlin
 * port of hour-grid.ts paints a bitmap with Geist Pixel Square and reschedules
 * itself for the next streak minute or confetti frame. This Glance layout is
 * only the gallery placeholder.
 */
const StreakWidgetView = (props: StreakWidgetProps, environment: WidgetEnvironment) => {
  'widget';

  const dark = environment.colorScheme === 'dark';
  const ink = dark ? '#fafafa' : '#171717';
  const muted = dark ? '#a3a3a3' : '#737373';
  const logged = props.lastOccurredAt != null;
  const caption = logged ? 'since last goon' : 'Nothing logged yet.';

  return (
    <Column
      horizontalAlignment="start"
      verticalArrangement="bottom"
      modifiers={[fillMaxSize(), paddingAll(16)]}>
      <Text color={ink} style={{ fontFamily: 'GeistPixelSquare', fontSize: 40 }}>
        {logged ? props.clock : '00:00'}
      </Text>
      <Text color={muted} style={{ fontFamily: 'Geist_500Medium', fontSize: 13 }}>
        {caption}
      </Text>
    </Column>
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
});
