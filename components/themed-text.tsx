import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  // primary prop historically called `type`; some places use `variant`.
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
  variant?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'body' | string;
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  variant,
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  // Support legacy/alternate `variant` prop. Map common values to our `type`.
  let resolvedType = type;
  if (variant) {
    if (variant === 'body') resolvedType = 'default';
    else if (variant === 'title' || variant === 'defaultSemiBold' || variant === 'subtitle' || variant === 'link') resolvedType = variant as any;
    else resolvedType = type;
  }

  return (
    <Text
      style={[
        { color },
        resolvedType === 'default' ? styles.default : undefined,
        resolvedType === 'title' ? styles.title : undefined,
        resolvedType === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        resolvedType === 'subtitle' ? styles.subtitle : undefined,
        resolvedType === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
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
