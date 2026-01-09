// utils/settings.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'notification_settings';

export interface NotificationSettings {
  enabled: boolean;
  accessibilityMode: boolean;
  notifyDistance: number;
  vibrationEnabled: boolean;
  soundEnabled: boolean;
  voicePrompts: boolean;
  vibrationStrength?: number;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  accessibilityMode: false,
  notifyDistance: 20,
  vibrationEnabled: true,
  soundEnabled: true,
  voicePrompts: true,
  vibrationStrength: 2,
};

export async function getSettings(): Promise<NotificationSettings> {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_KEY);
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function updateSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
  try {
    const current = await getSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Failed to save settings:', error);
    return DEFAULT_SETTINGS;
  }
}

// Convenience helper used by background tasks to check the voice prompt setting
export async function getVoicePromptEnabled(): Promise<boolean> {
  const settings = await getSettings();
  return !!settings.voicePrompts;
}