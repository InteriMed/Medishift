import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from './services/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, updateDoc } from 'firebase/firestore';

const functions = getFunctions();

/**
 * Newsletter Service
 * Handles newsletter subscriptions via Firestore
 */
const newsletterService = {
  /**
   * Subscribe a user to the newsletter
   * @param {string} email - User email address
   * @param {object} metadata - Additional metadata (ipAddress, userAgent, language, etc.)
   * @returns {Promise<object>} - Subscription result
   */
  async subscribeToNewsletter(email, metadata = {}) {
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }

    try {
      // Store subscription in Firestore
      const subscriptionData = {
        email: email.toLowerCase().trim(),
        subscribedAt: serverTimestamp(),
        status: 'active',
        source: 'website_footer',
        metadata: {
          ipAddress: metadata.ipAddress || null,
          userAgent: metadata.userAgent || null,
          language: metadata.language || 'en',
          referrer: metadata.referrer || 'direct',
          path: metadata.path || '/',
          locale: metadata.locale || 'en',
        },
        doubleOptIn: false, // Set to true if implementing double opt-in
        unsubscribedAt: null,
      };

      const docRef = await addDoc(collection(db, 'newsletterSubscriptions'), subscriptionData);

      console.log('Newsletter subscription created:', docRef.id);

      // Optional: Send welcome email via email action
      // This can be handled by a Firestore trigger or called here
      // await this.sendWelcomeEmail(email);

      return {
        success: true,
        subscriptionId: docRef.id,
        message: 'Successfully subscribed to newsletter',
      };
    } catch (error) {
      console.error('Error subscribing to newsletter:', error);
      throw new Error('Failed to subscribe to newsletter. Please try again.');
    }
  },

  /**
   * Unsubscribe a user from the newsletter
   * @param {string} email - User email address
   * @returns {Promise<object>} - Unsubscribe result
   */
  async unsubscribeFromNewsletter(email) {
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }

    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Query for active subscriptions with this email
      const q = query(
        collection(db, 'newsletterSubscriptions'),
        where('email', '==', normalizedEmail),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        throw new Error('No active subscription found');
      }

      // Update all matching subscriptions to unsubscribed
      const updatePromises = snapshot.docs.map(doc => 
        updateDoc(doc.ref, {
          status: 'unsubscribed',
          unsubscribedAt: serverTimestamp(),
        })
      );

      await Promise.all(updatePromises);

      return {
        success: true,
        message: 'Successfully unsubscribed from newsletter',
      };
    } catch (error) {
      console.error('Error unsubscribing from newsletter:', error);
      throw error;
    }
  },

  /**
   * Check if an email is already subscribed
   * @param {string} email - User email address
   * @returns {Promise<boolean>} - True if subscribed
   */
  async isSubscribed(email) {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      const q = query(
        collection(db, 'newsletterSubscriptions'),
        where('email', '==', normalizedEmail),
        where('status', '==', 'active'),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  },
};

export default newsletterService;

