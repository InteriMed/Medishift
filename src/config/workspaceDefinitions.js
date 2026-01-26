/**
 * CENTRALIZED WORKSPACE DEFINITIONS
 * Single source of truth for all workspace/role conditions
 * 
 * IMPORTANT: All workspace access checks MUST use these functions.
 * Do NOT check roles, hasProfessionalProfile, etc. directly elsewhere.
 */

import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { FIRESTORE_COLLECTIONS, WORKSPACE_TYPES as KEYS_WORKSPACE_TYPES } from './keysDatabase';

export const WORKSPACE_TYPES = KEYS_WORKSPACE_TYPES;

export const COLLECTIONS = FIRESTORE_COLLECTIONS;

// ============================================================================
// CORE CONDITION CHECKS - These are the ONLY valid ways to check access
// ============================================================================

/**
 * Check if user is a Professional
 * CONDITION: professionalProfiles/{userId} document EXISTS
 * 
 * @param {string} userId - Firebase Auth UID
 * @returns {Promise<boolean>}
 */
export const isProfessional = async (userId) => {
  if (!userId) return false;
  
  try {
    const profileDoc = await getDoc(doc(db, COLLECTIONS.PROFESSIONAL_PROFILES, userId));
    return profileDoc.exists();
  } catch (error) {
    return false;
  }
};

/**
 * Check if user is a Medishift Admin
 * CONDITION: admins/{userId} document EXISTS AND isActive !== false
 * 
 * @param {string} userId - Firebase Auth UID
 * @returns {Promise<boolean>}
 */
export const isAdmin = async (userId) => {
  if (!userId) return false;
  
  try {
    const adminDoc = await getDoc(doc(db, COLLECTIONS.ADMINS, userId));
    if (!adminDoc.exists()) return false;
    
    const data = adminDoc.data();
    return data.isActive !== false;
  } catch (error) {
    return false;
  }
};

/**
 * Check if user has Facility access (is attached to at least one facility)
 * CONDITION: User has entries in users.roles array with facility_uid
 * 
 * @param {string} userId - Firebase Auth UID
 * @returns {Promise<boolean>}
 */
export const hasFacilityAccess = async (userId) => {
  if (!userId) return false;
  
  try {
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
    if (!userDoc.exists()) return false;
    
    const userData = userDoc.data();
    const roles = userData.roles || [];
    
    return roles.some(r => r.facility_uid);
  } catch (error) {
    return false;
  }
};

/**
 * Get user's facility roles
 * @param {string} userId - Firebase Auth UID
 * @returns {Promise<Array>} Array of facility role objects [{facility_uid, roles: []}]
 */
export const getFacilityRoles = async (userId) => {
  if (!userId) return [];
  
  try {
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
    if (!userDoc.exists()) return [];
    
    const userData = userDoc.data();
    return userData.roles || [];
  } catch (error) {
    return [];
  }
};

/**
 * Check if user has Organization access (is attached to at least one organization)
 * CONDITION: User has entries in users.roles array with organization_uid
 * 
 * @param {string} userId - Firebase Auth UID
 * @returns {Promise<boolean>}
 */
export const hasOrganizationAccess = async (userId) => {
  if (!userId) return false;
  
  try {
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
    if (!userDoc.exists()) return false;
    
    const userData = userDoc.data();
    const roles = userData.roles || [];
    
    return roles.some(r => r.organization_uid);
  } catch (error) {
    return false;
  }
};

/**
 * Get user's organization roles
 * @param {string} userId - Firebase Auth UID
 * @returns {Promise<Array>} Array of organization role objects [{organization_uid, roles: [], rights: []}]
 */
export const getOrganizationRoles = async (userId) => {
  if (!userId) return [];
  
  try {
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
    if (!userDoc.exists()) return [];
    
    const userData = userDoc.data();
    const roles = userData.roles || [];
    
    return roles.filter(r => r.organization_uid);
  } catch (error) {
    return [];
  }
};

// ============================================================================
// SYNC VERSIONS - For use when data is already loaded
// ============================================================================

/**
 * Check if user is a Professional (sync version)
 * Use when professionalProfile data is already fetched
 * 
 * @param {Object} userData - User data object (must include _professionalProfileExists or hasProfessionalProfile)
 * @returns {boolean}
 */
export const isProfessionalSync = (userData) => {
  if (!userData) return false;
  return userData._professionalProfileExists === true || userData.hasProfessionalProfile === true;
};

