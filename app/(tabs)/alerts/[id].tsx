import {
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import MapView, { Polygon, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme.web';
import { Colors } from '@/constants/Colors';

interface AlertData {
  id: string;
  userId: string;
  createdAt: string;
  area: string;
  areaLevel2: string;
  areaLevel3: string;
}

interface PolygonCoordinates {
  latitude: number;
  longitude: number;
}

export default function AlertIdScreen() {
  const [token, setToken] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [alert, setAlert] = useState<AlertData | null>(null);
  const [region, setRegion] = useState<Region>({
    latitude: 44.49738301084014,
    longitude: 11.356121722966094,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  });
  const [polygon, setPolygon] = useState<PolygonCoordinates[]>([]);
  const [level2Polygon, setLevel2Polygon] = useState<PolygonCoordinates[]>([]);
  const [level3Polygon, setLevel3Polygon] = useState<PolygonCoordinates[]>([]);
  const mapRef = useRef<MapView | null>(null);

  const checkAuth = useCallback(async () => {
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
  }, []);

  const fetchAlert = useCallback(async (id: string) => {
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
            query: `{ alerts(id: ${id}) { id, userId, createdAt, area, areaLevel2, areaLevel3 } }`,
          }),
        }
      );

      const data = await response.json();

      if (data.errors) {
        Alert.alert('Error', 'Error fetching data');
      } else if (data.data.alerts && data.data.alerts.length > 0) {
        const alertData = data.data.alerts[0];
        const coordinatesString = alertData.area.substring(9, alertData.area.length - 2);
        const coordinates = coordinatesString
          .split(',')
          .map((coord: string) => coord.trim().split(' '))
          .map((pair: string[]) => ({
            longitude: parseFloat(pair[0]),
            latitude: parseFloat(pair[1]),
          }));

        const level2CoordinatesString = alertData.areaLevel2.substring(9, alertData.areaLevel2.length - 2);
        const level2Coordinates = level2CoordinatesString
          .split(',')
          .map((coord: string) => coord.trim().split(' '))
          .map((pair: string[]) => ({
            longitude: parseFloat(pair[0]),
            latitude: parseFloat(pair[1]),
          }));

        const level3CoordinatesString = alertData.areaLevel3.substring(9, alertData.areaLevel3.length - 2);
        const level3Coordinates = level3CoordinatesString
          .split(',')
          .map((coord: string) => coord.trim().split(' '))
          .map((pair: string[]) => ({
            longitude: parseFloat(pair[0]),
            latitude: parseFloat(pair[1]),
          }));

        setAlert(alertData);
        setPolygon(coordinates);
        setLevel2Polygon(level2Coordinates);
        setLevel3Polygon(level3Coordinates);
        setRegion({
          latitude: coordinates[0]?.latitude || region.latitude,
          longitude: coordinates[0]?.longitude || region.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } else {
        Alert.alert('Error', 'No data found');
        router.push('/alerts/index');
      }
    } catch (err) {
      console.error('Fetch Map Data Error:', err);
    }
  }, [token, userId, region.latitude, region.longitude]);

  useFocusEffect(
    useCallback(() => {
      checkAuth();
    }, [checkAuth])
  );

  const { id } = useLocalSearchParams();

  useEffect(() => {
    if (typeof id === 'string') {
      fetchAlert(id);
    }
  }, [id, fetchAlert]);

  useEffect(() => {
    if (mapRef.current && region) {
      mapRef.current.animateToRegion(region, 1000);
    }
  }, [region]);

  const formatDate = (timestamp: string) => {
    const date = new Date(parseInt(timestamp, 10) * 1000);
    return `${date.toDateString()} ${date.getHours()}:${(date.getMinutes() < 10 ? '0' : '') + date.getMinutes()}`;
  };

  const theme = useColorScheme() ?? 'light';

  return (
    <ParallaxScrollView token={token} userId={userId}>
      {alert === null ? (
        <ThemedView>
          <ThemedText>Loading...</ThemedText>
        </ThemedView>
      ) : (
        <>
          <ThemedView style={styles.dateRow}>
            <Ionicons
              name="chevron-back-outline"
              size={18}
              color="#0a7ea4"
              style={styles.icon}
            />
            <Link href="/alerts">
              <ThemedText type="link">Alerts list</ThemedText>
            </Link>
          </ThemedView>
          <ThemedView>
            <MapView
              ref={mapRef}
              initialRegion={region}
              style={styles.map}
            >
              <Polygon
                coordinates={polygon}
                strokeColor="#c0392b"
                fillColor="rgba(192, 57, 43, 0.4)"
              />
              <Polygon
                coordinates={level2Polygon}
                strokeColor="#c0392b"
                fillColor="rgba(192, 57, 43, 0.4)"
              />
              <Polygon
                coordinates={level3Polygon}
                strokeColor="#c0392b"
                fillColor="rgba(192, 57, 43, 0.4)"
              />
            </MapView>
          </ThemedView>
          <ThemedView style={styles.dateRow}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color={theme === 'light' ? Colors.light.text : Colors.dark.text}
              style={styles.icon}
            />
            <ThemedText>{formatDate(alert.createdAt)}</ThemedText>
          </ThemedView>
        </>
      )}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 400,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
});
