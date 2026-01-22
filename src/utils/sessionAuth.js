import Cookies from 'js-cookie';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

// Session configuration
const SESSION_TOKEN_PREFIX = 'medishift_session_';
const SESSION_EXPIRY_HOURS = 1;
const WORKSPACE_TYPES = {
  PERSONAL: 'personal',
  TEAM: 'team',
  ADMIN: 'admin'
};

/**
 * Generate a session token for workspace access
 * @param {string} userId - Firebase Auth UID
 * @param {string} workspaceType - 'personal', 'team', or 'admin'
 * @param {string} facilityId - Required for team workspace
 * @returns {string} Session token
 */
const generateSessionToken = (userId, workspaceType, facilityId = null) => {
  const tokenData = {
    userId,
    workspaceType,
    facilityId,
    issuedAt: Date.now(),
    expiresAt: Date.now() + (SESSION_EXPIRY_HOURS * 60 * 60 * 1000)
  };

  // In production, this should be a proper JWT or encrypted token
  return btoa(JSON.stringify(tokenData));
};

/**
 * Validate and decode a session token
 * @param {string} token - Session token
 * @returns {Object|null} Decoded token data or null if invalid
 */
const validateSessionToken = (token) => {
  try {
    const tokenData = JSON.parse(atob(token));

    // Check if token is expired
    if (Date.now() > tokenData.expiresAt) {
      return null;
    }

    return tokenData;
  } catch (error) {
    console.error('Invalid session token:', error);
    return null;
  }
};

/**
 * Check if user has professional access
 * STRICT: Only returns true if user has professional role AND professional profile exists
 * @param {Object} userData - User document from Firestore (must include hasProfessionalProfile)
 * @returns {boolean} True if user has professional access
 */
const hasProfessionalAccess = (userData) => {
  if (!userData) return false;

  // STRICT: Must have professional profile document
  if (userData.hasProfessionalProfile !== true) return false;

  // Check singular role (primary indicator)
  if (userData.role === 'professional') return true;

  // Check multi-role array for explicit professional role
  if (userData.roles && userData.roles.includes('professional')) return true;

  // BYPASS: Allow access if user bypassed GLN verification (team access)
  if (userData.bypassedGLN === true && userData.GLN_certified === false) return true;

  // IMPORTANT: Do NOT grant professional access just because user is a facility admin/employee
  // Facility users should only see Team Workspace, not Personal Workspace
  // Exception: Dual-role users will have 'professional' explicitly in their roles array
  return false;
};

/**
 * Check if user has team workspace access for a specific facility
 * @param {Object} userData - User document from Firestore
 * @param {string} facilityId - Facility profile ID
 * @returns {boolean} True if user has team access
 */
const hasTeamAccess = (userData, facilityId) => {
  if (!userData || !userData.roles || !facilityId) return false;

  // Check if user has admin or employee role for this specific facility
  const hasAdminRole = userData.roles.includes(`facility_admin_${facilityId}`);
  const hasEmployeeRole = userData.roles.includes(`facility_employee_${facilityId}`);

  return hasAdminRole || hasEmployeeRole;
};

/**
 * Check if user has admin access
 * @param {Object} userData - User document from Firestore
 * @returns {boolean} True if user has admin access
 */
export const hasAdminAccess = (userData) => {
  if (!userData) return false;
  
  // Check roles array for admin roles
  if (userData.roles && Array.isArray(userData.roles)) {
    const adminRoles = ['admin', 'super_admin', 'ops_manager', 'finance', 'recruiter', 'support'];
    return userData.roles.some(role => adminRoles.includes(role));
  }
  
  // Fallback to singular role field for backward compatibility
  return userData.role === 'admin';
};

/**
 * Verify user permissions and create session token for workspace access
 * @param {string} userId - Firebase Auth UID
 * @param {string} workspaceType - 'personal', 'team', or 'admin'
 * @param {string} facilityId - Required for team workspace
 * @returns {Promise<string|null>} Session token or null if unauthorized
 */
