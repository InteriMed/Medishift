import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  Firestore
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, Functions } from 'firebase/functions';
import { getAnalytics, Analytics } from 'firebase/analytics';
import { ENV_VARS, DEFAULT_VALUES, FIRESTORE_DATABASE_NAME, getEnvVar } from '../../config/keysDatabase';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

interface EmulatorConfig {
  auth?: string;
  firestore?: string;
  functions?: string;
  storage?: string;
}

const firebaseConfig: FirebaseConfig = {
  apiKey: getEnvVar('FIREBASE_API_KEY') || 'AIzaSyBKMnh477m8ZDmk7WhQZKPzb3VDe3PktDs',
  authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN') || DEFAULT_VALUES.FIREBASE_AUTH_DOMAIN,
  projectId: getEnvVar('FIREBASE_PROJECT_ID') || DEFAULT_VALUES.FIREBASE_PROJECT_ID,
  storageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET') || DEFAULT_VALUES.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: getEnvVar('FIREBASE_MESSAGING_SENDER_ID') || DEFAULT_VALUES.FIREBASE_MESSAGING_SENDER_ID,
  appId: getEnvVar('FIREBASE_APP_ID') || DEFAULT_VALUES.FIREBASE_APP_ID,
  measurementId: getEnvVar('FIREBASE_MEASUREMENT_ID') || DEFAULT_VALUES.FIREBASE_MEASUREMENT_ID
};

if (!firebaseConfig.projectId || firebaseConfig.projectId !== DEFAULT_VALUES.FIREBASE_PROJECT_ID) {
  firebaseConfig.projectId = DEFAULT_VALUES.FIREBASE_PROJECT_ID;
}

const useEmulators = getEnvVar('USE_FIREBASE_EMULATORS') === 'true';

const emulatorConfig: EmulatorConfig = {
  auth: getEnvVar('FIREBASE_AUTH_EMULATOR_URL') || DEFAULT_VALUES.EMULATOR_AUTH_URL,
  firestore: getEnvVar('FIREBASE_FIRESTORE_EMULATOR_URL') || DEFAULT_VALUES.EMULATOR_FIRESTORE_URL,
  functions: getEnvVar('FIREBASE_FUNCTIONS_EMULATOR_URL') || DEFAULT_VALUES.EMULATOR_FUNCTIONS_URL,
  storage: getEnvVar('FIREBASE_STORAGE_EMULATOR_URL') || DEFAULT_VALUES.EMULATOR_STORAGE_URL
};

let firebaseApp: FirebaseApp;

if (getApps().length === 0) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApp();
}

const auth: Auth = getAuth(firebaseApp);

let db: Firestore;
try {
  db = getFirestore(firebaseApp, FIRESTORE_DATABASE_NAME);
} catch (error) {
  db = initializeFirestore(firebaseApp, {
    localCache: memoryLocalCache()
  }, FIRESTORE_DATABASE_NAME);
}

const storage: FirebaseStorage = getStorage(firebaseApp);
const functions: Functions = getFunctions(firebaseApp, DEFAULT_VALUES.FIREBASE_REGION);

let analytics: Analytics | null = null;

if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(firebaseApp);
  } catch (error) {
    console.warn('Analytics initialization failed:', error);
  }
}

if (useEmulators) {
  if (emulatorConfig.auth) {
    const [host, port] = emulatorConfig.auth.replace('http://', '').split(':');
    connectAuthEmulator(auth, `http://${host}:${port}`);
  }

  if (emulatorConfig.firestore) {
    const [host, port] = emulatorConfig.firestore.replace('http://', '').split(':');
    connectFirestoreEmulator(db, host, parseInt(port, 10));
  }

  if (emulatorConfig.storage) {
    const [host, port] = emulatorConfig.storage.replace('http://', '').split(':');
    connectStorageEmulator(storage, host, parseInt(port, 10));
  }

  if (emulatorConfig.functions) {
    const [host, port] = emulatorConfig.functions.replace('http://', '').split(':');
    connectFunctionsEmulator(functions, host, parseInt(port, 10));
  }
}

export const getFirebaseAuth = (): Auth => {
  return auth;
};

export { 
  firebaseApp, 
  auth, 
  db, 
  storage, 
  functions, 
  analytics,
  FirebaseApp,
  Auth,
  Firestore,
  FirebaseStorage,
  Functions,
  Analytics
};

export default firebaseApp;

