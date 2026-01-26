export const ADMIN_ROLES = {
  SUPER_ADMIN: 'superAdmin',
  ADMIN: 'admin'
};

export const SUPER_ADMIN_VARIANTS = ['superAdmin', 'super_admin', 'superAdmin'];
export const ADMIN_VARIANTS = ['admin'];

export const RIGHTS = {
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_FINANCE: 'view_finance',
  VIEW_BALANCE_SHEET: 'view_balance_sheet',
  VERIFY_USERS: 'verify_users',
  MANAGE_SHIFTS: 'manage_shifts',
  FORCE_ASSIGN_SHIFTS: 'force_assign_shifts',
  EDIT_PAY_RATES: 'edit_pay_rates',
  VIEW_USER_PROFILES: 'view_user_profiles',
  IMPERSONATE_USERS: 'impersonate_users',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  MANAGE_EMPLOYEES: 'manage_employees',
  SEND_NOTIFICATIONS: 'send_notifications',
  VIEW_REVENUE: 'view_revenue',
  EXPORT_DATA: 'export_data',
  DELETE_DATA: 'delete_data',
  EXPORT_PAYROLL: 'export_payroll',
  MANAGE_SYSTEM: 'manage_system',
  MANAGE_ADMINS: 'manage_admins'
};

export const ALL_RIGHTS = Object.values(RIGHTS);

export const getAdminRole = (userProfile) => {
  if (!userProfile) return null;
  
  const checkForSuperAdmin = (roles) => {
    if (!Array.isArray(roles)) return false;
    return roles.some(r => SUPER_ADMIN_VARIANTS.includes(r));
  };
  
  const checkForAdmin = (roles) => {
    if (!Array.isArray(roles)) return false;
    return roles.some(r => ADMIN_VARIANTS.includes(r));
  };
  
  if (Array.isArray(userProfile.roles)) {
    if (checkForSuperAdmin(userProfile.roles)) return ADMIN_ROLES.SUPER_ADMIN;
    if (checkForAdmin(userProfile.roles)) return ADMIN_ROLES.ADMIN;
  }
  
  if (userProfile.adminData?.role) {
    if (SUPER_ADMIN_VARIANTS.includes(userProfile.adminData.role)) return ADMIN_ROLES.SUPER_ADMIN;
    if (ADMIN_VARIANTS.includes(userProfile.adminData.role)) return ADMIN_ROLES.ADMIN;
  }
  
  if (userProfile.adminData?.roles && Array.isArray(userProfile.adminData.roles)) {
    if (checkForSuperAdmin(userProfile.adminData.roles)) return ADMIN_ROLES.SUPER_ADMIN;
    if (checkForAdmin(userProfile.adminData.roles)) return ADMIN_ROLES.ADMIN;
  }
  
  return null;
};

export const getAdminRights = (userProfile) => {
  const role = getAdminRole(userProfile);
  
  if (role === ADMIN_ROLES.SUPER_ADMIN) {
    return ALL_RIGHTS;
  }
  
  if (role === ADMIN_ROLES.ADMIN) {
    if (userProfile?.adminData?.rights && Array.isArray(userProfile.adminData.rights)) {
      return userProfile.adminData.rights;
    }
    if (userProfile?.rights && Array.isArray(userProfile.rights)) {
      return userProfile.rights;
    }
    return [];
  }
  
  return [];
};

export const hasRight = (userProfile, right) => {
  if (!right) return true;
  
  const role = getAdminRole(userProfile);
  
  if (role === ADMIN_ROLES.SUPER_ADMIN) {
    return true;
  }
  
  if (role === ADMIN_ROLES.ADMIN) {
    const rights = getAdminRights(userProfile);
    return rights.includes(right);
  }
  
  return false;
};

export const hasAnyRight = (userProfile, requiredRights) => {
  if (!requiredRights || requiredRights.length === 0) return true;
  
  const role = getAdminRole(userProfile);
  
  if (role === ADMIN_ROLES.SUPER_ADMIN) {
    return true;
  }
  
  if (role === ADMIN_ROLES.ADMIN) {
    const rights = getAdminRights(userProfile);
    return requiredRights.some(right => rights.includes(right));
  }
  
  return false;
};

export const hasAllRights = (userProfile, requiredRights) => {
  if (!requiredRights || requiredRights.length === 0) return true;
  
  const role = getAdminRole(userProfile);
  
  if (role === ADMIN_ROLES.SUPER_ADMIN) {
    return true;
  }
  
  if (role === ADMIN_ROLES.ADMIN) {
    const rights = getAdminRights(userProfile);
    return requiredRights.every(right => rights.includes(right));
  }
  
  return false;
};

export const isSuperAdmin = (userProfile) => {
  return getAdminRole(userProfile) === ADMIN_ROLES.SUPER_ADMIN;
};

export const isAdmin = (userProfile) => {
  const role = getAdminRole(userProfile);
  return role === ADMIN_ROLES.SUPER_ADMIN || role === ADMIN_ROLES.ADMIN;
};

export const PERMISSIONS = RIGHTS;
export const hasPermission = hasRight;
