import type { PropsWithChildren, } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from './ThemedText';

type Props = PropsWithChildren<{}>;


export default function ParallaxScrollView({
  children,
}: Props) {
  const theme = useColorScheme() ?? 'light';

  return (
    <ThemedView style={styles.container}>
      <View style={{
        paddingTop: 50,
        padding: 10, 
        backgroundColor: (theme === 'light' ? 'rgba(0, 0, 0, .5)' : 'rgba(100, 100, 100, .5)'),
      }}>
        <ThemedText type="title" style={{ color: 'white' }}>CAS4</ThemedText>
      </View>
      <ThemedView style={styles.content}>{children}</ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  nav: {
    paddingTop: 50,
    padding: 10,
  },
  header: {
    height: 250,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    padding: 32,
    gap: 16,
    overflow: 'hidden',
  },
});
