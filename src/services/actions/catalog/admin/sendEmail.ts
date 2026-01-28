import { z } from "zod";
import { ActionDefinition } from "../../types";
import axios from "axios";

// AUTHORITY CONFIGURATION
const EMAIL_AUTHORITIES = {
  noreply: {
    email: 'noreply@medishift.ch',
    displayName: 'MediShift',
    description: 'Automated system emails (no-reply)',
  },
  admin: {
    email: 'admin@medishift.ch',
    displayName: 'MediShift Admin',
    description: 'Administrative emails (users can reply)',
  },
  support: {
    email: 'support@medishift.ch',
    displayName: 'MediShift Support',
    description: 'Support team emails',
  },
  hr: {
    email: 'hr@medishift.ch',
    displayName: 'MediShift HR',
    description: 'HR department emails',
  },
} as const;

const SendEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1).max(500),
  htmlBody: z.string().min(1),
  
  // Optional authority (defaults to 'admin')
  authority: z.enum(['noreply', 'admin', 'support', 'hr']).optional().default('admin'),
  
  // Optional recipients
  cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  
  // Optional reply-to (overrides authority email for replies)
  replyTo: z.string().email().optional(),
  
  // Email type for categorization
  emailType: z.enum([
    'newsletter',
    'notification',
    'invitation',
    'welcome',
    'reset_password',
    'verification',
    'announcement',
    'marketing',
    'transactional',
    'support',
    'general',
  ]).optional().default('general'),
  
  // Additional metadata
  metadata: z.record(z.any()).optional(),
  
  // Attachments (if needed in future)
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    contentType: z.string().optional(),
  })).optional(),
});

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  authority: string;
  fromEmail: string;
}

/**
 * MICROSOFT GRAPH API EMAIL SENDING
 * 
 * Uses Microsoft Graph API to send emails via Microsoft 365
 * Requires environment variables:
 * - MICROSOFT_CLIENT_ID
 * - MICROSOFT_CLIENT_SECRET
 * - MICROSOFT_TENANT_ID
 */
async function getMicrosoftAccessToken(): Promise<string> {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID;

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error('Microsoft Graph API credentials not configured');
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const response = await axios.post(tokenUrl, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  return response.data.access_token;
}

async function sendEmailViaMicrosoftGraph(
  fromEmail: string,
  to: string | string[],
  subject: string,
  htmlBody: string,
  options: {
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string;
  } = {}
): Promise<boolean> {
  const accessToken = await getMicrosoftAccessToken();

  const message = {
    message: {
      subject,
      body: {
        contentType: 'HTML',
        content: htmlBody,
      },
      toRecipients: (Array.isArray(to) ? to : [to]).map(email => ({
        emailAddress: { address: email },
      })),
      from: {
        emailAddress: { address: fromEmail },
      },
    },
    saveToSentItems: 'true',
  };

  if (options.cc && options.cc.length > 0) {
    message.message.ccRecipients = (Array.isArray(options.cc) ? options.cc : [options.cc]).map(email => ({
      emailAddress: { address: email },
    }));
  }

  if (options.bcc && options.bcc.length > 0) {
    message.message.bccRecipients = (Array.isArray(options.bcc) ? options.bcc : [options.bcc]).map(email => ({
      emailAddress: { address: email },
    }));
  }

  if (options.replyTo) {
    message.message.replyTo = [{
      emailAddress: { address: options.replyTo },
    }];
  }

  await axios.post(
    `https://graph.microsoft.com/v1.0/users/${fromEmail}/sendMail`,
    message,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return true;
}

export const sendEmailAction: ActionDefinition<typeof SendEmailSchema, SendEmailResult> = {
  id: "admin.send_email",
  fileLocation: "src/services/actions/catalog/admin/sendEmail.ts",
  
  requiredPermission: "admin.access",
  
  label: "Send Email",
  description: "Send email via configured authority (noreply, admin, support, hr)",
  keywords: ["email", "send", "notification", "message", "admin"],
  icon: "Mail",
  
  schema: SendEmailSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const {
      to,
      subject,
      htmlBody,
      authority = 'admin',
      cc,
      bcc,
      replyTo,
      emailType = 'general',
      metadata,
    } = input;

    // Get authority configuration
    const authorityConfig = EMAIL_AUTHORITIES[authority];
    if (!authorityConfig) {
      throw new Error(`Invalid email authority: ${authority}`);
    }

    const fromEmail = authorityConfig.email;

    // LOG EMAIL ATTEMPT
    await ctx.auditLogger('admin.send_email', 'START', {
      to: Array.isArray(to) ? to : [to],
      subject,
      authority,
      fromEmail,
      emailType,
    });

    try {
      // Send email via Microsoft Graph
      await sendEmailViaMicrosoftGraph(
        fromEmail,
        to,
        subject,
        htmlBody,
        {
          cc,
          bcc,
          replyTo: replyTo || (authority !== 'noreply' ? fromEmail : undefined),
        }
      );

      // Log successful email in Firestore
      await ctx.db.collection('emailLogs').add({
        sentBy: ctx.userId,
        sentByEmail: ctx.userEmail || 'system',
        authority,
        fromEmail,
        to: Array.isArray(to) ? to : [to],
        cc: cc ? (Array.isArray(cc) ? cc : [cc]) : [],
        bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : [],
        subject,
        emailType,
        metadata: metadata || {},
        sentAt: new Date(),
        status: 'sent',
      });

      await ctx.auditLogger('admin.send_email', 'SUCCESS', {
        to: Array.isArray(to) ? to : [to],
        authority,
        fromEmail,
      });

      return {
        success: true,
        authority,
        fromEmail,
      };
    } catch (error) {
      // Log failed email
      await ctx.db.collection('emailLogs').add({
        sentBy: ctx.userId,
        sentByEmail: ctx.userEmail || 'system',
        authority,
        fromEmail,
        to: Array.isArray(to) ? to : [to],
        subject,
        emailType,
        sentAt: new Date(),
        status: 'failed',
        error: error.message,
      });

      await ctx.auditLogger('admin.send_email', 'ERROR', {
        error: error.message,
        authority,
      });

      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
};