/**
 * Check if user is a Medishift Admin (sync version)
 * Use when admin data is already fetched
 * 
 * @param {Object} userData - User data object (must include adminData)
 * @returns {boolean}
 */
export const isAdminSync = (userData) => {
  if (!userData) return false;
  
  if (userData.adminData) {
    if (userData.adminData.isActive === false) return false;
    
    const adminRoles = Array.isArray(userData.adminData.roles) ? userData.adminData.roles : [];
    if (adminRoles.includes('superAdmin') || adminRoles.includes('super_admin')) {
      return true;
    }
    
    if (userData.adminData.rights && Array.isArray(userData.adminData.rights) && userData.adminData.rights.length > 0) {
      return true;
    }
    
    if (userData.adminData.role === 'superAdmin' || userData.adminData.role === 'super_admin' || userData.adminData.role === 'admin') {
      return true;
    }
  }
  
  const userRoles = Array.isArray(userData.roles) ? userData.roles : [];
  if (userRoles.includes('superAdmin') || userRoles.includes('super_admin') || userRoles.includes('admin')) {
    return true;
  }
  
  return false;
};

/**
 * Check if user has Facility access (sync version)
 * Use when user data with roles is already fetched
 * 
 * @param {Object} userData - User data object (must include roles array)
 * @param {string} facilityId - Optional facility ID to check specific facility
 * @returns {boolean}
 */
export const hasFacilityAccessSync = (userData, facilityId = null) => {
  if (!userData) return false;
  
  // ADMIN BYPASS: Admins have unrestricted access to all facilities
  if (isAdminSync(userData)) {
    return true;
  }
  
  const roles = userData.roles || [];
  
  if (facilityId) {
    return roles.some(r => r.facility_uid === facilityId);
  }
  
  return roles.some(r => r.facility_uid);
};

/**
 * Check if user has Organization access (sync version)
 * Use when user data with roles is already fetched
 * 
 * @param {Object} userData - User data object (must include roles array)
 * @param {string} organizationId - Optional organization ID to check specific organization
 * @returns {boolean}
 */
export const hasOrganizationAccessSync = (userData, organizationId = null) => {
  if (!userData) return false;
  
  // ADMIN BYPASS: Admins have unrestricted access to all organizations
  if (isAdminSync(userData)) {
    return true;
  }
  
  const roles = userData.roles || [];
  
  if (organizationId) {
    return roles.some(r => r.organization_uid === organizationId);
  }
  
  return roles.some(r => r.organization_uid);
};

/**
 * Check if user is an Organization Admin (sync version)
 * Only checks user roles - does not fetch organization document
 * For full verification including internalTeam.admins, use async version
 * 
 * @param {Object} userData - User data object (must include roles array)
 * @param {string} organizationId - Organization ID to check
 * @returns {boolean}
 */
export const isOrganizationAdminSync = (userData, organizationId) => {
  if (!userData || !organizationId) return false;
  
  // ADMIN BYPASS: Platform admins have unrestricted access
  if (isAdminSync(userData)) {
    return true;
  }
  
  const roles = userData.roles || [];
  
  // Check if user has organization_uid and org_admin role
  return roles.some(r => 
    r.organization_uid === organizationId && 
    (r.roles || []).includes('org_admin')
  );
};

/**
 * Check if user is an Organization Admin (async version)
 * Fetches organization document to verify admin status
 * Checks both user roles AND organization.internalTeam.admins
 * 
 * @param {string} userId - Firebase Auth UID
 * @param {string} organizationId - Organization ID to check
 * @returns {Promise<boolean>}
 */
export const isOrganizationAdmin = async (userId, organizationId) => {
  if (!userId || !organizationId) return false;
  
  try {
    // Check if user is platform admin first
    const userIsAdmin = await isAdmin(userId);
    if (userIsAdmin) return true;
    
    // Fetch organization document
    const orgDoc = await getDoc(doc(db, COLLECTIONS.ORGANIZATIONS, organizationId));
    if (!orgDoc.exists()) return false;
    
    const orgData = orgDoc.data();
    
    // Check internalTeam.admins array
    const internalTeamAdmins = orgData.internalTeam?.admins || [];
    if (internalTeamAdmins.includes(userId)) {
      return true;
    }
    
    // Also check user's roles array for org_admin
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
    if (!userDoc.exists()) return false;
    
    const userData = userDoc.data();
    const roles = userData.roles || [];
    
    return roles.some(r => 
      r.organization_uid === organizationId && 
      (r.roles || []).includes('org_admin')
    );
  } catch (error) {
    console.error('Error checking organization admin:', error);
    return false;
  }
};

