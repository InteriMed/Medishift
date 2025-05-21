# PharmaSoft Authentication Structure Documentation

## Overview

This document details the authentication structure in the PharmaSoft application, focusing on the implementation of user authentication (signup, login) using Firebase Authentication. This document also identifies any remaining legacy Flask API integrations that need to be migrated to Firebase.

## Implementation Status

The authentication system has been migrated from a Flask API backend to direct Firebase integration. The following components have been successfully migrated:

1. **User Registration (Signup)** - Now uses Firebase Authentication directly
2. **User Login** - Now uses Firebase Authentication directly
3. **Password Reset** - Now uses Firebase Authentication directly
4. **Social Login (Google)** - Implemented using Firebase Authentication
5. **User Profile Management** - Now uses Firestore for storage and retrieval

## Directory Structure

```
frontend/src/
├── config/
│   ├── firebase.config.js       # Primary Firebase configuration 
│   ├── firebaseConfig.js        # Legacy config (now re-exports firebase.config.js)
│   └── api.config.js            # Legacy API configuration (needs to be removed)
├── contexts/
│   ├── AuthContext.js           # Authentication context provider
│   └── NotificationContext.js   # Notification management
├── hooks/
│   ├── useAuth.js               # Custom hook for authentication
│   └── useNotifications.js      # Notifications hook
├── pages/Auth/
│   ├── LoginPage.js             # Login page implementation
│   ├── SignupPage.js            # Signup page implementation
│   ├── ForgotPasswordPage.js    # Password reset implementation
│   └── components/              # Shared authentication components
├── services/
│   ├── firebase.js              # Core Firebase services
│   ├── authService.js           # Authentication service (placeholder)
│   ├── userService.js           # User profile management
│   └── apiService.js            # Legacy API service (deprecated with warnings)
```

## Authentication Flow

### 1. Firebase Configuration

The Firebase configuration is defined in `firebase.config.js`:

```javascript
export const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};
```

The application also supports Firebase Emulator Suite for local development:

```javascript
export const useEmulators = process.env.REACT_APP_USE_FIREBASE_EMULATORS === 'true' || 
  (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_FIREBASE_EMULATORS !== 'false');

export const emulatorConfig = {
  auth: process.env.REACT_APP_FIREBASE_AUTH_EMULATOR_URL || 'http://localhost:9099',
  firestore: process.env.REACT_APP_FIREBASE_FIRESTORE_EMULATOR_URL || 'http://localhost:8081',
  functions: process.env.REACT_APP_FIREBASE_FUNCTIONS_EMULATOR_URL || 'http://localhost:5001',
  storage: process.env.REACT_APP_FIREBASE_STORAGE_EMULATOR_URL || 'http://localhost:9199'
};
```

### 2. Firebase Service Initialization

The Firebase services are initialized in `services/firebase.js`:

```javascript
// Initialize Firebase app
const firebaseApp = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);
const functions = getFunctions(firebaseApp);
let analytics = null;

// Only initialize analytics in browser environment
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(firebaseApp);
  } catch (error) {
    console.warn('Analytics initialization failed:', error);
  }
}

// Connect to emulators if needed
if (useEmulators) {
  // Connect to Auth, Firestore, Storage, and Functions emulators
}
```

### 3. Authentication Context

The `AuthContext.js` provides authentication state and methods:

```javascript
const value = {
  currentUser,        // Firebase Auth user object
  userProfile,        // Extended user data from Firestore
  loading,            // Authentication loading state
  error,              // Authentication error state
  register,           // User registration function
  login,              // Login function
  logout,             // Logout function
  resetPassword,      // Password reset function
  refreshUserData,    // Function to refresh user data
  updateProfile,      // Function to update user profile
  loginWithGoogle,    // Social login function
  isAuthenticated     // Boolean indicating if user is authenticated
};
```

The AuthContext initializes an auth state observer to keep track of the user's authentication state:

