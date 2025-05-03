# Firebase Authentication Testing Guide

This guide explains how to test the Firebase authentication flow in our application.

## Prerequisites

- Application running in development mode (`npm start`)
- Browser with developer console (Chrome recommended)
- Access to the Firebase console for your project

## Automated Testing via Console

We've exposed several test functions in the browser console that you can use to test the authentication flow:

- `authTests.runAuthTests()` - Run all auth tests in sequence
- `authTests.createTestUser()` - Create a test user
- `authTests.signInTestUser()` - Sign in the test user
- `authTests.signOutTestUser()` - Sign out the current user
- `authTests.resetTestUserPassword()` - Send password reset email
- `authTests.deleteTestUser()` - Delete the current test user

To use these functions:

1. Open the application in your browser
2. Open the developer console (F12 or Ctrl+Shift+I)
3. Run the desired test function, e.g., `authTests.runAuthTests()`

## Manual Testing Steps

For a complete test of the authentication flow, follow the manual test plan in [auth-test-plan.md](./auth-test-plan.md).

### Testing Email Verification

To test email verification without actually clicking email links:

1. Create a new user account
2. Sign in with the new account
3. You should be redirected to the email verification page
4. In the console, run:
   ```js
   const authContext = document.querySelector('[data-testid="auth-provider"]').__react_instance.return.return.memoizedProps.value;
   authContext.simulateEmailVerification();
   ```
5. Refresh the page and you should be redirected to the dashboard

### Testing Protected Routes

1. Sign out any current user
2. Try accessing a protected route like `/dashboard` or `/profile`
3. You should be redirected to the sign-in page
4. Sign in with valid credentials
5. You should now be able to access the protected routes

## Troubleshooting

If you encounter authentication errors:

1. Check browser console for detailed error messages
2. Verify that Firebase configuration is correct in `.env.development.local`
3. Check Firebase console Authentication section for user status
4. Ensure that Firebase Auth is properly enabled in Firebase console

## Reporting Issues

When reporting authentication issues:

1. Describe the steps to reproduce
2. Include error messages from the console
3. Note the browser and version used
4. Include screenshots if relevant
5. Describe expected vs. actual behavior 