// ============================================================================
// CONSTANTS
// ============================================================================


// ============================================================================
// WORKSPACE GENERATION
// ============================================================================

/**
 * Get all available workspaces for a user
 * This is the ONLY function that should generate workspace lists
 * 
 * @param {Object} userData - Complete user data object with all profile info
 * @returns {Array} Array of workspace objects
 */
export const getAvailableWorkspaces = (userData) => {
  const workspaces = [];
  
  if (!userData) return workspaces;

  const isUserAdmin = isAdminSync(userData);

  // 1. PERSONAL WORKSPACE - if professionalProfile exists OR user is admin
  if (isProfessionalSync(userData) || isUserAdmin) {
    workspaces.push({
      id: 'personal',
      name: 'Personal Workspace',
      type: WORKSPACE_TYPES.PERSONAL,
      description: 'Manage your professional profile and marketplace activities'
    });
  }

  // 2. FACILITY WORKSPACES - for each facility in roles array
  const roles = userData.roles || [];
  roles.forEach(roleEntry => {
    const facilityId = roleEntry.facility_uid;
    if (facilityId) {
      workspaces.push({
        id: facilityId,
        name: 'Facility Workspace',
        type: WORKSPACE_TYPES.FACILITY,
        facilityId: facilityId,
        roles: roleEntry.roles || [],
        description: 'Manage facility operations and team'
      });
    }
    
    // 3. ORGANIZATION WORKSPACES - ONLY for organization admins
    // Organization workspaces are separate from facility workspaces
    // Only users with 'org_admin' role in the organization can access organization workspace
    // This is verified by checking:
    // - User's roles array contains 'org_admin' for this organization_uid
    // - OR user is a platform admin (has unrestricted access)
    // Note: Full verification also checks organizations/{orgId}.internalTeam.admins
    //       but this sync function only checks user roles for performance
    const organizationId = roleEntry.organization_uid;
    if (organizationId) {
      const userRoles = roleEntry.roles || [];
      const isOrgAdmin = userRoles.includes('org_admin') || isUserAdmin;
      
      // Only add organization workspace if user is an organization admin
      // Facility workspaces remain separate and accessible to all facility members
      if (isOrgAdmin) {
        workspaces.push({
          id: organizationId,
          name: 'Organization Workspace',
          type: 'organization',
          organizationId: organizationId,
          roles: userRoles,
          rights: roleEntry.rights || [],
          description: 'Manage organization facilities and teams'
        });
      }
    }
  });


  // 4. ADMIN WORKSPACE - if admin document exists and is active
  if (isUserAdmin) {
    workspaces.push({
      id: 'admin',
      name: 'Admin Workspace',
      type: WORKSPACE_TYPES.ADMIN,
      description: 'Medishift platform administration'
    });
  }

  return workspaces;
};

/**
 * Get the default route for a workspace type
 * @param {string} workspaceType - One of WORKSPACE_TYPES
 * @returns {string} Default route path
 */
export const getDefaultRoute = (workspaceType) => {
  switch (workspaceType) {
    case WORKSPACE_TYPES.ADMIN:
      return '/dashboard/admin/portal';
    case WORKSPACE_TYPES.FACILITY:
      return '/dashboard/overview';
    case WORKSPACE_TYPES.PERSONAL:
    default:
      return '/dashboard/overview';
  }
};

// ============================================================================
// DATA FETCHING - Centralized user data loading
// ============================================================================

/**
 * Fetch complete user data with all profile information
 * This is the RECOMMENDED way to load user data for workspace decisions
 * 
 * @param {string} userId - Firebase Auth UID
 * @returns {Promise<Object|null>} Complete user data object or null
 */
