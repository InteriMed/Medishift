# Email Action Guide

## Overview

The `admin.send_email` action provides a centralized way to send emails from the application using Microsoft Graph API. It supports multiple email authorities for different purposes.

## Action ID

`admin.send_email`

## Location

`src/services/actions/catalog/admin/sendEmail.ts`

## Permission Required

`admin.access`

## Email Authorities

The action supports 4 different email authorities, each with its own purpose:

| Authority | Email | Use Case | Reply Allowed |
|-----------|-------|----------|---------------|
| `noreply` | noreply@medishift.ch | Automated system emails | ❌ No |
| `admin` | admin@medishift.ch | Administrative emails | ✅ Yes (default) |
| `support` | support@medishift.ch | Support team emails | ✅ Yes |
| `hr` | hr@medishift.ch | HR department emails | ✅ Yes |

## Input Schema

```typescript
{
  // Required fields
  to: string | string[],          // Email address(es)
  subject: string,                // Email subject (1-500 chars)
  htmlBody: string,               // HTML email content
  
  // Optional fields
  authority?: 'noreply' | 'admin' | 'support' | 'hr',  // Default: 'admin'
  cc?: string | string[],         // CC recipients
  bcc?: string | string[],        // BCC recipients
  replyTo?: string,               // Custom reply-to address
  
  emailType?: 'newsletter' | 'notification' | 'invitation' | 
              'welcome' | 'reset_password' | 'verification' |
              'announcement' | 'marketing' | 'transactional' |
              'support' | 'general',      // Default: 'general'
  
  metadata?: Record<string, any>, // Additional metadata
  attachments?: Array<{           // Future: file attachments
    name: string,
    url: string,
    contentType?: string
  }>
}
```

## Usage Examples

### Example 1: Simple Admin Email

```javascript
import { useAction } from '../../../services/actions/hook';

const { execute } = useAction();

await execute('admin.send_email', {
  to: 'user@example.com',
  subject: 'Welcome to MediShift',
  htmlBody: '<h1>Welcome!</h1><p>Your account is ready.</p>',
});
```

### Example 2: No-Reply System Email

```javascript
await execute('admin.send_email', {
  to: ['user1@example.com', 'user2@example.com'],
  subject: 'System Maintenance Notice',
  htmlBody: '<p>System will be down for maintenance on...</p>',
  authority: 'noreply',
  emailType: 'announcement',
});
```

### Example 3: Support Email with CC/BCC

```javascript
await execute('admin.send_email', {
  to: 'customer@example.com',
  cc: 'manager@medishift.ch',
  bcc: 'logs@medishift.ch',
  subject: 'Support Ticket #12345',
  htmlBody: '<p>Your support request has been resolved.</p>',
  authority: 'support',
  emailType: 'support',
  metadata: {
    ticketId: '12345',
    category: 'technical',
  },
});
```

### Example 4: Newsletter with Custom Reply-To

```javascript
await execute('admin.send_email', {
  to: newsletterSubscribers,
  subject: 'MediShift Monthly Newsletter - January 2026',
  htmlBody: newsletterHtmlContent,
  authority: 'noreply',
  replyTo: 'feedback@medishift.ch',  // Override default no-reply
  emailType: 'newsletter',
  bcc: 'analytics@medishift.ch',
});
```

### Example 5: HR Email

```javascript
await execute('admin.send_email', {
  to: 'employee@pharmacy.com',
  subject: 'Contract Renewal - Action Required',
  htmlBody: '<p>Your contract is up for renewal...</p>',
  authority: 'hr',
  emailType: 'transactional',
  metadata: {
    employeeId: 'EMP123',
    contractId: 'CON456',
  },
});
```

## Email Logging

All emails are automatically logged to Firestore collection `emailLogs` with:

- `sentBy`: User ID who sent the email
- `sentByEmail`: User email
- `authority`: Which authority was used
- `fromEmail`: The actual from address
- `to`, `cc`, `bcc`: Recipients
- `subject`: Email subject
- `emailType`: Type of email
- `metadata`: Custom metadata
- `sentAt`: Timestamp
- `status`: 'sent' or 'failed'
- `error`: Error message if failed

## Audit Trail

Every email action is automatically logged in the audit system with:

- **START**: Before sending
- **SUCCESS**: After successful send
- **ERROR**: If sending fails

## Microsoft Graph API Configuration

The action requires the following environment variables:

```
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_TENANT_ID=your-tenant-id
```

### Setting Up Microsoft Graph API

1. Register an application in Azure AD
2. Grant API permissions:
   - `Mail.Send`
   - `Mail.ReadWrite`
3. Create a client secret
4. Configure the environment variables

## Email Templates

For consistent branding, consider creating email templates:

### Basic Template Structure

