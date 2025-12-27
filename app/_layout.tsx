import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
// Require react-native-reanimated early and initialize layout animations.
// If the library is not available, fail fast instead of silently falling back.
const Reanimated = require('react-native-reanimated');
const R = Reanimated && (Reanimated.default ?? Reanimated);
if (!R) {
  throw new Error('react-native-reanimated is required — install and rebuild the native app.');
}
if (R && typeof R.enableLayoutAnimations === 'function') {
  R.enableLayoutAnimations(true);
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