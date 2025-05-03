import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { app } from '../../../firebase/config';

const auth = getAuth(app);

// Register a new user
export const registerUser = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    await sendEmailVerification(userCredential.user);
    return userCredential.user;
  } catch (error) {
    throw new Error(handleFirebaseError(error));
  }
};

// Log in existing user
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return {
      user: {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        photoURL: userCredential.user.photoURL,
        emailVerified: userCredential.user.emailVerified,
      }
    };
  } catch (error) {
    throw new Error(handleFirebaseError(error));
  }
};

// Log out user
export const logoutUser = async () => {
  try {
    await signOut(auth);
    localStorage.removeItem('authToken');
    return true;
  } catch (error) {
    throw new Error(handleFirebaseError(error));
  }
};

// Get current user data
export const getCurrentUser = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user is signed in');
  
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
  };
};

// Google sign-in
export const loginWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return {
      user: {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        emailVerified: result.user.emailVerified,
      }
    };
  } catch (error) {
    throw new Error(handleFirebaseError(error));
  }
};

// Request password reset
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    throw new Error(handleFirebaseError(error));
  }
};

// Helper to transform Firebase errors
const handleFirebaseError = (error) => {
  const errorCode = error.code;
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already registered.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/weak-password':
      return 'Password is too weak.';
    case 'auth/operation-not-allowed':
      return 'Operation not allowed.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completing the operation.';
    default:
      return error.message || 'An unknown error occurred';
  }
}; 