import { ThemedView } from '@/components/themed-view';
import { saveIntersections } from '@/utils/intersectionCache';
import { checkProximityAndNotify, setupNotifications } from '@/utils/notifications';
import { getSettings, type NotificationSettings } from '@/utils/settings';
import {
  Camera, MapView, PointAnnotation, type MapViewRef,
} from '@maplibre/maplibre-react-native';
import { lineString as ls, point as pt } from '@turf/helpers';
import * as turf from '@turf/turf';
import * as Location from 'expo-location';
import type { Feature, LineString } from 'geojson';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet } from 'react-native';

const MAP_STYLE = 'https://api.maptiler.com/maps/streets-v4/style.json?key=P6xL3GTk8oM1rxbEtoly';

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
  const [lastNotificationTime, setLastNotificationTime] = useState(0);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const mapRef = useRef<MapViewRef | null>(null);
  // Performance: throttle heavy intersection computation
  const lastRunRef = useRef<number>(0);
  const MIN_RUN_INTERVAL = 2000; // ms

  useEffect(() => { (async () => {
    const [locationStatus, userSettings] = await Promise.all([
      Location.requestForegroundPermissionsAsync(),
      getSettings()
    ]);
    setSettings(userSettings);
    if (locationStatus.status === 'granted') {
      setLoc((await Location.getCurrentPositionAsync({})).coords);
      await setupNotifications();
    }
  })(); }, []);

  const run = useCallback(async (userLL: [number, number]) => {
    if (!mapRef.current || !ready) return;
    // Throttle to avoid running expensive geometry ops too often
    const now = Date.now();
    if (now - lastRunRef.current < MIN_RUN_INTERVAL) return;
    const screen = await mapRef.current.getPointInView?.(userLL); if (!screen) return;
  // Keep the query region moderate to limit number of features processed
  const pad = 240;
  const rect:[number,number,number,number] = [screen[0]-pad,screen[1]-pad,screen[0]+pad,screen[1]+pad];
    const fc = await mapRef.current.queryRenderedFeaturesInRect(rect, undefined, []);
    const classes = ['motorway','trunk','primary','secondary','tertiary','street','path','pedestrian','residential','minor'];
    const roads = (fc.features as any[]).filter(f => classes.includes(f?.properties?.class));
    // Convert to Turf lineStrings
    let lines: Feature<LineString>[] = roads.flatMap((f:any)=>
      f.geometry.type==='LineString' ? [ls(f.geometry.coordinates)] :
      (f.geometry.coordinates as number[][][]).map(c=>ls(c))
    );

    // If we have many lines, simplify geometries and sample to top N by length
    const MAX_LINES = 250;
    if (lines.length > MAX_LINES) {
      // compute length for each line and keep the longest ones
      const linesWithLen = lines.map(l => ({
        len: turf.length(l, { units: 'kilometers' }),
        line: l,
      }));
      linesWithLen.sort((a,b) => b.len - a.len);
      lines = linesWithLen.slice(0, MAX_LINES).map(x => x.line).map(l => turf.simplify(l, { tolerance: 0.0005, highQuality: false }));
    }

    // intersections
    // Get crosswalk and traffic signal information
    const crosswalks = (fc.features as any[])
      .filter(f => f.properties?.crossing === 'marked' || f.properties?.highway === 'crossing');
    const signals = (fc.features as any[])
      .filter(f => f.properties?.highway === 'traffic_signals' || f.properties?.traffic_signals === 'yes');

    // Find intersections (pairwise) — acceptable after sampling / simplify
    const raw:P[] = [];
    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        const inter = turf.lineIntersect(lines[i], lines[j]);
        if (inter && inter.features && inter.features.length) {
          inter.features.forEach(q => raw.push({ lon: q.geometry.coordinates[0], lat: q.geometry.coordinates[1] }));
        }
      }
    }

    // Dedupe and process intersections
    const dedup:P[]=[]; raw.forEach(a=>{
      if(!dedup.some(b=>turf.distance(pt([a.lon,a.lat]),pt([b.lon,b.lat]),{units:'meters'})<5)) {
        // Check if intersection is near a crosswalk or signal
        const point = pt([a.lon,a.lat]);
        const hasCrosswalk = crosswalks.some(c => 
          turf.distance(point, pt(c.geometry.coordinates), {units:'meters'}) < 10
        );
        const hasSignals = signals.some(s => 
          turf.distance(point, pt(s.geometry.coordinates), {units:'meters'}) < 10
        );
        
        dedup.push({
          ...a,
          crosswalk: hasCrosswalk,
          signalized: hasSignals,
          type: hasCrosswalk ? 'crosswalk' : 'intersection'
        });
      }
    });
    
    const three=dedup.filter(p=>{
      let n=0; for(const l of lines){ if(turf.pointToLineDistance(pt([p.lon,p.lat]),l,{units:'meters'})<1) n++; if(n>=3) return true; }
      return false;
    });

    setInts(three);
    try {
      // Cache processed intersections (GeoJSON Point geometries) for background tasks
      const points = three.map(p => ({ type: 'Point' as const, coordinates: [p.lon, p.lat] }));
      await saveIntersections(points);
    } catch (e) {
      console.error('Failed to cache intersections:', e);
    }
  lastRunRef.current = Date.now();
    // Check for nearby crosswalks and notify if necessary
    if (userLL && settings) {
      const newLastNotificationTime = await checkProximityAndNotify(
        userLL,
        three,
        lastNotificationTime,
        settings
      );
      setLastNotificationTime(newLastNotificationTime);
    }
    console.log(`roads=${roads.length} 3+way=${three.length}`);
  },[ready, lastNotificationTime]);

  useEffect(()=>{ if(!ready) return; let sub:Location.LocationSubscription|null=null;
    (async()=>{ sub=await Location.watchPositionAsync({accuracy:Location.Accuracy.High,distanceInterval:12},pos=>{
      setLoc(pos.coords); run([pos.coords.longitude,pos.coords.latitude]); }); })();
    return()=>sub?.remove();
  },[ready,run]);

  if(!loc) return <ThemedView style={styles.loading}><ActivityIndicator size="large"/></ThemedView>;

  return (
    <ThemedView style={styles.container}>
      <MapView ref={mapRef as any} style={styles.map} mapStyle={MAP_STYLE} onDidFinishRenderingMapFully={()=>setReady(true)}>
        <Camera zoomLevel={16} centerCoordinate={[loc.longitude,loc.latitude]} />
        <PointAnnotation id="user" coordinate={[loc.longitude,loc.latitude]}><ThemedView style={styles.user}/></PointAnnotation>
        {ints.map((p,i)=><PointAnnotation key={i.toString()} id={`i-${i}`} coordinate={[p.lon,p.lat]}><ThemedView style={styles.dot}/></PointAnnotation>)}
      </MapView>
    </ThemedView>
  );
}

const styles=StyleSheet.create({
  container:{flex:1},
  map:{width:Dimensions.get('window').width,height:Dimensions.get('window').height},
  loading:{flex:1,justifyContent:'center',alignItems:'center'},
  user:{width:14,height:14,borderRadius:7,backgroundColor:'#007AFF',borderWidth:2,borderColor:'#fff'},
  dot:{width:12,height:12,borderRadius:6,backgroundColor:'red',borderWidth:2,borderColor:'#fff'},
});