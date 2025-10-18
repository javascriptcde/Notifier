import { ThemeProvider } from '@/components/ThemeContext'; // adjust path
import { Slot } from 'expo-router';

export default function Layout() {
  return (
    <ThemeProvider>
      <Slot />
    </ThemeProvider>
  );
}
