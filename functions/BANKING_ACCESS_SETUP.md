# Banking Access Verification Setup

## OVERVIEW

The Banking Access verification system provides secure two-factor authentication for accessing sensitive banking information. It supports both **Email** and **SMS** verification methods.

## EMAIL VERIFICATION (MICROSOFT GRAPH API - OAuth2)

Email verification is configured using **Microsoft Graph API** with OAuth2 client credentials flow.

### Required Environment Variables:
```bash
EMAIL_SERVICE=Microsoft
EMAIL_FROM=noreply@medishift.ch
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_TENANT_ID=your_tenant_id
MICROSOFT_AUTH_TYPE=OAuth2
```

### Microsoft App Registration Setup:

1. **Register Azure AD Application**:
   - Go to https://portal.azure.com
   - Navigate to Azure Active Directory > App registrations
   - Click "New registration"
   - Name: "MediShift Banking Notifications"
   - Supported account types: Single tenant
   - Click "Register"

2. **Configure API Permissions**:
   - In your app, go to "API permissions"
   - Click "Add a permission" > Microsoft Graph > Application permissions
   - Add: `Mail.Send` (Application permission, not Delegated)
   - Click "Grant admin consent" for your tenant

3. **Create Client Secret**:
   - Go to "Certificates & secrets"
   - Click "New client secret"
   - Description: "Banking Access Email Service"
   - Expiry: Choose duration (12-24 months recommended)
   - Copy the **Value** (this is your MICROSOFT_CLIENT_SECRET)

4. **Get Application IDs**:
   - **Client ID**: Found in "Overview" page as "Application (client) ID"
   - **Tenant ID**: Found in "Overview" page as "Directory (tenant) ID"

5. **Grant Mailbox Permissions**:
   - The app needs permission to send from `noreply@medishift.ch`
   - In Microsoft 365 Admin Center or Exchange Online PowerShell:
   ```powershell
   Add-MailboxPermission -Identity "noreply@medishift.ch" -User "YOUR_APP_ID" -AccessRights SendAs
   ```
   - Or grant organization-wide send permissions in Azure AD

### Why OAuth2 Instead of SMTP?
- ✅ No password/App Password needed
- ✅ More secure (token-based authentication)
- ✅ Better for automated services
- ✅ No MFA complications
- ✅ Easier to manage permissions
- ✅ Modern authentication standard


## SMS VERIFICATION (INFOBIP)

