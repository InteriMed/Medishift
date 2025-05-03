// Import Firebase from our centralized firebase/index.js
import { app, auth, db, storage, functions, analytics } from './firebase';
import connectToEmulators from './emulatorConnection';

// Enable offline persistence if we're using Firestore
import { enableIndexedDbPersistence } from 'firebase/firestore';

// Check if in development mode
if (process.env.NODE_ENV === 'development') {
  connectToEmulators();
}

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  console.warn('Offline persistence error:', err.code);
});

// Re-export everything from our centralized firebase module
export { app, auth, db, storage, functions, analytics }; 