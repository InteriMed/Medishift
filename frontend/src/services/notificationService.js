import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebaseService';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from './firebaseService';

// Initialize Firebase Functions
const functions = getFunctions(app);

// List notifications for the current user
export const listNotifications = async (limit = 20) => {
  try {
    const callFunction = httpsCallable(functions, 'listNotifications');
    
    const result = await callFunction({ limit });
    return result.data;
  } catch (error) {
    console.error('Error listing notifications:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Mark a notification as read
export const markNotificationAsRead = async (notificationId) => {
  try {
    const callFunction = httpsCallable(functions, 'markNotificationAsRead');
    
    const result = await callFunction({ notificationId });
    return result.data;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async () => {
  try {
    const callFunction = httpsCallable(functions, 'markAllNotificationsAsRead');
    
    const result = await callFunction();
    return result.data;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Add this new function for real-time notification listener
export const subscribeToNotifications = (userId, callback, errorCallback, limitCount = 20) => {
  if (!userId) return null;
  
  try {
    // Create query for user's notifications
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    // Create real-time listener
    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notifications = [];
        snapshot.forEach(doc => {
          notifications.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : new Date()
          });
        });
        
        // Call the callback with the notifications
        callback(notifications);
      },
      (error) => {
        console.error('Error in notification listener:', error);
        if (errorCallback) {
          errorCallback(error);
        }
      }
    );
    
    // Return the unsubscribe function
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up notification listener:', error);
    if (errorCallback) {
      errorCallback(error);
    }
    return null;
  }
}; 