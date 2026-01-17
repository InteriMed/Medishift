# Root Cause Analysis (RCA) and Corrective and Preventive Actions (CAPA)
## Issue: User Firestore Entry Not Created After Google Auth

### Incident Description
When creating an account using Google Auth, the user authentication entry is successfully created in Firebase Auth, but the corresponding user document in the Firestore `users` collection is never created. The application logs indicate a timeout and "Client is offline" error during the document fetching process.

### Root Cause Analysis (RCA)

1.  **Primary Failure Mode**: 
    The `handleGoogleLogin` (in `LoginPage.js`) and `handleGoogleSignup` (in `SignupPage.js`) functions attempt to fetch the user document (`getDoc`) immediately after successful authentication. If this call fails (e.g., due to a "Client is offline" error or timeout), the application acts incorrectly.

2.  **Root Cause**:
    In `LoginPage.js`, the error handling block for the `getDoc` failure swallows the error and proceeds to navigate the user to the dashboard (`navigate('/${lang}/dashboard')`). 
    ```javascript
    } catch (firestoreError) {
      console.error("Firestore error:", firestoreError);
      navigate(`/${lang}/dashboard`); // CRITICAL FLAW
    }
    ```
    Because the code proceeds to the dashboard, the logic that would normally create a *new* user document (the `else` block of `if (userDoc.exists())`) is effectively skipped. The user enters the application in an authenticated state but without a Firestore profile.

3.  **Secondary Failure**:
    The `DashboardContext` attempts to "self-heal" by creating a missing user document if `getDoc` returns a non-existent document. However, `DashboardContext` *also* fails to fetch the document due to the same connectivity/timeout issue that caused the initial failure. When `DashboardContext` catches an error during fetch, it logs a warning and aborts initialization, leaving the user with a `null` profile and no attempt to create the missing document.

4.  **Why "Offline"?**:
    The "FirebaseError: Failed to get document because the client is offline" usually occurs when the Firestore client cannot establish a connection to the backend. This can happen transiently after a redirect login or if `enableNetwork` has not yet completed.

### Corrective and Preventive Actions (CAPA)

#### Corrective Actions (Immediate Fixes)

1.  **Fix `LoginPage.js` and `SignupPage.js`**:
    *   **Remove the Fallback Navigation**: Eliminate the code that navigates to the dashboard when a Firestore error occurs. If we cannot verify the user's existence, we must not proceed.
    *   **Implement Retry Logic**: Add a retry mechanism (e.g., 3 retries with backoff) for the initial `getDoc` call to handle transient "offline" states immediately after auth.
    *   **User Feedback**: If retries fail, display an error message to the user prompting them to try again, rather than silently failing.

2.  **Enhance `DashboardContext.js`** (Optional but Recommended):
    *   Consider more robust offline handling, though the primary fix in the auth pages should prevent users from reaching this state without a profile.

#### Preventive Actions (Long-term)

1.  **Review Error Handling Patterns**: Audit other critical path operations (e.g., specific facility creation, payments) to ensure errors are not swallowed with `catch { navigate(...) }` patterns.
2.  **Offline-Ready Architecture**: Review the `persistence` settings in `firebase.js`. Ensuring offline persistence is correctly enabled allows `getDoc` and `setDoc` to work against a local cache even when the network is flaky, queuing writes for later synchronization.

### Implementation Plan
1.  Modify `src/pages/Auth/LoginPage.js` to implement `getDocWithRetry` and remove the auto-navigation on error.
2.  Modify `src/pages/Auth/SignupPage.js` to implement `getDocWithRetry` and improve error handling.
