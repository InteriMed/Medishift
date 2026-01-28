import { db, functions } from './firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs,
  writeBatch,
  doc,
  getDoc,
  updateDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { NotificationPayload, NotificationTarget } from '../types/context';
import { logAudit } from './audit';

const ANNOUNCEMENTS_COLLECTION = 'announcements';
const USERS_COLLECTION = 'users';

export const createAnnouncement = async (
  payload: NotificationPayload,
  createdBy: string,
  facilityId: string
): Promise<string> => {
  try {
    await logAudit('notification.create_announcement', 'START', {
      userId: createdBy,
      facilityId,
      priority: payload.priority,
    });

    const announcementData = {
      ...payload,
      createdBy,
      facilityId,
      createdAt: serverTimestamp(),
      status: 'PENDING',
      recipientCount: 0,
    };

    const announcementRef = await addDoc(
      collection(db, ANNOUNCEMENTS_COLLECTION),
      announcementData
    );

    await logAudit('notification.create_announcement', 'SUCCESS', {
      userId: createdBy,
      facilityId,
      announcementId: announcementRef.id,
    });

    return announcementRef.id;
  } catch (error) {
    await logAudit('notification.create_announcement', 'ERROR', {
      userId: createdBy,
      facilityId,
      error: error.message,
    });
    throw error;
  }
};

export const sendNotificationToUser = async (
  userId: string,
  notification: {
    title: string;
    body: string;
    priority: 'CRITICAL' | 'HIGH' | 'LOW';
    actionUrl?: string;
    data?: Record<string, any>;
  }
): Promise<void> => {
  try {
    const userNotificationRef = collection(db, `${USERS_COLLECTION}/${userId}/notifications`);
    
    await addDoc(userNotificationRef, {
      ...notification,
      read: false,
      createdAt: serverTimestamp(),
    });

    if (notification.priority === 'CRITICAL' || notification.priority === 'HIGH') {
      await sendPushNotification(userId, notification);
    }
  } catch (error) {
    console.error('Failed to send notification to user:', error);
    throw error;
  }
};

export const sendPushNotification = async (
  userId: string,
  notification: {
    title: string;
    body: string;
    priority: 'CRITICAL' | 'HIGH' | 'LOW';
    actionUrl?: string;
    data?: Record<string, any>;
  }
): Promise<void> => {
  try {
    const sendPushFunction = httpsCallable(functions, 'sendPushNotification');
    
    await sendPushFunction({
      userId,
      notification: {
        title: notification.title,
        body: notification.body,
        priority: notification.priority,
        sound: notification.priority === 'CRITICAL' ? 'default' : undefined,
        data: {
          actionUrl: notification.actionUrl,
          ...notification.data,
        },
      },
    });
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
};

export const broadcastNotification = async (
  payload: NotificationPayload,
  createdBy: string,
  facilityId: string
): Promise<void> => {
  try {
    const announcementId = await createAnnouncement(payload, createdBy, facilityId);

    const broadcastFunction = httpsCallable(functions, 'broadcastNotification');
    
    await broadcastFunction({
      announcementId,
      payload,
      facilityId,
    });
  } catch (error) {
    console.error('Failed to broadcast notification:', error);
    throw error;
  }
};

export const getTargetUsers = async (
  target: NotificationTarget,
  facilityId?: string
): Promise<string[]> => {
  try {
    let userQuery;
    const usersRef = collection(db, USERS_COLLECTION);

    switch (target.type) {
      case 'ALL':
        if (facilityId) {
          userQuery = query(usersRef, where('facilityId', '==', facilityId));
        } else {
          userQuery = query(usersRef);
        }
        break;

      case 'FACILITY':
        if (!target.facilityIds || target.facilityIds.length === 0) {
          throw new Error('Facility IDs required for FACILITY target');
        }
        userQuery = query(usersRef, where('facilityId', 'in', target.facilityIds.slice(0, 10)));
        break;

      case 'ROLE':
        if (!target.roleFilter || target.roleFilter.length === 0) {
          throw new Error('Role filter required for ROLE target');
        }
        userQuery = query(
          usersRef,
          where('role', 'in', target.roleFilter),
          ...(facilityId ? [where('facilityId', '==', facilityId)] : [])
        );
        break;

      case 'USER':
        return target.userIds || [];

      default:
        throw new Error('Invalid target type');
    }

    const snapshot = await getDocs(userQuery);
    return snapshot.docs.map((doc) => doc.id);
  } catch (error) {
    console.error('Error getting target users:', error);
    return [];
  }
};

export const fanOutNotifications = async (
  userIds: string[],
  notification: {
    title: string;
    body: string;
    priority: 'CRITICAL' | 'HIGH' | 'LOW';
    actionUrl?: string;
    data?: Record<string, any>;
  }
): Promise<number> => {
  const batch = writeBatch(db);
  let count = 0;

  const chunks = [];
  for (let i = 0; i < userIds.length; i += 500) {
    chunks.push(userIds.slice(i, i + 500));
  }

  for (const chunk of chunks) {
    for (const userId of chunk) {
      const notificationRef = doc(
        collection(db, `${USERS_COLLECTION}/${userId}/notifications`)
      );
      
      batch.set(notificationRef, {
        ...notification,
        read: false,
        createdAt: serverTimestamp(),
      });
      
      count++;
    }

    try {
      await batch.commit();
    } catch (error) {
      console.error('Failed to commit batch:', error);
    }
  }

  return count;
};

export const markNotificationAsRead = async (
  userId: string,
  notificationId: string
): Promise<void> => {
  try {
    const notificationRef = doc(
      db,
      `${USERS_COLLECTION}/${userId}/notifications`,
      notificationId
    );
    
    await updateDoc(notificationRef, {
      read: true,
      readAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    throw error;
  }
};

export const getUserNotifications = async (
  userId: string,
  limit: number = 50
): Promise<any[]> => {
  try {
    const notificationsRef = collection(db, `${USERS_COLLECTION}/${userId}/notifications`);
    const notificationsQuery = query(
      notificationsRef,
      orderBy('createdAt', 'desc'),
      limit(limit)
    );

    const snapshot = await getDocs(notificationsQuery);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Failed to get user notifications:', error);
    return [];
  }
};

export const sendNotification = async (
  notification: {
    title: string;
    body: string;
    priority: 'CRITICAL' | 'HIGH' | 'LOW';
    target?: NotificationTarget;
    actionUrl?: string;
    data?: Record<string, any>;
  }
): Promise<void> => {
  try {
    if (!notification.target) {
      throw new Error('Target is required for sendNotification');
    }

    const userIds = await getTargetUsers(notification.target, notification.data?.facilityId);
    
    if (userIds.length === 0) {
      return;
    }

    if (userIds.length === 1) {
      await sendNotificationToUser(userIds[0], {
        title: notification.title,
        body: notification.body,
        priority: notification.priority,
        actionUrl: notification.actionUrl,
        data: notification.data,
      });
    } else {
      await fanOutNotifications(userIds, {
        title: notification.title,
        body: notification.body,
        priority: notification.priority,
        actionUrl: notification.actionUrl,
        data: notification.data,
      });
    }
  } catch (error) {
    console.error('Failed to send notification:', error);
    throw error;
  }
};

