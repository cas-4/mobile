import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import React, { useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapView, { LatLng, Marker } from "react-native-maps";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as Location from "expo-location";
import Constants from "expo-constants";
import { Link } from "expo-router";
import * as TaskManager from "expo-task-manager";
import { Audio } from 'expo-av';

const LOCATION_TASK_NAME = "background-location-task";

/**
 * Task manager task definition for background location tracking.
 * This function processes incoming location data in the background.
 * If an error occurs, it logs the error to the console.
 * @param {Object} task - Task data including location and error.
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error(error);
    return;
  }
  if (data) {
    const { locations } = data;
    console.log("Received new locations:", locations);
    updateLocation(location.coords, location.coords.speed);
    // Process the locations here
  }
});

interface NotificationPositionData {
  movingActivity: string;
}

interface NotificationAlertData {
  text1: string;
  text2: string;
  text3: string;
}

interface NotificationData {
  id: string;
  createdAt: string;
  level: string;
  alert: NotificationAlertData;
  position: NotificationPositionData;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Displays an alert with an error message related to push notification registration.
 * @param {string} errorMessage - The error message to be shown in the alert.
 */
function handleRegistrationError(errorMessage: string) {
  Alert.alert("Error registering this device", errorMessage);
}

/**
 * Registers the device for push notifications. Requests permission and retrieves a push token.
 * Supports Android-specific notification channel setup.
 * @returns {Promise<string | undefined>} - The push token or undefined if registration fails.
 */
async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#007AFF",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      handleRegistrationError(
        "Permission not granted to get push token for push notification!",
      );
      return;
    }
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;
    if (!projectId) {
      handleRegistrationError("Project ID not found");
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
    handleRegistrationError("Must use physical device for push notifications");
  }
}

