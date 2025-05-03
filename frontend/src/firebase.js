// Instead of initializing Firebase again, import from the centralized location
import { app, auth, db, storage, functions, analytics } from './services/firebase';

// Re-export everything
export { app, auth, db, storage, functions, analytics };

// Export default for any code that imports the default
export default { app, auth, db, storage, functions, analytics }; 