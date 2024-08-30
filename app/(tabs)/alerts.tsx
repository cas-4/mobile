import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React, { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker } from 'react-native-maps';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';

export default function AlertsScreen() {
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');

  const checkAuth = async () => {
    const storedToken = Platform.OS === 'web' ? localStorage.getItem('token') : await AsyncStorage.getItem('token');
    const storedUserId = Platform.OS === 'web' ? localStorage.getItem('userId') : await AsyncStorage.getItem('userId');
    
    setToken(storedToken || '');
    setUserId(storedUserId || '');

    if (!storedToken || !storedUserId) {
      Alert.alert('Login required', 'You must log in to the system if you want to see alerts list', [
        {
          text: 'Ok',
          onPress: () => router.push('/')
        }
      ]);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      checkAuth();
    }, [])
  );


  return (
    <ParallaxScrollView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
});
