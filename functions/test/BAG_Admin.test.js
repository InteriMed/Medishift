const admin = require('firebase-admin');
const test = require('firebase-functions-test')({
  projectId: 'interimed-620fd',
});

const myFunctions = require('../index');

describe('BAG Admin API Tests', () => {
  after(() => {
    test.cleanup();
  });

  describe('healthRegistryAPI', () => {
    it('should retrieve information using GLN 7601001419988', async () => {
      const mockContext = {
        auth: {
          uid: 'test-user-id',
          token: {
            email: 'test@example.com'
          }
        }
      };

      const testData = {
        gln: '7601001419988'
      };

      try {
        const wrapped = test.wrap(myFunctions.healthRegistryAPI);
        const result = await wrapped(testData, mockContext);

        console.log('Test Result:', JSON.stringify(result, null, 2));

        if (result.success) {
          console.log('Success! Retrieved data:', JSON.stringify(result.data, null, 2));
        } else {
          console.error('Failed:', result.error);
        }

        if (result && result.success !== undefined) {
          console.log('Test completed successfully');
        }
      } catch (error) {
        console.error('Test Error:', error.message);
        console.error('Error Code:', error.code);
        console.error('Error Details:', error.details);
        throw error;
      }
    });

    it('should reject request without GLN', async () => {
      const mockContext = {
        auth: {
          uid: 'test-user-id',
          token: {
            email: 'test@example.com'
          }
        }
      };

      const testData = {};

      try {
        const wrapped = test.wrap(myFunctions.healthRegistryAPI);
        await wrapped(testData, mockContext);
        throw new Error('Should have thrown an error for missing GLN');
      } catch (error) {
        if (error.code === 'invalid-argument') {
          console.log('Correctly rejected request without GLN');
        } else {
          throw error;
        }
      }
    });

    it('should reject unauthenticated requests', async () => {
      const mockContext = {
        auth: null
      };

      const testData = {
        gln: '7601001419988'
      };

      try {
        const wrapped = test.wrap(myFunctions.healthRegistryAPI);
        await wrapped(testData, mockContext);
        throw new Error('Should have thrown an error for unauthenticated request');
      } catch (error) {
        if (error.code === 'unauthenticated') {
          console.log('Correctly rejected unauthenticated request');
        } else {
          throw error;
        }
      }
    });
  });

  describe('companySearchAPI', () => {
    it('should retrieve company information using GLN 7601001370357', async () => {
      const mockContext = {
        auth: {
          uid: 'test-user-id',
          token: {
            email: 'test@example.com'
          }
        }
      };

      const testData = {
        glnCompany: '7601001370357'
      };

      try {
        const wrapped = test.wrap(myFunctions.companySearchAPI);
        const result = await wrapped(testData, mockContext);

        console.log('Company Search Test Result:', JSON.stringify(result, null, 2));

        if (result.success) {
          console.log('Success! Retrieved company data:', JSON.stringify(result.data, null, 2));
        } else {
          console.error('Failed:', result.error);
        }

        if (result && result.success !== undefined) {
          console.log('Company search test completed successfully');
        }
      } catch (error) {
        console.error('Company Search Test Error:', error.message);
        console.error('Error Code:', error.code);
        console.error('Error Details:', error.details);
        throw error;
      }
    });

    it('should reject request without GLN Company', async () => {
      const mockContext = {
        auth: {
          uid: 'test-user-id',
          token: {
            email: 'test@example.com'
          }
        }
      };

      const testData = {};

      try {
        const wrapped = test.wrap(myFunctions.companySearchAPI);
        await wrapped(testData, mockContext);
        throw new Error('Should have thrown an error for missing GLN Company');
      } catch (error) {
        if (error.code === 'invalid-argument') {
          console.log('Correctly rejected request without GLN Company');
        } else {
          throw error;
        }
      }
    });

    it('should reject unauthenticated requests for company search', async () => {
      const mockContext = {
        auth: null
      };

      const testData = {
        glnCompany: '7601001370357'
      };

      try {
        const wrapped = test.wrap(myFunctions.companySearchAPI);
        await wrapped(testData, mockContext);
        throw new Error('Should have thrown an error for unauthenticated request');
      } catch (error) {
        if (error.code === 'unauthenticated') {
          console.log('Correctly rejected unauthenticated company search request');
        } else {
          throw error;
        }
      }
    });
  });
});

