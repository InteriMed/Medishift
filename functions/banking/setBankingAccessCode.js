// ADMIN UTILITY: Set Banking Access Code for User

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const crypto = require('crypto');
const axios = require('axios');

// Define secrets
const MICROSOFT_CLIENT_ID = defineSecret('MICROSOFT_CLIENT_ID');
const MICROSOFT_CLIENT_SECRET = defineSecret('MICROSOFT_CLIENT_SECRET');
const MICROSOFT_TENANT_ID = defineSecret('MICROSOFT_TENANT_ID');
const INFOBIP_API_KEY = defineSecret('INFOBIP_API_KEY');

/**
 * Admin-callable function to set a banking access code for a user
 * The code is hashed with the userId as salt for security
 */
const setBankingAccessCode = onCall(
  { region: 'europe-west6' },
  async (request) => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const db = getFirestore(admin.app(), 'medishift');
    const adminDoc = await db.collection('admins').doc(auth.uid).get();
    
    if (!adminDoc.exists || adminDoc.data().isActive === false) {
      throw new HttpsError('permission-denied', 'Only administrators can set banking access codes');
    }

    const adminRoles = adminDoc.data().roles || [];
    if (!adminRoles.includes('super_admin') && !adminRoles.includes('ops_manager') && !adminRoles.includes('finance')) {
      throw new HttpsError('permission-denied', 'Only administrators can set banking access codes');
    }

    const { userId, code } = data;

    if (!userId || !code) {
      throw new HttpsError('invalid-argument', 'userId and code are required');
    }

    if (typeof code !== 'string' || code.length < 4) {
      throw new HttpsError('invalid-argument', 'Code must be at least 4 characters');
    }

    try {
      const hash = crypto
        .createHash('sha256')
        .update(code + userId)
        .digest('hex');

      await db.collection('users').doc(userId).update({
        bankingAccessHash: hash,
        'security.bankingAccessSetBy': auth.uid,
        'security.bankingAccessSetAt': new Date()
      });

      await db.collection('auditLogs').add({
        action: 'banking_access_code_set',
        performedBy: auth.uid,
        targetUser: userId,
        timestamp: new Date(),
        ipAddress: request.rawRequest?.ip || 'unknown'
      });

      return { success: true, message: 'Banking access code set successfully' };
    } catch (error) {
      console.error('Error setting banking access code:', error);
      throw new HttpsError('internal', 'Failed to set banking access code');
    }
  }
);

