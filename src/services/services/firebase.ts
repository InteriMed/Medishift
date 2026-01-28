import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  connectAuthEmulator,
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';
import { ENV_VARS, DEFAULT_VALUES, FIRESTORE_DATABASE_NAME, FIRESTORE_COLLECTIONS, getEnvVar } from '../../config/keysDatabase';

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

type FirebaseApp = ReturnType<typeof initializeApp>;
let firebaseApp: FirebaseApp;

if (getApps().length === 0) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApp();
}

const auth = getAuth(firebaseApp);
type Auth = typeof auth;

let db: ReturnType<typeof getFirestore>;
try {
  db = getFirestore(firebaseApp, FIRESTORE_DATABASE_NAME);
} catch (error) {
  db = initializeFirestore(firebaseApp, {
    localCache: memoryLocalCache()
  }, FIRESTORE_DATABASE_NAME);
}
type Firestore = typeof db;

const storage = getStorage(firebaseApp);
type FirebaseStorage = typeof storage;

const functions = getFunctions(firebaseApp, DEFAULT_VALUES.FIREBASE_REGION);
type Functions = typeof functions;

let analytics: ReturnType<typeof getAnalytics> | null = null;
type Analytics = ReturnType<typeof getAnalytics>;

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

export const loginUser = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const resetPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
};

export const getUserProfile = async (userId: string) => {
  const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() };
  }
  return null;
};

export const updateUserProfile = async (userId: string, updates: any) => {
  const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
  await setDoc(userDocRef, {
    ...updates,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const authStateObserver = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, callback);
};

export { 
  firebaseApp, 
  auth, 
  db, 
  storage, 
  functions, 
  analytics
};

export type {
  FirebaseApp,
  Auth,
  Firestore,
  FirebaseStorage,
  Functions,
  Analytics
};

export default firebaseApp;