```javascript
useEffect(() => {
  // Set up auth state observer
  const unsubscribe = authStateObserver(async (user) => {
    setCurrentUser(user);
    setLoading(true);
    
    if (user) {
      try {
        // Get additional user data from Firestore
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
      } catch (err) {
        console.error("Error fetching user profile:", err);
      }
    } else {
      setUserProfile(null);
    }
    
    setLoading(false);
  });

  // Clean up subscription
  return () => unsubscribe();
}, []);
```

### 4. Authentication Methods

The Firebase service provides several authentication methods:

#### User Registration:

```javascript
export const registerUser = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with display name
    if (displayName) {
      await updateProfile(user, { displayName });
    }
    
    // Send verification email
    await sendEmailVerification(user);
    
    return user;
  } catch (error) {
    throw error;
  }
};
```

#### User Login:

```javascript
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};
```

#### Google Login:

```javascript
export const loginWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    throw error;
  }
};
```

#### Password Reset:

```javascript
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    throw error;
  }
};
```

### 5. User Authentication Flow in Login Page

The LoginPage component implements the login flow:

```javascript
const handleLogin = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) return;
  
  setError('');
  setIsLoading(true);
  
  try {
    // Sign in with email/password using Firebase Auth
    const result = await signInWithEmailAndPassword(
      auth,
      formData.email,
      formData.password
    );
    
    const user = result.user;
    
    // Get fresh token
    const token = await user.getIdToken(true);
    
    // Store the token and user data
    localStorage.setItem('token', token);
    localStorage.setItem('firebaseUid', user.uid);
    
    // Get additional user profile data directly from Firestore
    try {
      // Get user data from Firestore instead of API
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        // Store user data from Firestore
        const userData = userDoc.data();
        localStorage.setItem('user', JSON.stringify({
          ...userData,
          uid: user.uid
        }));
      } else {
        // User document doesn't exist in Firestore yet
        localStorage.setItem('user', JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
        }));
      }
    } catch (firestoreError) {
      console.error('Firestore data retrieval error:', firestoreError);
      // Continue with login even if Firestore connection fails
    }
    
    // Redirect to dashboard
    navigate(`/${lang}/dashboard`);
  } catch (error) {
    // Handle authentication errors
  } finally {
    setIsLoading(false);
  }
};
```

### 6. User Registration Flow in Signup Page

The SignupPage implements a multi-step registration flow:

1. **Step 1**: Collect basic information (name, email, password)
2. **Step 2**: Collect phone number and verify via SMS (using Firebase Phone Auth)
3. **Step 3**: Verify phone with OTP and create user profile in Firestore

```javascript
// Step 1: Create user with email/password
const userCredential = await createUserWithEmailAndPassword(
  auth,
  formData.email,
  formData.password
);

// Update profile with display name
await updateProfile(user, {
  displayName: `${formData.firstName} ${formData.lastName}`
});

// Step 2: Send phone verification code
const phoneProvider = new PhoneAuthProvider(auth);
const verificationId = await phoneProvider.verifyPhoneNumber(
  formData.phoneNumber,
  recaptchaVerifier
);

// Step 3: Verify code and link accounts
const phoneCredential = PhoneAuthProvider.credential(
  verificationId,
  formData.verificationCode
);

// Link phone credential to user account
await linkWithCredential(temporaryUser, phoneCredential);

// Create user document in Firestore
await setDoc(doc(db, 'users', user.uid), {
  firstName: formData.firstName,
  lastName: formData.lastName,
  email: formData.email,
  phoneNumber: formData.phoneNumber,
  displayName: `${formData.firstName} ${formData.lastName}`,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  // Add default user role and other properties
  role: 'user',
  isVerified: true,
  isActive: true
});
```

## Custom Authentication Hooks

The application provides a custom `useAuth` hook to simplify access to authentication functionality:

```javascript
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    // Return a mock implementation if the context is not available
    return {
      currentUser: null,
      loading: false,
      error: null,
      signIn: () => Promise.resolve(),
      signUp: () => Promise.resolve(),
      signOut: () => Promise.resolve(),
      resetPassword: () => Promise.resolve()
    };
  }
  
  return context;
};
```

## Firebase Emulator Usage

The application is configured to use Firebase Emulator Suite for local development. This allows developers to work with Firebase services locally without affecting production data.

### Emulator Configuration