export const createWorkspaceSession = async (userId, workspaceType, facilityId = null, userDataObject = null) => {
  try {
    // console.log(`[SessionAuth] Creating session for user ${userId}, workspace: ${workspaceType}, facility: ${facilityId}`);

    let userData = userDataObject;

    if (!userData) {
      // Fetch user data from Firestore if not provided
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        console.warn(`[SessionAuth] User document not found: ${userId}`);
        return null;
      }
      userData = userDoc.data();
    }

    // STRICT: Verify profile document existence before allowing workspace access
    if (workspaceType === WORKSPACE_TYPES.PERSONAL) {
      // Must have professional profile document
      const hasProfessionalProfile = userData.hasProfessionalProfile === true;
      if (!hasProfessionalProfile) {
        console.warn(`[SessionAuth] User ${userId} cannot access Personal workspace - no professional profile document exists`);
        return null;
      }

      if (!hasProfessionalAccess(userData)) {
        console.warn(`[SessionAuth] User ${userId} lacks professional access`);
        return null;
      }
    } else if (workspaceType === WORKSPACE_TYPES.TEAM) {
      if (!facilityId) {
        console.warn(`[SessionAuth] Facility ID required for team workspace`);
        return null;
      }

      if (!hasTeamAccess(userData, facilityId)) {
        console.warn(`[SessionAuth] User ${userId} lacks team access for facility ${facilityId}`);
        return null;
      }

      // STRICT: Verify facility profile document exists
      const facilityDoc = await getDoc(doc(db, 'facilityProfiles', facilityId));
      if (!facilityDoc.exists()) {
        console.warn(`[SessionAuth] Facility profile document not found: ${facilityId}`);
        return null;
      }

      // Additional check: verify user is in facility's admin or employees array

      const facilityData = facilityDoc.data();
      const adminsList = facilityData.admins || facilityData.admin || [];
      const employeesList = facilityData.employees || [];
      const isAdmin = adminsList.includes(userId) || employeesList.some(emp => emp.uid === userId && emp.rights === 'admin');
      const isEmployee = employeesList.some(emp => emp.uid === userId);

      if (!isAdmin && !isEmployee) {
        console.warn(`[SessionAuth] User ${userId} not found in facility ${facilityId} admin/employees`);
        return null;
      }
    } else if (workspaceType === WORKSPACE_TYPES.ADMIN) {
      if (!hasAdminAccess(userData)) {
        console.warn(`[SessionAuth] User ${userId} lacks admin access`);
        return null;
      }
    } else {
      console.warn(`[SessionAuth] Invalid workspace type: ${workspaceType}`);
      return null;
    }

    // Generate and store session token
    const sessionToken = generateSessionToken(userId, workspaceType, facilityId);
    const cookieName = `${SESSION_TOKEN_PREFIX}${workspaceType}${facilityId ? `_${facilityId}` : ''}`;

    Cookies.set(cookieName, sessionToken, {
      expires: SESSION_EXPIRY_HOURS / 24, // Convert hours to days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      httpOnly: false // Set to true in production with proper backend
    });

    // console.log(`[SessionAuth] Session created successfully for ${workspaceType} workspace`);
    return sessionToken;

  } catch (error) {
    console.error('[SessionAuth] Error creating workspace session:', error);
    return null;
  }
};

/**
 * Validate current session for workspace access
 * @param {string} workspaceType - 'personal', 'team', or 'admin'
 * @param {string} facilityId - Required for team workspace
 * @returns {Object|null} Session data or null if invalid
 */
export const validateWorkspaceSession = (workspaceType, facilityId = null) => {
  try {
    const cookieName = `${SESSION_TOKEN_PREFIX}${workspaceType}${facilityId ? `_${facilityId}` : ''}`;
    const sessionToken = Cookies.get(cookieName);

    if (!sessionToken) {
      console.log(`[SessionAuth] No session token found for ${workspaceType} workspace`);
      return null;
    }

    const sessionData = validateSessionToken(sessionToken);
    if (!sessionData) {
      console.log(`[SessionAuth] Invalid or expired session token for ${workspaceType} workspace`);
      clearWorkspaceSession(workspaceType, facilityId);
      return null;
    }

    // Verify workspace type and facility match
    if (sessionData.workspaceType !== workspaceType) {
      console.warn(`[SessionAuth] Workspace type mismatch: expected ${workspaceType}, got ${sessionData.workspaceType}`);
      return null;
    }

    if (workspaceType === WORKSPACE_TYPES.TEAM && sessionData.facilityId !== facilityId) {
      console.warn(`[SessionAuth] Facility ID mismatch: expected ${facilityId}, got ${sessionData.facilityId}`);
      return null;
    }

    if (workspaceType === WORKSPACE_TYPES.ADMIN && sessionData.facilityId) {
      console.warn(`[SessionAuth] Admin workspace should not have facilityId`);
      return null;
    }

    console.log(`[SessionAuth] Valid session found for ${workspaceType} workspace`);
    return sessionData;

  } catch (error) {
    console.error('[SessionAuth] Error validating workspace session:', error);
    return null;
  }
};

