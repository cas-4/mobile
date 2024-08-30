import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React, { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker } from 'react-native-maps';

export default function HomeScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [coordinates, setCoordinates] = useState({ latitude: 44.49738301084014, longitude: 11.356121722966094 });
  const [region, setRegion] = useState({ latitude: 44.49738301084014, longitude: 11.356121722966094, latitudeDelta: 0.03, longitudeDelta: 0.03 });
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
      }
    } catch (err) {
      console.error('Login Error:', err);
      Alert.alert('Error', 'An error occurred during login.');
    }
  };

  const handleLogout = async () => {
    await removeToken();
    setToken('');
  };

  const removeToken = async () => {
    if (Platform.OS === 'web') {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
    } else {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('userId');
    }
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
      const intervalId = setInterval(fetchMapData, 10000); // Fetch map data every 10 seconds

      return () => clearInterval(intervalId);
    }
  }, [token, userId]);

  useEffect(() => {
    if (mapRef.current && region) {
      mapRef.current.animateToRegion(region, 1000); // Smoothly animate to the new region
    }
  }, [region]);

  return (
    <ParallaxScrollView>
      {token && userId ? (
        <>
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
              <Marker coordinate={coordinates} title="Start Point" />
            </MapView>
          </View>
        </>
      ) : (
        <>
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title">Welcome, mate!</ThemedText>
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
  }
});
