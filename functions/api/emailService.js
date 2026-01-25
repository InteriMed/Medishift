const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const axios = require('axios');
const admin = require('firebase-admin');

const db = require('../database/db');

const MICROSOFT_CLIENT_ID = defineSecret('MICROSOFT_CLIENT_ID');
const MICROSOFT_CLIENT_SECRET = defineSecret('MICROSOFT_CLIENT_SECRET');
const MICROSOFT_TENANT_ID = defineSecret('MICROSOFT_TENANT_ID');

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

async function sendEmailViaMicrosoftGraph({ from, to, cc, bcc, subject, htmlBody, replyTo }) {
  const accessToken = await getMicrosoftAccessToken();
  const fromEmail = from || 'admin@medishift.ch';

  const message = {
    message: {
      subject,
      body: {
        contentType: 'HTML',
        content: htmlBody
      },
      toRecipients: (Array.isArray(to) ? to : [to]).map(email => ({
        emailAddress: { address: email }
      })),
      from: {
        emailAddress: { address: fromEmail }
      }
    },
    saveToSentItems: 'true'
  };

  if (cc && cc.length > 0) {
    message.message.ccRecipients = (Array.isArray(cc) ? cc : [cc]).map(email => ({
      emailAddress: { address: email }
    }));
  }

  if (bcc && bcc.length > 0) {
    message.message.bccRecipients = (Array.isArray(bcc) ? bcc : [bcc]).map(email => ({
      emailAddress: { address: email }
    }));
  }

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

  logger.info(`[Email Service] Email sent from ${fromEmail} to ${to}`);
  return true;
}

const sendAdminEmail = onCall(
  {
    region: 'europe-west6',
    secrets: [MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID]
  },
  async (request) => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const adminDoc = await db.collection('admins').doc(auth.uid).get();
    if (!adminDoc.exists || adminDoc.data().isActive === false) {
      throw new HttpsError('permission-denied', 'Only administrators can send emails');
    }

    const adminData = adminDoc.data();
    const adminRoles = adminData.roles || [];
    if (!adminRoles.includes('super_admin') && !adminRoles.includes('ops_manager')) {
      throw new HttpsError('permission-denied', 'Only administrators can send emails');
    }

    const { to, cc, bcc, subject, htmlBody, emailType, metadata, replyTo } = data;

    if (!to || !subject || !htmlBody) {
      throw new HttpsError('invalid-argument', 'to, subject, and htmlBody are required');
    }

    try {
      await sendEmailViaMicrosoftGraph({
        from: 'admin@medishift.ch',
        to,
        cc,
        bcc,
        subject,
        htmlBody,
        replyTo
      });

      await db.collection('emailLogs').add({
        sentBy: auth.uid,
        sentByEmail: auth.token.email,
        to: Array.isArray(to) ? to : [to],
        cc: cc || [],
        bcc: bcc || [],
        subject,
        emailType: emailType || 'general',
        metadata: metadata || {},
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent'
      });

      logger.info('[Admin Email] Email sent successfully', {
        sentBy: auth.uid,
        to,
        emailType: emailType || 'general'
      });

      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      logger.error('[Admin Email] Failed to send email:', error);

      await db.collection('emailLogs').add({
        sentBy: auth.uid,
        sentByEmail: auth.token.email,
        to: Array.isArray(to) ? to : [to],
        subject,
        emailType: emailType || 'general',
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'failed',
        error: error.message
      });

      throw new HttpsError('internal', 'Failed to send email. Please try again.');
    }
  }
);

