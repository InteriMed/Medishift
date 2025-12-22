const functions = require('firebase-functions');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables based on the environment
const env = process.env.NODE_ENV || 'development';
const configPath = path.resolve(__dirname, `.env.${env}`);

dotenv.config({
  path: configPath
});

// Export configuration 
module.exports = {
  // Existing
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  loggingLevel: process.env.LOGGING_LEVEL,

  // Swiss Compliance - Regional Configuration
  region: 'europe-west6',                      // Zurich - Cloud Functions & Firestore
  aiRegion: 'europe-west3',                    // Frankfurt - Vertex AI (Gemini)
  visionEndpoint: 'eu-vision.googleapis.com',  // EU - Vision API (OCR)

  // PayrollPlus Integration (Staff Leasing Partner)
  payrollEmail: 'partners@payrollplus.ch',

  // Pilot Mode Configuration
  pilot: {
    enabled: true,
    endDate: '2025-02-28',        // 8 weeks from launch
    feePercentage: 0,             // 0% commission during pilot
    message: 'Pilot Program: 0% commission until Feb 28, 2025'
  },

  // Data Retention (Swiss Code of Obligations)
  dataRetention: {
    financialRecordsYears: 10,    // Contracts, invoices
    auditLogsYears: 10,
    deletedAccountsYears: 10      // Anonymized after this period
  },

  // Security - Account Deletion
  security: {
    // Salt for anti-fraud hashes (should be set in environment variables in production)
    accountDeletionSalt: process.env.ACCOUNT_DELETION_SALT || 'interimed-gdpr-compliant-2024',
    // Hash algorithm for anti-fraud
    hashAlgorithm: 'sha256'
  },

  // Add other configuration variables as needed
}; 