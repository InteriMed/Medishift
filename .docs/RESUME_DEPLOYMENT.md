# Deploy Fix - Step by Step

## Issue
The deployment failed because `functions.auth.user().onLogin` is not a valid Firebase function.

## Fix Applied
1. **Removed Invalid Trigger**: Commented out `updateUserLastLogin` in `functions/database/index.js` as `onLogin` does not exist in Firebase Auth triggers.
2. **Removed Export**: Commented out the export in `functions/index.js`.
3. **Verified Node.js Version**: Confirmed `package.json` is set to `"node": "20"`.
4. **Verified CORS**: Confirmed `processDocument` is using v2 `onCall` with `cors: true`.

## How to Resume Deployment

Run the following command in your terminal:

```bash
firebase deploy --only functions:processDocument
```

### If you want to deploy all functions:
```bash
firebase deploy --only functions
```

## Troubleshooting

If you see `Error: functions codebase could not be analyzed successfully`, it usually means there's a syntax error. We have fixed the known error.

If you see `HTTP Error: 400, Precondition check failed`, ensure that your `functions/package.json` has `"node": "20"` (which we already set).

## Next Steps

1. **Deploy successfully**
2. **Test Document Auto-Fill** on the Profile page
3. **Monitor logs**: `firebase functions:log --only processDocument`

The code is now ready for deployment! 🚀
