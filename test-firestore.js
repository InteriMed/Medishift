const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc, collection, getDocs, enableNetwork } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'AIzaSyBKMnh477m8ZDmk7WhQZKPzb3VDe3PktDs',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'interimed-620fd.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'interimed-620fd',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'interimed-620fd.firebasestorage.app',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '436488373074',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '1:436488373074:web:60c3a26935b6238d9a308b',
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || 'G-66V8BS82V0'
};

console.log('🔧 Initializing Firebase...');
console.log('Project ID:', firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFirestore() {
  console.log('\n📋 Starting Firestore Tests...\n');

  try {
    console.log('1️⃣ Testing network connection...');
    await enableNetwork(db);
    console.log('✅ Network enabled\n');

    console.log('2️⃣ Testing read operation - checking users collection...');
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      console.log(`✅ Read successful: Found ${snapshot.size} users in collection\n`);
      
      if (snapshot.size > 0) {
        console.log('Sample user IDs:');
        snapshot.docs.slice(0, 3).forEach((doc) => {
          console.log(`  - ${doc.id}`);
        });
        console.log('');
      }
    } catch (readError) {
      console.error('❌ Read failed:', readError.code, readError.message);
      console.error('Full error:', readError);
      throw readError;
    }

    console.log('3️⃣ Testing write operation - creating test document...');
    const testDocId = `test_${Date.now()}`;
    const testDocRef = doc(db, 'users', testDocId);
    
    try {
      const testData = {
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'professional',
        createdAt: new Date(),
        updatedAt: new Date(),
        isTest: true
      };

      await setDoc(testDocRef, testData);
      console.log(`✅ Write successful: Created test document ${testDocId}\n`);

      console.log('4️⃣ Verifying write - reading back the document...');
      const verifyDoc = await getDoc(testDocRef);
      
      if (verifyDoc.exists()) {
        console.log('✅ Verification successful: Document exists');
        console.log('Document data:', verifyDoc.data());
        console.log('');
      } else {
        console.error('❌ Verification failed: Document does not exist after write');
        throw new Error('Document verification failed');
      }

      console.log('5️⃣ Testing user document creation (real format)...');
      const realTestId = `real_test_${Date.now()}`;
      const realTestRef = doc(db, 'users', realTestId);
      
      const realUserData = {
        email: `testuser_${Date.now()}@test.com`,
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test User',
        phoneNumber: '',
        phonePrefix: '+41',
        role: 'professional',
        createdAt: new Date(),
        updatedAt: new Date(),
        profileCompleted: false,
        profileCompletionPercentage: 0,
        isProfessionalProfileComplete: false,
        tutorialPassed: false
      };

      await setDoc(realTestRef, realUserData);
      console.log(`✅ Real user document created: ${realTestId}`);
      
      const verifyRealDoc = await getDoc(realTestRef);
      if (verifyRealDoc.exists()) {
        console.log('✅ Real user document verified');
        console.log('Real user data:', verifyRealDoc.data());
        console.log('');
      }

      console.log('6️⃣ Testing profile document creation...');
      const profileRef = doc(db, 'professionalProfiles', realTestId);
      const profileData = {
        email: realUserData.email,
        firstName: 'Test',
        lastName: 'User',
        legalFirstName: 'Test',
        legalLastName: 'User',
        contactPhone: '',
        contactPhonePrefix: '+41',
        profileVisibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(profileRef, profileData);
      console.log('✅ Profile document created');
      
      const verifyProfile = await getDoc(profileRef);
      if (verifyProfile.exists()) {
        console.log('✅ Profile document verified\n');
      }

      console.log('🎉 All tests passed! Firestore is working correctly.\n');
      console.log('Summary:');
      console.log('  ✅ Network connection: OK');
      console.log('  ✅ Read operations: OK');
      console.log('  ✅ Write operations: OK');
      console.log('  ✅ Document verification: OK');
      console.log('  ✅ User document format: OK');
      console.log('  ✅ Profile document format: OK');

    } catch (writeError) {
      console.error('❌ Write failed:', writeError.code, writeError.message);
      console.error('Full error:', writeError);
      throw writeError;
    }

  } catch (error) {
    console.error('\n❌ Test suite failed!');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.code === 'unavailable' || error.message?.includes('offline')) {
      console.error('\n⚠️  Firestore appears to be offline or unavailable.');
      console.error('Check:');
      console.error('  1. Internet connection');
      console.error('  2. Firebase project configuration');
      console.error('  3. Firestore database is enabled in Firebase Console');
      console.error('  4. Firestore security rules allow read/write');
    }
    
    if (error.code === 'permission-denied') {
      console.error('\n⚠️  Permission denied.');
      console.error('Check Firestore security rules in Firebase Console.');
    }

    process.exit(1);
  }
}

testFirestore()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });


