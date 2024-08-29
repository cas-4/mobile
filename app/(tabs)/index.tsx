import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React, { useState, useEffect } from 'react';
import { API_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';  


export default function HomeScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');

  const storeToken = async (token: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem('token', token);
    } else {
      await AsyncStorage.setItem('token', token);
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Username and password are required.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/graphql`, {
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
              } 
            }`,
          variables: {
            input: {
              email: username,
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
        const { accessToken } = data.data.login;
        await storeToken(accessToken);
        setToken(accessToken);
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
    } else {
      await AsyncStorage.removeItem('token');
    }
  };

  useEffect(() => {
    const retrieveToken = async () => {
      const storedToken = Platform.OS === 'web' ? localStorage.getItem('token') : await AsyncStorage.getItem('token');
      setToken(storedToken || '');
    };

    retrieveToken();
  }, []);

  return (
    <ParallaxScrollView>
      {token ? (
        <ThemedView> 
          <Pressable onPress={handleLogout} style={styles.formButton}>
            <Text style={{ color: 'white', textAlign: 'center' }}>Logout</Text>
          </Pressable>
        </ThemedView>
      ) : (
        <>
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title">Welcome, mate!</ThemedText>
          </ThemedView>
          <ThemedView style={styles.formContainer}>
            <View>
              <ThemedText style={styles.text}>Username</ThemedText>
              <TextInput
                style={styles.formInput}
                onChangeText={setUsername}
                value={username}
                placeholder="Username"
              />
            </View>
            <View>
              <ThemedText style={styles.text}>Password</ThemedText>
              <TextInput
                style={styles.formInput}
                onChangeText={setPassword}
                value={password}
                placeholder="Password"
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
    color: '#333',
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
  }
});

