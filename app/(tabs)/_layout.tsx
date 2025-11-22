import { ThemeProvider } from '@/components/ThemeContext';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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

// Native tab bar for iOS
function NativeTabBar() {
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ThemedView elevated="low" style={[styles.nativeTabBar, { backgroundColor: 'transparent' }]}>
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

// JavaScript tab bar for Android
function CustomTabBar({ state, descriptors, navigation }: any) {
  const getTabLabel = (routeName: string) => {
    switch (routeName) {
      case 'explore':
        return 'Home';
      case 'index':
        return 'Map';
      case 'settings':
        return 'Settings';
      default:
        return routeName;
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.customTabBar}>
      <ThemedView elevated="low" style={{ backgroundColor: 'transparent' }}>
        <View style={styles.tabButtonContainer}>
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            // Skip routes that are not defined tabs
            if (!['explore', 'index', 'settings'].includes(route.name)) {
              return null;
            }

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
                style={styles.tabButton}
                onTouchEnd={onPress}
              >
                {getIcon(isFocused)}
                <Text style={[styles.tabLabel, { color: isFocused ? '#007AFF' : '#666' }]}>
                  {getTabLabel(route.name)}
                </Text>
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

  // Use native tabs on iOS, custom tabs on Android
  const useNativeTabs = Platform.OS === 'ios';

  if (useNativeTabs) {
    // iOS: Use native tabs
    return (
      <ThemeProvider>
        <NativeTabBar />
      </ThemeProvider>
    );
  }

  // Android: Use Tabs with custom JavaScript tab bar
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
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  tabButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 70,
    paddingVertical: 4,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  statusBarBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
});
