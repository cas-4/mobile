import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React, { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker } from 'react-native-maps';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Link } from 'expo-router';

interface NotificationData {
  id: string;
  createdAt: string;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});


function handleRegistrationError(errorMessage: string) {
  Alert.alert("Error registering this device", errorMessage);
}

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007AFF',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      handleRegistrationError('Permission not granted to get push token for push notification!');
      return;
    }
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) {
      handleRegistrationError('Project ID not found');
    }
    try {
      const pushTokenString = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      return pushTokenString;
    } catch (e: unknown) {
      handleRegistrationError(`${e}`);
    }
  } else {
    handleRegistrationError('Must use physical device for push notifications');
  }
}

export default function HomeScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [coordinates, setCoordinates] = useState({ latitude: 44.49738301084014, longitude: 11.356121722966094 });
  const [region, setRegion] = useState({ latitude: 44.49738301084014, longitude: 11.356121722966094, latitudeDelta: 0.03, longitudeDelta: 0.03 });
  const [notification, setNotification] = useState<NotificationData|null>(null);
  const mapRef = useRef(null);

  const storeToken = async (token: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem('token', token);
    } else {
      await AsyncStorage.setItem('token', token);
    }
  };

  const storeUserId = async (userId: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem('userId', userId);
    } else {
      await AsyncStorage.setItem('userId', userId);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email and password are required.');
      return;
    }

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation Login($input: LoginCredentials!) { 
              login(input: $input) { 
                accessToken 
                tokenType 
                userId
              } 
            }`,
          variables: {
            input: {
              email: email,
              password,
            },
          },
        }),
      });

      const data = await response.json();

      if (data.errors) {
        const errorMessages = data.errors.map((error: any) => error.message);
        Alert.alert('Error', errorMessages.join('\n'));
      } else {
        const { accessToken, userId } = data.data.login;
        await storeToken(accessToken);
        await storeUserId(String(userId));
        setToken(accessToken);
        setUserId(String(userId));

        registerForPushNotificationsAsync()
          .then(async notificationToken => {
            if (!notificationToken) return;

            const regex = /ExponentPushToken\[(.*?)\]/;
            const match = notificationToken.match(regex);

            if (match && match[1]) {
                notificationToken = match[1];
            }
              await fetch(`${process.env.EXPO_PUBLIC_API_URL}/graphql`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  query: `
                    mutation RegisterDevice($input: RegisterNotificationToken!) {
                      registerDevice(input: $input) { id name email }
                    }
                  `,
                  variables: {
                    input: {
                      token: notificationToken,
                    },
                  },
                }),
              })
          })
          .catch((error: any) => alert(`${error}`));
      }
    } catch (err) {
      console.error('Login Error:', err);
      Alert.alert('Error', 'An error occurred during login.');
    }
  };

  const handleLogout = async () => {
    await removeToken();
  };

  const removeToken = async () => {
    if (Platform.OS === 'web') {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
    } else {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('userId');
    }
    setToken('');
    setUserId('');
  };

  const fetchMapData = async () => {
    if (!token || !userId) return;

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/graphql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `{ positions(userId: ${userId}) { id, userId, createdAt, latitude, longitude } }`,
        }),
      });

      const data = await response.json();

      if (data.data.positions && data.data.positions.length > 0) {
        const position = data.data.positions[0];
        setCoordinates({ latitude: position.latitude, longitude: position.longitude });
        setRegion({
          latitude: position.latitude,
          longitude: position.longitude,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        });
      }
    } catch (err) {
      console.error('Fetch Map Data Error:', err);
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(parseInt(timestamp) * 1000);
    return `${date.toDateString()} ${date.getHours()}:${(date.getMinutes() < 10 ? '0' : '') + date.getMinutes()}`;
  };

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
          setNotification(data.data.notifications[0]);
        }
      } catch (err) {
        console.error('Fetch notifications:', err);
      }
    };

    if (token && userId) {
      const intervalId = setInterval(fetchNotifications, 2000);

      return () => clearInterval(intervalId);
    } else {
      setNotification('');
    }
  }, [token, userId]);


  useEffect(() => {
    const retrieveToken = async () => {
      const storedToken = Platform.OS === 'web' ? localStorage.getItem('token') : await AsyncStorage.getItem('token');
      setToken(storedToken || '');
      const storedUserId = Platform.OS === 'web' ? localStorage.getItem('userId') : await AsyncStorage.getItem('userId');
      setUserId(storedUserId || '');
    };

    retrieveToken();
  }, []);

  useEffect(() => {
    if (token && userId) {
      const intervalId = setInterval(fetchMapData, 100000);

      return () => clearInterval(intervalId);
    }
  }, [token, userId]);

  useEffect(() => {
    if (mapRef.current && region) {
      mapRef.current.animateToRegion(region, 1000);
    }
  }, [region]);

  return (
    <ParallaxScrollView token={token} userId={userId}>
      {token && userId ? (
        <>
          {notification ? (
            <View>
              <Link
                href={`/notifications/${notification.id}`}
                style={{ width: '100%' }}
              >
              <View style={styles.notificationBox}>
                <Text style={styles.notificationBoxText}>Oh no, you are (or have been) in an alerted area in {formatDate(notification.createdAt)}!</Text>
                <Text style={styles.notificationBoxText}>Click this banner to know more!</Text>
              </View>
              </Link>
            </View>
          ) : (
            <>
            </>
          )}
          <ThemedView>
            <Pressable onPress={handleLogout} style={styles.formButton}>
              <Text style={{ color: 'white', textAlign: 'center' }}>Logout</Text>
            </Pressable>
          </ThemedView>
          <View>
            <MapView
              ref={mapRef}
              initialRegion={region}
              style={styles.map}
            >
              <Marker coordinate={coordinates} title="Me" />
            </MapView>
          </View>
        </>
      ) : (
        <>
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="subtitle">Welcome, mate!</ThemedText>
          </ThemedView>
          <ThemedView style={styles.formContainer}>
            <View>
              <ThemedText style={styles.text}>Email</ThemedText>
              <TextInput
                style={styles.formInput}
                onChangeText={setEmail}
                value={email}
              />
            </View>
            <View>
              <ThemedText style={styles.text}>Password</ThemedText>
              <TextInput
                style={styles.formInput}
                onChangeText={setPassword}
                value={password}
                secureTextEntry
              />
            </View>
            <View style={styles.buttonContainer}>
              <Pressable onPress={handleLogin} style={styles.formButton}>
                <Text style={{ color: 'white', textAlign: 'center' }}>Login</Text>
              </Pressable>
            </View>
          </ThemedView>
        </>
      )}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  text: {
    marginBottom: 8,
  },
  formContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  formInput: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f9f9f9',
    marginBottom: 20,
  },
  buttonContainer: {
    marginTop: 20,
  },
  formButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    borderRadius: 8,
    color: 'white',
  },
  map: {
    height: 400,
  },
  notificationBox: {
    padding: 40,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#EA2027',
  },
  notificationBoxText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold'
  }
});
