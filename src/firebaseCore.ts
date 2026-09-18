import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

const missingFirebaseKeys = Object.entries(firebaseConfig)
  .filter(([key, value]) => !['measurementId', 'databaseURL'].includes(key) && !value)
  .map(([key]) => `VITE_FIREBASE_${key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`);

if (missingFirebaseKeys.length) {
  throw new Error(`Missing Firebase environment variables: ${missingFirebaseKeys.join(', ')}`);
}

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const realtimeDb = import.meta.env.VITE_FIREBASE_DATABASE_URL ? getDatabase(app) : null;

export default app;
