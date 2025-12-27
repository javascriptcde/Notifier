// Ensure react-native-reanimated is initialized as early as possible.
// Importing it first (even in a try/catch) prevents runtime crashes
// or blank screens in environments where the native module is present
// but not yet wired up (common in dev clients / Expo Go variants).
// Require react-native-reanimated and initialize it early. Fail loudly if it's missing
// so the app does not silently run without the animation engine (no fallback behavior).
const Reanimated = require('react-native-reanimated');
const R = Reanimated && (Reanimated.default ?? Reanimated);
if (!R) {
  throw new Error('react-native-reanimated is required — install and rebuild the native app.');
}
if (typeof R.setUpReanimated === 'function') {
  // optional helper for some versions
  R.setUpReanimated();
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
