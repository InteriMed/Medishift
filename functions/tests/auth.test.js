const admin = require('firebase-admin');
const test = require('firebase-functions-test')();
const assert = require('assert');
const sinon = require('sinon');

// Import the functions we want to test
const authFunctions = require('../src/auth');

describe('Authentication Functions', () => {
  let adminInitStub;
  let userRecord;
  
  before(() => {
    // Mock admin.initializeApp()
    adminInitStub = sinon.stub(admin, 'initializeApp');
    
    // Mock user data
    userRecord = {
      uid: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
      emailVerified: true
    };
  });
  
  after(() => {
    // Restore stubs
    adminInitStub.restore();
    // Clean up test environment
    test.cleanup();
  });
  
  describe('createUserRecord', () => {
    it('should create a new user document in Firestore', async () => {
      // Mock Firestore
      const firestoreStub = {
        collection: sinon.stub().returnsThis(),
        doc: sinon.stub().returnsThis(),
        set: sinon.stub().resolves()
      };
      
      sinon.stub(admin, 'firestore').returns(firestoreStub);
      
      // Create wrapped function with test parameters
      const wrapped = test.wrap(authFunctions.createUserRecord);
      
      // Test data
      const data = {
        user: userRecord
      };
      
      // Call the function
      await wrapped(data);
      
      // Assert Firestore was called with correct parameters
      assert(firestoreStub.collection.calledWith('users'));
      assert(firestoreStub.doc.calledWith(userRecord.uid));
      assert(firestoreStub.set.calledOnce);
      
      // Clean up
      admin.firestore.restore();
    });
  });
  
  describe('deleteUserData', () => {
    it('should delete user data when user is deleted', async () => {
      // Mock Firestore
      const firestoreStub = {
        collection: sinon.stub().returnsThis(),
        doc: sinon.stub().returnsThis(),
        delete: sinon.stub().resolves()
      };
      
      sinon.stub(admin, 'firestore').returns(firestoreStub);
      
      // Create wrapped function with test parameters
      const wrapped = test.wrap(authFunctions.deleteUserData);
      
      // Test data
      const data = {
        uid: userRecord.uid
      };
      
      // Call the function
      await wrapped(data);
      
      // Assert Firestore was called with correct parameters
      assert(firestoreStub.collection.calledWith('users'));
      assert(firestoreStub.doc.calledWith(userRecord.uid));
      assert(firestoreStub.delete.calledOnce);
      
      // Clean up
      admin.firestore.restore();
    });
  });
}); 