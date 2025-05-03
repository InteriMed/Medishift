import { 
  runAuthTests,
  createTestUser,
  signInTestUser,
  signOutTestUser,
  resetTestUserPassword,
  deleteTestUser
} from './authTests';

// Make test functions available in browser console
const exposeAuthTestsToConsole = () => {
  if (process.env.NODE_ENV === 'development') {
    window.authTests = {
      runAuthTests,
      createTestUser,
      signInTestUser,
      signOutTestUser,
      resetTestUserPassword,
      deleteTestUser
    };
    
    console.log(`
    🔍 Firebase Auth Tests available in console:
    
    - authTests.runAuthTests() - Run all auth tests in sequence
    - authTests.createTestUser() - Create a test user
    - authTests.signInTestUser() - Sign in the test user
    - authTests.signOutTestUser() - Sign out the current user
    - authTests.resetTestUserPassword() - Send password reset email
    - authTests.deleteTestUser() - Delete the current test user
    
    For complete testing, follow the manual test plan in docs/auth-test-plan.md
    `);
  }
};

export default exposeAuthTestsToConsole; 