import { Geist_400Regular, Geist_500Medium } from '@expo-google-fonts/geist';
import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono';
import { Inter_500Medium } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import AppTabs from '@/components/app-tabs';
import { Toaster } from '@/components/toaster';
import { Colors } from '@/constants/theme';
import { useResolvedScheme } from '@/hooks/use-theme-mode';
import {
  initNotificationEngine,
  registerBackgroundReconcile,
} from '@/lib/notifications';
import { startStreakWidgetSync } from '@/widgets/sync-streak-widget';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useResolvedScheme();
  const [fontsLoaded] = useFonts({
    Inter_500Medium,
    Geist_400Regular,
    Geist_500Medium,
    GeistMono_400Regular,
    GeistPixelSquare: require('../../assets/fonts/GeistPixel-Square.otf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (!fontsLoaded || Platform.OS === 'web') return;
    const stopWidgetSync = startStreakWidgetSync();
    void (async () => {
      await initNotificationEngine();
      await registerBackgroundReconcile();
    })();
    return stopWidgetSync;
  }, [fontsLoaded]);

  useEffect(() => {
    const background = Colors[colorScheme].background;
    void SystemUI.setBackgroundColorAsync(background);
  }, [colorScheme]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.fill}>
      <KeyboardProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <AppTabs />
          <Toaster />
        </ThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
