import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = 'auth_user';
const TOKENS_KEY = 'auth_tokens';

export type PersistedUser = {
  name?: string;
  email?: string;
  provider?: string;
};

export async function saveUser(user: PersistedUser | null) {
  try {
    if (!user) {
      await AsyncStorage.removeItem(USER_KEY);
      return;
    }
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to save user', e);
  }
}

export async function getUser(): Promise<PersistedUser | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to load user', e);
    return null;
  }
}

export async function clearUser() {
  try {
    await AsyncStorage.removeItem(USER_KEY);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to clear user', e);
  }
}

// Token helpers (store tokens locally; for production prefer secure server storage)
export async function saveTokens(tokens: Record<string, any>) {
  try {
    await AsyncStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to save tokens', e);
  }
}

export async function getTokens(): Promise<Record<string, any> | null> {
  try {
    const raw = await AsyncStorage.getItem(TOKENS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to load tokens', e);
    return null;
  }
}

export async function clearTokens() {
  try {
    await AsyncStorage.removeItem(TOKENS_KEY);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to clear tokens', e);
  }
}

export default {
  saveUser,
  getUser,
  clearUser,
  saveTokens,
  getTokens,
  clearTokens,
};
