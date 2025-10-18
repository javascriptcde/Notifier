import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Point } from 'geojson';

const STORAGE_KEY = 'cached_intersections';

export async function saveIntersections(points: Point[]) {
  try {
    const serialized = JSON.stringify(points);
    await AsyncStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error('Failed to save intersections:', error);
  }
}

export async function getCachedIntersections(): Promise<Point[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Failed to load intersections:', error);
    return [];
  }
}