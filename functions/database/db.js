/**
 * Centralized Firestore Database Configuration
 * 
 * This module provides a single source of truth for Firestore database configuration
 * across all Cloud Functions. It ensures that all functions connect to the 'medishift'
 * database instead of the default database.
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

// Initialize Firestore with the medishift database
// This ensures all operations target the correct database
const db = getFirestore(admin.app(), 'medishift');

module.exports = db;
