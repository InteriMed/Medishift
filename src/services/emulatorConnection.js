import { db, auth, storage, functions } from './firebase';
import { getEnvVar, DEFAULT_VALUES } from '../config/keysDatabase';

const connectToEmulators = () => {
  if (getEnvVar('NODE_ENV') !== 'development' || 
      getEnvVar('USE_EMULATORS') !== 'true') {
    return;
  }

  const EMULATOR_HOST = getEnvVar('EMULATOR_HOST') || 'localhost';
  
  try {
    // Emulators are now connected directly in the firebase/index.js file
  } catch (error) {
    // Error connecting to emulators
  }
};

export default connectToEmulators; 