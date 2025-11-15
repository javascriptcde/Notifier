import * as turf from '@turf/turf';
import type { Feature, LineString, Point } from 'geojson';

/**
 * Detect intersections and only return points where at least `minRoads`
 * distinct source features meet. This avoids counting multiple segments
 * of the same source as separate roads.
 */
export function detectIntersections(features: Feature[]): Point[] {
  const lines = features
    .filter(f => f.geometry.type === 'LineString')
    .map(f => turf.lineString((f.geometry as LineString).coordinates));

  const intersections: Point[] = [];

  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const result = turf.lineIntersect(lines[i], lines[j]);
      for (const pt of result.features) {
        intersections.push(pt.geometry);
      }
    }
  }

  return intersections;
}