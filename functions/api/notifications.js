const functions = require('firebase-functions');
const admin = require('firebase-admin');

// List notifications for the current user
const listNotifications = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to view notifications'
    );
  }

  const userId = context.auth.uid;
  const { limit = 20 } = data || {};
  
  try {
    const notificationsSnapshot = await admin.firestore()
      .collection('notifications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    const notifications = [];
    notificationsSnapshot.forEach(doc => {
      notifications.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : null
      });
    });
    
    return {
      success: true,
      notifications
    };
  } catch (error) {
    console.error('Error listing notifications:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message
    );
  }
});

// Mark a notification as read
const markNotificationAsRead = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to update notifications'
    );
  }

  const userId = context.auth.uid;
  const { notificationId } = data;
  
  if (!notificationId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Notification ID is required'
    );
  }
  
  try {
    // Get the notification to verify ownership
    const notificationDoc = await admin.firestore()
      .collection('notifications')
      .doc(notificationId)
      .get();
    
    if (!notificationDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Notification not found'
      );
    }
    
    const notification = notificationDoc.data();
    
    // Check if the notification belongs to the user
    if (notification.userId !== userId) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You do not have permission to update this notification'
      );
    }
    
    // Mark as read
    await admin.firestore()
      .collection('notifications')
      .doc(notificationId)
      .update({
        read: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message
    );
  }
});

// Mark all notifications as read
const markAllNotificationsAsRead = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to update notifications'
    );
  }

  const userId = context.auth.uid;
  
  try {
    // Get all unread notifications for the user
    const batch = admin.firestore().batch();
    const unreadNotificationsSnapshot = await admin.firestore()
      .collection('notifications')
      .where('userId', '==', userId)
      .where('read', '==', false)
      .get();
    
    // If no unread notifications, return early
    if (unreadNotificationsSnapshot.empty) {
      return {
        success: true,
        count: 0
      };
    }
    
    // Update all in a batch
    unreadNotificationsSnapshot.forEach(doc => {
      batch.update(doc.ref, {
        read: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    await batch.commit();
    
    return {
      success: true,
      count: unreadNotificationsSnapshot.size
    };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message
    );
  }
});

module.exports = {
  listNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
}; 