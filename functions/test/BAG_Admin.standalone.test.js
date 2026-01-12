const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'interimed-620fd'
  });
}

const { healthRegistryAPI } = require('../api/BAG_Admin');

async function testHealthRegistryAPI() {
  console.log('Testing BAG Admin Health Registry API with GLN: 7601001419988\n');

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
    console.log('Making request to Swiss Health Registry API...');
    const result = await healthRegistryAPI(testData, mockContext);

    if (result.success) {
      console.log('\n✅ SUCCESS!');
      console.log('\nRetrieved Data:');
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      console.log('\n❌ FAILED');
      console.log('Error:', result.error);
    }
  } catch (error) {
    console.log('\n❌ ERROR');
    console.log('Error Code:', error.code);
    console.log('Error Message:', error.message);
    if (error.details) {
      console.log('Error Details:', error.details);
    }
  }
}

if (require.main === module) {
  testHealthRegistryAPI()
    .then(() => {
      console.log('\nTest completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nTest failed with error:', error);
      process.exit(1);
    });
}

module.exports = { testHealthRegistryAPI };



