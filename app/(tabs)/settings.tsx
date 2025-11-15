import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Slider from '@react-native-community/slider';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import * as TaskManager from 'expo-task-manager';
// Import OAuth libraries at runtime so types don't cause build failures when
// packages aren't installed in all environments. We attempt a dynamic require
// and fall back gracefully if the package is missing (developer will need to
// install and configure client IDs for real authentication flows).
let AuthSession: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AuthSession = require('expo-auth-session');
} catch (e) {
  // Not fatal: developer may not have installed oauth packages locally
  // eslint-disable-next-line no-console
  console.debug('expo-auth-session not available');
}

let AppleAuthentication: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AppleAuthentication = require('expo-apple-authentication');
} catch (e) {
  // eslint-disable-next-line no-console
  console.debug('expo-apple-authentication not available');
}
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
import { saveUser as persistUser, getUser as loadPersistedUser, clearUser as clearPersistedUser, saveTokens } from '@/utils/auth';

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
    vibrationStrength: 2,
  });

  const [user, setUser] = useState<{ name?: string; email?: string; provider?: string } | null>(null);

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
        // Load persisted user from storage
        const persistedUser = await loadPersistedUser();
        if (persistedUser) {
          setUser(persistedUser);
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
        // Start background location updates so the background task can run
        try {
          const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
          if (!hasStarted) {
            await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
              accuracy: Location.Accuracy.Balanced,
              distanceInterval: 10,
              timeInterval: 10000,
              // Android requires a foreground service notification for background location
              foregroundService: {
                notificationTitle: 'Notifier: Locating',
                notificationBody: 'Monitoring nearby intersections',
                notificationColor: '#FF0000',
              },
              pausesUpdatesAutomatically: false,
            });
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
        } catch (stopErr) {
          console.error('Failed to stop background location updates:', stopErr);
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

  // Authentication handlers
  const signInWithGoogle = async () => {
    try {
      const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
      const clientId = process.env.GOOGLE_CLIENT_ID || '<GOOGLE_CLIENT_ID_HERE>';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=token&scope=profile%20email`;
      const result = await AuthSession.startAsync({ authUrl });
      if (result.type === 'success' && (result as any).params?.access_token) {
        const token = (result as any).params.access_token;
        const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const profile = await resp.json();
        const u = { name: profile.name, email: profile.email, provider: 'google' };
        setUser(u);
        await persistUser(u);
        if ((result as any).params) await saveTokens({ provider: 'google', tokens: (result as any).params });
      } else {
        Alert.alert('Google Sign-In cancelled');
      }
    } catch (e) {
      console.error('Google sign-in failed:', e);
      Alert.alert('Error', 'Google sign-in failed. Check console for details.');
    }
  };

  const signInWithMicrosoft = async () => {
    try {
      const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
      const clientId = process.env.MICROSOFT_CLIENT_ID || '<MICROSOFT_CLIENT_ID_HERE>';
      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&scope=openid%20profile%20email`;
      const result = await AuthSession.startAsync({ authUrl });
      if (result.type === 'success' && (result as any).params?.access_token) {
        const token = (result as any).params.access_token;
        const resp = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const profile = await resp.json();
        const u = { name: profile.displayName, email: profile.mail || profile.userPrincipalName, provider: 'microsoft' };
        setUser(u);
        await persistUser(u);
        if ((result as any).params) await saveTokens({ provider: 'microsoft', tokens: (result as any).params });
      } else {
        Alert.alert('Microsoft Sign-In cancelled');
      }
    } catch (e) {
      console.error('Microsoft sign-in failed:', e);
      Alert.alert('Error', 'Microsoft sign-in failed. Check console for details.');
    }
  };

  const signInWithApple = async () => {
    try {
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        Alert.alert('Apple Sign-in not available on this device');
        return;
      }
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const name = credential.fullName ? `${credential.fullName.givenName ?? ''} ${credential.fullName.familyName ?? ''}`.trim() : undefined;
      const u = { name, email: credential.email, provider: 'apple' };
      setUser(u);
      await persistUser(u);
    } catch (e: any) {
      if (e.code === 'ERR_CANCELED') return;
      console.error('Apple sign-in failed:', e);
      Alert.alert('Error', 'Apple sign-in failed. Check console for details.');
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Sign Out',
        onPress: async () => {
          await clearPersistedUser();
          setUser(null);
          Alert.alert('Signed Out', 'You have been signed out.');
        },
      },
    ]);
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Login/Account Section */}
        <ThemedView
          style={styles.accountSection}
          glass={Platform.OS === 'ios'}
          glassVariant="tint"
          elevated={Platform.OS === 'android' ? 'medium' : undefined}>
          {user ? (
            <ThemedView style={styles.userCard}>
              <ThemedView style={styles.avatarContainer}>
                <ThemedView style={styles.avatar}>
                  <ThemedText style={styles.avatarText}>{getInitials(user.name)}</ThemedText>
                </ThemedView>
                <ThemedView style={styles.userInfo}>
                  <ThemedText variant="title" style={styles.userName}>
                    {user.name || 'User'}
                  </ThemedText>
                  <ThemedText style={styles.userEmail}>{user.email}</ThemedText>
                  <ThemedText style={styles.userProvider}>
                    Signed in with {user.provider?.charAt(0).toUpperCase()}{user.provider?.slice(1)}
                  </ThemedText>
                </ThemedView>
              </ThemedView>
              <Button title="Sign Out" onPress={handleSignOut} />
            </ThemedView>
          ) : (
            <ThemedView style={styles.loginPrompt}>
              <ThemedText variant="title" style={styles.loginTitle}>Sign In to Save Settings</ThemedText>
              <ThemedText style={styles.loginDescription}>
                Sign in to sync your settings across devices.
              </ThemedText>
              <ThemedView style={styles.authButtonsContainer}>
                {AuthSession && (
                  <ThemedView style={styles.authButton}>
                    <Button title="Sign in with Google" onPress={signInWithGoogle} />
                  </ThemedView>
                )}
                {AuthSession && (
                  <ThemedView style={styles.authButton}>
                    <Button title="Sign in with Microsoft" onPress={signInWithMicrosoft} />
                  </ThemedView>
                )}
                {AppleAuthentication && Platform.OS === 'ios' && (
                  <ThemedView style={styles.authButton}>
                    <Button title="Sign in with Apple" onPress={signInWithApple} />
                  </ThemedView>
                )}
              </ThemedView>
            </ThemedView>
          )}
        </ThemedView>

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
