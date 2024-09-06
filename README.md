# CAS4 mobile app

This repo refers to a React Native mobile app used for a project for the
[Context Aware System](https://www.unibo.it/en/study/phd-professional-masters-specialisation-schools-and-other-programmes/course-unit-catalogue/course-unit/2023/479036)
class at the [University of Bologna](https://unibo.it).

---

## Development

You need:
- Node `v21.7.1`. We strongly suggest [`fnm`](https://github.com/Schniz/fnm) or
  [`nvm`](https://github.com/nvm-sh/nvm) for Node versions management.
- PnpM or NPM (better the first one).

After that you need to edit the `.env` file and set up:

- `EXPO_PUBLIC_API_URL`: refers to the backend URL.

And start the Expo app.

```
pnpm run start
```

## Deployment

This work is made by Expo but you need an extra setup if you want that
everything go up well.

First of all you log in

```
eas login
```

Now you set up [Push Notifications](https://docs.expo.dev/push-notifications/push-notifications-setup/).

### Configuration and Build for Android

1. Generate a release key

```
keytool -genkey -v -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -storepass KEYSTORE_PASSWORD -keypass KEY_PASSWORD -alias cas4 -keystore release.keystore -dname "CN=John Doe, OU=Unknown, O=Unknown, L=Bologna, ST=Italy, C=IT"
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
