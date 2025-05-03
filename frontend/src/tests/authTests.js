import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser
} from 'firebase/auth';
import { auth } from '../services/firebaseService';

// Test user details
const TEST_EMAIL = 'test_user@example.com';
const TEST_PASSWORD = 'Test123!';
const TEST_NAME = 'Test User';

// Helper functions
const createTestUser = async () => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      TEST_EMAIL, 
      TEST_PASSWORD
    );
    
    await updateProfile(userCredential.user, {
      displayName: TEST_NAME
    });
    
    console.log('✅ Test user created successfully');
    return userCredential.user;
  } catch (error) {
    console.error('❌ Failed to create test user:', error.message);
    return null;
  }
};

const signInTestUser = async () => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      TEST_EMAIL,
      TEST_PASSWORD
    );
    
    console.log('✅ Test user signed in successfully');
    return userCredential.user;
  } catch (error) {
    console.error('❌ Failed to sign in test user:', error.message);
    return null;
  }
};

const signOutTestUser = async () => {
  try {
    await signOut(auth);
    console.log('✅ Test user signed out successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to sign out test user:', error.message);
    return false;
  }
};

const resetTestUserPassword = async () => {
  try {
    await sendPasswordResetEmail(auth, TEST_EMAIL);
    console.log('✅ Password reset email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error.message);
    return false;
  }
};

const deleteTestUser = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      await deleteUser(user);
      console.log('✅ Test user deleted successfully');
      return true;
    } else {
      console.error('❌ No user currently signed in to delete');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to delete test user:', error.message);
    return false;
  }
};

// Main test runner
const runAuthTests = async () => {
  console.log('🔍 Starting Firebase Auth tests...');
  
  // Create test user
  const user = await createTestUser();
  if (!user) return;
  
  // Sign out to test sign in
  await signOutTestUser();
  
  // Sign in test
  const signedInUser = await signInTestUser();
  if (!signedInUser) return;
  
  // Password reset test
  await resetTestUserPassword();
  
  // Sign out test
  await signOutTestUser();
  
  // Clean up - sign in again and delete test user
  const userForDeletion = await signInTestUser();
  if (userForDeletion) {
    await deleteTestUser();
  }
  
  console.log('✨ Firebase Auth tests completed');
};

export {
  runAuthTests,
  createTestUser,
  signInTestUser,
  signOutTestUser,
  resetTestUserPassword,
  deleteTestUser
}; 