SMS verification is configured using **Infobip** ([pricing details](https://portal.infobip.com/pricing)).

### 1. INFOBIP ACCOUNT SETUP

1. Go to https://www.infobip.com/
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key
5. Copy your API key

### 2. CONFIGURE FIREBASE ENVIRONMENT

Set the following environment variables in Firebase Console or using CLI:

```bash
firebase functions:config:set \
  infobip.api_key="YOUR_INFOBIP_API_KEY" \
  infobip.base_url="api.infobip.com" \
  infobip.sender="MediShift"
```

For local development, create `.env` file in the `functions` directory:

```bash
# Copy from .env.example
cp .env.example .env

# Edit .env with your credentials:
INFOBIP_API_KEY=your_infobip_api_key_here
INFOBIP_BASE_URL=api.infobip.com
INFOBIP_SENDER=MediShift
```

**Note**: The sender can be:
- Alphanumeric sender ID (e.g., "MediShift") - Requires registration with Infobip
- Your registered phone number (e.g., "41798070047")

### 3. DEPLOY FUNCTIONS

```bash
cd functions
firebase deploy --only functions:requestBankingAccessCode,functions:verifyBankingAccessCode
```

## CLOUD FUNCTION ENDPOINTS

### 1. requestBankingAccessCode
- **Purpose**: Generate and send a 6-digit verification code
- **Parameters**: 
  - `method`: 'email' or 'phone'
- **Response**: 
  ```json
  {
    "success": true,
    "message": "Access code sent. Please check your email/phone.",
    "expiresIn": 15,
    "method": "email"
  }
  ```

### 2. verifyBankingAccessCode
- **Purpose**: Verify the provided code
- **Parameters**: 
  - `code`: 6-digit verification code
- **Response**: 
  ```json
  {
    "success": true
  }
  ```

## SECURITY FEATURES

- **Rate Limiting**: 5-minute cooldown between code requests
- **Code Expiry**: Codes expire after 15 minutes
- **Failed Attempt Tracking**: Failed verification attempts are logged
- **Audit Logging**: All access requests and grants are logged
- **Client-side Session**: 1-hour access token stored in localStorage after successful verification

## TESTING

### Test Email Verification:
1. Open the Banking Information section
2. Click "Unlock Banking Data"
3. Select "Email" method
4. Click "Send Code"
5. Check your email for the 6-digit code
6. Enter the code and verify

### Test SMS Verification (After Twilio Setup):
1. Open the Banking Information section
2. Click "Unlock Banking Data"
3. Select "Phone" method
4. Click "Send Code"
5. Check your phone for SMS with 6-digit code
6. Enter the code and verify

## TROUBLESHOOTING

### Email Not Sending
- Verify Azure AD app has `Mail.Send` permission granted
- Check admin consent was granted for the permission
- Verify Client ID, Client Secret, and Tenant ID are correct
- Check token endpoint is accessible: `https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token`
- Ensure `noreply@medishift.ch` mailbox exists and is active
- Verify app has SendAs permissions on the mailbox
- Check Firebase Functions logs: `firebase functions:log`
- Test token acquisition separately to isolate issues

### SMS Not Sending
- Verify Infobip API key is correct
- Check Infobip account has sufficient credits
- Ensure user has valid phone number in their profile
- Check phone number format (should include country code, e.g., +41763392889)
- Verify sender ID is registered/approved in Infobip
- Review Infobip portal for delivery reports
- Check Firebase Functions logs for API error responses

### Code Not Working
- Verify code hasn't expired (15 minutes)
- Check user entered exactly 6 digits
- Review audit logs in Firestore
- Check Firebase Functions logs for errors

## DATABASE STRUCTURE

Banking access codes are stored in the user document:

```javascript
users/{userId}
  security: {
    tempBankingCode: "123456",
    tempBankingCodeExpiry: Timestamp,
    lastBankingCodeRequest: Timestamp,
    lastBankingAccessGranted: Timestamp,
    failedBankingAccessAttempts: 0,
    lastFailedBankingAccess: Timestamp
  }
```

## COST ESTIMATES

### Email (Microsoft via GoDaddy):
- Included with GoDaddy Premium domain package
- No additional per-email costs
- 50GB mailbox storage per account

### SMS (Infobip):
Based on [Infobip pricing](https://portal.infobip.com/pricing):
- Switzerland (CH): ~€0.07-0.09 per SMS
- European countries: ~€0.03-0.08 per SMS
- Transactional SMS tier pricing available
- Pay-as-you-go or volume discounts
- Estimate 50-100 SMS/month = ~€5-10/month

## PRODUCTION CHECKLIST

- [ ] Microsoft SMTP configured with `noreply@medishift.ch`
- [ ] App Password created if using MFA
- [ ] Authenticated SMTP enabled in Microsoft 365
- [ ] Email service tested (send test verification email)
- [ ] Infobip account created and API key obtained
- [ ] Infobip sender ID registered/approved
- [ ] SMS service tested (send test verification SMS)
- [ ] Environment variables set in Firebase production
- [ ] Rate limiting verified (5-minute cooldown)
- [ ] Audit logging confirmed working
- [ ] User phone numbers verified and formatted correctly
- [ ] Error handling tested for both email and SMS failures
- [ ] Monitoring/alerting setup for failed deliveries
- [ ] Cost tracking enabled in Infobip dashboard

