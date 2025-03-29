import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../../config/firebase.config';

let firebaseApp = null;
let firebaseAuth = null;

export const initializeFirebase = () => {
  if (!firebaseApp) {
    try {
      // Check if Firebase app already exists
      const existingApps = getApps();
      if (existingApps.length > 0) {
        firebaseApp = existingApps[0];
      } else {
        firebaseApp = initializeApp(firebaseConfig);
      }
      
      firebaseAuth = getAuth(firebaseApp);
      console.log('Firebase initialized successfully');
      return firebaseAuth;
    } catch (error) {
      console.error('Firebase initialization error:', error);
      return null;
    }
  }
  return firebaseAuth;
};

export const getFirebaseAuth = () => {
  if (!firebaseAuth) {
    firebaseAuth = initializeFirebase();
  }
  return firebaseAuth;
};

// Initialize Firebase when the module loads
initializeFirebase();

export default firebaseApp; 