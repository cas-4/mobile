import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  View,
  RefreshControl,
} from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React, { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface NotificationData {
  id: string;
  seen: boolean;
  createdAt: string;
}

export default function NotificationsScreen() {
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async (currentToken: string, currentUserId: string) => {
    if (!currentToken || !currentUserId) return;

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/graphql`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `{ notifications { id, seen, createdAt } }`,
          }),
        }
      );

      const data = await response.json();

      if (data.errors) {
        Alert.alert('Error', 'Error fetching data');
      } else if (data.data.notifications) {
        setNotifications(data.data.notifications);
      }
    } catch (err) {
      console.error('Fetch notifications Error:', err);
    }
  };

  const checkAuth = async () => {
    const storedToken =
      Platform.OS === 'web'
        ? localStorage.getItem('token')
        : await AsyncStorage.getItem('token');
    const storedUserId =
      Platform.OS === 'web'
        ? localStorage.getItem('userId')
        : await AsyncStorage.getItem('userId');

    setToken(storedToken || '');
    setUserId(storedUserId || '');

    if (!storedToken || !storedUserId) {
      setNotifications([]);
      Alert.alert(
        'Login required',
        'You must log in to the system if you want to see notifications list',
        [
          {
            text: 'Ok',
            onPress: () => router.push('/'),
          },
        ]
      );
    }

    // Fetch notifications only after token and userId are set
    return { storedToken, storedUserId };
  };

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const { storedToken, storedUserId } = await checkAuth();
        if (storedToken && storedUserId) {
          fetchNotifications(storedToken, storedUserId);
        }
      };

      init();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications(token, userId).finally(() => setRefreshing(false));
  }, [token, userId]);

  const formatDate = (timestamp: string) => {
    const date = new Date(parseInt(timestamp) * 1000);
    return `${date.toDateString()} ${date.getHours()}:${(date.getMinutes() < 10 ? '0' : '') + date.getMinutes()}`;
  };

  const renderNotification = ({ item }: { item: NotificationData }) => (
    <ThemedView style={styles.notificationContainer}>
      <View
        style={[
          styles.notificationBox,
          {
            backgroundColor: item.seen
              ? '#fff'
              : '#ff7979',
          },
        ]}
      >
        <Link
          href={`/notifications/${item.id}`}
          style={{ width: '100%' }}
        >
          <View style={styles.dateRow}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color="black"
              style={styles.icon}
            />
            <ThemedText style={styles.dateText}>
              {formatDate(item.createdAt)}
            </ThemedText>
          </View>
        </Link>
      </View>
    </ThemedView>
  );

  return (
    <FlatList
      ListHeaderComponent={
        <ParallaxScrollView token={token} userId={userId}>
          <ThemedView style={styles.header}>
            <ThemedText type="subtitle">Notifications</ThemedText>
            <ThemedText type="default">
              Click on a notification to see about it.
            </ThemedText>
          </ThemedView>
        </ParallaxScrollView>
      }
      data={notifications}
      renderItem={renderNotification}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
  },
  notificationContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  notificationBox: {
    padding: 16,
    paddingBottom: 14,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#fff'
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  dateText: {
    color: '#000',
  },
  listContent: {
    paddingBottom: 32,
  },
});
