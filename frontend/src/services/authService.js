import { getAuth, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';

// Service for handling Firebase authentication
const authService = {
  // Get the current user
  getCurrentUser: () => {
    const auth = getAuth();
    return auth.currentUser;
  },

  // Get the current user's ID token
  getIdToken: async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      return null;
    }
    try {
      return await user.getIdToken(true);
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  },

  // Sign in with email and password
  signIn: async (email, password) => {
    const auth = getAuth();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  },

  // Sign out
  signOut: async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      return true;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  // Register a new user
  register: async (email, password) => {
    const auth = getAuth();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const auth = getAuth();
    return !!auth.currentUser;
  }
};

export default authService; 