const admin = require('firebase-admin');
const test = require('firebase-functions-test')({
  projectId: 'test-project-id',
}, './service-account-key.json');

const { listNotifications, markNotificationAsRead, markAllNotificationsAsRead } = require('../api/notifications');
const { onContractCreate } = require('../database');

describe('Notification System Tests', () => {
  let testUserUid;
  
  before(async () => {
    // Create a test user
    testUserUid = 'test-user-id';
    
    // Create some test notifications in Firestore
    await admin.firestore().collection('notifications').add({
      userId: testUserUid,
      title: 'Test Notification 1',
      message: 'This is a test notification',
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    await admin.firestore().collection('notifications').add({
      userId: testUserUid,
      title: 'Test Notification 2',
      message: 'This is another test notification',
      read: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
  
  after(async () => {
    // Clean up test data
    const notificationsSnapshot = await admin.firestore()
      .collection('notifications')
      .where('userId', '==', testUserUid)
      .get();
    
    const batch = admin.firestore().batch();
    notificationsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    test.cleanup();
  });
  
  describe('listNotifications', () => {
    it('should list notifications for the authenticated user', async () => {
      // Mock authenticated context
      const context = {
        auth: {
          uid: testUserUid
        }
      };
      
      // Mock request data
      const data = {
        limit: 10
      };
      
      // Trigger the function
      const wrappedListNotifications = test.wrap(listNotifications);
      const result = await wrappedListNotifications(data, context);
      
      // Verify the result
      expect(result.success).to.be.true;
      expect(result.notifications).to.be.an('array');
      expect(result.notifications.length).to.be.at.least(2);
    });
    
    it('should require authentication', async () => {
      // Mock unauthenticated context
      const context = {
        auth: null
      };
      
      // Mock request data
      const data = {
        limit: 10
      };
      
      // Trigger the function
      const wrappedListNotifications = test.wrap(listNotifications);
      
      try {
        await wrappedListNotifications(data, context);
        // Should not reach here
        expect.fail('Function should have thrown an error');
      } catch (error) {
        expect(error.code).to.equal('unauthenticated');
      }
    });
  });
  
  describe('markNotificationAsRead', () => {
    let testNotificationId;
    
    before(async () => {
      // Create a test notification
      const notificationRef = await admin.firestore().collection('notifications').add({
        userId: testUserUid,
        title: 'Test Notification for Marking',
        message: 'This notification will be marked as read',
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      testNotificationId = notificationRef.id;
    });
    
    it('should mark a notification as read', async () => {
      // Mock authenticated context
      const context = {
        auth: {
          uid: testUserUid
        }
      };
      
      // Mock request data
      const data = {
        notificationId: testNotificationId
      };
      
      // Trigger the function
      const wrappedMarkNotificationAsRead = test.wrap(markNotificationAsRead);
      const result = await wrappedMarkNotificationAsRead(data, context);
      
      // Verify the result
      expect(result.success).to.be.true;
      
      // Verify the notification was updated in Firestore
      const notificationDoc = await admin.firestore()
        .collection('notifications')
        .doc(testNotificationId)
        .get();
      
      expect(notificationDoc.exists).to.be.true;
      expect(notificationDoc.data().read).to.be.true;
    });
  });
  
  describe('markAllNotificationsAsRead', () => {
    before(async () => {
      // Create multiple unread test notifications
      for (let i = 0; i < 3; i++) {
        await admin.firestore().collection('notifications').add({
          userId: testUserUid,
          title: `Bulk Test Notification ${i}`,
          message: 'This notification will be marked as read in bulk',
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });
    
    it('should mark all notifications as read', async () => {
      // Mock authenticated context
      const context = {
        auth: {
          uid: testUserUid
        }
      };
      
      // Trigger the function
      const wrappedMarkAllNotificationsAsRead = test.wrap(markAllNotificationsAsRead);
      const result = await wrappedMarkAllNotificationsAsRead({}, context);
      
      // Verify the result
      expect(result.success).to.be.true;
      expect(result.count).to.be.at.least(3);
      
      // Verify all notifications were updated in Firestore
      const notificationsSnapshot = await admin.firestore()
        .collection('notifications')
        .where('userId', '==', testUserUid)
        .where('read', '==', false)
        .get();
      
      expect(notificationsSnapshot.empty).to.be.true;
    });
  });
  
  describe('onContractCreate', () => {
    it('should create a notification when a contract is created', async () => {
      // Create a test contract
      const contractData = {
        title: 'Test Contract',
        workerId: 'worker-123',
        companyId: 'company-456',
        createdByType: 'worker',
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Create a test snapshot
      const snapshot = {
        data: () => contractData
      };
      
      // Create a test context
      const context = {
        params: {
          contractId: 'test-contract-123'
        }
      };
      
      // Trigger the function
      const wrappedOnContractCreate = test.wrap(onContractCreate);
      const result = await wrappedOnContractCreate(snapshot, context);
      
      // Verify the result
      expect(result.success).to.be.true;
      
      // Verify a notification was created in Firestore
      const notificationsSnapshot = await admin.firestore()
        .collection('notifications')
        .where('userId', '==', 'company-456')
        .where('type', '==', 'contract_created')
        .where('contractId', '==', 'test-contract-123')
        .get();
      
      expect(notificationsSnapshot.empty).to.be.false;
      const notification = notificationsSnapshot.docs[0].data();
      expect(notification.title).to.equal('New Contract Proposal');
    });
  });
}); 