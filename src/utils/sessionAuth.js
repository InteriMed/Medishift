/**
 * SESSION AUTHENTICATION
 * Handles workspace session tokens and validation
 * 
 * IMPORTANT: This file uses centralized workspace definitions from:
 * @see src/config/workspaceDefinitions.js
 */

import Cookies from 'js-cookie';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { WORKSPACE_TYPES, FIRESTORE_COLLECTIONS as COLLECTIONS, SESSION_PREFIXES, COOKIE_CONFIG, getCookieKey, getEnvVar } from '../config/keysDatabase';
import { hasProfessionalAccess, hasFacilityAccess, hasAdminAccess } from './workspaceAccess';
import { getAvailableWorkspaces as getAvailableWorkspacesFromDefs, MEDISHIFT_DEMO_FACILITY_ID, isAdminSync } from '../config/workspaceDefinitions';

export { WORKSPACE_TYPES, hasAdminAccess };

const SESSION_TOKEN_PREFIX = SESSION_PREFIXES.WORKSPACE_SESSION;
const SESSION_EXPIRY_HOURS = COOKIE_CONFIG.SESSION_EXPIRY_HOURS;

/**
 * Generate a session token for workspace access
 */
const generateSessionToken = (userId, workspaceType, facilityId = null) => {
  const tokenData = {
    userId,
    workspaceType,
    facilityId,
    issuedAt: Date.now(),
    expiresAt: Date.now() + (SESSION_EXPIRY_HOURS * 60 * 60 * 1000)
  };
  return btoa(JSON.stringify(tokenData));
};

/**
 * Validate and decode a session token
 */
const validateSessionToken = (token) => {
  try {
    const tokenData = JSON.parse(atob(token));
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
 * Fetch admin document for a user
 */
export const fetchAdminData = async (userId) => {
  if (!userId) return null;
  
  try {
    const adminDoc = await getDoc(doc(db, COLLECTIONS.ADMINS, userId));
    if (adminDoc.exists()) {
      const data = adminDoc.data();
      if (data.isActive !== false) {
        return data;
      }
    }
    return null;
  } catch (error) {
    console.error('[SessionAuth] Error fetching admin data:', error);
    return null;
  }
};

/**
 * Get admin roles from admin document
 */
export const getAdminRoles = (adminData) => {
  if (!adminData) return [];
  return adminData.roles || [];
};

/**
 * Verify user permissions and create session token for workspace access
 */
export const createWorkspaceSession = async (userId, workspaceType, facilityId = null, userDataObject = null) => {
  try {
    let userData = userDataObject;

    if (!userData) {
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
      if (!userDoc.exists()) {
        console.warn(`[SessionAuth] User document not found: ${userId}`);
        return null;
      }
      userData = userDoc.data();
    }

    // ADMIN BYPASS: Check if user is admin for unrestricted access
    const isAdmin = isAdminSync(userData) || await hasAdminAccess(userId);

    if (workspaceType === WORKSPACE_TYPES.PERSONAL) {
      // Admins can access personal workspace without professional profile
      if (!isAdmin) {
        const hasProfessional = await hasProfessionalAccess(userId);
        if (!hasProfessional) {
          return null;
        }
      }
    } else if (workspaceType === WORKSPACE_TYPES.FACILITY) {
      if (!facilityId) {
        return null;
      }

      // ADMIN BYPASS: Admins can access any facility, especially the demo facility
      if (!isAdmin) {
        if (!hasFacilityAccess(userData, facilityId)) {
          return null;
        }
      }

      // For Medishift Demo Facility, skip document check (it's virtual for admins)
      if (facilityId !== MEDISHIFT_DEMO_FACILITY_ID) {
        const facilityDoc = await getDoc(doc(db, COLLECTIONS.FACILITY_PROFILES, facilityId));
        if (!facilityDoc.exists()) {
          return null;
        }
      }
    } else if (workspaceType === WORKSPACE_TYPES.ADMIN) {
      const hasAdmin = await hasAdminAccess(userId);
      if (!hasAdmin) {
        return null;
      }
    } else {
      return null;
    }

    const sessionToken = generateSessionToken(userId, workspaceType, facilityId);
    const cookieName = getCookieKey('SESSION_TOKEN', workspaceType, facilityId);

    Cookies.set(cookieName, sessionToken, {
      expires: SESSION_EXPIRY_HOURS / 24,
      secure: getEnvVar('NODE_ENV') === 'production',
      sameSite: 'strict',
      httpOnly: false
    });

    return sessionToken;
  } catch (error) {
    console.error('[SessionAuth] Error creating workspace session:', error);
    return null;
  }
};

/**
 * Validate current session for workspace access
 */
export const validateWorkspaceSession = (workspaceType, facilityId = null) => {
  try {
    const cookieName = getCookieKey('SESSION_TOKEN', workspaceType, facilityId);
    const sessionToken = Cookies.get(cookieName);

    if (!sessionToken) {
      return null;
    }

    const sessionData = validateSessionToken(sessionToken);
    if (!sessionData) {
      clearWorkspaceSession(workspaceType, facilityId);
      return null;
    }

    if (sessionData.workspaceType !== workspaceType) {
      return null;
    }

    if (workspaceType === WORKSPACE_TYPES.FACILITY && sessionData.facilityId !== facilityId) {
      return null;
    }

    return sessionData;
  } catch (error) {
    return null;
  }
};

/**
 * Clear session for specific workspace
 */
export const clearWorkspaceSession = (workspaceType, facilityId = null) => {
  try {
    const cookieName = getCookieKey('SESSION_TOKEN', workspaceType, facilityId);
    Cookies.remove(cookieName);
  } catch (error) {
    // Error silently ignored
  }
};

/**
 * Clear all workspace sessions
 */
export const clearAllWorkspaceSessions = () => {
  try {
    const allCookies = Cookies.get();
    Object.keys(allCookies).forEach(cookieName => {
      if (cookieName.startsWith(SESSION_PREFIXES.WORKSPACE_SESSION)) {
        Cookies.remove(cookieName);
      }
    });
  } catch (error) {
    // Error silently ignored
  }
};

/**
 * Get available workspaces for a user
 * Uses centralized definition from workspaceDefinitions.js
 */
export const getAvailableWorkspaces = (userData) => {
  return getAvailableWorkspacesFromDefs(userData);
};
