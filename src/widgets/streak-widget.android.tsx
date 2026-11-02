import { Column, Text } from '@expo/ui/jetpack-compose';
import { fillMaxSize, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type StreakWidgetProps = {
  /** Epoch ms of the latest entry. Null when nothing is logged. */
  lastOccurredAt: number | null;
};

/**
 * Android draws this with a system Chronometer (see plugins/withStreakChronometer.js),
 * which keeps counting after the app is gone. This layout is the gallery placeholder.
 */
const StreakWidgetView = (props: StreakWidgetProps, environment: WidgetEnvironment) => {
  'widget';

  const dark = environment.colorScheme === 'dark';
  const digit = dark ? '#E85A6F' : '#D83C55';
  const muted = dark ? '#a3a3a3' : '#737373';
  const caption = props.lastOccurredAt == null ? 'Nothing logged yet.' : 'since last goon';

  return (
    <Column
      horizontalAlignment="center"
      verticalArrangement="center"
      modifiers={[fillMaxSize(), paddingAll(16)]}>
      <Text
        color={digit}
        style={{ fontFamily: 'GeistMono_400Regular', fontSize: 36, textAlign: 'center' }}>
        00:00:00
      </Text>
      <Text
        color={muted}
        style={{ fontFamily: 'GeistMono_400Regular', fontSize: 13, textAlign: 'center' }}>
        {caption}
      </Text>
    </Column>
  );
};

export default createWidget<StreakWidgetProps>('StreakWidget', StreakWidgetView, {
  lastOccurredAt: null,
});