async function getMicrosoftAccessToken() {
  try {
    const clientId = MICROSOFT_CLIENT_ID.value();
    const clientSecret = MICROSOFT_CLIENT_SECRET.value();
    const tenantId = MICROSOFT_TENANT_ID.value();
    
    if (!clientId || !clientSecret || !tenantId) {
      throw new Error('Microsoft OAuth credentials not configured');
    }
    
    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('grant_type', 'client_credentials');

    const response = await axios.post(tokenEndpoint, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data.access_token;
  } catch (error) {
    console.error('[Microsoft OAuth] Failed to get access token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Microsoft');
  }
}

async function sendEmailViaMicrosoftGraph(to, subject, htmlBody) {
  try {
    const accessToken = await getMicrosoftAccessToken();
    const fromEmail = 'noreply@medishift.ch';

    const message = {
      message: {
        subject: subject,
        body: {
          contentType: 'HTML',
          content: htmlBody
        },
        toRecipients: [
          {
            emailAddress: {
              address: to
            }
          }
        ],
        from: {
          emailAddress: {
            address: fromEmail
          }
        }
      },
      saveToSentItems: 'false'
    };

    await axios.post(
      `https://graph.microsoft.com/v1.0/users/${fromEmail}/sendMail`,
      message,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`[Microsoft Graph] Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error('[Microsoft Graph] Failed to send email:', error.response?.data || error.message);
    throw new Error('Failed to send email via Microsoft Graph');
  }
}

/**
 * User-callable function to request a new banking access code via SMS/Email
 */
const requestBankingAccessCode = onCall(
  { 
    region: 'europe-west6',
    secrets: [MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID, INFOBIP_API_KEY]
  },
  async (request) => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const db = getFirestore(admin.app(), 'medishift');
    const userId = auth.uid;
    const method = data?.method || 'email';

    try {
      // Try professionalProfiles first, then users
      let userDoc = await db.collection('professionalProfiles').doc(userId).get();
      
      if (!userDoc.exists) {
        userDoc = await db.collection('users').doc(userId).get();
      }
      
      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User profile not found in either professionalProfiles or users collection');
      }

      const userData = userDoc.data();
      const collectionName = userDoc.ref.parent.id;
      
      if (method === 'email') {
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        const emailRequests = userData.security?.bankingEmailRequests || [];
        const recentEmailRequests = emailRequests.filter(ts => {
          const timestamp = ts.toDate ? ts.toDate().getTime() : ts;
          return timestamp > fiveMinutesAgo;
        });
        
        if (recentEmailRequests.length >= 3) {
          const oldestRequest = Math.min(...recentEmailRequests.map(ts => ts.toDate ? ts.toDate().getTime() : ts));
          const waitSeconds = Math.ceil((oldestRequest + 5 * 60 * 1000 - Date.now()) / 1000);
          const waitMinutes = Math.ceil(waitSeconds / 60);
          throw new HttpsError(
            'resource-exhausted',
            `You have reached the limit of 3 email codes per 5 minutes. Please wait ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''}.`
          );
        }
      } else if (method === 'phone') {
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const smsRequests = userData.security?.bankingSmsRequests || [];
        const recentSmsRequests = smsRequests.filter(ts => {
          const timestamp = ts.toDate ? ts.toDate().getTime() : ts;
          return timestamp > oneHourAgo;
        });
        
        if (recentSmsRequests.length >= 3) {
          const oldestRequest = Math.min(...recentSmsRequests.map(ts => ts.toDate ? ts.toDate().getTime() : ts));
          const waitMinutes = Math.ceil((oldestRequest + 60 * 60 * 1000 - Date.now()) / 60000);
          throw new HttpsError(
            'resource-exhausted',
            `You have reached the limit of 3 SMS codes per hour. Please wait ${waitMinutes} minutes.`
          );
        }
      }

      const tempCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      const updateData = {
        'security.tempBankingCode': tempCode,
        'security.tempBankingCodeExpiry': expiresAt
      };

      if (method === 'email') {
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        const emailRequests = userData.security?.bankingEmailRequests || [];
        const recentEmailRequests = emailRequests.filter(ts => {
          const timestamp = ts.toDate ? ts.toDate().getTime() : ts;
          return timestamp > fiveMinutesAgo;
        });
        updateData['security.bankingEmailRequests'] = [...recentEmailRequests.map(ts => ts.toDate ? ts.toDate() : new Date(ts)), new Date()];
      } else if (method === 'phone') {
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const smsRequests = userData.security?.bankingSmsRequests || [];
        const recentSmsRequests = smsRequests.filter(ts => {
          const timestamp = ts.toDate ? ts.toDate().getTime() : ts;
          return timestamp > oneHourAgo;
        });
        updateData['security.bankingSmsRequests'] = [...recentSmsRequests.map(ts => ts.toDate ? ts.toDate() : new Date(ts)), new Date()];
      }
      
      await db.collection(collectionName).doc(userId).update(updateData);

      console.log(`[Banking Access] Temporary code generated for user ${userId}: ${tempCode}`);

      let deliveryMethod = 'console';
      let deliverySuccess = false;

      if (method === 'email') {
        const userEmail = auth.token.email || userData.email || userData.contact?.email;
        
        if (userEmail) {
          try {
            const htmlBody = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #0066cc; padding: 20px; text-align: center;">
                  <h1 style="color: white; margin: 0;">MediShift</h1>
                </div>
                <div style="padding: 30px; background: #f9f9f9;">
                  <h2 style="color: #333;">Banking Access Verification</h2>
                  <p style="color: #666; line-height: 1.6;">
                    Your verification code for accessing banking information is:
                  </p>
                  <div style="background: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; color: #0066cc; letter-spacing: 8px;">
                      ${tempCode}
                    </span>
                  </div>
                  <p style="color: #666; line-height: 1.6;">
                    This code will expire in <strong>15 minutes</strong>.
                  </p>
                  <p style="color: #cc0000; line-height: 1.6; font-weight: bold;">
                    If you did not request this code, please contact support immediately.
                  </p>
                  <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                  <p style="color: #999; font-size: 12px; text-align: center;">
                    MediShift Healthcare Staffing Platform<br>
                    admin@medishift.ch
                  </p>
                </div>
              </div>
            `;

            await sendEmailViaMicrosoftGraph(
              userEmail,
              'Banking Access Verification Code - MediShift',
              htmlBody
            );

            console.log(`[Banking Access] Email sent to ${userEmail}`);
            deliveryMethod = 'email';
            deliverySuccess = true;
          } catch (emailError) {
            console.error('[Banking Access] Failed to send email:', emailError);
            throw new HttpsError('internal', 'Failed to send verification code via email. Please try again or contact support.');
          }
        } else {
          throw new HttpsError('failed-precondition', 'No email address found for your account.');
        }
      } else if (method === 'phone') {
        const userPhone = userData.contact?.primaryPhone || userData.primaryPhone;
        const phonePrefix = userData.contact?.primaryPhonePrefix || userData.primaryPhonePrefix || '+41';
        
        if (userPhone) {
          let fullPhone = `${phonePrefix}${userPhone}`.replace(/\s+/g, '');
          if (!fullPhone.startsWith('+')) {
            fullPhone = `+${fullPhone}`;
          }
          if (fullPhone.startsWith('+0')) {
            fullPhone = '+' + fullPhone.substring(2);
          }
          
          try {
            const infobipApiKey = INFOBIP_API_KEY.value();
            const infobipBaseUrl = 'api.infobip.com';
            const infobipSender = 'MediShift';
            
            if (infobipApiKey) {
              const https = require('https');
              
              const postData = JSON.stringify({
                messages: [
                  {
                    destinations: [{ to: fullPhone.substring(1) }],
                    from: infobipSender,
                    text: `Your MediShift banking access code is: ${tempCode}. Valid for 15 minutes. If you did not request this code, please contact support immediately.`
                  }
                ]
              });

              const options = {
                method: 'POST',
                hostname: infobipBaseUrl,
                path: '/sms/2/text/advanced',
                headers: {
                  'Authorization': `App ${infobipApiKey}`,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  'Content-Length': Buffer.byteLength(postData)
                },
                timeout: 10000
              };

              await new Promise((resolve, reject) => {
                const req = https.request(options, (res) => {
                  const chunks = [];
                  
                  res.on('data', (chunk) => {
                    chunks.push(chunk);
                  });
                  
                  res.on('end', () => {
                    const body = Buffer.concat(chunks).toString();
                    const response = JSON.parse(body);
                    
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                      console.log(`[Banking Access] SMS sent via Infobip to ${fullPhone}`, response);
                      resolve(response);
                    } else {
                      console.error('[Banking Access] Infobip error:', response);
                      reject(new Error(`Infobip API error: ${response.requestError?.serviceException?.text || 'Unknown error'}`));
                    }
                  });
                });
                
                req.on('error', (error) => {
                  console.error('[Banking Access] Infobip request error:', error);
                  reject(error);
                });
                
                req.on('timeout', () => {
                  req.destroy();
                  reject(new Error('Request timeout'));
                });
                
                req.write(postData);
                req.end();
              });
              
              console.log(`[Banking Access] SMS sent to ${fullPhone}`);
              deliveryMethod = 'sms';
              deliverySuccess = true;
            } else {
              console.warn('[Banking Access] Infobip not configured. SMS delivery not available.');
              throw new HttpsError(
                'failed-precondition',
                'SMS delivery is not configured. Please use email verification or contact support.'
              );
            }
          } catch (smsError) {
            console.error('[Banking Access] Failed to send SMS:', smsError);
            if (smsError instanceof HttpsError) {
              throw smsError;
            }
            throw new HttpsError('internal', 'Failed to send verification code via SMS. Please try email instead.');
          }
        } else {
          throw new HttpsError('failed-precondition', 'No phone number found for your account.');
        }
      }

      await db.collection('auditLogs').add({
        userId,
        action: 'banking_access_code_requested',
        method: deliveryMethod,
        success: deliverySuccess,
        timestamp: new Date(),
        ipAddress: request.rawRequest?.ip || 'unknown'
      });

      return { 
        success: true, 
        message: deliveryMethod === 'email' 
          ? 'Access code sent. Please check your email.'
          : 'Access code sent. Please check your phone.',
        expiresIn: 15,
        method: deliveryMethod
      };
    } catch (error) {
      console.error('[Banking Access] ERROR in requestBankingAccessCode:', error);
      console.error('[Banking Access] ERROR stack:', error.stack);
      console.error('[Banking Access] ERROR message:', error.message);
      console.error('[Banking Access] ERROR name:', error.name);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', `Failed to generate access code: ${error.message}`);
    }
  }
);

module.exports = {
  setBankingAccessCode,
  requestBankingAccessCode
};