The emulators are configured in `firebase.config.js` and initialized in `services/firebase.js`:

```javascript
// In firebase.config.js
export const useEmulators = process.env.REACT_APP_USE_FIREBASE_EMULATORS === 'true' || 
  (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_FIREBASE_EMULATORS !== 'false');

export const emulatorConfig = {
  auth: process.env.REACT_APP_FIREBASE_AUTH_EMULATOR_URL || 'http://localhost:9099',
  firestore: process.env.REACT_APP_FIREBASE_FIRESTORE_EMULATOR_URL || 'http://localhost:8081',
  functions: process.env.REACT_APP_FIREBASE_FUNCTIONS_EMULATOR_URL || 'http://localhost:5001',
  storage: process.env.REACT_APP_FIREBASE_STORAGE_EMULATOR_URL || 'http://localhost:9199'
};

// In firebase.js
if (useEmulators) {
  console.log('Using Firebase emulators');
  
  if (emulatorConfig.auth) {
    const [host, port] = emulatorConfig.auth.replace('http://', '').split(':');
    connectAuthEmulator(auth, `http://${host}:${port}`);
    console.log(`Connected to Auth emulator at ${host}:${port}`);
  }
  
  if (emulatorConfig.firestore) {
    const [host, port] = emulatorConfig.firestore.replace('http://', '').split(':');
    connectFirestoreEmulator(db, host, parseInt(port, 10));
    console.log(`Connected to Firestore emulator at ${host}:${port}`);
  }
  
  // Similar connections for Storage and Functions emulators
}
```

### Starting the Emulators

To use the Firebase emulators, you need to:

1. Install the Firebase CLI: `npm install -g firebase-tools`
2. Initialize Firebase in your project: `firebase init emulators`
3. Start the emulators: `firebase emulators:start`

The default ports for the emulators are:
- Authentication: 9099
- Firestore: 8080
- Functions: 5001
- Storage: 9199

### Troubleshooting Emulator Connectivity

Common connectivity issues with the emulators include:

1. **Connection Refused Errors**: These usually indicate that the emulators are not running or are running on different ports than what's configured in the application.

   ```
   POST http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:lookup?key=... net::ERR_CONNECTION_REFUSED
   POST http://localhost:8081/google.firestore.v1.Firestore/Listen/channel?... net::ERR_CONNECTION_REFUSED
   ```

   **Solution**: Ensure the emulators are running (`firebase emulators:start`) and that the ports in `firebase.config.js` match the actual emulator ports.

2. **Firestore Offline Errors**: These occur when the application can't connect to the Firestore emulator.

   ```
   Error fetching user profile: FirebaseError: Failed to get document because the client is offline.
   ```

   **Solution**: Check that the Firestore emulator is running and that there are no network issues blocking the connection.

3. **Auth Emulator Warnings**: These are normal and indicate that you're using the Auth emulator instead of the production service.

   ```
   WARNING: You are using the Auth Emulator, which is intended for local testing only. Do not use with production credentials.
   ```

   **Note**: This is expected behavior in development mode.

### Best Practices for Emulator Usage

1. **Use Different Data Sets**: Create test data specifically for the emulators to avoid confusion with production data.

2. **Environment-Specific Configuration**: Use environment variables to control emulator usage:
   ```
   REACT_APP_USE_FIREBASE_EMULATORS=true
   ```

3. **Error Handling**: Implement proper error handling for scenarios where emulators might not be available:
   ```javascript
   try {
     // Firestore operation
   } catch (error) {
     if (error.code === 'unavailable' || error.message.includes('offline')) {
       // Handle emulator connectivity issues
       console.error('Firebase emulator connection issue:', error);
       // Provide user-friendly message or fallback behavior
     } else {
       // Handle other errors
       throw error;
     }
   }
   ```

4. **Consistent State Management**: When working with emulators, ensure that your application maintains consistent state even when connections fail:
   ```javascript
   // In AuthContext.js
   if (user) {
     try {
       // Get user profile from Firestore
       const profile = await getUserProfile(user.uid);
       setUserProfile(profile);
     } catch (err) {
       console.error("Error fetching user profile:", err);
       // Still maintain authenticated state, just with limited profile data
       setUserProfile({
         uid: user.uid,
         email: user.email,
         displayName: user.displayName || user.email.split('@')[0]
       });
     }
   }
   ```

## Switching from Emulators to Production

When you're ready to switch from using local Firebase emulators to the actual production Firebase services, follow these steps:

### 1. Disable Emulators in Configuration

There are several ways to disable the emulators:

#### Option A: Environment Variable

Set the `REACT_APP_USE_FIREBASE_EMULATORS` environment variable to `false` in your `.env` file:

```
REACT_APP_USE_FIREBASE_EMULATORS=false
```

#### Option B: Code Modification

If you need to permanently disable emulators in a specific environment, you can modify the `firebase.config.js` file:

```javascript
// Original code with emulators enabled in development
export const useEmulators = process.env.REACT_APP_USE_FIREBASE_EMULATORS === 'true' || 
  (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_FIREBASE_EMULATORS !== 'false');

