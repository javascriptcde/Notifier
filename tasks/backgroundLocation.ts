import { getCachedIntersections } from '@/utils/intersectionCache';
import { getVoicePromptEnabled } from '@/utils/settings';
import * as turf from '@turf/turf';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import * as TaskManager from 'expo-task-manager';

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

  for (const pt of intersections) {
    const dist = turf.distance(userPoint, turf.point(pt.coordinates), { units: 'meters' });
    if (dist < 20) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚦 Approaching Intersection',
          body: 'Watch for cross traffic.',
          sound: true,
        },
        trigger: null,
      });

      const voiceEnabled = await getVoicePromptEnabled();
      if (voiceEnabled) {
        Speech.speak('Approaching an intersection. Please be alert.');
      }

      break;
    }
  }
});