export const fetchCompleteUserData = async (userId) => {
  if (!userId) return null;

  try {
    // Fetch all data in parallel
    const [userDoc, professionalDoc, adminDoc] = await Promise.all([
      getDoc(doc(db, COLLECTIONS.USERS, userId)),
      getDoc(doc(db, COLLECTIONS.PROFESSIONAL_PROFILES, userId)),
      getDoc(doc(db, COLLECTIONS.ADMINS, userId)),
    ]);

    if (!userDoc.exists()) {
      console.warn('[WorkspaceDefinitions] User document not found:', userId);
      return null;
    }

    const userData = userDoc.data();

    // Build complete user object
    const completeUserData = {
      ...userData,
      uid: userId,
      
      // Professional status - based ONLY on profile existence
      _professionalProfileExists: professionalDoc.exists(),
      hasProfessionalProfile: professionalDoc.exists(),
      professionalProfile: professionalDoc.exists() ? professionalDoc.data() : null,
      
      // Facility status - based on roles array
      _hasFacilityRoles: (userData.roles || []).some(r => r.facility_uid),
      hasFacilityProfile: (userData.roles || []).some(r => r.facility_uid),
      
      // Organization status - based on roles array
      _hasOrganizationRoles: (userData.roles || []).some(r => r.organization_uid),
      hasOrganizationProfile: (userData.roles || []).some(r => r.organization_uid),
      
      // Admin status - based on admin document
      adminData: null,
    };

    // Add admin data if exists and active
    if (adminDoc.exists()) {
      const adminData = adminDoc.data();
      if (adminData.isActive !== false) {
        completeUserData.adminData = adminData;
      }
    }

    return completeUserData;
  } catch (error) {
    return null;
  }
};

// ============================================================================
// FACILITY ATTACHMENT - Functions to attach professional to facility
// ============================================================================

/**
 * Attach a professional profile to a facility
 * This should be called when:
 * - Creating a new facility
 * - Accepting a facility invitation
 * - Joining a facility from organization page
 * 
 * @param {string} userId - Firebase Auth UID
 * @param {Object} facilityInfo - Facility information
 * @param {string} facilityInfo.facilityId - Facility profile ID
 * @param {Array<string>} facilityInfo.roles - User's roles in facility (e.g., ['admin', 'scheduler'])
 * @returns {Promise<boolean>} Success status
 */
