import { ThemedText } from '@/components/themed-text';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ExploreScreen() {
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ThemedText style={{ fontSize: 48, fontWeight: 'bold' }}>COMING SOON!</ThemedText>
    </SafeAreaView>
  );
}
