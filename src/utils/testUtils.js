import { initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

// Initialize test Firebase app
export const initTestEnvironment = () => {
  // Use a separate config for testing to avoid affecting production
  const testConfig = {
    projectId: 'test-project',
    apiKey: 'test-api-key',
    authDomain: 'test-project.firebaseapp.com',
    storageBucket: 'test-project.appspot.com'
  };
  
  // Initialize test app
  const testApp = initializeApp(testConfig, 'test-app');
  
  // Get services
  const testAuth = getAuth(testApp);
  const testFirestore = getFirestore(testApp);
  const testFunctions = getFunctions(testApp);
  const testStorage = getStorage(testApp);
  
  // Connect to emulators
  connectAuthEmulator(testAuth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(testFirestore, 'localhost', 8080);
  connectFunctionsEmulator(testFunctions, 'localhost', 5001);
  connectStorageEmulator(testStorage, 'localhost', 9199);
  
  return {
    app: testApp,
    auth: testAuth,
    db: testFirestore,
    functions: testFunctions,
    storage: testStorage
  };
};

// Create test user
export const createTestUser = async (auth, email, password) => {
  try {
    await auth.createUserWithEmailAndPassword(email, password);
    return auth.currentUser;
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }
};

// Sign in test user
export const signInTestUser = async (auth, email, password) => {
  try {
    await auth.signInWithEmailAndPassword(email, password);
    return auth.currentUser;
  } catch (error) {
    console.error('Error signing in test user:', error);
    throw error;
  }
};

// Clear Firestore data for testing
export const clearFirestoreData = async (db) => {
  // This is just a helper to clear collections in the emulator
  // It's not meant for production use
  const collections = ['users', 'contracts', 'notifications', 'transactions'];
  
  for (const collectionName of collections) {
    const snapshot = await db.collection(collectionName).get();
    const batch = db.batch();
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  }
}; 