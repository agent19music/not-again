import { StyleSheet, View } from 'react-native';

import SafeText from '@/components/safe-text';
import { ThemeToggle } from '@/components/theme-toggle';

export function ScreenHeader({ title }: { title: string }) {
  return (
    <View style={styles.row}>
      <SafeText variant="title">{title}</SafeText>
      <ThemeToggle />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
