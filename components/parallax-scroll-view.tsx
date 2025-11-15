import type { PropsWithChildren, ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

// react-native-reanimated is optional at import-time (dev clients or web
// environments may not have the native part). Try to require it and fall
// back to a plain ScrollView if it's not available to avoid crashing on
// module evaluation.
let Animated: any = null;
let reanimatedExports: any = null;
try {
  // Use require so bundlers won't fail if the native module is missing.
  reanimatedExports = require('react-native-reanimated');
  Animated = reanimatedExports.default || reanimatedExports;
} catch (e) {
  // Not available — we'll render a safe fallback below.
  Animated = null;
}

import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

const HEADER_HEIGHT = 250;

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  const backgroundColor = useThemeColor({}, 'background');
  const colorScheme = useColorScheme() ?? 'light';

  // If reanimated isn't available (for example on web or when native
  // modules aren't present in a dev client), render a plain ScrollView
  // with the header and content — avoids crashing during import.
  const renderFallback = () => (
    <ScrollView style={{ backgroundColor, flex: 1 }} scrollEventThrottle={16}>
      <View style={[styles.header, { backgroundColor: headerBackgroundColor[colorScheme] }]}>
        {headerImage}
      </View>
      <ThemedView style={styles.content} elevated="medium">
        {children}
      </ThemedView>
    </ScrollView>
  );

  // If Animated isn't present, return fallback immediately.
  if (!Animated) return renderFallback();

  // Use an Error Boundary to catch runtime Reanimated initialization
  // errors (native part missing) and fall back gracefully.
  class RB extends (React as any).Component<{}, { hasError: boolean }> {
    constructor(props: any) {
      super(props);
      this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
      return { hasError: true };
    }
    componentDidCatch(error: any) {
      // swallow
      console.warn('Reanimated error caught in ParallaxScrollView:', error?.message || error);
    }
    render() {
      if (this.state.hasError) return renderFallback();
      return this.props.children as any;
    }
  }

  // The actual reanimated-driven subcomponent using hooks; keep it
  // separate so hooks are only invoked inside this component.
  function ReanimatedParallax() {
    const { interpolate, useAnimatedRef, useAnimatedStyle, useScrollOffset } = reanimatedExports;
    const scrollRef = useAnimatedRef<InstanceType<typeof Animated.ScrollView>>();
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

  return (
    <RB>
      <ReanimatedParallax />
    </RB>
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
