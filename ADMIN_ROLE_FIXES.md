# Admin Role & Account Creation Fixes

## Issues Fixed

### 1. Removed `profileType` from Users Collection
- **Problem**: `profileType: "doctor"` was being stored in the `users` collection
- **Solution**: `profileType` is now only stored in profile collections (`professionalProfiles`, `facilityProfiles`)
- **Files Changed**:
  - `frontend/src/dashboard/hooks/useProfileData.js` - Removed profileType from users collection writes

### 2. Standardized Role Storage
- **Problem**: `role: "professional"` was being stored as a string in some places
- **Solution**: All roles are now stored in `roles` array format: `roles: ["professional"]`
- **Files Changed**:
  - `frontend/src/pages/Auth/SignupPage.js` - Changed all `role: 'professional'` to `roles: ['professional']`
  - `frontend/src/dashboard/hooks/useProfileData.js` - Removed `role` string field, only use `roles` array

### 3. Admin Role Support
- **Implementation**: Admin role is checked via `roles` array: `roles: ["admin"]`
- **Backward Compatibility**: Still checks singular `role` field for existing data
- **Files Changed**:
  - `frontend/src/utils/adminUtils.js` - Enhanced `isAdmin()` function to prioritize `roles` array

## How to Grant Admin Access

To make a user an admin, update their Firestore document:

```javascript
// In Firestore console or via Cloud Function
users/{userId} {
  roles: ["admin"]  // Add "admin" to the roles array
}
```

**Note**: The system checks both `roles` array and `role` field for backward compatibility, but `roles` array is the preferred method.

## Data Structure

### Users Collection (`users/{userId}`)
```javascript
{
  uid: string,
  email: string,
  firstName: string,
  lastName: string,
  roles: ["professional"],  // Array of roles (required)
  // profileType: REMOVED - should not be in users collection
  // role: REMOVED - use roles array instead
  createdAt: Timestamp,
  updatedAt: Timestamp,
  // ... other fields
}
```

### Profile Collections (`professionalProfiles/{userId}` or `facilityProfiles/{userId}`)
```javascript
{
  userId: string,
  profileType: "doctor",  // OK - profileType belongs here
  // ... other profile-specific fields
}
```

## Migration Notes

Existing users with `role: "professional"` will continue to work due to backward compatibility in `isAdmin()` function. However, new account creation will only use `roles` array.

To migrate existing users:
```javascript
// Cloud Function or script to migrate
const userDoc = await db.collection('users').doc(userId).get();
const data = userDoc.data();
if (data.role && !data.roles) {
  await db.collection('users').doc(userId).update({
    roles: [data.role],
    role: admin.firestore.FieldValue.delete()  // Remove old field
  });
}
```









