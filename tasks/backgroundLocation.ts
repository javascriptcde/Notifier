import { getCachedIntersections } from '@/utils/intersectionCache';
import { getSettings } from '@/utils/settings';
import * as turf from '@turf/turf';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import * as TaskManager from 'expo-task-manager';
import { Vibration } from 'react-native';

export const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Location task error:', error);
    return;
  }

  const { locations } = data as { locations: Location.LocationObject[] };
  const { latitude, longitude } = locations[0].coords;
  const userPoint = turf.point([longitude, latitude]);

  // ✅ Check proximity to intersections
  const intersections = await getCachedIntersections();
  const settings = await getSettings();
  const threshold = settings?.notifyDistance ?? 20;

  for (const pt of intersections) {
    const dist = turf.distance(userPoint, turf.point(pt.coordinates), { units: 'meters' });
    if (dist <= threshold && settings?.enabled) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚦 Approaching Intersection',
          body: 'Watch for cross traffic.',
          sound: settings.soundEnabled ? true : false,
        },
        trigger: null,
      });

      if (settings.vibrationEnabled) {
        // Simple mapping: 1 -> short, 2 -> medium, 3 -> long
        const pattern = settings.vibrationStrength === 3 ? [0, 300] : settings.vibrationStrength === 2 ? [0, 200] : [0, 100];
        Vibration.vibrate(pattern);
      }

      if (settings.voicePrompts) {
        Speech.speak('Approaching an intersection. Please be alert.');
      }

      break;
    }
  }
});