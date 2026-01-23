import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { ENV_VARS, DEFAULT_VALUES, WINDOW_FLAGS, FIRESTORE_DATABASE_NAME, FIRESTORE_COLLECTIONS, getEnvVar } from '../config/keysDatabase';

const firebaseConfig = {
  apiKey: getEnvVar('FIREBASE_API_KEY') || 'AIzaSyBKMnh477m8ZDmk7WhQZKPzb3VDe3PktDs',
  authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN') || DEFAULT_VALUES.FIREBASE_AUTH_DOMAIN,
  projectId: getEnvVar('FIREBASE_PROJECT_ID') || DEFAULT_VALUES.FIREBASE_PROJECT_ID,
  storageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET') || DEFAULT_VALUES.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: getEnvVar('FIREBASE_MESSAGING_SENDER_ID') || DEFAULT_VALUES.FIREBASE_MESSAGING_SENDER_ID,
  appId: getEnvVar('FIREBASE_APP_ID') || DEFAULT_VALUES.FIREBASE_APP_ID,
  measurementId: getEnvVar('FIREBASE_MEASUREMENT_ID') || DEFAULT_VALUES.FIREBASE_MEASUREMENT_ID
};

if (!firebaseConfig.projectId || firebaseConfig.projectId !== DEFAULT_VALUES.FIREBASE_PROJECT_ID) {
  console.warn(`⚠️ Firebase Project ID mismatch! Expected: ${DEFAULT_VALUES.FIREBASE_PROJECT_ID}, Got:`, firebaseConfig.projectId);
  firebaseConfig.projectId = DEFAULT_VALUES.FIREBASE_PROJECT_ID;
}

console.log('🔧 Firebase Configuration:');
console.log('  API Key:', firebaseConfig.apiKey ? 'PRESENT ✅' : 'MISSING ❌');
console.log('  Project ID:', firebaseConfig.projectId);
console.log('  Auth Domain:', firebaseConfig.authDomain);
console.log('  Storage Bucket:', firebaseConfig.storageBucket);
console.log('  App ID:', firebaseConfig.appId ? 'PRESENT ✅' : 'MISSING ❌');

if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'YOUR_API_KEY') {
  console.error('❌ CRITICAL: Firebase API Key is missing or invalid!');
  console.error('Please set REACT_APP_FIREBASE_API_KEY in your .env file');
}

if (firebaseConfig.projectId !== DEFAULT_VALUES.FIREBASE_PROJECT_ID) {
  console.error('❌ CRITICAL: Project ID mismatch!');
  console.error(`Expected: ${DEFAULT_VALUES.FIREBASE_PROJECT_ID}, Got: ${firebaseConfig.projectId}`);
}

const useEmulators = getEnvVar('USE_FIREBASE_EMULATORS') === 'true';

const emulatorConfig = {
  auth: getEnvVar('FIREBASE_AUTH_EMULATOR_URL') || DEFAULT_VALUES.EMULATOR_AUTH_URL,
  firestore: getEnvVar('FIREBASE_FIRESTORE_EMULATOR_URL') || DEFAULT_VALUES.EMULATOR_FIRESTORE_URL,
  functions: getEnvVar('FIREBASE_FUNCTIONS_EMULATOR_URL') || DEFAULT_VALUES.EMULATOR_FUNCTIONS_URL,
  storage: getEnvVar('FIREBASE_STORAGE_EMULATOR_URL') || DEFAULT_VALUES.EMULATOR_STORAGE_URL
};

// Initialize Firebase app - Robust Singleton Pattern
let firebaseApp;

if (getApps().length === 0) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApp();
}

// Then initialize services using the app
const auth = getAuth(firebaseApp);
let db;

const INIT_FLAG = WINDOW_FLAGS.FIRESTORE_INITIALIZED;
const isInitialized = typeof window !== 'undefined' && window[INIT_FLAG];

if (!isInitialized) {
  try {
    db = initializeFirestore(firebaseApp, {
      localCache: memoryLocalCache()
    }, FIRESTORE_DATABASE_NAME);

    if (typeof window !== 'undefined') {
      window[INIT_FLAG] = true;
    }
    console.log(`✅ Firestore initialized with MEMORY CACHE (offline enabled) - Database: ${FIRESTORE_DATABASE_NAME}`);
  } catch (error) {
    console.warn('⚠️ initializeFirestore failed, attempting to get existing instance:', error);
    try {
      db = getFirestore(firebaseApp, FIRESTORE_DATABASE_NAME);
      console.log(`✅ Retrieved existing Firestore instance - Database: ${FIRESTORE_DATABASE_NAME}`);
    } catch (e) {
      console.error('🚨 CRITICAL: Could not initialize or retrieve Firestore:', e);
      throw e;
    }
  }
} else {
  db = getFirestore(firebaseApp, FIRESTORE_DATABASE_NAME);
  console.log(`✅ Using existing Firestore instance - Database: ${FIRESTORE_DATABASE_NAME}`);
}

