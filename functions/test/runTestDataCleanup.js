#!/usr/bin/env node

const admin = require('firebase-admin');
const path = require('path');
const readline = require('readline');

const DB_NAME = 'medishift';

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
  path.join(__dirname, '../service-account-key.json');

let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
  console.log('✓ Service account loaded');
} catch (error) {
  console.error('✗ Error loading service account:', error.message);
  console.error('Please set GOOGLE_APPLICATION_CREDENTIALS environment variable or place service-account-key.json in functions directory');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
  });
  console.log('✓ Firebase Admin initialized');
}

const { cleanupTestData } = require('./cleanupTestData');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('=== MEDISHIFT TEST DATA CLEANUP ===\n');
console.log(`Target Database: ${DB_NAME}`);
console.log(`Project: ${serviceAccount.project_id}`);
console.log('\n⚠️  WARNING: This will permanently delete test data from your database.');
console.log('\nThe following will be deleted:');
console.log('- Test user and 8 employee accounts (Auth + Firestore)');
console.log('- 1 Organization document');
console.log('- 3 Facility documents');
console.log('- Professional profiles for all test users');
console.log('- All associated events, contracts, positions, and notifications');

rl.question('\nAre you sure you want to continue? Type "yes" to confirm: ', async (answer) => {
  rl.close();
  
  if (answer.toLowerCase() !== 'yes') {
    console.log('\nCleanup cancelled.');
    process.exit(0);
  }

  console.log('\nProceeding with cleanup...\n');
  
  try {
    const result = await cleanupTestData();
    
    if (result.success) {
      console.log('\n✓ Cleanup completed successfully!');
      console.log(`Total items deleted: ${result.deletedCount}`);
    } else {
      console.error('\n✗ Cleanup failed');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Fatal error:', error);
    process.exit(1);
  }
});

