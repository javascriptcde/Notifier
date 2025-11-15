import type { PropsWithChildren, ReactElement } from 'react';
import React, { useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

const HEADER_HEIGHT = 250;

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
}>;

// Simplified parallax fallback: we intentionally avoid using
// react-native-reanimated here unless you rebuild the native app.
// This removes runtime crashes in environments where Reanimated's
// native module isn't initialized (Expo Go). To enable native
// reanimated animations, build a dev client or run on a simulator
// with native modules linked and then reintroduce Reanimated code.
export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  const backgroundColor = useThemeColor({}, 'background');
  const colorScheme = useColorScheme() ?? 'light';

  // Try to load reanimated at runtime (works in dev builds where native
  // modules are available). Use useMemo so require is only attempted once
  // per component mount and to keep synchronous behavior predictable.
  // Skip entirely on Android to avoid native module crashes.
  const reanimated = useMemo(() => {
    if (Platform.OS === 'android') {
      // Always use fallback on Android to avoid Reanimated native crashes
      console.debug('ParallaxScrollView: Using fallback on Android');
      return null;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const r = require('react-native-reanimated');
      if (r && r.useAnimatedStyle) {
        console.debug('ParallaxScrollView: Reanimated available on iOS');
        return r;
      }
      return null;
    } catch (e) {
      console.debug('ParallaxScrollView: Reanimated not available:', (e as any)?.message);
      return null;
    }
  }, []);

  try {
    if (reanimated && reanimated.useAnimatedStyle) {
      // Use the native reanimated implementation when available (iOS only)
      const { interpolate, useAnimatedRef, useAnimatedStyle, useScrollOffset } = reanimated;
      const scrollRef = useAnimatedRef();
      const scrollOffset = useScrollOffset(scrollRef);
      const headerAnimatedStyle = useAnimatedStyle(() => {
        return {
          transform: [
            {
              translateY: interpolate(
                scrollOffset.value,
                [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
                [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75]
              ),
            },
            {
              scale: interpolate(scrollOffset.value, [-HEADER_HEIGHT, 0, HEADER_HEIGHT], [2, 1, 1]),
            },
          ],
        };
      });

      const Animated: any = reanimated.default || reanimated;
      return (
        <Animated.ScrollView
          ref={scrollRef}
          style={{ backgroundColor, flex: 1 }}
          scrollEventThrottle={16}>
          <Animated.View
            style={[
              styles.header,
              { backgroundColor: headerBackgroundColor[colorScheme] },
              headerAnimatedStyle,
            ]}>
            {headerImage}
          </Animated.View>
          <ThemedView style={styles.content} elevated="medium">
            {children}
          </ThemedView>
        </Animated.ScrollView>
      );
    }
  } catch (renderError) {
    console.error('ParallaxScrollView render error:', (renderError as any)?.message);
  }

  // Fallback for environments without the native reanimated module (Android + errors)
  return (
    <ScrollView style={{ backgroundColor, flex: 1 }} scrollEventThrottle={16}>
      <View style={[styles.header, { backgroundColor: headerBackgroundColor[colorScheme] }]}>
        {headerImage}
      </View>
      <ThemedView style={styles.content} elevated="medium">
        {children}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: HEADER_HEIGHT,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    padding: 32,
    gap: 16,
    overflow: 'hidden',
  },
});
