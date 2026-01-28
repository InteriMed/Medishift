/**
 * Centralized Firestore Database Configuration
 * 
 * This module provides a single source of truth for Firestore database configuration
 * across all Cloud Functions. It ensures that all functions connect to the correct
 * database using centralized constants.
 * 
 * IMPORTANT: Always import the database instance from this module instead of calling
 * getFirestore() directly in your function files.
 * 
 * Usage:
 *   const db = require('./database/db');
 *   // or for API functions:
 *   const db = require('../database/db');
 */

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { FIRESTORE_DATABASE_NAME } = require('../config/keysDatabase');

// Initialize Firestore with the centralized database name
// This ensures all operations target the correct database
const db = getFirestore(admin.app(), FIRESTORE_DATABASE_NAME);

module.exports = db;
