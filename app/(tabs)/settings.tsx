import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import Slider from '@react-native-community/slider';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
// speech helper removed (test voice prompt removed below)
import * as TaskManager from 'expo-task-manager';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSettings, updateSettings, type NotificationSettings } from '../../utils/settings';

const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Location task error:', error);
    return;
  }
  // Location updates handled elsewhere
});

export default function SettingsScreen() {

  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: false,
    accessibilityMode: false,
    notifyDistance: 20,
    vibrationEnabled: true,
    soundEnabled: true,
    voicePrompts: false,
    vibrationStrength: 2,
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const userSettings = await getSettings();
        setSettings(userSettings);

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.HIGH,
            sound: 'default',
          });
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
  }, []);

  const handleSettingChange = async (key: keyof NotificationSettings, value: any) => {
    try {
      if (key === 'enabled' && value) {
        // Check permissions when enabling notifications
        const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        if (fgStatus !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Location access is needed to detect nearby crosswalks.'
          );
          return;
        }

        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Background location access is needed for continuous monitoring.'
          );
          return;
        }
        // Ensure notification permission is granted on Android (Android 13+ requires it)
        if (Platform.OS === 'android') {
          try {
            const { status: notifStatus } = await Notifications.getPermissionsAsync();
            if (notifStatus !== 'granted') {
              const { status: newStatus } = await Notifications.requestPermissionsAsync();
              if (newStatus !== 'granted') {
                Alert.alert('Permission Required', 'Notifications permission is required to show background alerts.');
                return;
              }
            }
          } catch (permErr) {
            // If permissions API fails, continue — we'll still attempt to start location updates
            console.debug('Notification permission check failed:', permErr);
          }
        }

        // Start background location updates so the background task can run
        try {
          const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
            if (!hasStarted) {
              // Cast to any to allow platform-specific foregroundService props
              const startOpts: any = {
                accuracy: Location.Accuracy.Balanced,
                distanceInterval: 10,
                timeInterval: 10000,
                // Android requires a foreground service notification for background location
                foregroundService: {
                  notificationTitle: 'Notifier: Locating',
                  notificationBody: 'Monitoring nearby intersections',
                  notificationColor: '#FF0000',
                  // Use our explicit background notification channel so Android has a valid channel
                  notificationChannelId: 'background-location',
                },
                pausesUpdatesAutomatically: false,
              } as any;
              await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, startOpts);
            }
        } catch (startErr) {
          console.error('Failed to start background location updates:', startErr);
          Alert.alert('Error', 'Failed to start background location updates.');
        }
      }
      if (key === 'enabled' && !value) {
        // Stop background location updates when disabling
        try {
          const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
          if (hasStarted) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        } catch {
        }
      }
      const newSettings = await updateSettings({ [key]: value });
      setSettings(newSettings);

    } catch (error) {
      console.error('Failed to update setting:', error);
      Alert.alert('Error', 'Failed to update setting. Please try again.');
    }
  };

  // Test notification and test voice prompt removed per cleanup request

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Notification Settings Section */}
        <ThemedView 
          style={styles.section} 
          glass={Platform.OS === 'ios'}
          glassVariant="tint"
          elevated={Platform.OS === 'android' ? 'medium' : undefined}>
          <ThemedText variant="title">
            Notification Settings
          </ThemedText>
          
          <ThemedView style={styles.setting}>
            <ThemedText style={styles.label} variant="body">Enable Notifications</ThemedText>
            <Switch
              value={settings.enabled}
              onValueChange={(value) => handleSettingChange('enabled', value)}
            />
          </ThemedView>

          <ThemedView style={styles.setting}>
            <ThemedText style={styles.label} variant="body">Accessibility Mode</ThemedText>
            <Switch
              value={settings.accessibilityMode}
              onValueChange={(value) => handleSettingChange('accessibilityMode', value)}
            />
          </ThemedView>

          <ThemedView style={styles.setting}>
            <ThemedText style={styles.label} variant="body">Voice Prompts</ThemedText>
            <Switch
              value={settings.voicePrompts}
              onValueChange={(value) => handleSettingChange('voicePrompts', value)}
            />
          </ThemedView>

          <ThemedView style={styles.setting}>
            <ThemedText style={styles.label} variant="body">Vibration</ThemedText>
            <Switch
              value={settings.vibrationEnabled}
              onValueChange={(value) => handleSettingChange('vibrationEnabled', value)}
            />
          </ThemedView>

          <ThemedView style={styles.settingColumn}>
            <ThemedText style={styles.label} variant="body">Vibration Strength</ThemedText>
            <Slider
              style={{ width: 200 }}
              minimumValue={1}
              maximumValue={3}
              step={1}
              value={settings.vibrationStrength ?? 2}
              onValueChange={(value) => handleSettingChange('vibrationStrength', value)}
            />
          </ThemedView>

          <ThemedView style={styles.setting}>
            <ThemedText style={styles.label} variant="body">Sound</ThemedText>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(value) => handleSettingChange('soundEnabled', value)}
            />
          </ThemedView>

          <ThemedView style={styles.setting}>
            <ThemedText style={styles.label} variant="body">
              Notification Distance ({settings.notifyDistance}m)
            </ThemedText>
            <Slider
              style={styles.slider}
              minimumValue={10}
              maximumValue={50}
              step={5}
              value={settings.notifyDistance}
              onValueChange={(value) => handleSettingChange('notifyDistance', value)}
            />
          </ThemedView>

          {/* Test helpers removed */}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingHorizontal: 20 
  },
  scrollView: {
    flex: 1
  },
  accountSection: {
    marginTop: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: Platform.OS === 'android' ? 16 : 12,
  },
  userCard: {
    gap: 12,
  },
  avatarContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 12,
    opacity: 0.7,
  },
  userProvider: {
    fontSize: 11,
    opacity: 0.6,
    fontStyle: 'italic',
  },
  loginPrompt: {
    alignItems: 'center',
    gap: 12,
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loginDescription: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  authButtonsContainer: {
    width: '100%',
    gap: 8,
  },
  authButton: {
    marginVertical: 4,
  },
  section: {
    marginTop: 20,
    marginBottom: 30,
    padding: 20,
    borderRadius: Platform.OS === 'android' ? 16 : 12,
  },
  setting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12
  },
  settingColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginVertical: 12,
  },
  label: {
    flex: 1,
    marginRight: 10
  },
  slider: {
    flex: 1,
    height: 40
  },
  buttonContainer: {
    marginTop: 30,
    padding: 16,
    borderRadius: Platform.OS === 'android' ? 16 : 12,
  },
  buttonSpacer: {
    height: 10
  }
});
