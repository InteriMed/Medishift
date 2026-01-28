/**
 * WORKSPACE ACCESS API
 * 
 * Implements the "Passport Strategy" for multi-tenancy:
 * - Verifies membership in facility/organization
 * - Issues custom tokens with workspace claims
 * - Enforces "Trust the Token" architecture
 * 
 * Reference: IMPLEMENTATION_GUIDE.md - Workspace Access Module
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const db = require('../database/db');
const { FUNCTION_CONFIG, FIRESTORE_COLLECTIONS } = require('../config/keysDatabase');

/**
 * WORKSPACE.SWITCH ACTION
 * The "Login Gate" for a specific workspace
 * Verifies membership and issues a fresh Firebase Auth Token with facilityId embedded
 */
const switchWorkspace = onCall(FUNCTION_CONFIG, async (request) => {
  // AUTHENTICATION CHECK
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be logged in to switch workspaces');
  }

  const { targetWorkspaceId, workspaceType } = request.data;
  const userId = request.auth.uid;

  // AUDIT HELPER
  const auditLog = async (actionId, status, metadata) => {
    try {
      await db.collection('system_logs').add({
        userId,
        actionId,
        status,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata,
        ipAddress: request.rawRequest?.ip || 'unknown'
      });
    } catch (error) {
      logger.error('Audit logging failed:', error);
    }
  };

  try {
    // PERSONAL WORKSPACE
    if (workspaceType === 'personal') {
      const professionalProfileRef = db.collection(FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES).doc(userId);
      const profileSnap = await professionalProfileRef.get();

      if (!profileSnap.exists) {
        throw new HttpsError('failed-precondition', 'Professional profile not found. Please complete onboarding.');
      }

      const customClaims = {
        workspaceId: 'personal',
        workspaceType: 'personal',
        permissions: ['profile.read', 'profile.update', 'marketplace.browse']
      };

      const customToken = await admin.auth().createCustomToken(userId, customClaims);

      await auditLog('workspace.switch', 'SUCCESS', {
        workspaceId: 'personal',
        workspaceType: 'personal'
      });

      return {
        token: customToken,
        workspace: {
          id: 'personal',
          name: 'Personal Workspace',
          type: 'personal',
          permissions: customClaims.permissions
        }
      };
    }

    // FACILITY WORKSPACE
    if (workspaceType === 'facility') {
      const facilityRef = db.collection(FIRESTORE_COLLECTIONS.FACILITY_PROFILES).doc(targetWorkspaceId);
      const facilitySnap = await facilityRef.get();

      if (!facilitySnap.exists) {
        throw new HttpsError('not-found', 'Facility workspace not found.');
      }

      const facilityData = facilitySnap.data();
      
      // VERIFY MEMBERSHIP (Source of Truth)
      const employees = facilityData.employees || [];
      const employeeRecord = employees.find(emp => emp.user_uid === userId);
      
      if (!employeeRecord) {
        await auditLog('workspace.switch', 'FAILURE', {
          attemptedFacility: targetWorkspaceId,
          reason: 'NO_ACCESS'
        });
        throw new HttpsError('permission-denied', 'Access Denied: You are not a member of this facility.');
      }

      // CHECK ACTIVE STATUS (Security Enhancement)
      if (employeeRecord.status && employeeRecord.status !== 'ACTIVE') {
        await auditLog('workspace.switch', 'FAILURE', {
          attemptedFacility: targetWorkspaceId,
          reason: 'NOT_ACTIVE',
          status: employeeRecord.status
        });
        throw new HttpsError('permission-denied', `Access Denied: Your account status is ${employeeRecord.status}.`);
      }

      const userRoles = employeeRecord.roles || [];
      const permissions = getPermissionsForFacilityRoles(userRoles);

      // MINT THE "FACILITY PASSPORT" (Custom Claims)
      const customClaims = {
        workspaceId: targetWorkspaceId,
        workspaceType: 'facility',
        facilityId: targetWorkspaceId,
        roles: userRoles,
        permissions
      };

      const customToken = await admin.auth().createCustomToken(userId, customClaims);

      await auditLog('workspace.switch', 'SUCCESS', {
        workspaceId: targetWorkspaceId,
        workspaceType: 'facility',
        roles: userRoles
      });

      return {
        token: customToken,
        workspace: {
          id: targetWorkspaceId,
          name: facilityData.facilityDetails?.name || facilityData.facilityName || 'Facility',
          type: 'facility',
          role: userRoles[0],
          permissions
        }
      };
    }

    // ORGANIZATION WORKSPACE
    if (workspaceType === 'organization') {
      const orgRef = db.collection('organizations').doc(targetWorkspaceId);
      const orgSnap = await orgRef.get();

      if (!orgSnap.exists) {
        throw new HttpsError('not-found', 'Organization workspace not found.');
      }

      const orgData = orgSnap.data();
      
      // Check internalTeam.admins first
      const internalTeamAdmins = orgData.internalTeam?.admins || [];
      
      if (!internalTeamAdmins.includes(userId)) {
        // Fallback: Check user's roles array
        const userRef = db.collection(FIRESTORE_COLLECTIONS.USERS).doc(userId);
        const userSnap = await userRef.get();
        
        if (!userSnap.exists) {
          throw new HttpsError('not-found', 'User profile not found.');
        }
        
        const userData = userSnap.data();
        const userRoles = userData.roles || [];
        
        const orgRole = userRoles.find(r => r.organization_uid === targetWorkspaceId);
        
        if (!orgRole || !(orgRole.roles || []).includes('org_admin')) {
          await auditLog('workspace.switch', 'FAILURE', {
            attemptedOrganization: targetWorkspaceId,
            reason: 'NOT_ORG_ADMIN'
          });
          throw new HttpsError('permission-denied', 'Access Denied: Only organization administrators can access this workspace.');
        }
      }

      const permissions = ['org.manage_facilities', 'org.view_analytics', 'org.manage_teams'];

      const customClaims = {
        workspaceId: targetWorkspaceId,
        workspaceType: 'organization',
        organizationId: targetWorkspaceId,
        role: 'org_admin',
        permissions
      };

      const customToken = await admin.auth().createCustomToken(userId, customClaims);

      await auditLog('workspace.switch', 'SUCCESS', {
        workspaceId: targetWorkspaceId,
        workspaceType: 'organization'
      });

      return {
        token: customToken,
        workspace: {
          id: targetWorkspaceId,
          name: orgData.name || 'Organization',
          type: 'organization',
          role: 'org_admin',
          permissions
        }
      };
    }

    // ADMIN WORKSPACE
    if (workspaceType === 'admin') {
      const adminRef = db.collection(FIRESTORE_COLLECTIONS.ADMINS).doc(userId);
      const adminSnap = await adminRef.get();

      if (!adminSnap.exists) {
        throw new HttpsError('not-found', 'Admin access not found.');
      }

      const adminData = adminSnap.data();
      
      if (adminData.isActive === false) {
        throw new HttpsError('permission-denied', 'Admin account is not active.');
      }

      const permissions = ['admin.all', 'admin.manage_users', 'admin.manage_facilities', 'admin.view_analytics'];

      const customClaims = {
        workspaceId: 'admin',
        workspaceType: 'admin',
        role: adminData.role || 'admin',
        permissions
      };

      const customToken = await admin.auth().createCustomToken(userId, customClaims);

      await auditLog('workspace.switch', 'SUCCESS', {
        workspaceId: 'admin',
        workspaceType: 'admin'
      });

      return {
        token: customToken,
        workspace: {
          id: 'admin',
          name: 'Admin Workspace',
          type: 'admin',
          role: adminData.role,
          permissions
        }
      };
    }

    throw new HttpsError('invalid-argument', 'Invalid workspace type');

  } catch (error) {
    logger.error('Error in switchWorkspace:', error);
    
    // Re-throw HttpsError as-is
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError('internal', error.message);
  }
});