// Modified code to disable emulators in all environments
export const useEmulators = process.env.REACT_APP_USE_FIREBASE_EMULATORS === 'true';
```

### 2. Ensure Proper Production Credentials

Make sure your `.env` file contains the correct production Firebase configuration:

```
REACT_APP_FIREBASE_API_KEY=your_production_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 3. Clean Local Storage and Cache

When switching between emulators and production:

1. Clear your browser's local storage to remove any emulator-specific authentication tokens
2. Clear IndexedDB data to remove any cached Firestore data
3. Clear application cache

In Chrome, you can do this by:
- Opening Developer Tools (F12)
- Going to "Application" tab
- Selecting "Clear storage" in the left sidebar
- Checking all options and clicking "Clear site data"

### 4. Update Security Rules for Production

Before switching to production, ensure your Firestore and Storage security rules are properly configured for production use:

1. Review all security rules in the Firebase Console
2. Test security rules using the Firebase Rules Playground
3. Ensure proper authentication checks are in place
4. Validate that data access is restricted to authorized users only

### 5. Testing the Production Connection

After disabling emulators, verify that your application connects to the production Firebase services:

1. Check the console for any error messages
2. Verify that there are no emulator warning messages
3. Test authentication flows (signup, login, password reset)
4. Test data operations (create, read, update, delete)

You should **not** see any of these emulator-related messages in the console:
```
Using Firebase emulators
Connected to Auth emulator at localhost:9099
Connected to Firestore emulator at localhost:8081
Connected to Storage emulator at localhost:9199
Connected to Functions emulator at localhost:5001
```

### 6. Common Issues When Switching

#### Authentication Token Issues

If users are already authenticated with the emulator but now connecting to production:
- Force a logout and re-authentication
- Implement a version check to detect environment changes and force re-authentication

#### Data Synchronization

If you've been developing with emulators for a while:
- Be aware that production data may differ from your emulator data
- Consider implementing a migration strategy if needed
- Verify that your queries work with the production data structure

#### CORS Configuration

If you're accessing Storage or other services:
- Ensure CORS is properly configured for your production domain
- Update any hardcoded URLs that might be pointing to emulator endpoints

### 7. Environment-Specific Builds

For a more robust approach, consider setting up environment-specific builds:

#### Development (with emulators)
```
REACT_APP_USE_FIREBASE_EMULATORS=true
```

#### Staging (with production Firebase but non-production data)
```
REACT_APP_USE_FIREBASE_EMULATORS=false
REACT_APP_ENVIRONMENT=staging
```

#### Production
```
REACT_APP_USE_FIREBASE_EMULATORS=false
REACT_APP_ENVIRONMENT=production
```

Then conditionally apply settings in your code:
```javascript
// Example of environment-specific code
const isProduction = process.env.REACT_APP_ENVIRONMENT === 'production';
const isStaging = process.env.REACT_APP_ENVIRONMENT === 'staging';

// Apply different settings based on environment
if (isProduction) {
  // Production-specific code
} else if (isStaging) {
  // Staging-specific code
} else {
  // Development-specific code
}
```

### 8. Security Considerations for Production