export default function HomeScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [userId, setUserId] = useState("");
  const [coordinates, setCoordinates] = useState({
    latitude: 0,
    longitude: 0,
  });
  const [region, setRegion] = useState({
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  });
  const [notification, setNotification] = useState<NotificationData | null>(
    null,
  );
  const mapRef = useRef(null);

  const [sound, setSound] = useState<Audio.Sound | null>(null);

  async function playSound(alert: string, level: string) {
    let levelDigit: string;
    switch (level) {
      case "ONE":
        levelDigit = "1";
        break;
      case "TWO":
        levelDigit = "2";
        break;
      case "THREE":
        levelDigit = "3";
        break;
      default: return;
    }
    const { sound } = await Audio.Sound.createAsync({
      uri: `${process.env.EXPO_PUBLIC_API_URL}/assets/sounds/alert-${alert}-text-${levelDigit}.mp3`,
    });
    setSound(sound);
    await sound.playAsync();
  }

  /**
   * Stores the token in AsyncStorage (or localStorage for web). This is used to persist user tokens.
   * @param {string} token - The token to be stored.
   */
  const storeToken = async (token: string) => {
    if (Platform.OS === "web") {
      localStorage.setItem("token", token);
    } else {
      await AsyncStorage.setItem("token", token);
    }
  };

  /**
   * Stores the user ID in AsyncStorage (or localStorage for web). Used for persisting user session data.
   * @param {string} userId - The user ID to be stored.
   */
  const storeUserId = async (userId: string) => {
    if (Platform.OS === "web") {
      localStorage.setItem("userId", userId);
    } else {
      await AsyncStorage.setItem("userId", userId);
    }
  };

  /**
   * Handles the login process by sending login credentials to the server,
   * storing the returned token and user ID, and registering for push notifications.
   */
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Email and password are required.");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/graphql`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
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
        },
      );

      const data = await response.json();

      if (data.errors) {
        const errorMessages = data.errors.map((error: any) => error.message);
        Alert.alert("Error", errorMessages.join("\n"));
      } else {
        const { accessToken, userId } = data.data.login;
        await storeToken(accessToken);
        await storeUserId(String(userId));
        setToken(accessToken);
        setUserId(String(userId));

        registerForPushNotificationsAsync()
          .then(async (notificationToken) => {
            if (!notificationToken) return;

            const regex = /ExponentPushToken\[(.*?)\]/;
            const match = notificationToken.match(regex);

            if (match && match[1]) {
              notificationToken = match[1];
            }
            await fetch(`${process.env.EXPO_PUBLIC_API_URL}/graphql`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
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
            });
          })
          .catch((error: any) => alert(`${error}`));
      }
    } catch (err) {
      console.error("Login Error:", err);
      Alert.alert("Error", "An error occurred during login.");
    }
  };

  /**
   * Handles the logout process by removing the stored token and user ID, clearing user session data.
   */
  const handleLogout = async () => {
    await removeToken();
  };

  /**
   * Removes the stored token and user ID from AsyncStorage (or localStorage for web).
   */
  const removeToken = async () => {
    if (Platform.OS === "web") {
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
    } else {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("userId");
    }
    setToken("");
    setUserId("");
  };

  /**
   * Formats a given timestamp into a readable date string with the format "Day Mon DD YYYY HH:mm".
   * @param {string} timestamp - The timestamp (in seconds) to be formatted.
   * @returns {string} - The formatted date string.
   */
  const formatDate = (timestamp: string): string => {
    const date = new Date(parseInt(timestamp) * 1000);
    return `${date.toDateString()} ${date.getHours()}:${(date.getMinutes() < 10 ? "0" : "") + date.getMinutes()}`;
  };

  /**
   * Updates the current user location both in the app state and by sending the data to the server.
   * @param {LatLng} coords - The latitude and longitude coordinates.
   * @param {number} speed - The speed of the device in m/s.
   */
  const updateLocation = async (coords: LatLng, speed: number) => {
    setCoordinates({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });

    if (region.longitude == 0 && region.latitude == 0) {
      setRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      });
    }


    if (!token || !userId) return;

    try {
      let movingActivity: string;
      if (speed == 0) {
        movingActivity = "STILL";
      } else if (speed < 1.5) {
        movingActivity = "WALKING";
      } else if (speed >= 1.5 && speed < 5) {
        movingActivity = "RUNNING";
      } else {
        movingActivity = "IN_VEHICLE";
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_ALERTD_URL}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            latitude: coords.latitude,
            longitude: coords.longitude,
            login: token,
            uid: userId,
            movingActivity,
          }),
        },
      );
      const data = await response.json();
      if (response.status != 200) {
        console.error(data)
      }
    } catch (err) {
      console.error("Error on updating position");
    }

  }

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!token || !userId) return;

      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/graphql`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: `{ notifications(seen: false) { id, createdAt, level, alert { id, text1 text2 text3 }, movingActivity } }`,
            }),
          },
        );

        const data = await response.json();

        if (data.data && data.data.notifications && data.data.notifications.length) {
          const n = data.data.notifications[0];
          setNotification(notification);
          if (n.position.movingActivity == "IN_VEHICLE") {
            playSound(n.alert.id, n.level);
          }
        } else {
          setNotification(null);
        }
      } catch (err) {
        console.error("Fetch notifications:", err);
      }
    };

    if (token && userId) {
      const intervalId = setInterval(fetchNotifications, 10000);

      return () => clearInterval(intervalId);
    } else {
      setNotification(null);
    }
  }, [token, userId]);

  useEffect(() => {
    const retrieveToken = async () => {
      const storedToken =
        Platform.OS === "web"
          ? localStorage.getItem("token")
          : await AsyncStorage.getItem("token");
      setToken(storedToken || "");
      const storedUserId =
        Platform.OS === "web"
          ? localStorage.getItem("userId")
          : await AsyncStorage.getItem("userId");
      setUserId(storedUserId || "");
    };

    retrieveToken();
  }, []);

  useEffect(() => {
    if (mapRef.current && region) {
      mapRef.current.animateToRegion(region, 1000);
    }
  }, [region]);

  useEffect(() => {
    const startBackgroundLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              distanceInterval: 10,
            },
            location => {
              updateLocation(location.coords, location.coords.speed);
            }
          )

          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.Balanced, // ~100 meters of precision
            distanceInterval: 10, // Send data only if they moved of >=10 meters
            deferredUpdatesInterval: 10000,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
              notificationTitle: "CAS4 Location Tracking",
              notificationBody:
                "Your location is being tracked in the background.",
              notificationColor: "#FFFFFF",
            },
          });
        } else {
          Alert.alert("Background location permission not granted");
        }
      } catch (error) {
        console.error("Error starting background location updates:", error);
      }
    };
    startBackgroundLocationTracking();
  }, []);

  useEffect(() => {
    return sound ? () => { console.log('Unloading Sound'); sound.unloadAsync(); } : undefined;
  }, [sound]);

  return (
    <ParallaxScrollView token={token} userId={userId}>
      {token && userId ? (
        <>
          {notification ? (
            <View>
              <Link
                href={`/notifications/${notification.id}`}
                style={{ width: "100%" }}
              >
                <View style={styles.notificationBox}>
                  <Text style={styles.notificationBoxText}>
                    Oh no, you are (or have been) in an alerted area in{" "}
                    {formatDate(notification.createdAt)}!
                  </Text>
                  <View style={styles.notificationDelimiter} />
                  <Text style={[styles.notificationBoxText, { fontStyle: 'italic' }]}>"
                    {notification.level == 'ONE' ?
                      notification.alert.text1 : notification.level == 'TWO' ?
                        notification.alert.text2 : notification.alert.text3}
                    "</Text>
                  <View style={styles.notificationDelimiter} />
                  <Text style={styles.notificationBoxText}>
                    Click this banner to know more!
                  </Text>
                </View>
              </Link>
            </View>
          ) : (
            <></>
          )
          }
          <ThemedView>
            <Pressable onPress={handleLogout} style={styles.formButton}>
              <Text style={{ color: "white", textAlign: "center" }}>
                Logout
              </Text>
            </Pressable>
          </ThemedView>
          <View>
            <MapView ref={mapRef} initialRegion={region} style={styles.map}>
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
                <Text style={{ color: "white", textAlign: "center" }}>
                  Login
                </Text>
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
    flexDirection: "row",
    alignItems: "center",
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
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#f9f9f9",
    marginBottom: 20,
  },
  buttonContainer: {
    marginTop: 20,
  },
  formButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    borderRadius: 8,
    color: "white",
  },
  map: {
    height: 400,
  },
  notificationBox: {
    padding: 40,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: "#EA2027",
  },
  notificationBoxText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
  notificationDelimiter: {
    marginVertical: 30,
    width: '100%',
    height: 1,
    backgroundColor: '#B2171B'
  }
});
