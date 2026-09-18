import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, ReCaptchaV3Provider } from 'firebase/app-check';
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

// App Check must be registered before any database/auth/storage service is used.
// Use the provider and PUBLIC site key registered for this exact Firebase web app.
const appCheckSiteKey = (import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY || '').trim();
const appCheckProvider = (import.meta.env.VITE_FIREBASE_APPCHECK_PROVIDER || '').trim();
if (typeof window !== 'undefined') {
  if (!appCheckSiteKey) {
    console.warn('Firebase App Check is not configured. If enforcement is enabled, set VITE_FIREBASE_APPCHECK_SITE_KEY and VITE_FIREBASE_APPCHECK_PROVIDER in Vercel, then redeploy.');
  } else if (!['recaptcha-v3', 'recaptcha-enterprise'].includes(appCheckProvider)) {
    console.error('Set VITE_FIREBASE_APPCHECK_PROVIDER to recaptcha-v3 or recaptcha-enterprise to match Firebase App Check registration.');
  } else {
    try {
      initializeAppCheck(app, {
        provider: appCheckProvider === 'recaptcha-enterprise'
          ? new ReCaptchaEnterpriseProvider(appCheckSiteKey)
          : new ReCaptchaV3Provider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (error) {
      console.error('Firebase App Check could not initialize. Check the registered provider and public site key.', error);
    }
  }
}

export const db = getFirestore(app);
export const realtimeDb = import.meta.env.VITE_FIREBASE_DATABASE_URL ? getDatabase(app) : null;

export default app;
