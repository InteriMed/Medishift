const admin = require('firebase-admin');
const test = require('firebase-functions-test')({
  projectId: 'test-project-id',
}, './service-account-key.json');

// Import our functions
const myFunctions = require('../index');

describe('Firebase Functions Tests', () => {
  // Clean up after tests
  after(() => {
    test.cleanup();
  });

  describe('Auth Functions', () => {
    it('should create a user profile on user creation', async () => {
      // Mock a Firebase Auth user
      const user = {
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: false
      };

      // Trigger the function
      const wrapped = test.wrap(myFunctions.createUserProfile);
      const result = await wrapped(user);

      // Verify the result
      expect(result.success).to.be.true;
    });
  });

  describe('Contract API', () => {
    it('should list contracts for the authenticated user', async () => {
      // Mock authenticated context
      const context = {
        auth: {
          uid: 'test-user-id'
        }
      };

      // Mock request data
      const data = {
        action: 'list'
      };

      // Trigger the function
      const wrapped = test.wrap(myFunctions.contractAPI);
      const result = await wrapped(data, context);

      // Verify the result
      expect(result.success).to.be.true;
      expect(result.contracts).to.be.an('array');
    });
  });

  describe('Notification Functions', () => {
    it('should list notifications for the authenticated user', async () => {
      // Mock authenticated context
      const context = {
        auth: {
          uid: 'test-user-id'
        }
      };

      // Mock request data
      const data = {
        limit: 10
      };

      // Trigger the function
      const wrapped = test.wrap(myFunctions.listNotifications);
      const result = await wrapped(data, context);

      // Verify the result
      expect(result.success).to.be.true;
      expect(result.notifications).to.be.an('array');
    });
  });
}); 