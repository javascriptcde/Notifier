import { useTheme } from '@/components/ThemeContext';
import React, { useRef, useState } from 'react';
import { Image, Linking, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const HOMEPAGE_URL = 'https://javascriptcde.pythonanywhere.com';

export default function ExploreScreen() {
  const [currentUrl, setCurrentUrl] = useState(HOMEPAGE_URL);
  const { theme } = useTheme();
  const webViewRef = useRef<WebView>(null);

  const handleNavigationStateChange = (navState: any) => {
    if (!navState.url.includes('javascriptcde.pythonanywhere.com')) {
      Linking.openURL(navState.url);
      setCurrentUrl(HOMEPAGE_URL);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1 }}>
      <View style={{ alignItems: 'center', paddingVertical: 10 }}>
        <Image
          source={require('@/assets/images/AppIcon.png')}
          style={{ width: 50, height: 50 }}
        />
      </View>
      <WebView
        ref={webViewRef}
        source={{ uri: currentUrl }}
        style={{ flex: 1 }}
        onNavigationStateChange={handleNavigationStateChange}
        injectedJavaScriptBeforeContentLoaded={`
document.querySelector('meta[name="viewport"]')?.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
document.documentElement.style.colorScheme = '${theme}';
`}
        onLoadEnd={() => {
          webViewRef.current?.injectJavaScript(`
            const mediaQuery = window.matchMedia('(prefers-color-scheme: ${theme})');
            mediaQuery.dispatchEvent(new Event('change'));
          `);
        }}
      />
    </SafeAreaView>
  );
}
