import {
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React, { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';

export default function AlertIdScreen() {
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');

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
    }, [])
  );


  const { id } = useLocalSearchParams();


  return (
    <ParallaxScrollView>
      <ThemedView>
        <ThemedText>{ id }</ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
});
