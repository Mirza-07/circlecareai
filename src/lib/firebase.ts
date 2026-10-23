import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// CircleCare AI Firebase Configuration (Project: circlecare-ai)
// In production, these environment variables are populated via Cloud / Hosting.
// Local emulator suite and mock demo modes are automatically supported.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCircleCareDemoKey2026ValidMock',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'circlecare-ai.firebaseapp.com',
  projectId: 'circlecare-ai',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'circlecare-ai.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1029384756',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1029384756:web:a1b2c3d4e5f6g7h8'
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// Connect to local emulators if specified or if running in emulator dev mode
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    console.log('[CircleCare] Connected to Firebase Emulator Suite (Auth: 9099, Firestore: 8080)');
  } catch {
    // Emulator already connected
  }
}

export default app;
