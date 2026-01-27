import { useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useDashboard } from '../../contexts/DashboardContext';
import { hasRight, hasAnyRight, hasAllRights, isSuperAdmin, isAdmin, getAdminRights, getAdminRole, RIGHTS } from '../utils/rbac';

export const useAdminPermission = () => {
  const { userProfile: authUserProfile } = useAuth();
  const { userProfile: dashboardUserProfile, user } = useDashboard();
  
  const userProfile = useMemo(() => {
    return dashboardUserProfile || authUserProfile || user || null;
  }, [dashboardUserProfile, authUserProfile, user]);

  const adminRole = useMemo(() => getAdminRole(userProfile), [userProfile]);
  const adminRights = useMemo(() => getAdminRights(userProfile), [userProfile]);

  const checkRight = (right) => {
    if (!right) return true;
    return hasRight(userProfile, right);
  };

  const checkAnyRight = (requiredRights) => {
    if (!requiredRights || requiredRights.length === 0) return true;
    return hasAnyRight(userProfile, requiredRights);
  };

  const checkAllRights = (requiredRights) => {
    if (!requiredRights || requiredRights.length === 0) return true;
    return hasAllRights(userProfile, requiredRights);
  };

  return {
    adminRole,
    adminRights,
    hasRight: checkRight,
    hasAnyRight: checkAnyRight,
    hasAllRights: checkAllRights,
    isSuperAdmin: isSuperAdmin(userProfile),
    isAdmin: isAdmin(userProfile),
    canViewUsers: checkRight(RIGHTS.VIEW_USER_PROFILES),
    canImpersonate: checkRight(RIGHTS.IMPERSONATE_USERS),
    canVerifyUsers: checkRight(RIGHTS.VERIFY_USERS),
    canManageShifts: checkRight(RIGHTS.MANAGE_SHIFTS),
    canViewFinance: checkRight(RIGHTS.VIEW_FINANCE),
    canViewRevenue: checkRight(RIGHTS.VIEW_REVENUE),
    canViewAuditLogs: checkRight(RIGHTS.VIEW_AUDIT_LOGS),
    canManageSystem: checkRight(RIGHTS.MANAGE_SYSTEM),
    canManageAdmins: checkRight(RIGHTS.MANAGE_ADMINS),
  };
};

export default useAdminPermission;
