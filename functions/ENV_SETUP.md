# Environment Variables Setup Using .env

## OVERVIEW

This project uses `.env` file for environment variables instead of Firebase config. This provides:
- ✅ Simpler configuration
- ✅ Works for both local and production
- ✅ Standard approach across all Node.js projects
- ✅ Easy to update and version control (template only)

## SETUP

### 1. Create .env File

```bash
cd functions
cp .env.template .env
```

### 2. Edit .env with Your Credentials

Open `functions/.env` and add your actual values:

```bash
# MICROSOFT OAUTH2
MICROSOFT_CLIENT_ID=406b2cf6-2530-4c19-a7bd-0478f074156b
MICROSOFT_CLIENT_SECRET=5474bfa0-0ea5-47cd-a8dd-533e8256e0db
MICROSOFT_TENANT_ID=e8026978-c9e0-4640-b76b-bb83c6fba810
EMAIL_FROM=noreply@medishift.ch

# INFOBIP SMS
INFOBIP_API_KEY=your_actual_infobip_api_key
INFOBIP_BASE_URL=api.infobip.com
INFOBIP_SENDER=MediShift
```

### 3. Deploy

```bash
firebase deploy --only functions
```

Firebase will automatically include the `.env` file during deployment.

## HOW IT WORKS

### In functions/index.js:

```javascript
// Load environment variables from .env file
require('dotenv').config();
```

This loads all variables from `functions/.env` into `process.env`.

### In Cloud Functions:

```javascript
// Access environment variables
const clientId = process.env.MICROSOFT_CLIENT_ID;
const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
```

## SECURITY

### ✅ SECURE:
- `.env` is in `.gitignore` - never committed to Git
- `.env.template` is committed - shows structure without secrets
- Only you and Firebase have access to actual values

### 🔒 BEST PRACTICES:
1. Never commit `.env` to Git
2. Keep `.env.template` updated with variable names (not values)
3. Share credentials securely with team members
4. Rotate secrets periodically

## LOCAL DEVELOPMENT

The same `.env` file works for:
- Local testing with Firebase emulators
- Running test scripts (`test-microsoft-oauth.js`)
- Production deployment

## TROUBLESHOOTING

### Variables not loading?

**Check 1:** File exists
```bash
cd functions
ls -la .env
```

**Check 2:** dotenv is loaded in index.js
```javascript
require('dotenv').config();
```

**Check 3:** No typos in variable names
```bash
# Correct:
MICROSOFT_CLIENT_ID=...

# Wrong:
MICROSOFT_CLIENTID=...  # Missing underscore
```

**Check 4:** Redeploy after changes
```bash
firebase deploy --only functions
```

### Still not working?

**Test locally first:**
```bash
cd functions
node test-microsoft-oauth.js
```

This will show if environment variables are loading correctly.

## MIGRATION FROM FIREBASE CONFIG

If you previously used `firebase functions:config:set`, you can migrate:

### Old Way (Firebase Config):
```bash
firebase functions:config:set microsoft.client_id="..."
```

### New Way (.env file):
```bash
# Create functions/.env
MICROSOFT_CLIENT_ID=...
```

**Advantages of .env:**
- ✅ Faster to update (no CLI command needed)
- ✅ Easier to manage (single file)
- ✅ Standard Node.js approach
- ✅ Works with Firebase emulators

## TEMPLATE REFERENCE

Keep `functions/.env.template` updated as reference:

```bash
# functions/.env.template
MICROSOFT_CLIENT_ID=your_client_id_here
MICROSOFT_CLIENT_SECRET=your_client_secret_here
MICROSOFT_TENANT_ID=your_tenant_id_here
EMAIL_FROM=noreply@medishift.ch
INFOBIP_API_KEY=your_infobip_api_key_here
INFOBIP_BASE_URL=api.infobip.com
INFOBIP_SENDER=MediShift
```

This helps team members know what variables are needed.

## DEPLOYMENT CHECKLIST

- [ ] `functions/.env` file created
- [ ] All required variables set with actual values
- [ ] `.env` is in `.gitignore`
- [ ] Test locally: `node test-microsoft-oauth.js`
- [ ] Deploy: `firebase deploy --only functions`
- [ ] Test in production: Open Banking Access Modal

---

**Simple, secure, and standard!** 🚀

