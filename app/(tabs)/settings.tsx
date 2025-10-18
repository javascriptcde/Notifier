import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Slider from '@react-native-community/slider';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import * as TaskManager from 'expo-task-manager';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: false,
    accessibilityMode: false,
    notifyDistance: 20,
    vibrationEnabled: true,
    soundEnabled: true,
    voicePrompts: false,
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
      }

      const newSettings = await updateSettings({ [key]: value });
      setSettings(newSettings);

    } catch (error) {
      console.error('Failed to update setting:', error);
      Alert.alert('Error', 'Failed to update setting. Please try again.');
    }
  };

  const sendTestNotification = async () => {
    if (!settings.enabled) {
      Alert.alert('Notifications Disabled', 'Enable notifications first.');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 Test Notification',
        body: 'This is a test notification from your Settings screen!',
        sound: true,
      },
      trigger: null,
    });
  };

  const sendTestVoicePrompt = () => {
    if (!settings.voicePrompts) {
      Alert.alert('Voice Prompts Disabled', 'Enable voice prompts first.');
      return;
    }
    Speech.speak('This is a test voice prompt from your Settings screen.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
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

          <ThemedView 
            style={styles.buttonContainer} 
            elevated="low"
            glass={Platform.OS === 'ios'}
            glassVariant="regular">
            <Button title="Send Test Notification" onPress={sendTestNotification} />
            <ThemedView style={styles.buttonSpacer} />
            <Button title="Test Voice Prompt" onPress={sendTestVoicePrompt} />
          </ThemedView>
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