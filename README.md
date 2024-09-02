# Configuration

```
# .env
EXPO_PUBLIC_API_URL=
```

# Set up for android

1. Generate a release key

```
keytool -genkey -v -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -storepass KEYSTORE_PASSWORD -keypass KEY_PASSWORD -alias cas4 -keystore release.keystore -dname "CN=Santo Cariotti, OU=Unknown, O=Unknown, L=Bologna, ST=Italy, C=IT"
```

2. Build Android app

```
eas build --platform android
```

3. Download the artifact from Expo page

4. Create APKS from the AAB file

```
java -jar bundletool-all-1.17.1.jar build-apks --bundle=application-XXXX.aab --output=cas.apks --mode=universal --ks android/keystores/release.keystore --ks-key-alias=cas4
```
