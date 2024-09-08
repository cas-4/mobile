import { useState, type PropsWithChildren,  useEffect, } from 'react';
import { StyleSheet, SafeAreaView, useColorScheme, View, Text, Pressable } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';


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
      const intervalId = setInterval(fetchNotifications, 2000);

      return () => clearInterval(intervalId);
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
          <SafeAreaView>
            {token && userId ? (
              <Pressable onPress={() => router.push('/notifications')} style={styles.notificationWrapper}>
                {notifications.length > 0 && (
                  <View style={styles.notificationCircle}>
                    <Text style={styles.notificationCircleText}>{notifications.length}</Text>
                  </View>
                )}
                <Ionicons name="notifications-outline" size={32} color="white" />
              </Pressable>
            ) : (
              <>
              </>
            )}
          </SafeAreaView>
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
  notificationWrapper: {
    color: '#fff',
    position: 'absolute',
    bottom: 15,
    right: 30,
  },
  notificationCircle: {
    width: 20,
    height: 20,
    borderRadius: 100,
    backgroundColor: '#EA2027',
    position: 'absolute',
    top: -5,
    right: 0,
    zIndex: 1,
  },
  notificationCircleText: {
    color: 'white',
    textAlign: 'center',
    lineHeight: 20,
  }
});
