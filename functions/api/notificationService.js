const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const axios = require('axios');
const https = require('https');
const admin = require('firebase-admin');

const db = require('../../../Medishift/functions/database/dbhift/functions/database/db');

const MICROSOFT_CLIENT_ID = defineSecret('MICROSOFT_CLIENT_ID');
const MICROSOFT_CLIENT_SECRET = defineSecret('MICROSOFT_CLIENT_SECRET');
const MICROSOFT_TENANT_ID = defineSecret('MICROSOFT_TENANT_ID');
const INFOBIP_API_KEY = defineSecret('INFOBIP_API_KEY');

async function getMicrosoftAccessToken() {
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
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  return response.data.access_token;
}

async function sendEmailNotification({ to, subject, htmlBody, from, replyTo }) {
  const accessToken = await getMicrosoftAccessToken();
  const fromEmail = from || 'noreply@medishift.ch';

  const recipients = Array.isArray(to) ? to : [to];

  const message = {
    message: {
      subject,
      body: {
        contentType: 'HTML',
        content: htmlBody
      },
      toRecipients: recipients.map(email => ({
        emailAddress: { address: email }
      })),
      from: {
        emailAddress: { address: fromEmail }
      }
    },
    saveToSentItems: 'false'
  };

  if (replyTo) {
    message.message.replyTo = [{
      emailAddress: { address: replyTo }
    }];
  }

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

  logger.info(`[Notification] Email sent to ${recipients.join(', ')}`);
  return { success: true, method: 'email', recipients };
}

