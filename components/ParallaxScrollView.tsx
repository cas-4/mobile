import { useState, type PropsWithChildren, useCallback, useEffect, } from 'react';
import { StyleSheet, SafeAreaView, useColorScheme, View, Text, Platform } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';


type Props = PropsWithChildren<{
  token: string;
  userId: string;
  children: React.ReactNode;
}>;


export default function ParallaxScrollView({
  token,
  userId,
  children,
}: Props) {
  const theme = useColorScheme() ?? 'light';
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!token || !userId) return;

      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/graphql`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: `{ notifications(seen: false) { id, createdAt } }`,
            }),
          }
        );

        const data = await response.json();

        if (data.data.notifications) {
          setNotifications(data.data.notifications);
        }
      } catch (err) {
        console.error('Fetch notifications:', err);
      }
    };

    if (token && userId) {
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [token, userId]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={{
        backgroundColor: (theme === 'light' ? 'rgba(0, 0, 0, .5)' : 'rgba(100, 100, 100, .5)'),
      }}>
        <ThemedText type="title" style={{ color: 'white', paddingVertical: 10 }}>CAS4</ThemedText>
        { notifications.length > 0 ? (
          <SafeAreaView>
            <View style={styles.notificationCircle}>
              <Text style={styles.notificationCircleText}>{ notifications.length }</Text>
            </View>
            <Ionicons
              name="notifications-outline"
              size={32}
              style={styles.notification}
            />
          </SafeAreaView>
        ) : (
          <>
          </>
        )}
      </SafeAreaView>
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
  notification: {
    color: '#fff',
    position: 'absolute',
    bottom: 10,
    right: 30,
  },
  notificationCircle: {
    width: 20,
    height: 20,
    borderRadius: 100,
    backgroundColor: '#EA2027',
    position: 'absolute',
    bottom: 30,
    right: 30,
    zIndex: 1,
  },
  notificationCircleText: {
    color: 'white',
    textAlign: 'center',
    lineHeight: 20,
  }
});
