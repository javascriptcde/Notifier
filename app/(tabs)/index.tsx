import { ThemedView } from '@/components/themed-view';
import { saveIntersections } from '@/utils/intersectionCache';
import { setupNotifications } from '@/utils/notifications';
import { getSettings, type NotificationSettings } from '@/utils/settings';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Camera, MapView, PointAnnotation, type MapViewRef,
} from '@maplibre/maplibre-react-native';
import { lineString as ls, point as pt } from '@turf/helpers';
import * as turf from '@turf/turf';
import * as Location from 'expo-location';
import type { Feature, LineString } from 'geojson';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
const MAP_STYLE_STREETS = 'https://api.maptiler.com/maps/streets-v4/style.json?key=P6xL3GTk8oM1rxbEtoly';
const MAP_STYLE_SATELLITE = 'https://api.maptiler.com/maps/hybrid/style.json?key=P6xL3GTk8oM1rxbEtoly';

type P = {
  lon: number;
  lat: number;
  crosswalk?: boolean;
  signalized?: boolean;
  type?: string;
};

export default function MapScreen() {
  const [loc, setLoc] = useState<Location.LocationObjectCoords | null>(null);
  const [ready, setReady] = useState(false);
  const [ints, setInts] = useState<P[]>([]);
  const [branchedInts, setBranchedInts] = useState<P[]>([]);
  const [lastNotificationTime, setLastNotificationTime] = useState(0);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const mapRef = useRef<MapViewRef | null>(null);
  const [mapStyle, setMapStyle] = useState(MAP_STYLE_STREETS);
  const [followUser, setFollowUser] = useState(false);
  const followUserRef = useRef(followUser);
  const [cameraCenter, setCameraCenter] = useState<[number, number] | null>(null);
  const [cameraBearing, setCameraBearing] = useState<number | undefined>(0);
  const [pitch, setPitch] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(16);
  // Smooth camera fly helper: tries native animation, falls back to requestAnimationFrame-based interpolation
  const smoothFlyTo = async (
    targetCoord: [number, number],
    targetBearing?: number,
    targetZoom?: number,
    targetPitch?: number,
    duration = 600
  ) => {
    // Try native setCamera with duration first
    try {
      await (mapRef.current as any)?.setCamera?.({ centerCoordinate: targetCoord, bearing: targetBearing, zoomLevel: targetZoom, pitch: targetPitch, duration });
      // update local state
      setCameraCenter(targetCoord);
      if (typeof targetBearing === 'number') setCameraBearing(targetBearing);
      if (typeof targetZoom === 'number') setZoomLevel(targetZoom);
      if (typeof targetPitch === 'number') setPitch(targetPitch);
      return;
    } catch (e) {
      // fall back to rAF interpolation
    }

    const startCoord = cameraCenter ?? (loc ? [loc.longitude, loc.latitude] : targetCoord);
    const startBearing = cameraBearing ?? 0;
    const startZoom = zoomLevel;
    const startPitch = pitch ?? 0;

    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // easeInOutCubic

    return new Promise<void>(resolve => {
      const start = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();

      const step = (now?: number) => {
        const current = now ?? (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
        const tRaw = Math.min(1, (current - start) / duration);
        const t = ease(tRaw);

        const lon = startCoord[0] + (targetCoord[0] - startCoord[0]) * t;
        const lat = startCoord[1] + (targetCoord[1] - startCoord[1]) * t;
        const bear = typeof targetBearing === 'number' ? startBearing + (targetBearing - startBearing) * t : undefined;
        const z = typeof targetZoom === 'number' ? startZoom + (targetZoom - startZoom) * t : undefined;
        const p = typeof targetPitch === 'number' ? startPitch + (targetPitch - startPitch) * t : undefined;

        // Prefer native per-frame camera updates when available for smoothness
          try {
            (mapRef.current as any)?.setCamera?.({ centerCoordinate: [lon, lat], bearing: bear, zoomLevel: z, pitch: p, duration: 0 });
          } catch (e) {
            // Fallback to updating state which will let Camera animate
            setCameraCenter([lon, lat]);
            if (typeof bear === 'number') setCameraBearing(bear);
            if (typeof z === 'number') setZoomLevel(z);
            if (typeof p === 'number') setPitch(p);
          }

        if (tRaw < 1) {
          requestAnimationFrame(step);
        } else {
          // finalize
          setCameraCenter(targetCoord);
          if (typeof targetBearing === 'number') setCameraBearing(targetBearing);
          if (typeof targetZoom === 'number') setZoomLevel(targetZoom);
          if (typeof targetPitch === 'number') setPitch(targetPitch);
          resolve();
        }
      };

      requestAnimationFrame(step);
    });
  };
  // Performance: throttle heavy intersection computation
  const lastRunRef = useRef<number>(0);
  const MIN_RUN_INTERVAL = 3000; // ms

  useEffect(() => { (async () => {
    console.log('MapScreen: Starting initialization');
    const [locationStatus, userSettings] = await Promise.all([
      Location.requestForegroundPermissionsAsync(),
      getSettings()
    ]);
    console.log('MapScreen: Location status =', locationStatus.status, 'Settings loaded');
    setSettings(userSettings);
    if (locationStatus.status === 'granted') {
      const pos = await Location.getCurrentPositionAsync({});
      console.log('MapScreen: Got current position', pos.coords.latitude, pos.coords.longitude);
      setLoc(pos.coords);
      // initialize camera center
      setCameraCenter([pos.coords.longitude, pos.coords.latitude]);
      await setupNotifications();
    }
    // Fallback: ensure map becomes ready on Android if callbacks don't fire
    const timeoutId = setTimeout(() => {
      console.log('MapScreen: Timeout firing, forcing ready state');
      setReady(true);
    }, 4000);
    return () => clearTimeout(timeoutId);
  })(); }, []);

  const run = useCallback(async (userLL: [number, number]) => {
    if (!mapRef.current || !ready) return;
    // Throttle to avoid running expensive geometry ops too often
    const now = Date.now();
    if (now - lastRunRef.current < MIN_RUN_INTERVAL) return;
    const screen = await mapRef.current.getPointInView?.(userLL);
    if (!screen) return;

    // Keep the query region moderate to limit number of features processed
    const pad = 240;
    const rect: [number, number, number, number] = [screen[0] - pad, screen[1] - pad, screen[0] + pad, screen[1] + pad];
    const fc = await mapRef.current.queryRenderedFeaturesInRect(rect, undefined, []);
    const classes = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'street', 'path', 'pedestrian', 'residential', 'minor'];
    const roads = (fc.features as any[]).filter(f => classes.includes(f?.properties?.class));

    // Safety guard: bail out early if the viewport has an enormous number of road features
    if (roads.length > 600) {
      console.warn(`MapScreen: too many road features (${roads.length}), skipping heavy intersection computation to avoid freezing UI`);
      lastRunRef.current = Date.now();
      return;
    }

    // Convert to Turf lineStrings
    // Keep source mapping so we can ignore intersections between adjacent
    // segments that come from the same source feature (curvy roads split into
    // multiple line segments can produce spurious intersections).
    type LineItem = { line: Feature<LineString>; sourceIndex: number };
    let lines: LineItem[] = roads.flatMap((f: any, srcIdx: number) =>
      f.geometry.type === 'LineString'
        ? [{ line: ls(f.geometry.coordinates), sourceIndex: srcIdx }]
        : (f.geometry.coordinates as number[][][]).map(c => ({ line: ls(c), sourceIndex: srcIdx }))
    );

    // If we have many lines, simplify geometries and sample to top N by length
    const MAX_LINES = 120;
    if (lines.length > MAX_LINES) {
      const linesWithLen = lines.map((l, idx) => ({
        len: turf.length(l.line, { units: 'kilometers' }),
        line: l.line,
        src: l.sourceIndex,
        idx,
      }));
      linesWithLen.sort((a, b) => b.len - a.len);
      const top = linesWithLen.slice(0, MAX_LINES);
      lines = top.map(x => ({ line: turf.simplify(x.line, { tolerance: 0.0005, highQuality: false }), sourceIndex: x.src }));
    }

    // Get crosswalk and traffic signal information
    const crosswalks = (fc.features as any[])
      .filter(f => f.properties?.crossing === 'marked' || f.properties?.highway === 'crossing');
    const signals = (fc.features as any[])
      .filter(f => f.properties?.highway === 'traffic_signals' || f.properties?.traffic_signals === 'yes');

    // Find intersections (pairwise) and track which pairs created each point
    const raw: P[] = [];
    type IntKey = { lon: number; lat: number; pairs: Set<string> };
    const intMap = new Map<string, IntKey>();
    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        // Skip intersections where both segments came from the same source feature
        // -- these are likely adjacent segments from a single curvy road.
        if (lines[i].sourceIndex === lines[j].sourceIndex) continue;
        const inter = turf.lineIntersect(lines[i].line, lines[j].line);
        if (inter && inter.features && inter.features.length) {
          inter.features.forEach(q => {
            const coord = q.geometry.coordinates as number[];
            const key = `${coord[0].toFixed(6)},${coord[1].toFixed(6)}`;
            const pairKey = `${i},${j}`;
            if (!intMap.has(key)) {
              intMap.set(key, { lon: coord[0], lat: coord[1], pairs: new Set([pairKey]) });
            } else {
              intMap.get(key)!.pairs.add(pairKey);
            }
          });
        }
      }
    }
    intMap.forEach(int => {
      raw.push({ lon: int.lon, lat: int.lat });
    });

      // Dedupe and process intersections (smaller threshold — keep intersections
      // closer together as separate points). Reduced from 2m to 1m for finer
      // separation per user request.
      const DEDUP_DISTANCE_METERS = 1.0;
    const dedup: P[] = [];
    raw.forEach(a => {
      if (!dedup.some(b => turf.distance(pt([a.lon, a.lat]), pt([b.lon, b.lat]), { units: 'meters' }) < DEDUP_DISTANCE_METERS)) {
        const point = pt([a.lon, a.lat]);
        const hasCrosswalk = crosswalks.some(c => turf.distance(point, pt(c.geometry.coordinates), { units: 'meters' }) < 10);
        const hasSignals = signals.some(s => turf.distance(point, pt(s.geometry.coordinates), { units: 'meters' }) < 10);
        dedup.push({
          ...a,
          crosswalk: hasCrosswalk,
          signalized: hasSignals,
          type: hasCrosswalk ? 'crosswalk' : 'intersection'
        });
      }
    });

    // Identify 3+ way intersections: for each deduped point, count distinct LINE INDICES
    // (not just pairs) from all nearby raw intersections. This avoids false positives from
    // curvy roads (which are chains of adjacent segments like 0-1-2-3, giving pairs (0-1),(1-2),(2-3)).
    // A true 3-way has roads A,B,C intersecting, creating pairs from >=3 distinct indices.
    const branched = dedup.filter(p => {
      const point = pt([p.lon, p.lat]);
      const distinctIndices = new Set<number>();
      
      // Check all raw intersection locations; if a location is near this deduped point,
      // collect all distinct line indices from all pairs at that location.
      for (const [, intKey] of intMap) {
        if (turf.distance(point, pt([intKey.lon, intKey.lat]), { units: 'meters' }) <= DEDUP_DISTANCE_METERS) {
          for (const pairKey of intKey.pairs) {
            const [li, lj] = pairKey.split(',').map(Number);
            // Use sourceIndex (original feature index) so adjacent segment pairs
            // from the same source are counted as one road.
            const srcI = lines[li].sourceIndex;
            const srcJ = lines[lj].sourceIndex;
            distinctIndices.add(srcI);
            distinctIndices.add(srcJ);
          }
        }
      }
      
      return distinctIndices.size >= 3;
    });

    // Display all deduped intersections as red dots, and keep the
    // branched (3+ direction) set separately so we can highlight them.
    setInts(dedup);
    setBranchedInts(branched);
    try {
      // Cache processed intersections (GeoJSON Point geometries) for background tasks
      const points = branched.map(p => ({ type: 'Point' as const, coordinates: [p.lon, p.lat] }));
      await saveIntersections(points);
    } catch (e) {
      console.error('Failed to cache intersections:', e);
    }

    lastRunRef.current = Date.now();

    // Foreground notifications are disabled by preference; background task handles alerts.
  console.log(`roads=${roads.length} detected=${dedup.length}`);
  }, [ready, lastNotificationTime]);

  useEffect(()=>{ if(!ready) return; let sub:Location.LocationSubscription|null=null;
    // keep ref in sync so callbacks see the latest value immediately
    followUserRef.current = followUser;
    (async()=>{ sub=await Location.watchPositionAsync({accuracy:Location.Accuracy.High,distanceInterval:12},pos=>{
      setLoc(pos.coords);
      // if follow mode is active, update camera center to keep user centered
      if (followUserRef.current) setCameraCenter([pos.coords.longitude, pos.coords.latitude]);
      run([pos.coords.longitude,pos.coords.latitude]); }); })();
    return()=>sub?.remove();
  },[ready,run,followUser]);

  // keep followUserRef updated whenever followUser state changes
  useEffect(() => { followUserRef.current = followUser; }, [followUser]);

  // Keep zoomLevel in sync with native map state: poll camera zoom periodically when ready
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const sync = async () => {
      try {
        const cam = await (mapRef.current as any)?.getCamera?.();
        const nativeZoom = cam?.zoom ?? cam?.zoomLevel ?? cam?.zoomLevel;
        if (!cancelled && typeof nativeZoom === 'number' && Math.abs(nativeZoom - zoomLevel) > 0.001) {
          setZoomLevel(nativeZoom);
        }
      } catch (e) {
        // ignore if API not available
      }
    };
    const id = setInterval(sync, 800);
    // run once immediately
    void sync();
    return () => { cancelled = true; clearInterval(id); };
  }, [ready]);

  // Immediate sync: called from map event handlers to update zoom/center/bearing instantly
  const syncCameraInstant = async () => {
    try {
      const cam = await (mapRef.current as any)?.getCamera?.();
      if (!cam) return;
      const nativeZoom = cam.zoom ?? cam.zoomLevel ?? cam.zoomLevel;
      if (typeof nativeZoom === 'number') setZoomLevel(nativeZoom);
      if (cam.centerCoordinate && Array.isArray(cam.centerCoordinate) && cam.centerCoordinate.length >= 2) {
        setCameraCenter([cam.centerCoordinate[0], cam.centerCoordinate[1]]);
      }
      if (typeof cam.bearing === 'number') setCameraBearing(cam.bearing);
      // some map implementations expose pitch on the camera
      if (typeof (cam as any).pitch === 'number') setPitch((cam as any).pitch);
    } catch (e) {
      // ignore
    }
  };

  if(!loc) return <ThemedView style={styles.loading}><ActivityIndicator size="large"/></ThemedView>;

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <MapView 
          ref={mapRef as any} 
          style={styles.map} 
          mapStyle={mapStyle} 
          onDidFinishRenderingMapFully={()=>{
            console.log('Map finished rendering fully');
            setReady(true);
          }}
          onDidFinishLoadingMap={()=>{
            console.log('Map finished loading');
            setReady(true);
          }}
          onRegionDidChange={() => { void syncCameraInstant(); }}
          onRegionIsChanging={() => { void syncCameraInstant(); }}
        >
        <Camera
          zoomLevel={zoomLevel}
          centerCoordinate={cameraCenter ?? [loc.longitude, loc.latitude]}
          pitch={pitch}
          animationDuration={300}
        />
        <PointAnnotation id="user" coordinate={[loc.longitude,loc.latitude]}><ThemedView style={styles.user}/></PointAnnotation>
        {/* Branched intersections (3+ way) highlighted in green on top */}
        {branchedInts.map((p,i)=>(
          <PointAnnotation key={`branched-${i}`} id={`b-${i}`} coordinate={[p.lon,p.lat]}>
            <ThemedView style={styles.branchedDot} />
          </PointAnnotation>
        ))}
      </MapView>
      {/* Floating controls */}
      <View style={styles.fabContainer} pointerEvents="box-none">
        <View style={styles.fabColumn}>
          {/* Top: Align with location (fetch fresh pos + short heading watch for immediate response) */}
          <TouchableOpacity
            style={styles.fab}
            onPress={async () => {
              try {
                const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                setLoc(pos.coords);
                setFollowUser(true);
                // quick heading sample and smooth fly
                try {
                  const hdgSample = await new Promise<number | undefined>(resolve => {
                    let done = false;
                    Location.watchHeadingAsync(h => {
                      if (done) return;
                      done = true;
                      const hdg = (h as any).trueHeading ?? (h as any).magHeading ?? 0;
                      resolve(hdg || 0);
                    }).then(sub => {
                      // safety unsubscribe after 1.5s
                      setTimeout(() => { try { sub.remove(); } catch (_) {} }, 1500);
                    }).catch(() => resolve(undefined));
                    // fallback timer
                    setTimeout(() => { if (!done) { done = true; resolve(undefined); } }, 1200);
                  });
                  const bearing = hdgSample ?? 0;
                  await smoothFlyTo([pos.coords.longitude, pos.coords.latitude], bearing, undefined, undefined, 700);
                } catch (e) {
                  // if heading not available, just fly to location
                  await smoothFlyTo([pos.coords.longitude, pos.coords.latitude], 0, undefined, undefined, 700);
                }
              } catch (err) {
                console.error('Align with location failed:', err);
              }
            }}
          >
            <Ionicons name="navigate" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Middle: Satellite toggle */}
          <TouchableOpacity
            style={[styles.fab, { marginTop: 12 }]}
            onPress={() => {
              setMapStyle(prev => prev === MAP_STYLE_STREETS ? MAP_STYLE_SATELLITE : MAP_STYLE_STREETS);
            }}
          >
            <Ionicons name="layers" size={20} color="#fff" />
          </TouchableOpacity>

          {/* 2D / 3D toggle */}
          <TouchableOpacity
            style={[styles.fab, { marginTop: 12 }]}
            onPress={async () => {
              try {
                const cam = await (mapRef.current as any)?.getCamera?.();
                const targetPitch = (typeof pitch === 'number' && pitch > 1) ? 0 : 60;
                const targetCenter = (cam && cam.centerCoordinate && Array.isArray(cam.centerCoordinate))
                  ? [cam.centerCoordinate[0], cam.centerCoordinate[1]] as [number, number]
                  : (cameraCenter ?? null);
                if (!targetCenter) return;
                const wasFollowing = followUser;
                if (wasFollowing) setFollowUser(false);
                await smoothFlyTo(targetCenter, cameraBearing, undefined, targetPitch, 350);
                if (wasFollowing) setTimeout(() => setFollowUser(true), 450);
              } catch (e) {
                console.error('Toggle 3D failed', e);
              }
            }}
          >
            <Ionicons name="cube" size={18} color="#fff" />
          </TouchableOpacity>

          {/* Zoom controls placed under satellite button */}
          <TouchableOpacity
            style={[styles.fab, { marginTop: 18 }]}
            onPress={async () => {
              try {
                const cam = await (mapRef.current as any)?.getCamera?.();
                const nativeZoom = (cam?.zoom ?? cam?.zoomLevel ?? zoomLevel) as number;
                const newZoom = Math.min(nativeZoom + 1, 20);
                const targetCenter = (cam && cam.centerCoordinate && Array.isArray(cam.centerCoordinate))
                  ? [cam.centerCoordinate[0], cam.centerCoordinate[1]] as [number, number]
                  : (cameraCenter ?? null);
                if (!targetCenter) return; // avoid jumping to user location
                const wasFollowing = followUser;
                if (wasFollowing) setFollowUser(false);
                await smoothFlyTo(targetCenter, cameraBearing, newZoom, undefined, 300);
                if (wasFollowing) {
                  // restore follow after animation
                  setTimeout(() => setFollowUser(true), 350);
                }
              } catch (e) {
                const nativeZoom = zoomLevel;
                const newZoom = Math.min(nativeZoom + 1, 20);
                const targetCenter = cameraCenter ?? null;
                if (!targetCenter) return;
                const wasFollowing = followUser;
                if (wasFollowing) setFollowUser(false);
                await smoothFlyTo(targetCenter, cameraBearing, newZoom, undefined, 300);
                if (wasFollowing) {
                  setTimeout(() => setFollowUser(true), 350);
                }
              }
            }}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fab, { marginTop: 12 }]}
            onPress={async () => {
              try {
                const cam = await (mapRef.current as any)?.getCamera?.();
                const nativeZoom = (cam?.zoom ?? cam?.zoomLevel ?? zoomLevel) as number;
                const newZoom = Math.max(nativeZoom - 1, 1);
                const targetCenter = (cam && cam.centerCoordinate && Array.isArray(cam.centerCoordinate))
                  ? [cam.centerCoordinate[0], cam.centerCoordinate[1]] as [number, number]
                  : (cameraCenter ?? null);
                if (!targetCenter) return;
                const wasFollowing = followUser;
                if (wasFollowing) setFollowUser(false);
                await smoothFlyTo(targetCenter, cameraBearing, newZoom, undefined, 300);
                if (wasFollowing) {
                  setTimeout(() => setFollowUser(true), 350);
                }
              } catch (e) {
                const nativeZoom = zoomLevel;
                const newZoom = Math.max(nativeZoom - 1, 1);
                const targetCenter = cameraCenter ?? null;
                if (!targetCenter) return;
                const wasFollowing = followUser;
                if (wasFollowing) setFollowUser(false);
                await smoothFlyTo(targetCenter, cameraBearing, newZoom, undefined, 300);
                if (wasFollowing) {
                  setTimeout(() => setFollowUser(true), 350);
                }
              }
            }}
          >
            <Ionicons name="remove" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* previously separate zoom control removed; zoom buttons now sit under satellite button */}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles=StyleSheet.create({
  container:{flex:1},
  map:{width:Dimensions.get('window').width,height:Dimensions.get('window').height},
  loading:{flex:1,justifyContent:'center',alignItems:'center'},
  user:{width:14,height:14,borderRadius:7,backgroundColor:'#007AFF',borderWidth:2,borderColor:'#fff'},
  dot:{width:12,height:12,borderRadius:6,backgroundColor:'red',borderWidth:2,borderColor:'#fff'},
  branchedDot:{width:14,height:14,borderRadius:7,backgroundColor:'limegreen',borderWidth:2,borderColor:'#fff'},
  fabContainer: {
    position: 'absolute',
    right: 16,
    top: 120,
    zIndex: 200,
  },
  fabColumn: {
    alignItems: 'center',
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  /* zoomContainer removed - zoom buttons are now under satellite button */
});