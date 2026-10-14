import { Platform } from 'react-native';
import { Accelerometer as NativeAccelerometer } from 'expo-sensors';

const G = 9.80665;
let intervalMs = 50;

type Measurement = { x: number; y: number; z: number; timestamp: number };

// Browser / WebView accelerometer using DeviceMotionEvent.
// Emits values in g with a timestamp in seconds, like expo-sensors.
const webAccelerometer = {
  async isAvailableAsync() {
    return typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
  },
  async requestPermissionsAsync() {
    const DME = (globalThis as any).DeviceMotionEvent;
    if (DME && typeof DME.requestPermission === 'function') {
      try {
        const result = await DME.requestPermission();
        return { granted: result === 'granted', status: result, canAskAgain: true, expires: 'never' };
      } catch {
        return { granted: false, status: 'denied', canAskAgain: true, expires: 'never' };
      }
    }
    return { granted: true, status: 'granted', canAskAgain: true, expires: 'never' };
  },
  setUpdateInterval(ms: number) {
    intervalMs = ms;
  },
  addListener(listener: (m: Measurement) => void) {
    const g = globalThis as any;
    let last = -Infinity;
    const handler = (e: any) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      const t = e.timeStamp as number;
      if (t - last < intervalMs - 8) return;
      last = t;
      listener({ x: a.x / G, y: a.y / G, z: a.z / G, timestamp: t / 1000 });
    };
    g.addEventListener('devicemotion', handler);
    return { remove: () => g.removeEventListener('devicemotion', handler) };
  },
  removeAllListeners() {},
};

export const Accelerometer: typeof NativeAccelerometer =
  Platform.OS === 'web'
    ? (webAccelerometer as unknown as typeof NativeAccelerometer)
    : NativeAccelerometer;