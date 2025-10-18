import { GlassView } from 'expo-glass-effect';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

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
  if (glass && Platform.OS === 'ios') {
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
