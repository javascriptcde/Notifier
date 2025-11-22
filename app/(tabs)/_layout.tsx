import { ThemeProvider } from '@/components/ThemeContext';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';

// ✅ Use Ionicons (cross‑platform)
import Ionicons from '@expo/vector-icons/Ionicons';

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

function CustomTabBar({ state, descriptors, navigation }: any) {
  return (
    <SafeAreaView edges={['bottom']} style={styles.customTabBar}>
      <ThemedView elevated="low" style={{ backgroundColor: 'transparent' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', height: 56 }}>
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const label = options.tabBarLabel || options.title || route.name;
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const getIcon = (focused: boolean) => {
              switch (route.name) {
                case 'explore':
                  return <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={isFocused ? '#007AFF' : '#666'} />;
                case 'index':
                  return <Ionicons name={focused ? 'paper-plane' : 'paper-plane-outline'} size={24} color={isFocused ? '#007AFF' : '#666'} />;
                case 'settings':
                  return <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={isFocused ? '#007AFF' : '#666'} />;
                default:
                  return null;
              }
            };

            return (
              <View
                key={route.key}
                style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
                onTouchEnd={onPress}
              >
                {getIcon(isFocused)}
              </View>
            );
          })}
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const tint = Colors[colorScheme ?? 'light'].tint;

  return (
    <ThemeProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: tint,
          headerShown: false,
          tabBarStyle: {
            display: 'none',
          },
        }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Home',
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: 'Map',
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
          }}
        />
      </Tabs>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  nativeTabBar: {
    borderTopLeftRadius: Platform.OS === 'android' ? 16 : 0,
    borderTopRightRadius: Platform.OS === 'android' ? 16 : 0,
  },
  safeArea: {
    backgroundColor: 'transparent',
  },
  customTabBar: {
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statusBarBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
});
