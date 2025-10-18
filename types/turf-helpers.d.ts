// Minimal ambient declarations for @turf/helpers used in this project.
// These provide the named exports (point, lineString, points, etc.) so
// TypeScript can resolve them even if the package's "exports" prevents
// the shipped .d.ts from being picked up by the resolver.

import type { Feature, FeatureCollection, LineString, Point, Polygon } from 'geojson';

declare module '@turf/helpers' {
  export type Position = [number, number];

  export function point<P = any>(coordinates: Position, properties?: P, options?: any): Feature<Point, P>;
  export function points<P = any>(coordinates: Position[], properties?: P, options?: any): FeatureCollection<Point, P>;
  export function lineString<P = any>(coordinates: Position[], properties?: P, options?: any): Feature<LineString, P>;
  export function polygon<P = any>(coordinates: Position[][], properties?: P, options?: any): Feature<Polygon, P>;

  // re-export common types (keep minimal)
  export type FeatureT<G = any, P = any> = Feature<G, P>;
  export type FeatureCollectionT<G = any, P = any> = FeatureCollection<G, P>;
}

// Also allow importing the shipped d.ts directly via path mapping in tsconfig
declare module '@turf/helpers/dist/js/index' {
  export * from '@turf/helpers';
}