const sendSupportResponse = onCall(
  {
    region: 'europe-west6',
    secrets: [MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID]
  },
  async (request) => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const adminDoc = await db.collection('admins').doc(auth.uid).get();
    if (!adminDoc.exists || adminDoc.data().isActive === false) {
      throw new HttpsError('permission-denied', 'Only support staff can respond to tickets');
    }

    const adminData = adminDoc.data();
    const adminRoles = adminData.roles || [];
    if (!adminRoles.includes('super_admin') && !adminRoles.includes('ops_manager') && !adminRoles.includes('support')) {
      throw new HttpsError('permission-denied', 'Only support staff can respond to tickets');
    }

    const { ticketId, recipientEmail, recipientName, subject, message, originalMessage } = data;

    if (!ticketId || !recipientEmail || !subject || !message) {
      throw new HttpsError('invalid-argument', 'ticketId, recipientEmail, subject, and message are required');
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0066cc, #004999); padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">MediShift Support</h1>
        </div>
        <div style="padding: 32px; background: #ffffff;">
          <p style="color: #333; line-height: 1.6;">Hello${recipientName ? ` ${recipientName}` : ''},</p>
          <p style="color: #333; line-height: 1.6;">Thank you for contacting MediShift Support. Here is our response to your inquiry:</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #0066cc;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          
          ${originalMessage ? `
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e0e0e0;">
            <p style="color: #666; font-size: 14px; margin-bottom: 8px;"><strong>Your original message:</strong></p>
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; color: #666; font-size: 14px;">
              ${originalMessage.replace(/\n/g, '<br>')}
            </div>
          </div>
          ` : ''}
          
          <p style="color: #333; line-height: 1.6; margin-top: 24px;">
            If you have any further questions, please reply to this email or contact us at 
            <a href="mailto:admin@medishift.ch" style="color: #0066cc;">admin@medishift.ch</a>
          </p>
          
          <p style="color: #333; line-height: 1.6;">
            Best regards,<br>
            <strong>MediShift Support Team</strong>
          </p>
        </div>
        <div style="background: #f8f9fa; padding: 16px; text-align: center; font-size: 12px; color: #666;">
          <p style="margin: 0;">MediShift Healthcare Staffing Platform</p>
          <p style="margin: 8px 0 0 0;">Ticket ID: ${ticketId}</p>
        </div>
      </div>
    `;

    try {
      await sendEmailViaMicrosoftGraph({
        from: 'admin@medishift.ch',
        to: recipientEmail,
        subject: `Re: ${subject} [Ticket #${ticketId}]`,
        htmlBody,
        replyTo: 'admin@medishift.ch'
      });

      if (ticketId) {
        const ticketRef = db.collection('supportTickets').doc(ticketId);
        const ticketDoc = await ticketRef.get();

        if (ticketDoc.exists) {
          await ticketRef.update({
            status: 'responded',
            lastResponseAt: admin.firestore.FieldValue.serverTimestamp(),
            lastResponseBy: auth.uid,
            responses: admin.firestore.FieldValue.arrayUnion({
              message,
              sentBy: auth.uid,
              sentAt: new Date().toISOString()
            })
          });
        }
      }

      await db.collection('emailLogs').add({
        sentBy: auth.uid,
        sentByEmail: auth.token.email,
        to: [recipientEmail],
        subject: `Re: ${subject} [Ticket #${ticketId}]`,
        emailType: 'support_response',
        metadata: { ticketId },
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent'
      });

      return { success: true, message: 'Support response sent successfully' };
    } catch (error) {
      logger.error('[Support Response] Failed to send:', error);
      throw new HttpsError('internal', 'Failed to send support response');
    }
  }
);

const sendTeamInvitation = onCall(
  {
    region: 'europe-west6',
    secrets: [MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID]
  },
  async (request) => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { inviteEmail, inviteRole, inviterName, organizationName, customMessage, inviteToken, inviteCode } = data;

    if (!inviteEmail || !inviteRole) {
      throw new HttpsError('invalid-argument', 'inviteEmail and inviteRole are required');
    }

    const signupLink = `${process.env.INVITATION_BASE_URL || 'https://medishift.ch'}/signup?admin_invite=${inviteToken}`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0066cc, #004999); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to MediShift!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">You've been invited to join the team</p>
        </div>
        
        <div style="padding: 32px; background: #ffffff;">
          <p style="color: #333; line-height: 1.6; font-size: 16px;">Hello,</p>
          
          <p style="color: #333; line-height: 1.6; font-size: 16px;">
            ${customMessage || `<strong>${inviterName || 'An administrator'}</strong>${organizationName ? ` from <strong>${organizationName}</strong>` : ''} has invited you to join MediShift as a <strong>${inviteRole}</strong>.`}
          </p>
          
          ${inviteCode ? `
          <div style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); padding: 24px; border-radius: 12px; text-align: center; margin: 32px 0;">
            <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">Your invitation code:</p>
            <h2 style="margin: 0; letter-spacing: 6px; color: #0066cc; font-size: 32px; font-family: monospace;">${inviteCode}</h2>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${signupLink}" style="background: linear-gradient(135deg, #0066cc, #004999); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
              Accept Invitation
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; text-align: center;">
            Or copy this link: <a href="${signupLink}" style="color: #0066cc;">${signupLink}</a>
          </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p style="margin: 0;">This invitation expires in 7 days.</p>
          <p style="margin: 8px 0 0 0;">If you didn't expect this invitation, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 16px 0;">
          <p style="margin: 0;">MediShift Healthcare Staffing Platform<br>admin@medishift.ch</p>
        </div>
      </div>
    `;

    try {
      await sendEmailViaMicrosoftGraph({
        from: 'admin@medishift.ch',
        to: inviteEmail,
        subject: `${inviterName || 'MediShift'} invited you to join MediShift`,
        htmlBody
      });

      await db.collection('emailLogs').add({
        sentBy: auth.uid,
        sentByEmail: auth.token.email,
        to: [inviteEmail],
        subject: `Team Invitation - ${inviteRole}`,
        emailType: 'team_invitation',
        metadata: { inviteRole, inviteToken },
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent'
      });

      logger.info('[Team Invitation] Email sent', { to: inviteEmail, role: inviteRole });

      return { success: true, message: 'Invitation email sent successfully' };
    } catch (error) {
      logger.error('[Team Invitation] Failed to send:', error);
      throw new HttpsError('internal', 'Failed to send invitation email');
    }
  }
);

