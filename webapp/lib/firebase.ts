import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfigBase = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const measurementId = process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID;

function assertConfig(): void {
  const missing = Object.entries(firebaseConfigBase)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase env: ${missing.join(', ')}. Set EXPO_PUBLIC_FIREBASE_* variables.`,
    );
  }
}

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }
  assertConfig();
  const options = {
    ...firebaseConfigBase,
    ...(measurementId ? { measurementId } : {}),
  } as Required<typeof firebaseConfigBase> & { measurementId?: string };
  return initializeApp(options);
}

function getOrCreateAuth(firebaseApp: FirebaseApp): Auth {
  if (Platform.OS === 'web') {
    return getAuth(firebaseApp);
  }
  try {
    // Firebase 11 types omit getReactNativePersistence; it exists in the RN bundle at runtime
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const { getReactNativePersistence } = require('firebase/auth') as {
      getReactNativePersistence: (s: typeof ReactNativeAsyncStorage) => Persistence;
    };
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch {
    return getAuth(firebaseApp);
  }
}

app = getFirebaseApp();
auth = getOrCreateAuth(app);
db = getFirestore(app);
storage = getStorage(app);

export { app, auth, db, storage };
