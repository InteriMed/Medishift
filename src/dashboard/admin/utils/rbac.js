export const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  OPS_MANAGER: 'ops_manager',
  FINANCE: 'finance',
  RECRUITER: 'recruiter',
  SUPPORT: 'support',
  EXTERNAL_PAYROLL: 'external_payroll'
};

export const PERMISSIONS = {
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
  MANAGE_SYSTEM: 'manage_system'
};

export const ROLE_PERMISSIONS = {
  [ADMIN_ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ADMIN_ROLES.OPS_MANAGER]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VERIFY_USERS,
    PERMISSIONS.MANAGE_SHIFTS,
    PERMISSIONS.FORCE_ASSIGN_SHIFTS,
    PERMISSIONS.VIEW_USER_PROFILES,
    PERMISSIONS.IMPERSONATE_USERS,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.VIEW_AUDIT_LOGS
  ],
  [ADMIN_ROLES.FINANCE]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_FINANCE,
    PERMISSIONS.VIEW_REVENUE,
    PERMISSIONS.VIEW_BALANCE_SHEET,
    PERMISSIONS.EXPORT_DATA
  ],
  [ADMIN_ROLES.RECRUITER]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VERIFY_USERS,
    PERMISSIONS.MANAGE_SHIFTS,
    PERMISSIONS.VIEW_USER_PROFILES,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.MANAGE_SYSTEM
  ],
  [ADMIN_ROLES.SUPPORT]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_USER_PROFILES,
    PERMISSIONS.IMPERSONATE_USERS
  ],
  [ADMIN_ROLES.EXTERNAL_PAYROLL]: [
    PERMISSIONS.EXPORT_PAYROLL
  ]
};

export const getAdminRoles = (userRoles) => {
  if (!userRoles || !Array.isArray(userRoles)) return [];
  return userRoles.filter(role => Object.values(ADMIN_ROLES).includes(role));
};

export const hasPermission = (userRoles, permission) => {
  if (!userRoles || !Array.isArray(userRoles)) return false;

  const adminRoles = getAdminRoles(userRoles);

  for (const role of adminRoles) {
    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    if (rolePermissions.includes(permission)) {
      return true;
    }
  }

  return false;
};

export const hasAnyRole = (userRoles, allowedRoles) => {
  if (!userRoles || !Array.isArray(userRoles)) return false;
  const adminRoles = getAdminRoles(userRoles);
  return adminRoles.some(role => allowedRoles.includes(role));
};

export const hasAllRoles = (userRoles, requiredRoles) => {
  if (!userRoles || !Array.isArray(userRoles)) return false;
  const adminRoles = getAdminRoles(userRoles);
  return requiredRoles.every(role => adminRoles.includes(role));
};

export const isSuperAdmin = (userRoles) => {
  return hasAnyRole(userRoles, [ADMIN_ROLES.SUPER_ADMIN]);
};