export const attachProfessionalToFacility = async (userId, facilityInfo) => {
  if (!userId || !facilityInfo?.facilityId) {
    console.error('[WorkspaceDefinitions] Invalid parameters for attachProfessionalToFacility');
    return false;
  }

  const { updateDoc, getDoc, serverTimestamp } = await import('firebase/firestore');

  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('[WorkspaceDefinitions] User document not found:', userId);
      return false;
    }

    const userData = userDoc.data();
    const existingRoles = userData.roles || [];
    
    const newRoleEntry = {
      facility_uid: facilityInfo.facilityId,
      roles: facilityInfo.roles || ['employee']
    };

    const updatedRoles = existingRoles.filter(r => r.facility_uid !== facilityInfo.facilityId);
    updatedRoles.push(newRoleEntry);

    await updateDoc(userRef, {
      roles: updatedRoles,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Detach a professional profile from a facility
 * @param {string} userId - Firebase Auth UID
 * @param {string} facilityId - Facility profile ID to detach from
 * @returns {Promise<boolean>} Success status
 */
export const detachProfessionalFromFacility = async (userId, facilityId) => {
  if (!userId || !facilityId) {
    console.error('[WorkspaceDefinitions] Invalid parameters for detachProfessionalFromFacility');
    return false;
  }

  const { updateDoc, getDoc, serverTimestamp } = await import('firebase/firestore');

  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return false;

    const userData = userDoc.data();
    const currentRoles = userData.roles || [];
    
    const updatedRoles = currentRoles.filter(r => r.facility_uid !== facilityId);

    await updateDoc(userRef, {
      roles: updatedRoles,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Attach a professional profile to an organization
 * This should be called when:
 * - Creating a new organization
 * - Accepting an organization invitation
 * - Joining an organization
 * 
 * @param {string} userId - Firebase Auth UID
 * @param {Object} organizationInfo - Organization information
 * @param {string} organizationInfo.organizationId - Organization profile ID
 * @param {Array<string>} organizationInfo.roles - User's roles in organization (e.g., ['org_admin', 'org_manager'])
 * @param {Array<string>} organizationInfo.rights - User's rights in organization (e.g., ['manage_facilities'])
 * @returns {Promise<boolean>} Success status
 */
export const attachProfessionalToOrganization = async (userId, organizationInfo) => {
  if (!userId || !organizationInfo?.organizationId) {
    console.error('[WorkspaceDefinitions] Invalid parameters for attachProfessionalToOrganization');
    return false;
  }

  const { updateDoc, getDoc, serverTimestamp } = await import('firebase/firestore');

  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('[WorkspaceDefinitions] User document not found:', userId);
      return false;
    }

    const userData = userDoc.data();
    const existingRoles = userData.roles || [];
    
    const newRoleEntry = {
      organization_uid: organizationInfo.organizationId,
      roles: organizationInfo.roles || ['org_employee'],
      rights: organizationInfo.rights || []
    };

    const updatedRoles = existingRoles.filter(r => r.organization_uid !== organizationInfo.organizationId);
    updatedRoles.push(newRoleEntry);

    await updateDoc(userRef, {
      roles: updatedRoles,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Detach a professional profile from an organization
 * @param {string} userId - Firebase Auth UID
 * @param {string} organizationId - Organization profile ID to detach from
 * @returns {Promise<boolean>} Success status
 */
export const detachProfessionalFromOrganization = async (userId, organizationId) => {
  if (!userId || !organizationId) {
    console.error('[WorkspaceDefinitions] Invalid parameters for detachProfessionalFromOrganization');
    return false;
  }

  const { updateDoc, getDoc, serverTimestamp } = await import('firebase/firestore');

  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return false;

    const userData = userDoc.data();
    const currentRoles = userData.roles || [];
    
    const updatedRoles = currentRoles.filter(r => r.organization_uid !== organizationId);

    await updateDoc(userRef, {
      roles: updatedRoles,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    return false;
  }
};

// ============================================================================
// ADMIN CRM QUERIES - For searching users
// ============================================================================

/**
 * Query for professional users (for CRM)
 * CONDITION: Has document in professionalProfiles collection
 * 
 * @returns {Promise<Array>} Array of professional user objects
 */
export const queryProfessionals = async () => {
  try {
    // Get all professional profiles
    const profilesSnapshot = await getDocs(collection(db, COLLECTIONS.PROFESSIONAL_PROFILES));
    const profileIds = profilesSnapshot.docs.map(doc => doc.id);
    
    if (profileIds.length === 0) return [];

    // Get corresponding user documents
    const users = [];
    for (const profileId of profileIds) {
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, profileId));
      if (userDoc.exists()) {
        const profileDoc = profilesSnapshot.docs.find(d => d.id === profileId);
        users.push({
          id: profileId,
          ...userDoc.data(),
          professionalProfile: profileDoc?.data() || null,
        });
      }
    }

    return users;
  } catch (error) {
    return [];
  }
};

/**
 * Query for facility profiles (for CRM)
 * @returns {Promise<Array>} Array of facility profile objects
 */
export const queryFacilities = async () => {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.FACILITY_PROFILES));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    return [];
  }
};

/**
 * Query for admin users (for CRM)
 * CONDITION: Has document in admins collection with isActive !== false
 * 
 * @returns {Promise<Array>} Array of admin user objects
 */
export const queryAdmins = async () => {
  try {
    const adminsSnapshot = await getDocs(collection(db, COLLECTIONS.ADMINS));
    const admins = [];

    for (const adminDoc of adminsSnapshot.docs) {
      const adminData = adminDoc.data();
      if (adminData.isActive === false) continue;

      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, adminDoc.id));
      admins.push({
        id: adminDoc.id,
        ...userDoc.data(),
        adminData: adminData,
      });
    }

    return admins;
  } catch (error) {
    return [];
  }
};

// Default export for convenience
export default {
  // Types
  WORKSPACE_TYPES,
  COLLECTIONS,
  
  
  // Async checks
  isProfessional,
  isAdmin,
  hasFacilityAccess,
  getFacilityRoles,
  hasOrganizationAccess,
  getOrganizationRoles,
  
  // Sync checks
  isProfessionalSync,
  isAdminSync,
  hasFacilityAccessSync,
  hasOrganizationAccessSync,
  
  // Workspace functions
  getAvailableWorkspaces,
  getDefaultRoute,
  
  // Data fetching
  fetchCompleteUserData,
  
  // Facility attachment
  attachProfessionalToFacility,
  detachProfessionalFromFacility,
  
  // Organization attachment
  attachProfessionalToOrganization,
  detachProfessionalFromOrganization,
  
  // CRM queries
  queryProfessionals,
  queryFacilities,
  queryAdmins,
};