if (typeof window !== 'undefined' && db) {
  if (getEnvVar('NODE_ENV') === 'development') {
    console.log('🌐 Browser online status:', navigator.onLine ? 'ONLINE' : 'OFFLINE');
    console.log('📦 Firestore instance ready for project:', firebaseConfig.projectId);
  }
}
const storage = getStorage(firebaseApp);
const functions = getFunctions(firebaseApp, DEFAULT_VALUES.FIREBASE_REGION);

if (getEnvVar('NODE_ENV') === 'development') {
  console.log('Firebase Storage Bucket:', firebaseConfig.storageBucket);
  console.log('Firebase Project ID:', firebaseConfig.projectId);
}
let analytics = null;

// Only initialize analytics in browser environment
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(firebaseApp);
  } catch (error) {
    console.warn('Analytics initialization failed:', error);
  }
}

// Connect to emulators if needed
if (useEmulators) {
  console.log('Using Firebase emulators');

  if (emulatorConfig.auth) {
    const [host, port] = emulatorConfig.auth.replace('http://', '').split(':');
    connectAuthEmulator(auth, `http://${host}:${port}`);
    console.log(`Connected to Auth emulator at ${host}:${port}`);
  }

  if (emulatorConfig.firestore) {
    const [host, port] = emulatorConfig.firestore.replace('http://', '').split(':');
    connectFirestoreEmulator(db, host, parseInt(port, 10));
    console.log(`Connected to Firestore emulator at ${host}:${port}`);
  }

  if (emulatorConfig.storage) {
    const [host, port] = emulatorConfig.storage.replace('http://', '').split(':');
    connectStorageEmulator(storage, host, parseInt(port, 10));
    console.log(`Connected to Storage emulator at ${host}:${port}`);
  }

  if (emulatorConfig.functions) {
    const [host, port] = emulatorConfig.functions.replace('http://', '').split(':');
    connectFunctionsEmulator(functions, host, parseInt(port, 10));
    console.log(`Connected to Functions emulator at ${host}:${port}`);
  }
}

// Function to get the Firebase auth instance
export const getFirebaseAuth = () => {
  return auth;
};

// Authentication functions
export const registerUser = async (email, password, displayName) => {
  try {
    if (!db) {
      throw new Error('Firestore database not initialized');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user document in Firestore - only include basic user fields
    const userData = {
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: displayName || '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      photoURL: user.photoURL || '',
      role: 'professional',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Explicitly remove any professionalProfile field if it exists
    delete userData.professionalProfile;

    // Create the user document with error handling
    const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, user.uid);
    await setDoc(userDocRef, userData);

    // Verify the document was created
    const verifyDoc = await getDoc(userDocRef);
    if (!verifyDoc.exists()) {
      throw new Error('Failed to create user document in Firestore');
    }
    console.log('✅ User document created successfully in Firestore');

    return user;
  } catch (error) {
    console.error('❌ Error registering user:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    throw error;
  }
};

export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const loginWithGoogle = async () => {
  try {
    console.log('Current domain:', window.location.hostname);
    console.log('Current origin:', window.location.origin);

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    // Use popup for better reliability in some environments
    const result = await signInWithPopup(auth, provider);
    console.log('✅ Google sign-in successful:', result.user.uid);
    return result.user;
  } catch (error) {
    console.error('❌ Google login error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);

    if (error.code === 'auth/popup-blocked') {
      throw new Error('Popup was blocked. Please allow popups for this site.');
    } else if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in was cancelled.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your connection.');
    } else if (error.code === 'auth/unauthorized-domain') {
      throw new Error('This domain is not authorized for Google sign-in.');
    }

    throw error;
  }
};

export const logoutUser = async () => {
  await signOut(auth);
  return true;
};

export const resetPassword = async (email) => {
  await sendPasswordResetEmail(auth, email);
  return true;
};

// User profile services
export const getUserProfile = async (userId) => {
  const userDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, userId));
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() };
  }
  return null;
};

export const updateUserProfile = async (userId, data) => {
  await updateDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, userId), {
    ...data,
    updatedAt: serverTimestamp()
  });

  // If display name is updated, also update Auth profile
  if (data.displayName && auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: data.displayName });
  }

  return true;
};

// Auth state observer
export const authStateObserver = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Export Firebase services and app
export { auth, firebaseApp, db, storage, functions, analytics };
export default firebaseApp; 