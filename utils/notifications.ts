import * as turf from '@turf/turf';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import { Vibration } from 'react-native';
import type { NotificationSettings } from './settings';

export async function setupNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.warn('Notification permissions not granted');
    return false;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  return true;
}

export async function checkProximityAndNotify(
  userLocation: [number, number],
  intersections: { lon: number; lat: number; crosswalk?: boolean; signalized?: boolean; type?: string }[],
  lastNotificationTime: number,
  settings: NotificationSettings
): Promise<number> {
  const now = Date.now();
  // Don't notify more often than every 30 seconds
  if (now - lastNotificationTime < 30000) {
    return lastNotificationTime;
  }

  const userPoint = turf.point(userLocation);
  
  for (const intersection of intersections) {
    const intersectionPoint = turf.point([intersection.lon, intersection.lat]);
    const distance = turf.distance(userPoint, intersectionPoint, { units: 'meters' });

    if (distance <= settings.notifyDistance && settings.enabled) {
      const title = intersection.crosswalk ? 'Approaching Crosswalk' : 'Approaching Intersection';
      const body = `You are ${Math.round(distance)}m from ${intersection.crosswalk ? 'a crosswalk' : 'an intersection'}. ${
        intersection.signalized ? 'Watch for traffic signals.' : 'Please proceed with caution.'
      }`;

      // Send notification if enabled
      if (settings.soundEnabled) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { type: intersection.type },
          },
          trigger: null,
        });
      }

      // Vibrate if enabled
      if (settings.vibrationEnabled) {
        if (intersection.crosswalk && intersection.signalized) {
          Vibration.vibrate([0, 200, 100, 200]); // Double vibration for signalized crosswalk
        } else if (intersection.crosswalk) {
          Vibration.vibrate([0, 400]); // Single long vibration for crosswalk
        } else {
          Vibration.vibrate([0, 100]); // Short vibration for regular intersection
        }
      }

      // Voice prompt if enabled
      if (settings.accessibilityMode && settings.voicePrompts) {
        Speech.speak(body, {
          language: 'en',
          pitch: 1,
          rate: 0.9,
        });
      }

      return now;
    }
  }

  return lastNotificationTime;
}