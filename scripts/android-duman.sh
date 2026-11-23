#!/bin/sh
# APK'yı gerçek Android emülatörüne kurar, açar ve ekranın geldiğini doğrular.
set -eu
APP=com.yuzmekulup.sistem
mkdir -p duman
adb install -r -g android/app/build/outputs/apk/debug/app-debug.apk
adb shell dumpsys package "$APP" | grep -q 'android.permission.RECORD_AUDIO: granted=true'
adb shell am start -W -n "$APP/.MainActivity"
found=0
for _ in $(seq 1 30); do
  sleep 3
  adb shell uiautomator dump /sdcard/ekran.xml >/dev/null 2>&1 || continue
  adb pull /sdcard/ekran.xml duman/ekran.xml >/dev/null 2>&1 || continue
  if grep -Eq 'Giriş|Yüzme|Kulüp' duman/ekran.xml; then found=1; break; fi
done
adb exec-out screencap -p > duman/android.png
adb logcat -d -s chromium:E Capacitor:E AndroidRuntime:E > duman/log.txt || true
adb shell pidof "$APP"
if grep -q 'FATAL EXCEPTION' duman/log.txt; then echo 'Uygulama kapandı'; exit 1; fi
[ "$found" = 1 ] || { echo 'Ekran gelmedi'; exit 1; }
echo 'Android uygulaması açıldı, mikrofon izni var.'
