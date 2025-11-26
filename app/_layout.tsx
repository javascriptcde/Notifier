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
  const Reanimated = require('react-native-reanimated');
  // The library may export the module as default or as the module itself.
  const R = Reanimated && (Reanimated.default ?? Reanimated);

  // Per Reanimated troubleshooting, try to call runtime initialization helpers
  // when available so the native part is properly wired up in dev clients.
  if (R && R.enableLayoutAnimations) {
    try {
      R.enableLayoutAnimations?.(true);
    } catch (initErr) {
      // Non-fatal initialization error
      console.debug('Reanimated init error:', (initErr as any)?.message ?? String(initErr));
    }
  }
} catch (e) {
  // Not fatal — fall back to non-reanimated behavior and warn.
  // The parallax component and other pieces use fallbacks when reanimated
  // isn't present, so the app remains functional in Expo Go.
  // Log at debug level to help troubleshooting.
  console.debug('react-native-reanimated not fully available:', (e as any)?.message ?? String(e));
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
      // ✅ Android: create notification channels
      if (Platform.OS === 'android') {
        // default channel for app notifications
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
        });

        // channel explicitly for background location / foreground service
        // keep importance lower to avoid overly aggressive interruptions
        await Notifications.setNotificationChannelAsync('background-location', {
          name: 'Background Location',
          importance: Notifications.AndroidImportance.DEFAULT,
          sound: 'default',
          enableVibrate: false,
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