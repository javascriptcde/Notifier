import { getCachedIntersections } from '@/utils/intersectionCache';
import { getSettings } from '@/utils/settings';
import * as turf from '@turf/turf';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import * as TaskManager from 'expo-task-manager';
import { Platform, Vibration } from 'react-native';

export const LOCATION_TASK_NAME = 'background-location-task';

const NOTIFIED_KEY = 'notifiedIntersections';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Location task error:', error);
    return;
  }

  const { locations } = data as { locations: Location.LocationObject[] };
  if (!locations || locations.length === 0) return;

  const { latitude, longitude } = locations[0].coords;
  const userPoint = turf.point([longitude, latitude]);

  // Load notified intersections
  let notified: Set<string>;
  try {
    const stored = await AsyncStorage.getItem(NOTIFIED_KEY);
    notified = new Set(stored ? JSON.parse(stored) : []);
  } catch (e) {
    console.error('Failed to load notified intersections:', e);
    notified = new Set();
  }

  // Check proximity to intersections
  const intersections = await getCachedIntersections();
  const settings = await getSettings();
  const threshold = settings?.notifyDistance ?? 20;

  let notifiedUpdated = false;

  for (const pt of intersections) {
    const dist = turf.distance(userPoint, turf.point(pt.coordinates), { units: 'meters' });
    const key = `${pt.coordinates[0].toFixed(6)},${pt.coordinates[1].toFixed(6)}`;

    if (dist >= 100) {
      if (notified.has(key)) {
        notified.delete(key);
        notifiedUpdated = true;
      }
    }

    if (dist <= threshold && !notified.has(key) && settings?.enabled) {
      try {
        const content: any = {
          title: '🚦 Approaching Intersection',
          body: 'Watch for cross traffic.',
          sound: settings.soundEnabled ? true : false,
        };

        // On Android target the background-location channel explicitly
        if (Platform.OS === 'android') content.android = { channelId: 'background-location' };

        await Notifications.scheduleNotificationAsync({ content: content as any, trigger: null });
      } catch (notifyErr) {
        // Background tasks can fail to post notifications if permissions or
        // the notification channel are missing. Log the error for debugging.
        console.error('Failed to schedule background notification:', notifyErr);
      }

      if (settings.vibrationEnabled) {
        // Simple mapping: 1 -> short, 2 -> medium, 3 -> long
        const pattern = settings.vibrationStrength === 3 ? [0, 300] : settings.vibrationStrength === 2 ? [0, 200] : [0, 100];
        Vibration.vibrate(pattern);
      }

      if (settings.voicePrompts) {
        Speech.speak('Approaching an intersection. Please be alert.');
      }

      notified.add(key);
      notifiedUpdated = true;
      break; // Notify only once per location update
    }
  }

  // Save updated notified set if changed
  if (notifiedUpdated) {
    try {
      await AsyncStorage.setItem(NOTIFIED_KEY, JSON.stringify([...notified]));
    } catch (e) {
      console.error('Failed to save notified intersections:', e);
    }
  }
});