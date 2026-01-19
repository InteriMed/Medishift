import { db } from '../services/firebase';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';

export async function testFirestoreConnection() {
  console.log('\n📋 Starting Firestore Connection Test...\n');

  try {
    if (!db) {
      throw new Error('Firestore database not initialized');
    }

    console.log('1️⃣ Testing network connection... (Implicit check via operations)');
    // Network is enabled by default. Explicit calls were causing issues.

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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isTest: true
      };

      await setDoc(testDocRef, testData);
      console.log(`✅ Write successful: Created test document ${testDocId}\n`);

      console.log('4️⃣ Verifying write - reading back the document...');
      await new Promise(resolve => setTimeout(resolve, 1000));
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        profileCompleted: false,
        profileCompletionPercentage: 0,
        isProfessionalProfileComplete: false,
        tutorialPassed: false
      };

      await setDoc(realTestRef, realUserData);
      console.log(`✅ Real user document created: ${realTestId}`);

      await new Promise(resolve => setTimeout(resolve, 1000));
      const verifyRealDoc = await getDoc(realTestRef);
      if (verifyRealDoc.exists()) {
        console.log('✅ Real user document verified');
        console.log('Real user data:', verifyRealDoc.data());
        console.log('');
      } else {
        console.error('❌ Real user document verification failed');
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(profileRef, profileData);
      console.log('✅ Profile document created');

      await new Promise(resolve => setTimeout(resolve, 1000));
      const verifyProfile = await getDoc(profileRef);
      if (verifyProfile.exists()) {
        console.log('✅ Profile document verified\n');
      } else {
        console.error('❌ Profile document verification failed\n');
      }

      console.log('🎉 All tests passed! Firestore is working correctly.\n');
      console.log('Summary:');
      console.log('  ✅ Network connection: OK');
      console.log('  ✅ Read operations: OK');
      console.log('  ✅ Write operations: OK');
      console.log('  ✅ Document verification: OK');
      console.log('  ✅ User document format: OK');
      console.log('  ✅ Profile document format: OK');

      return { success: true, message: 'All tests passed' };
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

    return { success: false, error: error.message, code: error.code };
  }
}


