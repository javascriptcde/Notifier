import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

// expo-glass-effect may not be available in some environments. Try to
// require GlassView at runtime and fall back to a regular View when it's
// not present to avoid "cannot read property 'default' of undefined".
let GlassView: any = null;
try {
  const mod = require('expo-glass-effect');
  GlassView = mod && (mod.GlassView || mod.default || mod);
} catch (e) {
  GlassView = null;
}

import { DesignTokens } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  // iOS liquid glass
  glass?: boolean;
  // control the glass style when using GlassView: 'regular' | 'clear' | 'tint'
  glassVariant?: 'regular' | 'clear' | 'tint';
  // Android Material elevation: 'low' | 'medium' | 'high'
  elevated?: 'low' | 'medium' | 'high';
};

export function ThemedView({ style, lightColor, darkColor, glass, elevated, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  // iOS: use GlassView for Liquid Glass surfaces
  if (glass && Platform.OS === 'ios' && GlassView) {
    const iosTokens = DesignTokens.ios;
    const variant = otherProps && (otherProps as any).glassVariant ? (otherProps as any).glassVariant : 'regular';

    return (
      <GlassView
        style={[styles.glass, { borderRadius: iosTokens.borderRadius }, style]}
        glassEffectStyle={variant}
        {...otherProps}
      />
    );
  }

  // Android: apply elevation tokens
  const androidStyle: any = {};
  if (elevated && Platform.OS === 'android') {
    const e = DesignTokens.android.elevation[elevated];
    androidStyle.elevation = e;
  }

  return <View style={[{ backgroundColor }, androidStyle, style]} {...otherProps} />;
}

const styles = StyleSheet.create({
  glass: {
    overflow: 'hidden',
  },
});
