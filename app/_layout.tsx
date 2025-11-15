import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
// Only require reanimated if available; importing it unconditionally can
// throw when the native module isn't linked (Expo Go). Use a try/catch
// so the app can still run in environments without the native part.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('react-native-reanimated');
} catch (e) {
  // Not fatal — fall back to non-reanimated behavior and warn.
  // The parallax component and other pieces use fallbacks when reanimated
  // isn't present, so the app remains functional in Expo Go.
  // Log at debug level to help troubleshooting.
  // eslint-disable-next-line no-console
  console.warn('react-native-reanimated not available (native part missing):', e?.message || e);
}

// ✅ Register background location task
import '../tasks/backgroundLocation';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const setupNotifications = async () => {
      // ✅ Android: create notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
        });
      }

      // ✅ Foreground notification listener
      Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification);
      });
    };

    setupNotifications();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}