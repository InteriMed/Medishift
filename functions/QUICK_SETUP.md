# QUICK SETUP - Banking Access Verification

## 1. CONFIGURE ENVIRONMENT VARIABLES

### Create .env File

```bash
cd functions
cp .env.template .env
```

### Edit .env with Your Credentials

```bash
# functions/.env
MICROSOFT_CLIENT_ID=406b2cf6-2530-4c19-a7bd-0478f074156b
MICROSOFT_CLIENT_SECRET=5474bfa0-0ea5-47cd-a8dd-533e8256e0db
MICROSOFT_TENANT_ID=e8026978-c9e0-4640-b76b-bb83c6fba810
EMAIL_FROM=noreply@medishift.ch
INFOBIP_API_KEY=your_actual_infobip_key
INFOBIP_BASE_URL=api.infobip.com
INFOBIP_SENDER=MediShift
```

**Note:** The `.env` file works for both local development AND production deployment. Firebase will automatically include it when deploying.

## 2. MICROSOFT EMAIL SETUP (OAuth2)

1. **Register App in Azure AD**:
   - Go to https://portal.azure.com
   - Azure Active Directory > App registrations > New registration
   - Name: "MediShift Banking Notifications"
   - Register as Single tenant

2. **Configure API Permissions**:
   - API permissions > Add permission
   - Microsoft Graph > Application permissions
   - Add `Mail.Send`
   - Grant admin consent

3. **Create Client Secret**:
   - Certificates & secrets > New client secret
   - Copy the secret value immediately (won't be shown again)

4. **Copy IDs**:
   - From Overview page, copy:
     - Application (client) ID → `MICROSOFT_CLIENT_ID`
     - Directory (tenant) ID → `MICROSOFT_TENANT_ID`
     - Client secret value → `MICROSOFT_CLIENT_SECRET`

5. **Grant Mailbox Permissions** (if needed):
   ```powershell
   # Using Exchange Online PowerShell
   Add-MailboxPermission -Identity "noreply@medishift.ch" -User "<YOUR_APP_ID>" -AccessRights SendAs
   ```

## 3. INFOBIP SMS SETUP

1. Go to https://www.infobip.com/
2. Sign up / Log in
3. Navigate to API Keys section
4. Create new API key
5. Copy API key to INFOBIP_API_KEY
6. Add credits to your account
7. (Optional) Register sender ID "MediShift" for better delivery

## 4. DEPLOY

```bash
cd functions
firebase deploy --only functions:requestBankingAccessCode,functions:verifyBankingAccessCode
```

## 5. TEST

### Test Email:
```bash
# Use Firebase Console Functions tab
# Or call from your app
```

### Test SMS:
```bash
# Ensure user has valid phone number with country code
# Example: +41763392889
```

## TROUBLESHOOTING

### Email Issues:
- Verify Azure AD app has `Mail.Send` permission with admin consent
- Check Client ID, Secret, and Tenant ID are correct
- Verify `noreply@medishift.ch` mailbox exists
- Test token endpoint: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token`
- Check app has SendAs permissions on mailbox
- Review Azure AD sign-in logs for app authentication attempts
- Run test script: `node test-microsoft-oauth.js`

### SMS Issues:
- Verify Infobip API key
- Check account has credits
- Verify phone number format (+41XXXXXXXXX)
- Check Infobip portal for delivery reports

## SUPPORT

For issues:
- Check Firebase Functions logs: `firebase functions:log`
- Check Infobip delivery reports in portal
- Review BANKING_ACCESS_SETUP.md for detailed docs

