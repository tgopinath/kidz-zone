#!/bin/zsh
# KidZ Zone's Android shell needs the native text-to-speech plugin (Android's WebView has no speechSynthesis; the
# web app's src/shared/speech.ts uses @capacitor-community/text-to-speech inside the app). build-remote.sh resets
# package.json, so after running it (or instead of it) run this to add the plugin, rebuild and upload.
set -e; cd ${0:A:h}
npm i -q @capacitor-community/text-to-speech@8.0.2 @capacitor/app@^8.1.2
npx cap sync android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ANDROID_HOME="$HOME/Library/Android/sdk"
(cd android && ./gradlew --no-daemon --init-script ../../maven-mirror.gradle assembleDebug)
cp android/app/build/outputs/apk/debug/app-debug.apk kidz-zone.apk
[ -n "$NO_UPLOAD" ] && { echo "BUILT $PWD/kidz-zone.apk (not uploaded)"; exit 0; }
G=~/.local/bin/gh
$G release view v1.0.0 -R tgopinath/kidz-zone >/dev/null 2>&1 || $G release create v1.0.0 -R tgopinath/kidz-zone --title "KidZ Zone 1.0.0 for Android" --notes "Android app that opens the live KidZ Zone web app (eight worlds for children aged 4 to 12), so it is always up to date, with Material 3 bars and the phone's own text-to-speech for reading aloud. Needs an internet connection. Android 7.0 or later: open the APK on your phone and allow installs from this source." --latest
$G release upload v1.0.0 kidz-zone.apk -R tgopinath/kidz-zone --clobber
echo "BUILT https://github.com/tgopinath/kidz-zone/releases/latest/download/kidz-zone.apk"
