# TEST MICROSOFT OAUTH2 AUTHENTICATION

## Quick Test Script

Create a test file to verify your Microsoft OAuth2 setup:

### 1. Create Test File

```javascript
// functions/test-microsoft-oauth.js
const axios = require('axios');

async function testMicrosoftAuth() {
  const CLIENT_ID = 'YOUR_CLIENT_ID';
  const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
  const TENANT_ID = 'YOUR_TENANT_ID';
  const FROM_EMAIL = 'noreply@medishift.ch';
  const TEST_RECIPIENT = 'your-test-email@example.com';

  console.log('🔐 Testing Microsoft OAuth2 Authentication...\n');

  try {
    // STEP 1: Get Access Token
    console.log('Step 1: Requesting access token...');
    const tokenEndpoint = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('grant_type', 'client_credentials');

    const tokenResponse = await axios.post(tokenEndpoint, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const accessToken = tokenResponse.data.access_token;
    console.log('✅ Access token obtained successfully');
    console.log(`Token expires in: ${tokenResponse.data.expires_in} seconds\n`);

    // STEP 2: Send Test Email
    console.log('Step 2: Sending test email...');
    const message = {
      message: {
        subject: 'Test Email - Banking Access Verification',
        body: {
          contentType: 'HTML',
          content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Test Email</h2>
              <p>This is a test email from the Banking Access Verification system.</p>
              <p>If you received this, your Microsoft OAuth2 configuration is working correctly!</p>
              <p><strong>Test Code: 123456</strong></p>
            </div>
          `
        },
        toRecipients: [
          {
            emailAddress: {
              address: TEST_RECIPIENT
            }
          }
        ],
        from: {
          emailAddress: {
            address: FROM_EMAIL
          }
        }
      },
      saveToSentItems: 'false'
    };

    await axios.post(
      `https://graph.microsoft.com/v1.0/users/${FROM_EMAIL}/sendMail`,
      message,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Test email sent successfully!');
    console.log(`📧 Check inbox at: ${TEST_RECIPIENT}\n`);
    console.log('🎉 Microsoft OAuth2 setup is working correctly!');

  } catch (error) {
    console.error('❌ Error during test:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    
    console.log('\n📋 Troubleshooting Tips:');
    console.log('1. Verify Client ID, Secret, and Tenant ID are correct');
    console.log('2. Check that Mail.Send permission is granted with admin consent');
    console.log('3. Ensure noreply@medishift.ch mailbox exists and is active');
    console.log('4. Verify app has SendAs permissions on the mailbox');
    console.log('5. Check Azure AD app registration is not expired');
  }
}

testMicrosoftAuth();
```

### 2. Run Test

```bash
cd functions
node test-microsoft-oauth.js
```

### 3. Expected Output (Success)

```
🔐 Testing Microsoft OAuth2 Authentication...

Step 1: Requesting access token...
✅ Access token obtained successfully
Token expires in: 3599 seconds

Step 2: Sending test email...
✅ Test email sent successfully!
📧 Check inbox at: your-test-email@example.com

🎉 Microsoft OAuth2 setup is working correctly!
```

### 4. Common Errors

#### Error: "invalid_client"
```json
{
  "error": "invalid_client",
  "error_description": "AADSTS7000215: Invalid client secret provided"
}
```
**Solution**: Client secret is incorrect or expired. Generate new secret in Azure AD.

#### Error: "unauthorized_client"
```json
{
  "error": "unauthorized_client",
  "error_description": "AADSTS700016: Application not found in directory"
}
```
**Solution**: Client ID or Tenant ID is incorrect. Verify from Azure AD app registration.

#### Error: 403 - "ErrorAccessDenied"
```json
{
  "error": {
    "code": "ErrorAccessDenied",
    "message": "Access is denied. Check credentials and try again."
  }
}
```
**Solution**: 
1. Verify `Mail.Send` permission is granted
2. Check admin consent was provided
3. Ensure app has SendAs permissions on mailbox

#### Error: 404 - "ResourceNotFound"
```json
{
  "error": {
    "code": "ResourceNotFound",
    "message": "Resource 'noreply@medishift.ch' does not exist"
  }
}
```
**Solution**: Mailbox doesn't exist or app doesn't have access. Create mailbox or grant permissions.

### 5. Verify in Azure Portal

1. Go to https://portal.azure.com
2. Azure Active Directory > App registrations > Your App
3. Check:
   - ✅ API permissions shows `Mail.Send` with green checkmark (admin consent granted)
   - ✅ Client secret is not expired
   - ✅ Application ID matches your MICROSOFT_CLIENT_ID
   - ✅ Directory ID matches your MICROSOFT_TENANT_ID

### 6. Grant Mailbox Permissions (If Needed)

```powershell
# Connect to Exchange Online
Connect-ExchangeOnline

# Grant SendAs permission
Add-MailboxPermission -Identity "noreply@medishift.ch" -User "YOUR_APP_CLIENT_ID" -AccessRights SendAs

# Verify permissions
Get-MailboxPermission -Identity "noreply@medishift.ch" | Where-Object {$_.User -like "*YOUR_APP_CLIENT_ID*"}
```

### 7. Alternative: Organization-Wide Permission

If you want the app to send from any mailbox in your organization:

1. Azure AD > App registrations > Your App
2. API permissions > Add permission
3. Microsoft Graph > Application permissions
4. Add `Mail.Send` (if not already added)
5. Grant admin consent
6. This allows sending from any mailbox without individual permissions

---

## Integration with Firebase Functions

Once test passes, your environment variables are correct:

```bash
MICROSOFT_CLIENT_ID=406b2cf6-2530-4c19-a7bd-0478f074156b
MICROSOFT_CLIENT_SECRET=5474bfa0-0ea5-47cd-a8dd-533e8256e0db
MICROSOFT_TENANT_ID=e8026978-c9e0-4640-b76b-bb83c6fba810
MICROSOFT_AUTH_TYPE=OAuth2
EMAIL_FROM=noreply@medishift.ch
EMAIL_SERVICE=Microsoft
```

Deploy and test in production! 🚀

