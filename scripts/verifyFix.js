const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, getDoc, deleteDoc, terminate, initializeFirestore } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
require('dotenv').config();

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'AIzaSyBKMnh477m8ZDmk7WhQZKPzb3VDe3PktDs',
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'interimed-620fd.firebaseapp.com',
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'interimed-620fd',
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'interimed-620fd.firebasestorage.app',
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '436488373074',
    appId: process.env.REACT_APP_FIREBASE_APP_ID || '1:436488373074:web:60c3a26935b6238d9a308b',
};

console.log('🔧 Initializing Firebase with config:', { projectId: firebaseConfig.projectId });

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// Explicitly initialize with medishift database ID
const db = initializeFirestore(app, {}, 'medishift');

async function runTest() {
    console.log('\n🚀 Starting Connectivity Test with Authentication...');

    try {
        // Authenticate first
        console.log('🔑 Authenticating...');
        const email = `verify_${Date.now()}@example.com`;
        const password = 'TestPassword123!';
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log(`✅ Authenticated as ${email}`);

        // 1. Write Test (Using user's own document to ensure permission)
        console.log('📝 Testing Write Operation...');
        const testDocRef = doc(db, 'users', user.uid);
        const testData = {
            uid: user.uid,
            email: email,
            displayName: 'Verification User',
            createdAt: new Date().toISOString(),
            role: 'test_verification'
        };

        await setDoc(testDocRef, testData);
        console.log('✅ Write successful!');

        // 2. Read Test (Read OWN document)
        console.log('📖 Testing Read Operation (Own Document)...');
        const docSnap = await getDoc(testDocRef);

        if (docSnap.exists()) {
            console.log(`✅ Read successful! Document data:`, docSnap.data());
        } else {
            throw new Error('Document written but not found!');
        }

        // 3. Cleanup (Delete the test user document to keep it clean)
        console.log('🧹 Cleaning up test document...');
        await deleteDoc(testDocRef); // Deleting own document
        console.log('✅ Cleanup successful!');

        console.log('\n🎉 SUCCESS: Firestore connection is stable and working correctly with "medishift" database.');
        await terminate(db);
        process.exit(0);

    } catch (error) {
        console.error('\n❌ FAILURE: An error occurred during the test.');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        process.exit(1);
    }
}

runTest();
