import type { PropsWithChildren, ReactElement } from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollViewOffset,
} from 'react-native-reanimated';

import { ThemedView } from '@/components/ThemedView';

const HEADER_HEIGHT = 250;

type Props = PropsWithChildren<{
}>;

export default function ParallaxScrollView({
  children,
}: Props) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  return (
    <ThemedView style={styles.container}>
      <Animated.ScrollView ref={scrollRef} scrollEventThrottle={16}>
        <View style={styles.nav}>
          <Text style={styles.navText}>CAS4</Text>
        </View>
        <ThemedView style={styles.content}>{children}</ThemedView>
      </Animated.ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  nav: {
    backgroundColor: '#fcfcfc',
    paddingTop: 50,
    padding: 10,
  },
  navText: {
    textAlign: 'center',
    fontFamily: 'SpaceMono',
    fontSize: 24,
    fontWeight: 'bold'
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
