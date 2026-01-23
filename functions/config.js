const functions = require('firebase-functions');
const path = require('path');
const dotenv = require('dotenv');
const { CONFIG, DEFAULT_VALUES, ENV_VARS, getEnvVar } = require('./config/keysDatabase');

// Load environment variables based on the environment
const env = process.env.NODE_ENV || 'development';
const configPath = path.resolve(__dirname, `.env.${env}`);

dotenv.config({
  path: configPath
});

// Export configuration 
module.exports = {
  // Existing
  storageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET'),
  loggingLevel: getEnvVar('LOGGING_LEVEL'),

  // Swiss Compliance - Regional Configuration
  region: CONFIG.REGION,
  aiRegion: CONFIG.AI_REGION,
  visionEndpoint: CONFIG.VISION_ENDPOINT,

  // PayrollPlus Integration (Staff Leasing Partner)
  payrollEmail: CONFIG.PAYROLL_EMAIL,

  // Pilot Mode Configuration
  pilot: CONFIG.PILOT,

  // Data Retention (Swiss Code of Obligations)
  dataRetention: CONFIG.DATA_RETENTION,

  // Security - Account Deletion
  security: {
    accountDeletionSalt: getEnvVar('ACCOUNT_DELETION_SALT') || DEFAULT_VALUES.ACCOUNT_DELETION_SALT,
    hashAlgorithm: CONFIG.SECURITY.HASH_ALGORITHM
  }
}; 