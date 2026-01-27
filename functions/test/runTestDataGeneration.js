#!/usr/bin/env node

const admin = require('firebase-admin');
const path = require('path');

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

const { generateTestData } = require('./generateTestData');

console.log('=== MEDISHIFT TEST DATA GENERATOR ===\n');
console.log(`Target Database: ${DB_NAME}`);
console.log(`Project: ${serviceAccount.project_id}`);
console.log('\nWARNING: This will create test data in your database.');
console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');

setTimeout(async () => {
  try {
    const result = await generateTestData();
    
    if (result.success) {
      console.log('\n✓ All test data created successfully!');
      console.log('\n=== SUMMARY ===');
      console.log('Test User ID:', result.testUserId);
      console.log('Test Email:', result.testEmail);
      console.log('Organization:', result.organizationId);
      console.log('Facilities:', result.facilityIds.length);
      console.log('Employees:', result.employeeIds.length);
    } else {
      console.error('\n✗ Test data generation failed');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Fatal error:', error);
    process.exit(1);
  }
}, 3000);

