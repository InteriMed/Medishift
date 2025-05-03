# Authentication Flow Test Plan

## Overview
This document outlines the test scenarios for the Firebase-based authentication flow in our application.

## Prerequisites
- Frontend application running in development mode
- Firebase Auth configured properly
- Test user accounts (or ability to create them)

## Test Scenarios

### 1. User Registration (Sign Up)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/signup` | Sign Up form displayed |
| 2 | Toggle between Worker/Company | Form fields update accordingly |
| 3 | Enter invalid email | Validation error shown |
| 4 | Enter mismatched passwords | Validation error shown |
| 5 | Leave required fields empty | Form submission blocked |
| 6 | Complete form with valid data | Account created, redirected to verify email page |

### 2. Email Verification
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Access verify email page after signup | Verify email page shown with user's email |
| 2 | Click "Resend verification" button | Success notification shown |
| 3 | Verify email link in actual email | Account verified |
| 4 | Sign in after verification | Properly directed to dashboard |

### 3. User Sign In
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/signin` | Sign In form displayed |
| 2 | Enter incorrect credentials | Error message shown |
| 3 | Enter valid credentials (unverified) | Sign in succeeds, redirected to verify email |
| 4 | Enter valid credentials (verified) | Sign in succeeds, redirected to dashboard |

### 4. Password Reset
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/forgot-password` | Password reset form displayed |
| 2 | Enter invalid email | Validation error shown | 
| 3 | Enter email not associated with account | Success message still shown (security) |
| 4 | Enter valid email | Success message shown, email sent |
| 5 | Click reset link in email | Password reset form shown |
| 6 | Enter new password | Password updated, redirected to sign in |

### 5. Protected Routes
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Access `/dashboard` without auth | Redirected to sign in |
| 2 | Access `/profile` without auth | Redirected to sign in |
| 3 | Sign in and access protected route | Successfully access protected content |

### 6. Sign Out
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click sign out button | User signed out, redirected to home/signin |
| 2 | Try to access protected route after signout | Redirected to sign in |

### 7. Real-time Auth State
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Sign in on one tab | All open app tabs reflect signed-in state |
| 2 | Sign out on one tab | All open app tabs reflect signed-out state |
| 3 | Change password from Firebase console | User remains signed in until next session |

## Edge Cases to Test
- Session expiration handling
- Network disconnection during authentication
- Multiple rapid authentication attempts
- Cross-device sign-in persistence
- Browser refresh during authentication process

## Test Reporting
For each failed test, document:
1. Test name/number
2. Expected vs. actual behavior
3. Browser/environment details
4. Screenshots if relevant
5. Console errors if any 