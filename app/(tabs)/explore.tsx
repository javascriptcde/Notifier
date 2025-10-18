import { Image } from 'expo-image';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { useTheme } from '@/components/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';

export default function ExploreScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#e4e4e4ff', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#e4e4e4ff"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={[styles.card, styles.welcomeCard]} elevated="medium">
        <ThemedText>Hello</ThemedText>
      </ThemedView>

      <ThemedView 
        style={styles.titleContainer} 
        glass={Platform.OS === 'ios'} 
        glassVariant="regular"
        elevated={Platform.OS === 'android' ? 'low' : undefined}>
        <ThemedText
          variant="title"
          style={{
            fontFamily: Fonts.rounded,
          }}>
          Explore
        </ThemedText>
      </ThemedView>

  <ThemedText>This app includes example code to help you get started.</ThemedText>

      <Collapsible title="File-based routing">
        <ThemedText>
          This app has two screens: <ThemedText variant="subtitle">app/(tabs)/index.tsx</ThemedText> and <ThemedText variant="subtitle">app/(tabs)/explore.tsx</ThemedText>
        </ThemedText>
        <ThemedText>
          The layout file in <ThemedText variant="subtitle">app/(tabs)/_layout.tsx</ThemedText> sets up the tab navigator.
        </ThemedText>
        <ExternalLink href="https://docs.expo.dev/router/introduction">
          <ThemedText variant="link">Learn more</ThemedText>
        </ExternalLink>
      </Collapsible>

      <Collapsible title="Android, iOS, and web support">
        <ThemedText>
          You can open this project on Android, iOS, and the web. To open the web version, press <ThemedText variant="subtitle">w</ThemedText> in the terminal running this project.
        </ThemedText>
      </Collapsible>

      <Collapsible title="Images">
        <ThemedText>
          For static images, you can use the <ThemedText variant="subtitle">@2x</ThemedText> and <ThemedText variant="subtitle">@3x</ThemedText> suffixes to provide files for different screen densities
        </ThemedText>
        <Image
          source={require('@/assets/images/react-logo.png')}
          style={{ width: 100, height: 100, alignSelf: 'center' }}
        />
        <ExternalLink href="https://reactnative.dev/docs/images">
          <ThemedText variant="link">Learn more</ThemedText>
        </ExternalLink>
      </Collapsible>

      <Collapsible title="Light and dark mode components">
        <ThemedText>
          This template has light and dark mode support. The <ThemedText variant="subtitle">useColorScheme()</ThemedText> hook lets you inspect what the user's current color scheme is, and so you can adjust UI colors accordingly.
        </ThemedText>
        <ExternalLink href="https://docs.expo.dev/develop/user-interface/color-themes/">
          <ThemedText variant="link">Learn more</ThemedText>
        </ExternalLink>
      </Collapsible>

      <Collapsible title="Animations">
        <ThemedText>
          This template includes an example of an animated component. The <ThemedText variant="subtitle">components/HelloWave.tsx</ThemedText> component uses the powerful <ThemedText variant="subtitle" style={{ fontFamily: Fonts.mono }}>react-native-reanimated</ThemedText> library to create a waving hand animation.
        </ThemedText>
        {Platform.select({
            ios: (
              <ThemedText>
                The <ThemedText variant="subtitle">components/ParallaxScrollView.tsx</ThemedText> component provides a parallax effect for the header image.
              </ThemedText>
            ),
        })}
      </Collapsible>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 16,
  },
  headerImage: {
    alignSelf: 'center',
  },
  card: {
    padding: 16,
    marginVertical: 8,
    borderRadius: Platform.OS === 'android' ? 16 : 12,
  },
  welcomeCard: {
    marginBottom: 16,
  },
});
