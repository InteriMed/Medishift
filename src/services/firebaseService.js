// Re-export everything from our centralized firebase module
// Persistence and emulator connection are handled in firebase.js
export { firebaseApp, auth, db, storage, functions, analytics } from './firebase';