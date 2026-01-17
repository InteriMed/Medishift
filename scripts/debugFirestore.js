const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, getDoc, terminate } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyBKMnh477m8ZDmk7WhQZKPzb3VDe3PktDs",
    authDomain: "interimed-620fd.firebaseapp.com",
    projectId: "interimed-620fd",
    storageBucket: "interimed-620fd.firebasestorage.app",
    messagingSenderId: "436488373074",
    appId: "1:436488373074:web:60c3a26935b6238d9a308b",
    measurementId: "G-66V8BS82V0"
};

async function runTest() {
    console.log('--- Firestore Debug Test ---');
    console.log('Initializing Firebase with Project ID:', firebaseConfig.projectId);

    const app = initializeApp(firebaseConfig);
    // Specify the database ID 'medishift' as found in firebase.json
    const db = getFirestore(app, 'medishift');

    try {
        console.log('\n1. Testing Write Access...');
        const testDocRef = doc(db, 'debug_tests', 'connection_test_node');
        const testData = {
            timestamp: new Date().toISOString(),
            message: 'Node.js Debug Test',
            status: 'success'
        };

        await setDoc(testDocRef, testData);
        console.log('✅ Write success! Document created in "debug_tests/connection_test_node"');

        console.log('\n2. Testing Read Access...');
        const docSnap = await getDoc(testDocRef);
        if (docSnap.exists()) {
            console.log('✅ Read success! Data:', docSnap.data());
        } else {
            console.log('❌ Read failed: Document does not exist (this is unexpected)');
        }

        console.log('\n3. Testing "users" Collection Access...');
        try {
            // Try to read a few docs from users collection
            const usersSnap = await getDocs(collection(db, 'users'));
            console.log(`✅ Users collection accessible! Found ${usersSnap.size} documents.`);
            if (usersSnap.size > 0) {
                console.log('First user ID found:', usersSnap.docs[0].id);
            }
        } catch (e) {
            console.log('❌ "users" collection access failed:', e.message);
            if (e.code === 'permission-denied') {
                console.log('   (Hint: Check Firestore Security Rules)');
            }
        }

    } catch (error) {
        console.error('\n💥 CRITICAL ERROR:', error);
        if (error.code === 'unavailable') {
            console.log('   (Hint: Network issue or Firestore is unreachable)');
        }
    } finally {
        console.log('\n--- Test Finished ---');
        // Terminate to allow the process to exit
        await terminate(db);
    }
}

runTest().catch(console.error);