When moving to production, pay special attention to these security aspects:

1. **Secure API Keys**: Ensure your Firebase API keys are only used client-side and protected by proper domain restrictions in the Firebase Console

2. **Authentication Settings**:
   - Review authentication provider settings in Firebase Console
   - Set appropriate password strength requirements
   - Configure email verification requirements
   - Set up proper authentication UI customization

3. **Firestore Rules**: Implement comprehensive rules that follow the principle of least privilege

4. **Error Handling**: Ensure production error handling doesn't expose sensitive information

## Issues and Remaining Legacy Code

### 1. Legacy API Configuration

The `api.config.js` file contains Flask API configuration that should be fully removed:

```javascript
const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000',
  TIMEOUT: 30000, // 30 seconds
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  ENDPOINTS: {
    CHECK_EMAIL: '/api/users/check-email',
    SIGNUP: '/api/users/signup',
    LOGIN: '/api/users/login',
    PROFILE: '/api/users/profile',
    VALIDATE_VERIFICATION: '/api/users/validate-verification',
  }
};
```

### 2. Legacy API Service

The `apiService.js` file is marked as deprecated and contains warnings, but it still exists in the codebase:

```javascript
/**
 * DEPRECATED: This file is deprecated and will be removed in a future update.
 * All functionality is being migrated to direct Firebase integration.
 */

console.warn(
  'apiService.js is deprecated and scheduled for removal. ' +
  'Please migrate to direct Firebase integration using the appropriate service files.'
);
```

All functions in this file now throw errors or return mock data to encourage migration to Firebase services.

### 3. Empty authService.js

The `authService.js` file appears to be a placeholder (only 62 bytes) and should be properly implemented or removed:

```javascript
// This file should be removed or properly implemented
```

## Recommendations

1. **Remove Legacy Files**: The `api.config.js` and empty `authService.js` files should be removed or properly implemented.

2. **Complete apiService.js Deprecation**: Once all references to `apiService.js` have been removed from the codebase, the file itself should be deleted.

3. **Implement Missing Authentication Methods**: Some authentication methods are commented out or not fully implemented, such as:
   - `updateUserEmail`
   - `updateUserPassword`
   - `verifyEmail`
   - `facebookSignIn`

4. **Improve Error Handling**: Enhance error handling in authentication flows to provide more user-friendly error messages.

5. **Implement Proper Security Rules**: Ensure proper Firestore security rules are in place to protect user data.

6. **Enhance Emulator Support**: Improve the emulator configuration to handle connectivity issues more gracefully and provide better developer feedback.

7. **Add Offline Capabilities**: Implement offline support for authentication operations where possible, particularly for verification flows.

## Security Considerations

1. **Token Management**: The application stores authentication tokens in localStorage, which may be susceptible to XSS attacks. Consider more secure storage options.

2. **Firestore Security Rules**: Implement proper security rules to ensure users can only access their own data.

3. **Phone Authentication**: The phone authentication implementation in SignupPage.js should be reviewed for security best practices.

4. **Emulator Usage**: Ensure that the application clearly distinguishes between development (emulator) and production environments to prevent accidental use of emulators in production.

## Internationalization (i18n) Integration

The authentication system integrates with the application's internationalization (i18n) system using `react-i18next`. However, there are some missing translation keys that should be addressed:

```javascript
// Missing keys in translation files:
// - navigation.forPharmacies
// - navigation.forProfessionals
// - navigation.aboutUs
// - navigation.contact
// - navigation.blog
// - auth.signup.button
```

Ensure that all text strings in authentication components use the translation system:

```javascript
const { t } = useTranslation();
// ...
<button>{t('auth.login.button', 'Sign In')}</button>
```

## Conclusion

The authentication system has been successfully migrated from a Flask API to direct Firebase integration. There are a few legacy files and placeholder implementations that should be addressed to complete the migration, but the core authentication flows (signup, login, password reset) are fully implemented using Firebase Authentication.

When developing locally, the Firebase Emulator Suite provides a complete environment for testing authentication flows without affecting production data. However, developers should be aware of potential connectivity issues and implement proper error handling to ensure a smooth development experience. 