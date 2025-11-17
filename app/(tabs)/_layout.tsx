import { ThemeProvider } from '@/components/ThemeContext';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';

// ✅ Use Ionicons (cross‑platform)
import Ionicons from '@expo/vector-icons/Ionicons';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';

function StatusBarBlur() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View
      style={[
        styles.statusBarBlur,
        {
          height: insets.top,
          backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.6)',
        },
      ]}
    />
  );
}

function TabScreens() {
  const colorScheme = useColorScheme();
  const tint = Colors[colorScheme ?? 'light'].tint;

  // Wrap the tab bar in a SafeAreaView (bottom) so on iOS the glass
  // effect and rounded corners don't get positioned under the home
  // indicator. The outer TabLayout already includes SafeAreaProvider.
  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
        <ThemedView elevated="low" style={[styles.tabBar, { backgroundColor: 'transparent' }]}>
          <NativeTabs>

          <NativeTabs.Trigger name="explore">
            <Icon src={<VectorIcon family={Ionicons} name="home" />} />
            <Label>Home</Label>
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="index">
            <Icon src={<VectorIcon family={Ionicons} name="paper-plane" />} />
            <Label>Map</Label>
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="settings">
            <Icon src={<VectorIcon family={Ionicons} name="settings" />} />
            <Label>Settings</Label>
          </NativeTabs.Trigger>
        </NativeTabs>
        </ThemedView>
    </SafeAreaView>
  );
}

export default function TabLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <View style={{ flex: 1 }}>
          <StatusBarBlur />
          <TabScreens />
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopLeftRadius: Platform.OS === 'android' ? 16 : 0,
    borderTopRightRadius: Platform.OS === 'android' ? 16 : 0,
  },
  safeArea: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  statusBarBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
});
