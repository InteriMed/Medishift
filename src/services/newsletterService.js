import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const newsletterService = {
  /**
   * Subscribe email to newsletter
   * @param {string} email - Email address to subscribe
   * @param {object} metadata - Additional metadata about the subscription
   * @returns {Promise} Subscription result
   */
  subscribeToNewsletter: async (email, metadata = {}) => {
    try {
      // Add to Firestore
      const docRef = await addDoc(collection(db, 'newsletter'), {
        email,
        ...metadata,
        subscriptionTime: serverTimestamp()
      });
      
      return {
        success: true,
        id: docRef.id,
        message: 'Successfully subscribed to newsletter'
      };
    } catch (error) {
      console.error('Error subscribing to newsletter:', error);
      throw error;
    }
  }
};

export default newsletterService; 