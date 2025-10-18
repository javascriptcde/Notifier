import { Platform, StyleSheet, Text, type TextProps, useColorScheme } from 'react-native';

import { DesignTokens } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  variant?: 'body' | 'title' | 'subtitle' | 'caption' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  variant = 'body',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const platform = useColorScheme() === 'dark' ? 'dark' : 'light';

  // Pick tokens from DesignTokens depending on platform (prefer iOS tokens on iOS, Android tokens on Android)
  const tokens = DesignTokens[Platform.OS === 'ios' ? 'ios' : 'android'];
  const tv = tokens.typography[variant === 'link' ? 'body' : variant];

  const textStyle = {
    fontSize: tv.fontSize,
    lineHeight: tv.lineHeight,
    fontWeight: tv.fontWeight as any,
    color,
  };

  return <Text style={[textStyle, style]} {...rest} />;
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
  },
});
