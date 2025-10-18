import { ThemeProvider } from '@/components/ThemeContext';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';

// ✅ Use Ionicons (cross‑platform)
import Ionicons from '@expo/vector-icons/Ionicons';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';

function TabScreens() {
  const colorScheme = useColorScheme();
  const tint = Colors[colorScheme ?? 'light'].tint;

  return (
    <ThemedView elevated="medium" style={styles.tabBar}>
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
  );
}

export default function TabLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <TabScreens />
        </SafeAreaView>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopLeftRadius: Platform.OS === 'android' ? 16 : 0,
    borderTopRightRadius: Platform.OS === 'android' ? 16 : 0,
  }
});