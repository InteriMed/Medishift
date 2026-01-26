import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../config/keysDatabase';


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
  
  // ADMIN BYPASS: Admins have access to all facilities
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

export const hasOrganizationAccess = (userData, organizationId) => {
  if (!userData || !organizationId) return false;
  
  if (isAdminUser(userData)) {
    return true;
  }
  
  const roles = userData.roles || [];
  return roles.some(r => r.organization_uid === organizationId);
};

export const getOrganizationRoles = (userData, organizationId) => {
  if (!userData || !organizationId) return [];
  
  const organizationRole = userData.roles?.find(r => r.organization_uid === organizationId);
  return organizationRole?.roles || [];
};

export const getOrganizationRights = (userData, organizationId) => {
  if (!userData || !organizationId) return [];
  
  const organizationRole = userData.roles?.find(r => r.organization_uid === organizationId);
  return organizationRole?.rights || [];
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
    
    if (roleEntry.organization_uid) {
      workspaces.push({
        type: 'organization',
        id: roleEntry.organization_uid,
        organizationId: roleEntry.organization_uid,
        roles: roleEntry.roles || [],
        rights: roleEntry.rights || []
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
  hasProfessionalAccess,
  hasFacilityAccess,
  getFacilityRoles,
  hasOrganizationAccess,
  getOrganizationRoles,
  getOrganizationRights,
  hasAdminAccess,
  getAdminRoles,
  getUserWorkspaces
};

