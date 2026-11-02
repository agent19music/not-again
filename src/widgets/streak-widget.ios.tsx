import { Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  padding,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type StreakWidgetProps = {
  /** Epoch ms of the latest entry. Null when nothing is logged. */
  lastOccurredAt: number | null;
};

const StreakWidgetView = (props: StreakWidgetProps, environment: WidgetEnvironment) => {
  'widget';

  const dark = environment.colorScheme === 'dark';
  const background = dark ? '#0a0a0a' : '#fafafa';
  const digit = dark ? '#E85A6F' : '#D83C55';
  const muted = dark ? '#a3a3a3' : '#737373';
  const mono = (size: number) =>
    font({ family: 'GeistMono_400Regular', size, design: 'monospaced' });

  const caption = props.lastOccurredAt == null ? 'Nothing logged yet.' : 'since last goon';
  const century = 100 * 365 * 24 * 60 * 60 * 1000;
  const start = new Date(props.lastOccurredAt ?? Date.now());
  const end = new Date(start.getTime() + century);

  return (
    <VStack
      alignment="center"
      spacing={4}
      modifiers={[
        padding({ all: 16 }),
        containerBackground(background, 'widget'),
        widgetURL('gooned://'),
      ]}>
      {props.lastOccurredAt == null ? (
        <Text modifiers={[mono(36), foregroundStyle(digit)]}>00:00:00</Text>
      ) : (
        <Text
          timerInterval={{ lower: start, upper: end }}
          countsDown={false}
          modifiers={[mono(36), foregroundStyle(digit)]}
        />
      )}
      <Text modifiers={[mono(13), foregroundStyle(muted)]}>{caption}</Text>
    </VStack>
  );
};

export default createWidget<StreakWidgetProps>('StreakWidget', StreakWidgetView, {
  lastOccurredAt: null,
});