async function sendSMSNotification({ to, message }) {
  const infobipApiKey = INFOBIP_API_KEY.value();

  if (!infobipApiKey) {
    throw new Error('Infobip API key not configured');
  }

  const phones = Array.isArray(to) ? to : [to];

  const formattedPhones = phones.map(phone => {
    let formatted = phone.replace(/\s+/g, '');
    if (!formatted.startsWith('+')) {
      formatted = `+${formatted}`;
    }
    if (formatted.startsWith('+0')) {
      formatted = '+' + formatted.substring(2);
    }
    return formatted.substring(1);
  });

  const postData = JSON.stringify({
    messages: formattedPhones.map(phone => ({
      destinations: [{ to: phone }],
      from: 'MediShift',
      text: message
    }))
  });

  const options = {
    method: 'POST',
    hostname: 'api.infobip.com',
    path: '/sms/2/text/advanced',
    headers: {
      'Authorization': `App ${infobipApiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
    timeout: 10000
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];

      res.on('data', (chunk) => chunks.push(chunk));

      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        const response = JSON.parse(body);

        if (res.statusCode >= 200 && res.statusCode < 300) {
          logger.info(`[Notification] SMS sent to ${formattedPhones.join(', ')}`, response);
          resolve({ success: true, method: 'sms', recipients: formattedPhones, response });
        } else {
          logger.error('[Notification] Infobip error:', response);
          reject(new Error(`Infobip API error: ${response.requestError?.serviceException?.text || 'Unknown error'}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

const EMAIL_TEMPLATES = {
  shift_assigned: (data) => ({
    subject: `New Shift Assignment - ${data.facilityName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0066cc, #004999); padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0;">New Shift Assigned!</h1>
        </div>
        <div style="padding: 32px; background: #ffffff;">
          <p>Hello ${data.workerName || 'there'},</p>
          <p>You have been assigned a new shift:</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 8px 0;"><strong>Facility:</strong> ${data.facilityName}</p>
            <p style="margin: 8px 0;"><strong>Date:</strong> ${data.date}</p>
            <p style="margin: 8px 0;"><strong>Time:</strong> ${data.startTime} - ${data.endTime}</p>
            ${data.notes ? `<p style="margin: 8px 0;"><strong>Notes:</strong> ${data.notes}</p>` : ''}
          </div>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${data.dashboardUrl || 'https://medishift.ch/dashboard/calendar'}" 
               style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
              View in Dashboard
            </a>
          </div>
        </div>
        <div style="background: #f8f9fa; padding: 16px; text-align: center; font-size: 12px; color: #666;">
          MediShift Healthcare Staffing Platform
        </div>
      </div>
    `
  }),

  shift_reminder: (data) => ({
    subject: `Reminder: Shift Tomorrow at ${data.facilityName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0;">⏰ Shift Reminder</h1>
        </div>
        <div style="padding: 32px; background: #ffffff;">
          <p>Hello ${data.workerName || 'there'},</p>
          <p>This is a reminder about your upcoming shift tomorrow:</p>
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 8px 0;"><strong>Facility:</strong> ${data.facilityName}</p>
            <p style="margin: 8px 0;"><strong>Date:</strong> ${data.date}</p>
            <p style="margin: 8px 0;"><strong>Time:</strong> ${data.startTime} - ${data.endTime}</p>
            <p style="margin: 8px 0;"><strong>Address:</strong> ${data.address || 'Check dashboard for details'}</p>
          </div>
          <p style="color: #666;">Please ensure you arrive on time. Contact us if you have any questions.</p>
        </div>
        <div style="background: #f8f9fa; padding: 16px; text-align: center; font-size: 12px; color: #666;">
          MediShift Healthcare Staffing Platform
        </div>
      </div>
    `
  }),

  shift_cancelled: (data) => ({
    subject: `Shift Cancelled - ${data.facilityName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0;">Shift Cancelled</h1>
        </div>
        <div style="padding: 32px; background: #ffffff;">
          <p>Hello ${data.workerName || 'there'},</p>
          <p>Unfortunately, the following shift has been cancelled:</p>
          <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 8px 0;"><strong>Facility:</strong> ${data.facilityName}</p>
            <p style="margin: 8px 0;"><strong>Date:</strong> ${data.date}</p>
            <p style="margin: 8px 0;"><strong>Time:</strong> ${data.startTime} - ${data.endTime}</p>
            ${data.reason ? `<p style="margin: 8px 0;"><strong>Reason:</strong> ${data.reason}</p>` : ''}
          </div>
          <p style="color: #666;">We apologize for any inconvenience. Please check the marketplace for other available shifts.</p>
        </div>
        <div style="background: #f8f9fa; padding: 16px; text-align: center; font-size: 12px; color: #666;">
          MediShift Healthcare Staffing Platform
        </div>
      </div>
    `
  }),

  promotion: (data) => ({
    subject: data.subject || 'Special Offer from MediShift',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">${data.headline || '🎉 Special Offer!'}</h1>
          ${data.subheadline ? `<p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0;">${data.subheadline}</p>` : ''}
        </div>
        <div style="padding: 32px; background: #ffffff;">
          ${data.greeting ? `<p style="font-size: 16px;">${data.greeting}</p>` : ''}
          <div style="line-height: 1.6; color: #333;">
            ${data.body}
          </div>
          ${data.ctaText && data.ctaUrl ? `
          <div style="text-align: center; margin: 32px 0;">
            <a href="${data.ctaUrl}" 
               style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              ${data.ctaText}
            </a>
          </div>
          ` : ''}
          ${data.footer ? `<p style="color: #666; font-size: 14px; margin-top: 24px;">${data.footer}</p>` : ''}
        </div>
        <div style="background: #f8f9fa; padding: 16px; text-align: center; font-size: 12px; color: #666;">
          <p style="margin: 0;">MediShift Healthcare Staffing Platform</p>
          <p style="margin: 8px 0 0 0;"><a href="${data.unsubscribeUrl || '#'}" style="color: #666;">Unsubscribe</a></p>
        </div>
      </div>
    `
  }),

  welcome: (data) => ({
    subject: 'Welcome to MediShift! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0066cc, #004999); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to MediShift!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0;">Your healthcare staffing journey starts here</p>
        </div>
        <div style="padding: 32px; background: #ffffff;">
          <p style="font-size: 16px;">Hello ${data.name || 'there'},</p>
          <p style="color: #333; line-height: 1.6;">
            Thank you for joining MediShift! We're excited to have you as part of our healthcare community.
          </p>
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <h3 style="margin: 0 0 12px 0; color: #0066cc;">Getting Started:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #333;">
              <li style="margin: 8px 0;">Complete your profile to get verified</li>
              <li style="margin: 8px 0;">Browse available shifts in the marketplace</li>
              <li style="margin: 8px 0;">Set up your notification preferences</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${data.dashboardUrl || 'https://medishift.ch/dashboard'}" 
               style="background: #0066cc; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Go to Dashboard
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Need help? Contact us at <a href="mailto:admin@medishift.ch" style="color: #0066cc;">admin@medishift.ch</a>
          </p>
        </div>
        <div style="background: #f8f9fa; padding: 16px; text-align: center; font-size: 12px; color: #666;">
          MediShift Healthcare Staffing Platform
        </div>
      </div>
    `
  }),

  generic: (data) => ({
    subject: data.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0066cc, #004999); padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0;">${data.title || 'MediShift'}</h1>
        </div>
        <div style="padding: 32px; background: #ffffff;">
          ${data.greeting ? `<p style="font-size: 16px;">${data.greeting}</p>` : ''}
          <div style="line-height: 1.6; color: #333;">
            ${data.body}
          </div>
          ${data.ctaText && data.ctaUrl ? `
          <div style="text-align: center; margin: 32px 0;">
            <a href="${data.ctaUrl}" 
               style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
              ${data.ctaText}
            </a>
          </div>
          ` : ''}
        </div>
        <div style="background: #f8f9fa; padding: 16px; text-align: center; font-size: 12px; color: #666;">
          MediShift Healthcare Staffing Platform
        </div>
      </div>
    `
  })
};

const SMS_TEMPLATES = {
  shift_assigned: (data) => 
    `MediShift: New shift assigned at ${data.facilityName} on ${data.date} (${data.startTime}-${data.endTime}). Check your dashboard for details.`,
  
  shift_reminder: (data) => 
    `MediShift Reminder: Shift tomorrow at ${data.facilityName}, ${data.startTime}-${data.endTime}. Address: ${data.address || 'See app'}`,
  
  shift_cancelled: (data) => 
    `MediShift: Your shift at ${data.facilityName} on ${data.date} has been cancelled. Check marketplace for alternatives.`,
  
  verification_code: (data) => 
    `Your MediShift verification code is: ${data.code}. Valid for ${data.validMinutes || 15} minutes.`,
  
  banking_updated: (data) => 
    `MediShift Security Alert: Your banking information was updated on ${data.date}. If this wasn't you, contact support immediately.`,
  
  generic: (data) => data.message
};

const LOGO_URL = 'https://firebasestorage.googleapis.com/v0/b/interimed-620fd.firebasestorage.app/o/public%2Flogo.png?alt=media';

const createEmailWrapper = (content, options = {}) => {
  const { 
    headerColor = '#0066cc',
    headerGradient = 'linear-gradient(135deg, #0066cc, #004999)',
    title = 'MediShift',
    subtitle = ''
  } = options;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Segoe UI', Arial, sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
              <!-- Logo Header -->
              <tr>
                <td align="center" style="padding-bottom: 24px;">
                  <img src="${LOGO_URL}" alt="MediShift" style="height: 48px; width: auto;" />
                </td>
              </tr>
              
              <!-- Main Card -->
              <tr>
                <td>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                    <!-- Header Banner -->
                    <tr>
                      <td style="background: ${headerGradient}; padding: 32px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">${title}</h1>
                        ${subtitle ? `<p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">${subtitle}</p>` : ''}
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 32px;">
                        ${content}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 24px; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #71717a;">
                    MediShift Healthcare Staffing Platform
                  </p>
                  <p style="margin: 8px 0 0 0; font-size: 12px; color: #a1a1aa;">
                    This is an automated message. Please do not reply directly.
                  </p>
                  <p style="margin: 16px 0 0 0; font-size: 11px; color: #a1a1aa;">
                    <a href="https://medishift.ch/privacy" style="color: #a1a1aa; text-decoration: underline;">Privacy Policy</a>
                    &nbsp;|&nbsp;
                    <a href="https://medishift.ch/terms" style="color: #a1a1aa; text-decoration: underline;">Terms of Service</a>
                    &nbsp;|&nbsp;
                    <a href="mailto:admin@medishift.ch" style="color: #a1a1aa; text-decoration: underline;">Contact Support</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

EMAIL_TEMPLATES.banking_updated = (data) => {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="width: 64px; height: 64px; background: #fef3c7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
        <span style="font-size: 32px;">🔒</span>
      </div>
    </div>
    
    <p style="color: #27272a; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      Hello${data.name ? ` ${data.name}` : ''},
    </p>
    
    <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
      We're writing to confirm that your banking information has been successfully updated in your MediShift account.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f8fafc; border-radius: 12px; margin: 24px 0;">
      <tr>
        <td style="padding: 24px;">
          <h3 style="color: #27272a; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Update Details:</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #71717a; font-size: 14px; width: 120px;">Date:</td>
              <td style="padding: 8px 0; color: #27272a; font-size: 14px; font-weight: 500;">${data.date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Time:</td>
              <td style="padding: 8px 0; color: #27272a; font-size: 14px; font-weight: 500;">${data.time}</td>
            </tr>
            ${data.bankName ? `
            <tr>
              <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Bank:</td>
              <td style="padding: 8px 0; color: #27272a; font-size: 14px; font-weight: 500;">${data.bankName}</td>
            </tr>
            ` : ''}
            ${data.ibanLast4 ? `
            <tr>
              <td style="padding: 8px 0; color: #71717a; font-size: 14px;">IBAN:</td>
              <td style="padding: 8px 0; color: #27272a; font-size: 14px; font-weight: 500;">****${data.ibanLast4}</td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    </table>
    
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="color: #991b1b; font-size: 14px; line-height: 1.6; margin: 0;">
        <strong>⚠️ Security Notice:</strong> If you did not make this change, please contact our support team immediately at 
        <a href="mailto:admin@medishift.ch" style="color: #991b1b; font-weight: 600;">admin@medishift.ch</a>
      </p>
    </div>
    
    <p style="color: #52525b; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
      Thank you for keeping your account information up to date.
    </p>
    
    <p style="color: #52525b; font-size: 14px; line-height: 1.6; margin: 16px 0 0 0;">
      Best regards,<br>
      <strong style="color: #27272a;">The MediShift Team</strong>
    </p>
  `;

  return {
    subject: '🔒 Banking Information Updated - MediShift',
    html: createEmailWrapper(content, {
      title: 'Banking Information Updated',
      subtitle: 'Your payment details have been changed',
      headerGradient: 'linear-gradient(135deg, #f59e0b, #d97706)'
    })
  };
};

const sendNotification = onCall(
  {
    region: 'europe-west6',
    secrets: [MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID, INFOBIP_API_KEY]
  },
  async (request) => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { 
      type,
      method,
      recipients,
      template,
      templateData,
      customSubject,
      customMessage,
      customHtml,
      from
    } = data;

    if (!recipients || recipients.length === 0) {
      throw new HttpsError('invalid-argument', 'At least one recipient is required');
    }

    if (!method || !['email', 'sms', 'both'].includes(method)) {
      throw new HttpsError('invalid-argument', 'method must be email, sms, or both');
    }

    const results = { email: null, sms: null };

    try {
      if (method === 'email' || method === 'both') {
        const emailRecipients = recipients
          .map(r => r.email || r)
          .filter(e => e && e.includes('@'));

        if (emailRecipients.length > 0) {
          let subject, htmlBody;

          if (template && EMAIL_TEMPLATES[template]) {
            const emailTemplate = EMAIL_TEMPLATES[template](templateData || {});
            subject = customSubject || emailTemplate.subject;
            htmlBody = customHtml || emailTemplate.html;
          } else {
            subject = customSubject || 'Notification from MediShift';
            htmlBody = customHtml || `<div style="font-family: Arial; padding: 20px;">${customMessage || ''}</div>`;
          }

          results.email = await sendEmailNotification({
            to: emailRecipients,
            subject,
            htmlBody,
            from: from || 'noreply@medishift.ch'
          });
        }
      }

      if (method === 'sms' || method === 'both') {
        const phoneRecipients = recipients
          .map(r => r.phone || r)
          .filter(p => p && /^\+?[\d\s-]{8,}$/.test(p.replace(/\s/g, '')));

        if (phoneRecipients.length > 0) {
          let message;

          if (template && SMS_TEMPLATES[template]) {
            message = SMS_TEMPLATES[template](templateData || {});
          } else {
            message = customMessage || 'Notification from MediShift';
          }

          if (message.length > 160) {
            logger.warn(`[Notification] SMS truncated from ${message.length} to 160 chars`);
            message = message.substring(0, 157) + '...';
          }

          results.sms = await sendSMSNotification({
            to: phoneRecipients,
            message
          });
        }
      }

      await db.collection('notificationLogs').add({
        sentBy: auth.uid,
        type: type || 'general',
        method,
        template,
        recipientCount: recipients.length,
        emailsSent: results.email?.recipients?.length || 0,
        smsSent: results.sms?.recipients?.length || 0,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent'
      });

      logger.info('[Notification] Sent successfully', {
        method,
        template,
        emailCount: results.email?.recipients?.length || 0,
        smsCount: results.sms?.recipients?.length || 0
      });

      return {
        success: true,
        results
      };
    } catch (error) {
      logger.error('[Notification] Failed:', error);

      await db.collection('notificationLogs').add({
        sentBy: auth.uid,
        type: type || 'general',
        method,
        template,
        recipientCount: recipients.length,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'failed',
        error: error.message
      });

      throw new HttpsError('internal', `Failed to send notification: ${error.message}`);
    }
  }
);

const sendBulkNotification = onCall(
  {
    region: 'europe-west6',
    secrets: [MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID, INFOBIP_API_KEY]
  },
  async (request) => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const adminDoc = await db.collection('admins').doc(auth.uid).get();
    if (!adminDoc.exists || adminDoc.data().isActive === false) {
      throw new HttpsError('permission-denied', 'Only administrators can send bulk notifications');
    }

    const adminData = adminDoc.data();
    const adminRoles = adminData.roles || [];
    if (!adminRoles.includes('super_admin') && !adminRoles.includes('ops_manager')) {
      throw new HttpsError('permission-denied', 'Only administrators can send bulk notifications');
    }

    const { 
      targetAudience,
      method,
      template,
      templateData,
      customSubject,
      customMessage,
      customHtml,
      filters
    } = data;

    let recipientsQuery = db.collection('professionalProfiles');

    if (filters) {
      if (filters.workerType) {
        recipientsQuery = recipientsQuery.where('workerType', '==', filters.workerType);
      }
      if (filters.verified === true) {
        recipientsQuery = recipientsQuery.where('verified', '==', true);
      }
      if (filters.region) {
        recipientsQuery = recipientsQuery.where('contact.canton', '==', filters.region);
      }
    }

    const snapshot = await recipientsQuery.limit(500).get();

    const recipients = snapshot.docs.map(doc => {
      const profile = doc.data();
      return {
        email: profile.contact?.email || profile.email,
        phone: profile.contact?.primaryPhone ? 
          `${profile.contact.primaryPhonePrefix || '+41'}${profile.contact.primaryPhone}` : null,
        name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
      };
    }).filter(r => r.email || r.phone);

    if (recipients.length === 0) {
      throw new HttpsError('not-found', 'No recipients found matching the criteria');
    }

    const results = { email: null, sms: null, totalRecipients: recipients.length };

    try {
      if (method === 'email' || method === 'both') {
        const emailRecipients = recipients.filter(r => r.email).map(r => r.email);

        if (emailRecipients.length > 0) {
          let subject, htmlBody;

          if (template && EMAIL_TEMPLATES[template]) {
            const emailTemplate = EMAIL_TEMPLATES[template](templateData || {});
            subject = customSubject || emailTemplate.subject;
            htmlBody = customHtml || emailTemplate.html;
          } else {
            subject = customSubject || 'Notification from MediShift';
            htmlBody = customHtml || EMAIL_TEMPLATES.generic({
              subject: customSubject,
              body: customMessage,
              ...templateData
            }).html;
          }

          const BATCH_SIZE = 50;
          let sentCount = 0;

          for (let i = 0; i < emailRecipients.length; i += BATCH_SIZE) {
            const batch = emailRecipients.slice(i, i + BATCH_SIZE);
            await sendEmailNotification({
              to: batch,
              subject,
              htmlBody,
              from: 'noreply@medishift.ch'
            });
            sentCount += batch.length;
          }

          results.email = { success: true, count: sentCount };
        }
      }

      if (method === 'sms' || method === 'both') {
        const phoneRecipients = recipients.filter(r => r.phone).map(r => r.phone);

        if (phoneRecipients.length > 0) {
          let message;

          if (template && SMS_TEMPLATES[template]) {
            message = SMS_TEMPLATES[template](templateData || {});
          } else {
            message = customMessage || 'Notification from MediShift';
          }

          if (message.length > 160) {
            message = message.substring(0, 157) + '...';
          }

          results.sms = await sendSMSNotification({
            to: phoneRecipients,
            message
          });
        }
      }

      await db.collection('notificationLogs').add({
        sentBy: auth.uid,
        type: 'bulk',
        targetAudience: targetAudience || 'filtered',
        method,
        template,
        filters,
        totalRecipients: recipients.length,
        emailsSent: results.email?.count || 0,
        smsSent: results.sms?.recipients?.length || 0,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent'
      });

      return {
        success: true,
        message: `Notification sent to ${recipients.length} recipients`,
        results
      };
    } catch (error) {
      logger.error('[Bulk Notification] Failed:', error);
      throw new HttpsError('internal', `Failed to send bulk notification: ${error.message}`);
    }
  }
);

const notifyShiftAssignment = onCall(
  {
    region: 'europe-west6',
    secrets: [MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID, INFOBIP_API_KEY]
  },
  async (request) => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { workerId, shiftData, method } = data;

    if (!workerId || !shiftData) {
      throw new HttpsError('invalid-argument', 'workerId and shiftData are required');
    }

    const workerDoc = await db.collection('professionalProfiles').doc(workerId).get();
    if (!workerDoc.exists) {
      throw new HttpsError('not-found', 'Worker profile not found');
    }

    const worker = workerDoc.data();
    const notifyMethod = method || worker.notificationPreferences?.shiftAssignment || 'email';

    const recipients = [{
      email: worker.contact?.email || worker.email,
      phone: worker.contact?.primaryPhone ? 
        `${worker.contact.primaryPhonePrefix || '+41'}${worker.contact.primaryPhone}` : null
    }];

    const templateData = {
      workerName: worker.firstName || '',
      ...shiftData
    };

    try {
      const results = {};

      if (notifyMethod === 'email' || notifyMethod === 'both') {
        const emailTemplate = EMAIL_TEMPLATES.shift_assigned(templateData);
        results.email = await sendEmailNotification({
          to: recipients[0].email,
          subject: emailTemplate.subject,
          htmlBody: emailTemplate.html
        });
      }

      if ((notifyMethod === 'sms' || notifyMethod === 'both') && recipients[0].phone) {
        const smsMessage = SMS_TEMPLATES.shift_assigned(templateData);
        results.sms = await sendSMSNotification({
          to: recipients[0].phone,
          message: smsMessage
        });
      }

      return { success: true, results };
    } catch (error) {
      logger.error('[Shift Notification] Failed:', error);
      throw new HttpsError('internal', 'Failed to send shift notification');
    }
  }
);

const notifyBankingUpdate = onCall(
  {
    region: 'europe-west6',
    secrets: [MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID, INFOBIP_API_KEY]
  },
  async (request) => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { bankName, ibanLast4 } = data;
    const userId = auth.uid;

    const userDoc = await db.collection('professionalProfiles').doc(userId).get();
    if (!userDoc.exists) {
      logger.warn(`[Banking Notification] User profile not found: ${userId}`);
      return { success: false, message: 'User profile not found' };
    }

    const userData = userDoc.data();
    const userEmail = userData.contact?.email || userData.email || auth.token.email;
    const userPhone = userData.contact?.primaryPhone ? 
      `${userData.contact.primaryPhonePrefix || '+41'}${userData.contact.primaryPhone}` : null;
    const userName = userData.firstName || '';

    const now = new Date();
    const templateData = {
      name: userName,
      date: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
      time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      bankName: bankName || '',
      ibanLast4: ibanLast4 || ''
    };

    const results = { email: null, sms: null };

    try {
      if (userEmail) {
        const emailTemplate = EMAIL_TEMPLATES.banking_updated(templateData);
        results.email = await sendEmailNotification({
          to: userEmail,
          subject: emailTemplate.subject,
          htmlBody: emailTemplate.html,
          from: 'noreply@medishift.ch'
        });
        logger.info(`[Banking Notification] Email sent to ${userEmail}`);
      }

      if (userPhone) {
        const smsMessage = SMS_TEMPLATES.banking_updated({
          date: templateData.date
        });
        results.sms = await sendSMSNotification({
          to: userPhone,
          message: smsMessage
        });
        logger.info(`[Banking Notification] SMS sent to ${userPhone}`);
      }

      await db.collection('notificationLogs').add({
        userId,
        type: 'banking_update',
        method: 'both',
        emailSent: !!results.email,
        smsSent: !!results.sms,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent'
      });

      return {
        success: true,
        message: 'Banking update notifications sent',
        results
      };
    } catch (error) {
      logger.error('[Banking Notification] Failed:', error);
      
      await db.collection('notificationLogs').add({
        userId,
        type: 'banking_update',
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'failed',
        error: error.message
      });

      throw new HttpsError('internal', 'Failed to send banking update notification');
    }
  }
);

module.exports = {
  sendNotification,
  sendBulkNotification,
  notifyShiftAssignment,
  notifyBankingUpdate,
  sendEmailNotification,
  sendSMSNotification,
  EMAIL_TEMPLATES,
  SMS_TEMPLATES,
  createEmailWrapper
};

