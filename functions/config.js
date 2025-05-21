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
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  loggingLevel: process.env.LOGGING_LEVEL,
  // Add other configuration variables as needed
}; 