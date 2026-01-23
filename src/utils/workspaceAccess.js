import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../config/keysDatabase';

export const MEDISHIFT_DEMO_FACILITY_ID = 'medishift-demo-facility';

export const hasProfessionalAccess = async (userId) => {
  if (!userId) return false;
  
  try {
    const profileDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, userId));
    return profileDoc.exists();
  } catch (error) {
    console.error('[workspaceAccess] Error checking professional access:', error);
    return false;
  }
};

const isAdminUser = (userData) => {
  if (!userData) return false;
  return userData.adminData && userData.adminData.isActive !== false;
};

export const hasFacilityAccess = (userData, facilityId) => {
  if (!userData || !facilityId) return false;
  
  // ADMIN BYPASS: Admins have access to all facilities including demo facility
  if (isAdminUser(userData)) {
    return true;
  }
  
  const roles = userData.roles || [];
  return roles.some(r => r.facility_uid === facilityId);
};

export const getFacilityRoles = (userData, facilityId) => {
  if (!userData || !facilityId) return [];
  
  const facilityRole = userData.roles?.find(r => r.facility_uid === facilityId);
  return facilityRole?.roles || [];
};

export const hasAdminAccess = async (userId) => {
  if (!userId) return false;
  
  try {
    const adminDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.ADMINS, userId));
    if (!adminDoc.exists()) return false;
    
    const adminData = adminDoc.data();
    return adminData.isActive !== false;
  } catch (error) {
    console.error('[workspaceAccess] Error checking admin access:', error);
    return false;
  }
};

export const getAdminRoles = async (userId) => {
  if (!userId) return [];
  
  try {
    const adminDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.ADMINS, userId));
    if (!adminDoc.exists()) return [];
    
    const adminData = adminDoc.data();
    return adminData.roles || [];
  } catch (error) {
    console.error('[workspaceAccess] Error getting admin roles:', error);
    return [];
  }
};

export const getUserWorkspaces = async (userId, userData) => {
  const workspaces = [];
  
  const hasProfessional = await hasProfessionalAccess(userId);
  if (hasProfessional) {
    workspaces.push({
      type: 'personal',
      id: userId,
      name: 'Personal Workspace'
    });
  }
  
  const facilityRoles = userData?.roles || [];
  facilityRoles.forEach(roleEntry => {
    if (roleEntry.facility_uid) {
      workspaces.push({
        type: 'facility',
        id: roleEntry.facility_uid,
        facilityId: roleEntry.facility_uid,
        roles: roleEntry.roles || []
      });
    }
  });
  
  const hasAdmin = await hasAdminAccess(userId);
  if (hasAdmin) {
    const adminRoles = await getAdminRoles(userId);
    workspaces.push({
      type: 'admin',
      id: userId,
      roles: adminRoles
    });
  }
  
  return workspaces;
};

export default {
  MEDISHIFT_DEMO_FACILITY_ID,
  hasProfessionalAccess,
  hasFacilityAccess,
  getFacilityRoles,
  hasAdminAccess,
  getAdminRoles,
  getUserWorkspaces
};

