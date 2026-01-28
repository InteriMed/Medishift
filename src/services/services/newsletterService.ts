import { functions } from './firebase';
import { httpsCallable } from 'firebase/functions';

export interface NewsletterSubscriptionMetadata {
  ipAddress?: string;
  userAgent?: string;
  language?: string;
  referrer?: string;
  path?: string;
  locale?: string;
}

export const subscribeToNewsletter = async (
  email: string,
  metadata?: NewsletterSubscriptionMetadata
): Promise<{ success: boolean; message?: string }> => {
  try {
    const subscribeNewsletterFunction = httpsCallable(functions, 'subscribeNewsletter');
    
    const result = await subscribeNewsletterFunction({
      email,
      metadata: metadata || {},
    });

    return {
      success: true,
      message: (result.data as any)?.message || 'Successfully subscribed to newsletter',
    };
  } catch (error: any) {
    console.error('Failed to subscribe to newsletter:', error);
    throw new Error(error.message || 'Failed to subscribe to newsletter');
  }
};

export const unsubscribeFromNewsletter = async (
  email: string,
  token?: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    const unsubscribeNewsletterFunction = httpsCallable(functions, 'unsubscribeNewsletter');
    
    const result = await unsubscribeNewsletterFunction({
      email,
      token,
    });

    return {
      success: true,
      message: (result.data as any)?.message || 'Successfully unsubscribed from newsletter',
    };
  } catch (error: any) {
    console.error('Failed to unsubscribe from newsletter:', error);
    throw new Error(error.message || 'Failed to unsubscribe from newsletter');
  }
};

