const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.setCustomClaimsOnUserCreation = functions.auth.user().onCreate(async (user) => {
  try {
    const defaultClaims = {
      role: 'professional',
      tier: 'FREE',
      facilityId: 'UNASSIGNED',
    };

    await admin.auth().setCustomUserClaims(user.uid, defaultClaims);

    await admin.firestore().collection('system_logs').add({
      actionId: 'auth.user_created',
      userId: user.uid,
      facilityId: 'UNASSIGNED',
      status: 'SUCCESS',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        email: user.email,
        defaultClaims,
      },
    });

    console.log(`Custom claims set for user ${user.uid}`);
  } catch (error) {
    console.error('Error setting custom claims:', error);
  }
});

exports.assignFacilityToUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userId, facilityId, role, tier } = data;

  const callerClaims = context.auth.token;
  if (callerClaims.role !== 'admin' && callerClaims.role !== 'facility_admin') {
    throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
  }

  if (callerClaims.role === 'facility_admin' && callerClaims.facilityId !== facilityId) {
    throw new functions.https.HttpsError('permission-denied', 'Cannot assign users to other facilities');
  }

  try {
    const customClaims = {
      facilityId,
      role: role || 'professional',
      tier: tier || 'STARTER',
    };

    await admin.auth().setCustomUserClaims(userId, customClaims);

    await admin.firestore().collection('users').doc(userId).update({
      facilityId,
      role: role || 'professional',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await admin.firestore().collection('system_logs').add({
      actionId: 'auth.facility_assigned',
      userId: context.auth.uid,
      facilityId,
      status: 'SUCCESS',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        targetUserId: userId,
        customClaims,
      },
    });

    return { success: true, claims: customClaims };
  } catch (error) {
    console.error('Error assigning facility:', error);
    throw new functions.https.HttpsError('internal', 'Failed to assign facility');
  }
});

exports.updateUserTier = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { facilityId, tier } = data;

  const callerClaims = context.auth.token;
  if (callerClaims.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can update tiers');
  }

  try {
    const facilityDoc = await admin.firestore().collection('facility_profiles').doc(facilityId).get();
    
    if (!facilityDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Facility not found');
    }

    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('facilityId', '==', facilityId)
      .get();

    const batch = admin.firestore().batch();

    for (const userDoc of usersSnapshot.docs) {
      const userRef = admin.firestore().collection('users').doc(userDoc.id);
      batch.update(userRef, { tier });
    }

    await batch.commit();

    for (const userDoc of usersSnapshot.docs) {
      const currentClaims = (await admin.auth().getUser(userDoc.id)).customClaims || {};
      await admin.auth().setCustomUserClaims(userDoc.id, {
        ...currentClaims,
        tier,
      });
    }

    await admin.firestore().collection('system_logs').add({
      actionId: 'auth.tier_updated',
      userId: context.auth.uid,
      facilityId,
      status: 'SUCCESS',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        newTier: tier,
        affectedUsers: usersSnapshot.size,
      },
    });

    return { success: true, affectedUsers: usersSnapshot.size };
  } catch (error) {
    console.error('Error updating tier:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update tier');
  }
});

exports.refreshUserToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const user = await admin.auth().getUser(context.auth.uid);
    
    return { 
      success: true, 
      claims: user.customClaims || {},
      message: 'Token refreshed. Client should call getIdToken(true)' 
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw new functions.https.HttpsError('internal', 'Failed to refresh token');
  }
});

