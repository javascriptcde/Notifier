/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Design tokens for platform-specific guidelines
export const DesignTokens = {
  ios: {
    // Liquid Glass guidelines: soft semi-transparent surfaces with blur
    surfaceOpacity: 0.6,
    blurIntensity: 60,
    borderRadius: 12,
    // elevation emulated via shadow
    shadow: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
    },
    typography: {
      title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
      body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
      subtitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
      caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
    },
  },
  android: {
    // Material 3 expressive tokens: elevations, tonal surfaces
    elevation: {
      low: 2,
      medium: 6,
      high: 12,
    },
    cornerRadius: 12,
    // tonal surface overlay opacity for expressive surfaces
    overlayOpacity: 0.08,
    typography: {
      title: { fontSize: 26, lineHeight: 32, fontWeight: '700' },
      body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
      subtitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
      caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
    },
  },
};

export type DesignTokensType = typeof DesignTokens;
