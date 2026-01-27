const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.onAnnouncementCreated = functions.firestore
  .document('announcements/{announcementId}')
  .onCreate(async (snap, context) => {
    const announcement = snap.data();
    const announcementId = context.params.announcementId;

    try {
      const targetUserIds = await getTargetUsers(announcement.target, announcement.facilityId);

      const batchSize = 500;
      let processedCount = 0;

      for (let i = 0; i < targetUserIds.length; i += batchSize) {
        const batch = admin.firestore().batch();
        const chunk = targetUserIds.slice(i, i + batchSize);

        for (const userId of chunk) {
          const notificationRef = admin.firestore()
            .collection('users')
            .doc(userId)
            .collection('notifications')
            .doc();

          batch.set(notificationRef, {
            title: announcement.title,
            body: announcement.body,
            priority: announcement.priority,
            actionUrl: announcement.actionUrl,
            data: announcement.data,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            announcementId,
          });

          processedCount++;
        }

        await batch.commit();
      }

      if (announcement.priority === 'CRITICAL' || announcement.priority === 'HIGH') {
        await sendPushNotifications(targetUserIds, announcement);
      }

      await snap.ref.update({
        status: 'COMPLETED',
        recipientCount: processedCount,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await admin.firestore().collection('system_logs').add({
        actionId: 'notification.announcement_processed',
        userId: announcement.createdBy,
        facilityId: announcement.facilityId,
        status: 'SUCCESS',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          announcementId,
          recipientCount: processedCount,
        },
      });

      console.log(`Announcement ${announcementId} processed for ${processedCount} users`);
    } catch (error) {
      console.error('Error processing announcement:', error);

      await snap.ref.update({
        status: 'FAILED',
        error: error.message,
      });

      await admin.firestore().collection('system_logs').add({
        actionId: 'notification.announcement_failed',
        userId: announcement.createdBy || 'SYSTEM',
        facilityId: announcement.facilityId || 'NONE',
        status: 'ERROR',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        error: error.message,
      });
    }
  });

exports.broadcastNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { announcementId, payload, facilityId } = data;

  try {
    const announcementRef = admin.firestore().collection('announcements').doc(announcementId);
    const announcementSnap = await announcementRef.get();

    if (!announcementSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Announcement not found');
    }

    return { success: true, announcementId };
  } catch (error) {
    console.error('Error broadcasting notification:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

exports.sendPushNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userId, notification } = data;

  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data();
    const fcmTokens = userData.fcmTokens || [];

    if (fcmTokens.length === 0) {
      console.log(`No FCM tokens found for user ${userId}`);
      return { success: false, reason: 'no_tokens' };
    }

    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        priority: notification.priority,
        actionUrl: notification.actionUrl || '',
        ...notification.data,
      },
      android: {
        priority: notification.priority === 'CRITICAL' ? 'high' : 'normal',
        notification: {
          sound: notification.sound || 'default',
          priority: notification.priority === 'CRITICAL' ? 'max' : 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: notification.sound || 'default',
            badge: 1,
          },
        },
      },
    };

    const results = await Promise.allSettled(
      fcmTokens.map(token => admin.messaging().send({ ...message, token }))
    );

    const invalidTokens = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Failed to send to token ${index}:`, result.reason);
        if (result.reason?.code === 'messaging/invalid-registration-token' ||
            result.reason?.code === 'messaging/registration-token-not-registered') {
          invalidTokens.push(fcmTokens[index]);
        }
      }
    });

    if (invalidTokens.length > 0) {
      await admin.firestore().collection('users').doc(userId).update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
      });
    }

    if (notification.priority === 'CRITICAL') {
    }

    return { success: true, sentCount: results.filter(r => r.status === 'fulfilled').length };
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

async function getTargetUsers(target, facilityId) {
  const usersRef = admin.firestore().collection('users');
  let query;

  switch (target.type) {
    case 'ALL':
      query = facilityId ? usersRef.where('facilityId', '==', facilityId) : usersRef;
      break;

    case 'FACILITY':
      if (!target.facilityIds || target.facilityIds.length === 0) {
        throw new Error('Facility IDs required');
      }
      query = usersRef.where('facilityId', 'in', target.facilityIds.slice(0, 10));
      break;

    case 'ROLE':
      if (!target.roleFilter || target.roleFilter.length === 0) {
        throw new Error('Role filter required');
      }
      query = usersRef.where('role', 'in', target.roleFilter);
      if (facilityId) {
        query = query.where('facilityId', '==', facilityId);
      }
      break;

    case 'USER':
      return target.userIds || [];

    default:
      throw new Error('Invalid target type');
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => doc.id);
}

async function sendPushNotifications(userIds, announcement) {
  const batchSize = 100;
  
  for (let i = 0; i < userIds.length; i += batchSize) {
    const chunk = userIds.slice(i, i + batchSize);
    
    const userDocs = await Promise.all(
      chunk.map(uid => admin.firestore().collection('users').doc(uid).get())
    );

    const tokens = [];
    userDocs.forEach(doc => {
      if (doc.exists) {
        const fcmTokens = doc.data().fcmTokens || [];
        tokens.push(...fcmTokens);
      }
    });

    if (tokens.length === 0) continue;

    const message = {
      notification: {
        title: announcement.title,
        body: announcement.body,
      },
      data: {
        priority: announcement.priority,
        actionUrl: announcement.actionUrl || '',
      },
      tokens: tokens.slice(0, 500),
    };

    try {
      await admin.messaging().sendEachForMulticast(message);
    } catch (error) {
      console.error('Error sending multicast message:', error);
    }
  }
}

