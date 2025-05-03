// Firebase configuration
export const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Flag to determine if we should use emulators (for local development)
export const useEmulators = process.env.NODE_ENV === 'development';

// Emulator configuration - updated to match firebase.json
export const emulatorConfig = {
  auth: 'http://localhost:9099',
  firestore: 'http://localhost:8081', // Updated to match firebase.json
  functions: 'http://localhost:5001',
  storage: 'http://localhost:9199'
}; 