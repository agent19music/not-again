import { Geist_400Regular, Geist_500Medium } from '@expo-google-fonts/geist';
import { Inter_500Medium } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import AppTabs from '@/components/app-tabs';
import { Toaster } from '@/components/toaster';
import { useResolvedScheme } from '@/hooks/use-theme-mode';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useResolvedScheme();
  const [fontsLoaded] = useFonts({
    Inter_500Medium,
    Geist_400Regular,
    Geist_500Medium,
    GeistPixelSquare: require('../../assets/fonts/GeistPixel-Square.otf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.fill}>
      <KeyboardProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