const sendContactFormEmail = onCall(
  {
    region: 'europe-west6',
    secrets: [MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID]
  },
  async (request) => {
    const { data } = request;
    const { name, email, phone, company, subject, message, type } = data;

    if (!name || !email || !subject || !message) {
      throw new HttpsError('invalid-argument', 'name, email, subject, and message are required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new HttpsError('invalid-argument', 'Invalid email address');
    }

    const inquiryTypes = {
      general: 'General Inquiry',
      professional: 'Professional Opportunities',
      facility: 'Healthcare Facility',
      partnership: 'Partnership Opportunities',
      media: 'Media & Press'
    };

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0066cc, #004999); padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New Contact Form Submission</h1>
        </div>
        <div style="padding: 32px; background: #ffffff;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold; width: 140px; color: #666;">Inquiry Type:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; color: #333;">${inquiryTypes[type] || 'General Inquiry'}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #666;">Name:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; color: #333;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #666;">Email:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; color: #333;"><a href="mailto:${email}" style="color: #0066cc;">${email}</a></td>
            </tr>
            ${phone ? `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #666;">Phone:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; color: #333;">${phone}</td>
            </tr>
            ` : ''}
            ${company ? `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #666;">Company:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; color: #333;">${company}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #666;">Subject:</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e0e0e0; color: #333;">${subject}</td>
            </tr>
          </table>
          
          <div style="margin-top: 24px;">
            <p style="color: #666; font-weight: bold; margin-bottom: 8px;">Message:</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #0066cc;">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
        </div>
        <div style="background: #f8f9fa; padding: 16px; text-align: center; font-size: 12px; color: #666;">
          <p style="margin: 0;">This message was sent from the MediShift Contact Form</p>
          <p style="margin: 8px 0 0 0;">Reply directly to: <a href="mailto:${email}" style="color: #0066cc;">${email}</a></p>
        </div>
      </div>
    `;

    try {
      await sendEmailViaMicrosoftGraph({
        from: 'admin@medishift.ch',
        to: 'admin@medishift.ch',
        subject: `[Contact Form] ${subject}`,
        htmlBody,
        replyTo: email
      });

      await db.collection('contactSubmissions').add({
        name,
        email,
        phone: phone || '',
        company: company || '',
        subject,
        message,
        type: type || 'general',
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'new'
      });

      logger.info('[Contact Form] Email sent to admin@medishift.ch', { from: email, subject });

      return { success: true, message: 'Message sent successfully' };
    } catch (error) {
      logger.error('[Contact Form] Failed to send:', error);
      throw new HttpsError('internal', 'Failed to send message. Please try again.');
    }
  }
);

const getAdminInbox = onCall(
  {
    region: 'europe-west6',
    secrets: [MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID]
  },
  async (request) => {
    const { auth } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const adminDoc = await db.collection('admins').doc(auth.uid).get();
    if (!adminDoc.exists || adminDoc.data().isActive === false) {
      throw new HttpsError('permission-denied', 'Only administrators can access the inbox');
    }

    try {
      const accessToken = await getMicrosoftAccessToken();
      const fromEmail = 'admin@medishift.ch';

      // Fetch top 50 messages from Inbox, select specific fields for performance
      const response = await axios.get(
        `https://graph.microsoft.com/v1.0/users/${fromEmail}/mailFolders/Inbox/messages?$top=50&$select=id,subject,from,receivedDateTime,bodyPreview,isRead,body,toRecipients&$orderby=receivedDateTime desc`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const messages = response.data.value.map(msg => ({
        id: msg.id,
        subject: msg.subject,
        from: msg.from?.emailAddress,
        receivedDateTime: msg.receivedDateTime,
        bodyPreview: msg.bodyPreview,
        body: msg.body?.content,
        isRead: msg.isRead,
        toRecipients: msg.toRecipients?.map(r => r.emailAddress)
      }));

      return { success: true, messages };
    } catch (error) {
      logger.error('[Admin Inbox] Failed to fetch emails:', error.response?.data || error.message);
      throw new HttpsError('internal', 'Failed to fetch emails from Outlook');
    }
  }
);

module.exports = {
  sendAdminEmail,
  sendSupportResponse,
  sendTeamInvitation,
  sendContactFormEmail,
  sendEmailViaMicrosoftGraph,
  getAdminInbox
};

