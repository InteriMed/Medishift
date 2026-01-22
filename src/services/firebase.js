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
// Firebase configuration - Primary configuration file

// This consolidated file replaces both firebase.config.js and firebaseConfig.js
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'AIzaSyBKMnh477m8ZDmk7WhQZKPzb3VDe3PktDs',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'interimed-620fd.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'interimed-620fd',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'interimed-620fd.firebasestorage.app',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '436488373074',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '1:436488373074:web:60c3a26935b6238d9a308b',
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || 'G-66V8BS82V0'
};

if (!firebaseConfig.projectId || firebaseConfig.projectId !== 'interimed-620fd') {
  console.warn('⚠️ Firebase Project ID mismatch! Expected: interimed-620fd, Got:', firebaseConfig.projectId);
  firebaseConfig.projectId = 'interimed-620fd';
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

if (firebaseConfig.projectId !== 'interimed-620fd') {
  console.error('❌ CRITICAL: Project ID mismatch!');
  console.error(`Expected: interimed-620fd, Got: ${firebaseConfig.projectId}`);
}

// Flag to control emulator usage - supports both explicit env var and development environment check
const useEmulators = process.env.REACT_APP_USE_FIREBASE_EMULATORS === 'true';

// Emulator configuration with fallbacks to default local ports
const emulatorConfig = {
  auth: process.env.REACT_APP_FIREBASE_AUTH_EMULATOR_URL || 'http://localhost:9099',
  firestore: process.env.REACT_APP_FIREBASE_FIRESTORE_EMULATOR_URL || 'http://localhost:8080',
  functions: process.env.REACT_APP_FIREBASE_FUNCTIONS_EMULATOR_URL || 'http://localhost:5001',
  storage: process.env.REACT_APP_FIREBASE_STORAGE_EMULATOR_URL || 'http://localhost:9199'
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

// Initialize Firestore - Attempt custom settings, fallback to default if any issues
// Use window-level flag to persist across hot reloads
const INIT_FLAG = '__FIRESTORE_INITIALIZED__';
const isInitialized = typeof window !== 'undefined' && window[INIT_FLAG];

if (!isInitialized) {
  try {
    db = initializeFirestore(firebaseApp, {
      localCache: memoryLocalCache()
    }, 'medishift');

    if (typeof window !== 'undefined') {
      window[INIT_FLAG] = true;
    }
    console.log('✅ Firestore initialized with MEMORY CACHE (offline enabled) - Database: medishift');
  } catch (error) {
    // If it fails (likely because it was already initialized elsewhere), try to get the existing instance
    console.warn('⚠️ initializeFirestore failed, attempting to get existing instance:', error);
    try {
      db = getFirestore(firebaseApp, 'medishift');
      console.log('✅ Retrieved existing Firestore instance - Database: medishift');
    } catch (e) {
      console.error('🚨 CRITICAL: Could not initialize or retrieve Firestore:', e);
      throw e;
    }
  }
} else {
  db = getFirestore(firebaseApp, 'medishift');
  console.log('✅ Using existing Firestore instance - Database: medishift');
}

// Log connection status in development
if (typeof window !== 'undefined' && db) {
  if (process.env.NODE_ENV === 'development') {
    console.log('🌐 Browser online status:', navigator.onLine ? 'ONLINE' : 'OFFLINE');
    console.log('📦 Firestore instance ready for project:', firebaseConfig.projectId);
  }
}
const storage = getStorage(firebaseApp);
const functions = getFunctions(firebaseApp, 'europe-west6');

// Log storage bucket configuration for debugging
if (process.env.NODE_ENV === 'development') {
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
    const userDocRef = doc(db, 'users', user.uid);
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
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() };
  }
  return null;
};

export const updateUserProfile = async (userId, data) => {
  await updateDoc(doc(db, 'users', userId), {
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