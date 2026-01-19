const { initializeApp } = require('firebase/app');
const { initializeFirestore, doc, setDoc, getDoc, terminate } = require('firebase/firestore');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
    apiKey: "AIzaSyBKMnh477m8ZDmk7WhQZKPzb3VDe3PktDs",
    authDomain: "interimed-620fd.firebaseapp.com",
    projectId: "interimed-620fd",
    storageBucket: "interimed-620fd.firebasestorage.app",
    messagingSenderId: "436488373074",
    appId: "1:436488373074:web:60c3a26935b6238d9a308b",
    measurementId: "G-66V8BS82V0"
};

async function createUserTest() {
    console.log('--- Creating User Test ---');

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    // Use 'medishift' database ID
    const db = initializeFirestore(app, {}, 'medishift');

    try {
        console.log('Authenticating...');
        const email = `testuser${Date.now()}@example.com`;
        const password = 'TestPassword123!';

        let userCredential;
        try {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log(`✅ User created: ${email} (${userCredential.user.uid})`);
        } catch (e) {
            console.warn('Could not create user', e);
            throw e;
        }

        const user = userCredential.user;
        const userId = user.uid;

        console.log(`Attempting to create user document with ID: ${userId}`);

        const userRef = doc(db, 'users', userId);
        const userData = {
            uid: userId,
            email: email,
            displayName: 'Test User',
            createdAt: new Date().toISOString(),
            role: 'test'
        };

        await setDoc(userRef, userData);
        console.log('✅ User document successfully created!');

        console.log('Verifying document...');
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            console.log('✅ Document exists and was read back successfully:');
            console.log(JSON.stringify(docSnap.data(), null, 2));
        } else {
            console.error('❌ Document was created but could not be found!');
        }

    } catch (error) {
        console.error('❌ Error executing test:', error);
    } finally {
        await terminate(db);
        process.exit(0);
    }
}

createUserTest();