/**
 * WORKSPACE.CHECK_AVAILABLE ACTION
 * Returns list of workspaces user has access to
 */
const checkWorkspaces = onCall(FUNCTION_CONFIG, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be logged in');
  }

  const userId = request.auth.uid;

  try {
    const workspaces = [];
    
    // Check Professional Profile (Personal Workspace)
    const professionalProfileSnap = await db.collection(FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES).doc(userId).get();
    if (professionalProfileSnap.exists) {
      workspaces.push({
        id: 'personal',
        name: 'Personal Workspace',
        type: 'personal'
      });
    }

    // Check Facility Access
    const userSnap = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(userId).get();
    if (userSnap.exists) {
      const userData = userSnap.data();
      const roles = userData.roles || [];
      
      // Find facility roles
      for (const roleEntry of roles) {
        if (roleEntry.facility_uid) {
          const facilitySnap = await db.collection(FIRESTORE_COLLECTIONS.FACILITY_PROFILES).doc(roleEntry.facility_uid).get();
          if (facilitySnap.exists) {
            const facilityData = facilitySnap.data();
            workspaces.push({
              id: roleEntry.facility_uid,
              name: facilityData.facilityDetails?.name || facilityData.facilityName || 'Facility',
              type: 'facility',
              role: roleEntry.roles?.[0]
            });
          }
        }
        
        // Find organization roles
        if (roleEntry.organization_uid && roleEntry.roles?.includes('org_admin')) {
          const orgSnap = await db.collection('organizations').doc(roleEntry.organization_uid).get();
          if (orgSnap.exists) {
            const orgData = orgSnap.data();
            workspaces.push({
              id: roleEntry.organization_uid,
              name: orgData.name || 'Organization',
              type: 'organization',
              role: 'org_admin'
            });
          }
        }
      }
    }

    // Check Admin Access
    const adminSnap = await db.collection(FIRESTORE_COLLECTIONS.ADMINS).doc(userId).get();
    if (adminSnap.exists && adminSnap.data().isActive !== false) {
      workspaces.push({
        id: 'admin',
        name: 'Admin Workspace',
        type: 'admin',
        role: adminSnap.data().role || 'admin'
      });
    }

    return {
      workspaces,
      needsOnboarding: workspaces.length === 0,
      hasAnyWorkspace: workspaces.length > 0
    };

  } catch (error) {
    logger.error('Error in checkWorkspaces:', error);
    throw new HttpsError('internal', error.message);
  }
});

/**
 * HELPER: Map Roles to Permissions (RBAC)
 */
function getPermissionsForFacilityRoles(roles) {
  const permissionMap = {
    'admin': [
      'facility.manage_all',
      'facility.manage_employees',
      'facility.manage_schedules',
      'facility.post_positions',
      'facility.manage_contracts',
      'facility.view_analytics',
      'facility.manage_settings',
      'facility.invite_users'
    ],
    'scheduler': [
      'facility.manage_schedules',
      'facility.view_employees',
      'facility.view_contracts',
      'facility.request_staffing'
    ],
    'recruiter': [
      'facility.post_positions',
      'facility.view_applications',
      'facility.manage_contracts',
      'facility.view_professionals'
    ],
    'employee': [
      'facility.view_schedule',
      'facility.request_timeoff',
      'facility.view_contracts'
    ]
  };

  const allPermissions = new Set();
  
  roles.forEach(role => {
    const perms = permissionMap[role] || permissionMap['employee'];
    perms.forEach(p => allPermissions.add(p));
  });

  return Array.from(allPermissions);
}

module.exports = {
  switchWorkspace,
  checkWorkspaces
};

