import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator, enableIndexedDbPersistence } from 'firebase/firestore';

// Firebase client initialization
const firebaseConfig = {
  apiKey: 'AIzaSyCM9L3-CEdT8YMZ7D93-oLL2v2a8djVFyw',
  authDomain: 'chefai-f7fba.firebaseapp.com',
  projectId: 'chefai-f7fba',
  storageBucket: 'chefai-f7fba.firebasestorage.app',
  messagingSenderId: '113626038942',
  appId: '1:113626038942:web:4f87d137b410d7c925f18f',
  measurementId: 'G-J88TS141ZS',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// Ensure auth tokens persist across reloads
setPersistence(auth, browserLocalPersistence).catch(() => {});

const usingEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

// Firestore auto-selects the optimal transport; emulator skips extra settings
const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: !usingEmulators,
  ignoreUndefinedProperties: true,
});

if (usingEmulators) {
  const authEmulatorUrl = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL || 'http://127.0.0.1:9099';
  const firestoreHost = (import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || '127.0.0.1').trim();
  const firestorePort = Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || 8080);

  connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });
  connectFirestoreEmulator(db, firestoreHost, firestorePort);
} else {
  // Enable offline persistence for production
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
    } else if (err.code == 'unimplemented') {
        console.warn('The current browser does not support all of the features required to enable persistence');
    }
  });
}
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
