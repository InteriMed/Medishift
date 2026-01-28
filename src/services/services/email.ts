import { functions } from './firebase';
import { httpsCallable } from 'firebase/functions';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  htmlBody: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export const sendEmail = async (options: SendEmailOptions): Promise<boolean> => {
  try {
    const sendEmailFunction = httpsCallable(functions, 'sendEmail');
    
    await sendEmailFunction({
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      htmlBody: options.htmlBody,
      from: options.from || 'noreply@medishift.ch',
      replyTo: options.replyTo,
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
      bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
    });

    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};

export const sendEmailNotification = async (
  to: string | string[],
  subject: string,
  htmlBody: string,
  options?: {
    from?: string;
    replyTo?: string;
  }
): Promise<boolean> => {
  return sendEmail({
    to,
    subject,
    htmlBody,
    from: options?.from,
    replyTo: options?.replyTo,
  });
};