```javascript
const emailTemplate = (title, content, ctaText, ctaUrl) => `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
      .header { background: linear-gradient(135deg, #0066cc, #004999); padding: 24px; text-align: center; }
      .content { padding: 32px; background: #ffffff; }
      .footer { background: #f8f9fa; padding: 16px; text-align: center; font-size: 12px; color: #666; }
      .button { background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1 style="color: white; margin: 0;">${title}</h1>
    </div>
    <div class="content">
      ${content}
      ${ctaText && ctaUrl ? `<p style="text-align: center; margin-top: 32px;">
        <a href="${ctaUrl}" class="button">${ctaText}</a>
      </p>` : ''}
    </div>
    <div class="footer">
      <p>© 2026 MediShift. All rights reserved.</p>
      <p>This email was sent by MediShift. If you have questions, contact us at support@medishift.ch</p>
    </div>
  </body>
  </html>
`;

// Usage
const welcomeEmail = emailTemplate(
  'Welcome to MediShift!',
  '<p>Thank you for joining MediShift...</p>',
  'Get Started',
  'https://medishift.ch/dashboard'
);

await execute('admin.send_email', {
  to: 'newuser@example.com',
  subject: 'Welcome to MediShift',
  htmlBody: welcomeEmail,
  authority: 'admin',
  emailType: 'welcome',
});
```

## Best Practices

### 1. Choose the Right Authority

- **noreply**: System notifications, automated alerts, newsletters
- **admin**: General administrative communications, account updates
- **support**: Support responses, ticket updates
- **hr**: HR-related communications, contracts, onboarding

### 2. Use Appropriate Email Types

Categorize emails properly for analytics and filtering:
- `newsletter`: Marketing newsletters
- `notification`: System notifications
- `invitation`: User invitations
- `welcome`: Welcome emails
- `transactional`: Receipts, confirmations
- `support`: Support-related emails

### 3. Include Metadata

Always include relevant metadata for tracking:

```javascript
metadata: {
  userId: 'USER123',
  action: 'password_reset',
  triggeredBy: 'user_request',
  ipAddress: '192.168.1.1',
}
```

### 4. Handle Errors Gracefully

```javascript
try {
  const result = await execute('admin.send_email', {
    to: email,
    subject: subject,
    htmlBody: content,
    authority: 'admin',
  });
  
  if (result.success) {
    console.log(`Email sent from ${result.fromEmail}`);
  }
} catch (error) {
  console.error('Failed to send email:', error);
  // Implement fallback or retry logic
}
```

### 5. Respect Rate Limits

Implement rate limiting for bulk emails:

```javascript
const sendBulkEmails = async (recipients, emailData) => {
  const BATCH_SIZE = 50;
  const DELAY_MS = 1000; // 1 second between batches
  
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    
    await execute('admin.send_email', {
      ...emailData,
      bcc: batch, // Use BCC for bulk
    });
    
    if (i + BATCH_SIZE < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
};
```

## Security Considerations

1. **Permission Check**: Only users with `admin.access` permission can send emails
2. **Audit Logging**: All email sends are logged for compliance
3. **Email Validation**: All email addresses are validated by Zod schema
4. **Rate Limiting**: Consider implementing rate limits at application level
5. **Content Sanitization**: Sanitize HTML content to prevent XSS

## Integration with Newsletter Service

The newsletter service (`src/services/newsletterService.js`) can trigger welcome emails:

```javascript
// In newsletterService.js
async subscribeToNewsletter(email, metadata) {
  // ... subscription logic ...
  
  // Send welcome email
  try {
    await execute('admin.send_email', {
      to: email,
      subject: 'Welcome to MediShift Newsletter',
      htmlBody: getWelcomeEmailTemplate(email),
      authority: 'noreply',
      emailType: 'newsletter',
      metadata: { source: 'website_footer' },
    });
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    // Don't fail subscription if email fails
  }
  
  return { success: true };
}
```

## Troubleshooting

### Email Not Sent

1. Check environment variables are set
2. Verify Microsoft Graph API credentials
3. Check audit logs for error messages
4. Verify user has `admin.access` permission

### Emails Going to Spam

1. Configure SPF/DKIM/DMARC records for your domain
2. Use proper email templates with good HTML
3. Avoid spam trigger words
4. Ensure consistent sending domain

### Rate Limits Exceeded

1. Implement exponential backoff
2. Use batch sending with delays
3. Consider queue system for bulk emails

## Related Documentation

- [Admin Actions Guide](./ADMIN_SECURITY_GUIDE.md)
- [Action Catalog Overview](../../README.md)
- [Thread Service Guide](../../THREAD_SERVICE_GUIDE.md)

## Support

For issues or questions about the email action, contact the development team or check the audit logs in Firestore.

