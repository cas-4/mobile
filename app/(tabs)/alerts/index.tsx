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

interface AlertData {
  id: string;
  userId: string;
  createdAt: string;
  area: string;
  level: string;
}

export default function AlertsScreen() {
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlerts = async () => {
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
            query: `{ alerts { id, userId, createdAt, area, level } }`,
          }),
        }
      );

      const data = await response.json();

      if (data.errors) {
        Alert.alert('Error', 'Error fetching data');
      } else if (data.data.alerts) {
        console.log(`Found ${data.data.alerts.length} alerts`);
        setAlerts(data.data.alerts);
      }
    } catch (err) {
      console.error('Fetch Map Data Error:', err);
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
      Alert.alert(
        'Login required',
        'You must log in to the system if you want to see alerts list',
        [
          {
            text: 'Ok',
            onPress: () => router.push('/'),
          },
        ]
      );
    }
  };

  useFocusEffect(
    useCallback(() => {
      checkAuth();
      fetchAlerts();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAlerts().finally(() => setRefreshing(false));
  }, []);

  const formatDate = (timestamp: string) => {
    const date = new Date(parseInt(timestamp) * 1000);
    return `${date.toDateString()} ${date.getHours()}:${(date.getMinutes() < 10 ? '0' : '') + date.getMinutes()}`;
  };

  const renderAlert = ({ item }: { item: AlertData }) => (
    <ThemedView style={styles.alertContainer}>
      <View
        style={[
          styles.alertBox,
          {
            backgroundColor: item.level === 'ONE'
              ? '#27ae60'
              : item.level === 'TWO'
              ? '#e67e22'
              : '#c0392b',
          },
        ]}
      >
        <Link
          href={`/alerts/${item.id}`}
          style={{ width: '100%' }}
        >
          <View style={styles.dateRow}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color="white"
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
        <ParallaxScrollView>
          <ThemedView style={styles.header}>
            <ThemedText type="subtitle">Alerts</ThemedText>
            <ThemedText type="default">
              Click on an alert to show more info about the area.
            </ThemedText>
          </ThemedView>
        </ParallaxScrollView>
      }
      data={alerts}
      renderItem={renderAlert}
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
  alertContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  alertBox: {
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  dateText: {
    color: '#fff',
  },
  listContent: {
    paddingBottom: 32,
  },
});