/**
 * Clear session for specific workspace
 * @param {string} workspaceType - 'personal', 'team', or 'admin'
 * @param {string} facilityId - Required for team workspace
 */
export const clearWorkspaceSession = (workspaceType, facilityId = null) => {
  try {
    const cookieName = `${SESSION_TOKEN_PREFIX}${workspaceType}${facilityId ? `_${facilityId}` : ''}`;
    Cookies.remove(cookieName);
    console.log(`[SessionAuth] Session cleared for ${workspaceType} workspace`);
  } catch (error) {
    console.error('[SessionAuth] Error clearing workspace session:', error);
  }
};

/**
 * Clear all workspace sessions
 */
export const clearAllWorkspaceSessions = () => {
  try {
    // Get all cookies and remove session tokens
    const allCookies = Cookies.get();
    Object.keys(allCookies).forEach(cookieName => {
      if (cookieName.startsWith(SESSION_TOKEN_PREFIX)) {
        Cookies.remove(cookieName);
      }
    });
    console.log('[SessionAuth] All workspace sessions cleared');
  } catch (error) {
    console.error('[SessionAuth] Error clearing all workspace sessions:', error);
  }
};

/**
 * Get available workspaces for a user
 * STRICT: Only returns workspaces if corresponding profile documents exist
 * Order: Facility -> Professional -> Admin
 * @param {Object} userData - User document from Firestore (must include hasFacilityProfile, hasProfessionalProfile)
 * @returns {Array} Array of available workspace objects
 */
export const getAvailableWorkspaces = (userData) => {
  const workspaces = [];

  if (!userData) return workspaces;

  const hasFacilityProfile = userData.hasFacilityProfile === true;
  const hasProfessionalProfile = userData.hasProfessionalProfile === true;
  const isAdmin = hasAdminAccess(userData);

  // 1. Check for facility workspace - ONLY if facility profile document exists
  if (hasFacilityProfile) {
    if (userData.role === 'facility' || userData.role === 'company' || userData.uid) {
      workspaces.push({
        id: userData.uid,
        name: userData.companyName || userData.displayName || 'Facility Workspace',
        type: WORKSPACE_TYPES.TEAM,
        facilityId: userData.uid,
        role: 'admin',
        description: 'Manage your facility profile and operations'
      });
    }

    // Check for facility memberships (other facilities user is part of)
    if (userData.facilityMemberships && userData.facilityMemberships.length > 0) {
      userData.facilityMemberships.forEach(membership => {
        if (!workspaces.find(w => w.id === membership.facilityProfileId)) {
          workspaces.push({
            id: membership.facilityProfileId,
            name: `${membership.facilityName} - Team Workspace`,
            type: WORKSPACE_TYPES.TEAM,
            facilityId: membership.facilityProfileId,
            role: membership.role,
            description: 'Manage team schedules, time-off requests, and internal operations'
          });
        }
      });
    }
  }

  // 2. Check for professional access - ONLY if professional profile document exists
  if (hasProfessionalProfile && hasProfessionalAccess(userData)) {
    workspaces.push({
      id: 'personal',
      name: 'Personal Workspace',
      type: WORKSPACE_TYPES.PERSONAL,
      description: 'Manage your professional profile and marketplace activities'
    });
  }

  // 3. Check for admin access (admin doesn't require profile document)
  if (isAdmin) {
    workspaces.push({
      id: 'admin',
      name: 'Admin Workspace',
      type: WORKSPACE_TYPES.ADMIN,
      description: 'Manage platform operations, users, and system settings'
    });
  }

  return workspaces;
};

export { WORKSPACE_TYPES }; 