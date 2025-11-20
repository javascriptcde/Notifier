import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  // UI helpers used around the app for a glass/elevated look
  glass?: boolean;
  glassVariant?: 'tint' | 'regular' | 'transparent' | string;
  elevated?: 'low' | 'medium' | 'high' | string;
};

export function ThemedView({ style, lightColor, darkColor, glass, glassVariant, elevated, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  // Minimal visual adjustments to support "glass" and "elevated" props
  const extraStyle: any = {};
  if (glass) {
    // Make background slightly translucent to emulate a glass effect
    extraStyle.backgroundColor = backgroundColor ? `${backgroundColor}CC` : 'rgba(255,255,255,0.6)';
    extraStyle.borderWidth = 1;
    extraStyle.borderColor = 'rgba(0,0,0,0.06)';
  }

  if (elevated) {
    // Simple cross-platform shadow approximation
    if (elevated === 'low') {
      extraStyle.elevation = 1;
      extraStyle.shadowColor = '#000';
      extraStyle.shadowOpacity = 0.08;
      extraStyle.shadowOffset = { width: 0, height: 1 };
      extraStyle.shadowRadius = 2;
    } else if (elevated === 'medium') {
      extraStyle.elevation = 4;
      extraStyle.shadowColor = '#000';
      extraStyle.shadowOpacity = 0.12;
      extraStyle.shadowOffset = { width: 0, height: 2 };
      extraStyle.shadowRadius = 6;
    } else if (elevated === 'high') {
      extraStyle.elevation = 8;
      extraStyle.shadowColor = '#000';
      extraStyle.shadowOpacity = 0.18;
      extraStyle.shadowOffset = { width: 0, height: 4 };
      extraStyle.shadowRadius = 12;
    }
  }

  return <View style={[{ backgroundColor }, extraStyle, style]} {...otherProps} />;
}
