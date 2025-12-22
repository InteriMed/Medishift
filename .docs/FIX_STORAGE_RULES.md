# Firebase Storage Rules Deployment

## Issue Fixed
The error `storage/unauthorized` was caused by missing Firebase Storage security rules. The `storage.rules` file has been created with proper permissions.

## Storage Rules Created

**File**: `storage.rules`

### Key Features:
- ✅ Users can upload documents to their own directories
- ✅ File type validation (PDF, DOC, DOCX, JPG, PNG)
- ✅ File size limit (10MB max)
- ✅ Authentication required
- ✅ User isolation (can only access own files)

### Allowed Paths:

1. **Professional Documents**:
   ```
   /documents/{userId}/cv/{fileName}
   /documents/{userId}/certificates/{fileName}
   /documents/{userId}/{docType}/{fileName}
   ```

2. **Facility Documents**:
   ```
   /documents/facilities/{userId}/businessDocument/{fileName}
   /documents/facilities/{userId}/{docType}/{fileName}
   ```

3. **Profile Pictures**:
   ```
   /profilePictures/{userId}/{fileName}
   ```

4. **Other Allowed Paths**:
   - Chat attachments
   - Contract documents
   - Marketplace images
   - Temporary uploads

## How to Deploy

### Option 1: Firebase Console (Recommended for Quick Fix)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Storage** → **Rules**
4. Copy the contents of `storage.rules` file
5. Paste into the editor
6. Click **Publish**

### Option 2: Firebase CLI

```bash
# Make sure you're in the project root
cd /root/Medishift

# Deploy storage rules only
firebase deploy --only storage
```

### Option 3: WSL/Linux Terminal

```bash
# Open WSL terminal
wsl

# Navigate to project
cd /root/Medishift

# Deploy
firebase deploy --only storage
```

## Verify Deployment

After deploying, test the upload:

1. Navigate to Profile page
2. Click "Auto Fill" button
3. Upload a test document
4. Should upload successfully without `storage/unauthorized` error

## Security Rules Explanation

### File Type Validation
```javascript
function isValidDocumentType() {
  return request.resource.contentType.matches('application/pdf') ||
         request.resource.contentType.matches('application/msword') ||
         request.resource.contentType.matches('application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
         request.resource.contentType.matches('image/jpeg') ||
         request.resource.contentType.matches('image/png');
}
```

### Size Validation
```javascript
function isValidSize() {
  return request.resource.size < 10 * 1024 * 1024; // 10MB max
}
```

### User Ownership
```javascript
function isOwner(userId) {
  return request.auth.uid == userId;
}
```

### Document Upload Rule
```javascript
match /documents/{userId}/{docType}/{fileName} {
  allow read: if isAuthenticated() && isOwner(userId);
  allow write: if isAuthenticated() && 
                 isOwner(userId) && 
                 isValidDocumentType() && 
                 isValidSize();
}
```

## Troubleshooting

### Still getting `storage/unauthorized`?

1. **Check deployment**:
   ```bash
   firebase deploy --only storage
   ```

2. **Verify in Firebase Console**:
   - Go to Storage → Rules
   - Check if rules are updated
   - Look for the `documents/{userId}` path

3. **Check user authentication**:
   - User must be logged in
   - `request.auth.uid` must match `{userId}` in path

4. **Check file path**:
   - Ensure path matches: `/documents/{userId}/cv/{fileName}`
   - User ID in path must match authenticated user

5. **Check file type**:
   - Must be PDF, DOC, DOCX, JPG, or PNG
   - Check `Content-Type` header

6. **Check file size**:
   - Must be under 10MB

### Debug in Firebase Console

1. Go to Storage → Rules
2. Click "Rules Playground"
3. Test your upload path:
   ```
   Path: /documents/CYouOs0zUWOFawJVw6dysFTdrsl1/cv/test.pdf
   Auth UID: CYouOs0zUWOFawJVw6dysFTdrsl1
   Operation: write
   ```
4. Should show "Allowed"

## Next Steps

1. **Deploy the rules** using one of the methods above
2. **Test the upload** in the Profile page
3. **Verify** the document appears in Firebase Storage
4. **Test AI processing** with a real CV

## Important Notes

- Rules are deployed globally (not per environment)
- Changes take effect immediately
- Test in emulator first if possible:
  ```bash
  firebase emulators:start
  ```
- Monitor usage in Firebase Console → Storage → Usage

## Security Best Practices

✅ **Implemented**:
- Authentication required
- User isolation
- File type validation
- File size limits
- Read/write separation

🔒 **Additional Recommendations**:
- Monitor storage usage
- Set up Cloud Functions to scan uploaded files
- Implement virus scanning for production
- Add rate limiting for uploads
- Log all upload attempts

## Cost Considerations

Firebase Storage pricing:
- **Storage**: $0.026/GB/month
- **Download**: $0.12/GB
- **Upload**: Free
- **Operations**: $0.05 per 10,000 operations

Estimated costs for 100 users:
- ~1GB storage: $0.026/month
- ~10GB downloads: $1.20/month
- **Total: ~$1.25/month**

Very affordable!
