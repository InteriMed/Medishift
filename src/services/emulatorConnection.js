import { db, auth, storage, functions } from './firebase';

const connectToEmulators = () => {
  if (process.env.NODE_ENV !== 'development' || 
      process.env.REACT_APP_USE_EMULATORS !== 'true') {
    return;
  }

  const EMULATOR_HOST = process.env.REACT_APP_EMULATOR_HOST || 'localhost';
  
  try {
    // Emulators are now connected directly in the firebase/index.js file
    console.log('Connected to Firebase emulators');
  } catch (error) {
    console.error('Error connecting to emulators:', error);
  }
};

export default connectToEmulators; 