# Firebase Secrets Setup (Modern Approach)

Firebase deprecated `functions.config()` in favor of **Secret Manager**.

## 🔐 Set Secrets Using Firebase CLI

Run these commands in WSL terminal:

```bash
cd ~/Interimed/NEW\ INTERIMED\ MERGED

# Set Microsoft OAuth2 secrets
firebase functions:secrets:set MICROSOFT_CLIENT_ID
# When prompted, paste: 406b2cf6-2530-4c19-a7bd-0478f074156b

firebase functions:secrets:set MICROSOFT_CLIENT_SECRET
# When prompted, paste: 5474bfa0-0ea5-47cd-a8dd-533e8256e0db

firebase functions:secrets:set MICROSOFT_TENANT_ID
# When prompted, paste: e8026978-c9e0-4640-b76b-bb83c6fba810

# Set Infobip API key
firebase functions:secrets:set INFOBIP_API_KEY
# When prompted, paste: 8272f672c72b130bb8840ce7fefa758c-89f5ca69-24db-423a-b11d-37cf8c588c30
```

## 📋 Verify Secrets

```bash
firebase functions:secrets:access MICROSOFT_CLIENT_ID
firebase functions:secrets:access MICROSOFT_CLIENT_SECRET
firebase functions:secrets:access MICROSOFT_TENANT_ID
firebase functions:secrets:access INFOBIP_API_KEY
```

## 🚀 Deploy Functions

```bash
firebase deploy --only functions:requestBankingAccessCode,functions:verifyBankingAccessCode
```

During deployment, Firebase will prompt you to grant Secret Manager access if needed.

## ✅ Benefits of Secret Manager

- ✅ More secure than runtime config
- ✅ Automatic encryption
- ✅ Audit logging
- ✅ Version control for secrets
- ✅ Not deprecated (future-proof)

## 🔧 Local Development

For local testing, create `.secret.local` file in functions directory:

```bash
cd functions
echo "406b2cf6-2530-4c19-a7bd-0478f074156b" > .secret.MICROSOFT_CLIENT_ID.local
echo "5474bfa0-0ea5-47cd-a8dd-533e8256e0db" > .secret.MICROSOFT_CLIENT_SECRET.local
echo "e8026978-c9e0-4640-b76b-bb83c6fba810" > .secret.MICROSOFT_TENANT_ID.local
echo "8272f672c72b130bb8840ce7fefa758c-89f5ca69-24db-423a-b11d-37cf8c588c30" > .secret.INFOBIP_API_KEY.local
```

Add to `.gitignore`:
```
functions/.secret.*.local
```

## 💰 Pricing Note

Secret Manager has a small cost:
- $0.06 per secret version per month
- $0.03 per 10,000 access operations

For 4 secrets, this is about **$0.24/month**.

## 🆘 Troubleshooting

### Error: "Secret Manager API not enabled"

Run:
```bash
gcloud services enable secretmanager.googleapis.com --project=interimed-620fd
```

### Error: "Permission denied"

Grant your Firebase service account access:
```bash
gcloud projects add-iam-policy-binding interimed-620fd \
  --member="serviceAccount:436488373074-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Check IAM Permissions

Go to: https://console.cloud.google.com/iam-admin/iam?project=interimed-620fd

Ensure the service account `436488373074-compute@developer.gserviceaccount.com` has:
- Secret Manager Secret Accessor

## 📝 What Changed in Code

1. Added `defineSecret()` imports
2. Changed from `functions.config()` to `SECRET.value()`
3. Added `secrets` parameter to `onCall()` function definition

## ✅ Success Checklist

- [ ] All 4 secrets set using `firebase functions:secrets:set`
- [ ] Secrets verified with `firebase functions:secrets:access`
- [ ] Secret Manager API enabled
- [ ] Functions deployed
- [ ] Test sending code - works!

