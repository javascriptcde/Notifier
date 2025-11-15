// Ensure react-native-reanimated is initialized as early as possible.
// Importing it first (even in a try/catch) prevents runtime crashes
// or blank screens in environments where the native module is present
// but not yet wired up (common in dev clients / Expo Go variants).
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Reanimated = require('react-native-reanimated');
  // Some installs export as default
  const R = Reanimated && (Reanimated.default ?? Reanimated);
  if (R && typeof R.setUpReanimated === 'function') {
    try {
      // optional helper, won't exist in many versions
      R.setUpReanimated();
    } catch (e) {
      // ignore initialization errors
      // eslint-disable-next-line no-console
      console.debug('Reanimated early init helper failed:', (e as any)?.message ?? e);
    }
  }
} catch (e) {
  // Not fatal — continue without reanimated
  // eslint-disable-next-line no-console
  console.debug('react-native-reanimated not available at app entry:', (e as any)?.message ?? e);
}

import { ThemeProvider } from '@/components/ThemeContext'; // adjust path
import { Slot } from 'expo-router';

export default function Layout() {
  return (
    <ThemeProvider>
      <Slot />
    </ThemeProvider>
  );
}
