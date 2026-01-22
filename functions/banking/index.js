// BANKING ACCESS VERIFICATION

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getAuth } = require('firebase-admin/auth');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const crypto = require('crypto');

const verifyBankingAccessCode = onCall(
  { region: 'europe-west6' },
  async (request) => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { code } = data;

    if (!code || typeof code !== 'string') {
      throw new HttpsError('invalid-argument', 'Access code is required');
    }

    const db = getFirestore(admin.app(), 'medishift');
    const userId = auth.uid;

    try {
      // Try professionalProfiles first, then users
      let userDoc = await db.collection('professionalProfiles').doc(userId).get();
      
      if (!userDoc.exists) {
        userDoc = await db.collection('users').doc(userId).get();
      }
      
      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User not found');
      }

      const userData = userDoc.data();
      const collectionName = userDoc.ref.parent.id;
      
      const tempCode = userData.security?.tempBankingCode;
      const tempCodeExpiry = userData.security?.tempBankingCodeExpiry;
      
      console.log('[Banking Verify] User:', userId);
      console.log('[Banking Verify] Collection:', collectionName);
      console.log('[Banking Verify] Input code:', code, 'Type:', typeof code);
      console.log('[Banking Verify] Stored tempCode:', tempCode, 'Type:', typeof tempCode);
      console.log('[Banking Verify] Stored tempCodeExpiry:', tempCodeExpiry);
      
      if (tempCode && tempCodeExpiry) {
        const expiryDate = tempCodeExpiry.toDate ? tempCodeExpiry.toDate() : new Date(tempCodeExpiry);
        console.log('[Banking Verify] Expiry date:', expiryDate, 'Now:', new Date());
        console.log('[Banking Verify] Is expired:', Date.now() >= expiryDate.getTime());
        
        if (Date.now() < expiryDate.getTime()) {
          console.log('[Banking Verify] Code comparison:', code, '===', tempCode, '?', code === tempCode);
          console.log('[Banking Verify] Trimmed comparison:', code.trim(), '===', String(tempCode).trim(), '?', code.trim() === String(tempCode).trim());
          if (code.trim() === String(tempCode).trim()) {
            await db.collection(collectionName).doc(userId).update({
              'security.lastBankingAccessGranted': new Date(),
              'security.failedBankingAccessAttempts': 0,
              'security.tempBankingCode': null,
              'security.tempBankingCodeExpiry': null
            });

            await db.collection('auditLogs').add({
              userId,
              action: 'banking_access_granted',
              method: 'temporary_code',
              timestamp: new Date(),
              ipAddress: request.rawRequest?.ip || 'unknown'
            });

            return { success: true };
          } else {
            console.log('[Banking Verify] Code mismatch - input:', code, 'stored:', tempCode);
            await db.collection(collectionName).doc(userId).update({
              'security.failedBankingAccessAttempts': (userData.security?.failedBankingAccessAttempts || 0) + 1,
              'security.lastFailedBankingAccess': new Date()
            });
            throw new HttpsError('permission-denied', 'Invalid access code');
          }
        } else {
          console.log('[Banking Verify] Code expired');
          await db.collection(collectionName).doc(userId).update({
            'security.tempBankingCode': null,
            'security.tempBankingCodeExpiry': null
          });
          throw new HttpsError('deadline-exceeded', 'Verification code has expired. Please request a new one.');
        }
      } else {
        console.log('[Banking Verify] No temp code found, checking permanent hash');
      }
      
      const storedHash = userData.bankingAccessHash;

      if (!storedHash) {
        throw new HttpsError(
          'failed-precondition',
          'No banking access code configured. Please request a verification code.'
        );
      }

      const inputHash = crypto
        .createHash('sha256')
        .update(code + userId)
        .digest('hex');

      if (inputHash !== storedHash) {
        await db.collection(collectionName).doc(userId).update({
          'security.failedBankingAccessAttempts': (userData.security?.failedBankingAccessAttempts || 0) + 1,
          'security.lastFailedBankingAccess': new Date()
        });

        throw new HttpsError('permission-denied', 'Invalid access code');
      }

      await db.collection(collectionName).doc(userId).update({
        'security.lastBankingAccessGranted': new Date(),
        'security.failedBankingAccessAttempts': 0
      });

      await db.collection('auditLogs').add({
        userId,
        action: 'banking_access_granted',
        method: 'permanent_hash',
        timestamp: new Date(),
        ipAddress: request.rawRequest?.ip || 'unknown'
      });

      return { success: true };
    } catch (error) {
      console.error('Error verifying banking access:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', 'Failed to verify access code');
    }
  }
);

const { setBankingAccessCode, requestBankingAccessCode } = require('./setBankingAccessCode');

module.exports = {
  verifyBankingAccessCode,
  setBankingAccessCode,
  requestBankingAccessCode
};

