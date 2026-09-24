# EcoRoute for Android and Web

The React interface is shared by the website, installable PWA and Capacitor Android application. There is no iPhone target.

## Android

- Application ID: `com.nithixs.ecoroute`
- Minimum Android: 7.0 / API 24; compile and target SDK: 36.
- Java 21, Android SDK 36 and Node 22+ are required.
- The JavaScript/CSS interface is bundled in the APK. There is no remote website wrapper or development server URL in the native configuration.
- Native API requests use HTTPS at `https://ecoroute-production.up.railway.app` through CapacitorHttp. Set `REACT_APP_API_ORIGIN` at build time only if deploying a different HTTPS backend. No secret belongs in this variable.
- Location is requested only after tapping **Use my location**. The app requests approximate foreground location; no background tracking is used. City search works when permission is denied.
- Export directions opens the Android share sheet. The Android back button returns from saved trips to the planner, then minimises the app.
- Saved trips stay on the device. Android cloud backup is disabled for this app.

```sh
npm --prefix client ci
npm --prefix client run android:sync
```

Then open `client/android` in Android Studio or run `npm --prefix client run android:open`. Let Gradle sync, choose an emulator/device, and run the app.

Command-line APK build (with `JAVA_HOME` pointing to Java 21 and `ANDROID_HOME` pointing to the SDK):

```sh
cd client/android
./gradlew assembleDebug
```

On Windows use `gradlew.bat assembleDebug`. Output: `client/android/app/build/outputs/apk/debug/app-debug.apk`. This is a debug-signed test APK, not a Google Play release. A store release requires your release signing key, store account, listing and device testing. Signing keys and `local.properties` are excluded from Git.

The **Android APK** GitHub Actions workflow builds a downloadable debug APK for changes on `main` and supports manual runs. Its artifact is named `EcoRoute-Android-debug`.

## Installable web app

The website includes an install button, PNG icons, a web manifest and a versioned service worker generated after each production build. Chrome/Edge can install it when their installability conditions are met. The app explains browser-menu installation when a direct install prompt is unavailable.

The offline cache contains only the application shell and static assets. It never caches API responses or third-party map tiles. Offline users can read saved journey summaries; new routes, maps, weather and the copilot require connectivity. An **Update app** button activates a waiting worker rather than interrupting an in-progress journey.

## Verification

```sh
npm --prefix client test -- --watchAll=false
npm --prefix server test
npm --prefix client run build
```

Before store release, verify on real Android devices: location allow/deny, approximate location, network loss/reconnection, map gestures, back-button behaviour, sharing, rotation, small-screen layout and saved trips after restart. Automated adapter tests do not replace these device checks.

## References

- https://capacitorjs.com/docs/getting-started/environment-setup
- https://capacitorjs.com/docs/apis/geolocation
- https://capacitorjs.com/docs/apis/http
- https://capacitorjs.com/docs/apis/share
