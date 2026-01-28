const admin = require('firebase-admin');
const { HttpsError } = require('firebase-functions/v2/https');
const { logAuditEvent, AUDIT_EVENT_TYPES } = require('../services/auditLog');

const ADMIN_ROLES = {
  SUPER_ADMIN: 'superAdmin',
  OPS_MANAGER: 'ops_manager',
  FINANCE: 'finance',
  RECRUITER: 'recruiter',
  SUPPORT: 'support'
};

const ADMIN_PERMISSIONS = {
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
  MANAGE_SYSTEM: 'manage_system',
  PROVISION_TENANT: 'provision_tenant',
  MANAGE_BILLING: 'manage_billing'
};

const ROLE_PERMISSIONS = {
  [ADMIN_ROLES.SUPER_ADMIN]: Object.values(ADMIN_PERMISSIONS),
  [ADMIN_ROLES.OPS_MANAGER]: [
    ADMIN_PERMISSIONS.VIEW_DASHBOARD,
    ADMIN_PERMISSIONS.VERIFY_USERS,
    ADMIN_PERMISSIONS.MANAGE_SHIFTS,
    ADMIN_PERMISSIONS.VIEW_USER_PROFILES,
    ADMIN_PERMISSIONS.VIEW_AUDIT_LOGS,
    ADMIN_PERMISSIONS.FORCE_ASSIGN_SHIFTS,
  ],
  [ADMIN_ROLES.FINANCE]: [
    ADMIN_PERMISSIONS.VIEW_DASHBOARD,
    ADMIN_PERMISSIONS.VIEW_FINANCE,
    ADMIN_PERMISSIONS.VIEW_BALANCE_SHEET,
    ADMIN_PERMISSIONS.VIEW_REVENUE,
    ADMIN_PERMISSIONS.EXPORT_DATA,
  ],
  [ADMIN_ROLES.RECRUITER]: [
    ADMIN_PERMISSIONS.VIEW_DASHBOARD,
    ADMIN_PERMISSIONS.VERIFY_USERS,
    ADMIN_PERMISSIONS.MANAGE_SHIFTS,
    ADMIN_PERMISSIONS.VIEW_USER_PROFILES,
  ],
  [ADMIN_ROLES.SUPPORT]: [
    ADMIN_PERMISSIONS.VIEW_DASHBOARD,
    ADMIN_PERMISSIONS.VIEW_USER_PROFILES,
    ADMIN_PERMISSIONS.IMPERSONATE_USERS,
    ADMIN_PERMISSIONS.VIEW_AUDIT_LOGS,
  ],
};

async function verifyAdminAccess(request, requiredPermissions = null) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }

  const userId = request.auth.uid;
  const db = admin.firestore();

  try {
    const adminDoc = await db.collection('admins').doc(userId).get();

    if (!adminDoc.exists()) {
      await logAuditEvent({
        eventType: AUDIT_EVENT_TYPES.ADMIN_ACCESS_DENIED,
        userId,
        metadata: {
          reason: 'NO_ADMIN_DOCUMENT',
          requestedPermissions: requiredPermissions,
          ipAddress: request.rawRequest?.ip || 'unknown',
          userAgent: request.rawRequest?.headers?.['user-agent'] || 'unknown'
        }
      });

      throw new HttpsError(
        'permission-denied',
        'Admin access required. This incident has been logged.'
      );
    }

    const adminData = adminDoc.data();

    if (adminData.isActive === false) {
      await logAuditEvent({
        eventType: AUDIT_EVENT_TYPES.ADMIN_ACCESS_DENIED,
        userId,
        metadata: {
          reason: 'ACCOUNT_INACTIVE',
          ipAddress: request.rawRequest?.ip || 'unknown'
        }
      });

      throw new HttpsError(
        'permission-denied',
        'Admin account is inactive'
      );
    }

    const adminRoles = Array.isArray(adminData.roles) ? adminData.roles : [];
    const isSuperAdmin = adminRoles.includes(ADMIN_ROLES.SUPER_ADMIN) || 
                         adminRoles.includes('super_admin');

    if (isSuperAdmin) {
      return {
        userId,
        adminData,
        role: ADMIN_ROLES.SUPER_ADMIN,
        permissions: Object.values(ADMIN_PERMISSIONS),
        isSuperAdmin: true
      };
    }

    if (requiredPermissions) {
      const requiredPermsArray = Array.isArray(requiredPermissions) 
        ? requiredPermissions 
        : [requiredPermissions];

      const adminPermissions = new Set();
      for (const role of adminRoles) {
        const rolePerms = ROLE_PERMISSIONS[role] || [];
        rolePerms.forEach(perm => adminPermissions.add(perm));
      }

      if (Array.isArray(adminData.rights)) {
        adminData.rights.forEach(right => adminPermissions.add(right));
      }

      const hasAllPermissions = requiredPermsArray.every(perm => 
        adminPermissions.has(perm)
      );

      if (!hasAllPermissions) {
        await logAuditEvent({
          eventType: AUDIT_EVENT_TYPES.ADMIN_ACCESS_DENIED,
          userId,
          metadata: {
            reason: 'INSUFFICIENT_PERMISSIONS',
            requiredPermissions: requiredPermsArray,
            adminPermissions: Array.from(adminPermissions),
            ipAddress: request.rawRequest?.ip || 'unknown'
          }
        });

        throw new HttpsError(
          'permission-denied',
          `Missing required permissions: ${requiredPermsArray.join(', ')}`
        );
      }

      return {
        userId,
        adminData,
        role: adminRoles[0],
        permissions: Array.from(adminPermissions),
        isSuperAdmin: false
      };
    }

    return {
      userId,
      adminData,
      role: adminRoles[0],
      permissions: [],
      isSuperAdmin: false
    };

  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }

    console.error('[verifyAdminAccess] Unexpected error:', error);
    throw new HttpsError('internal', 'Admin verification failed');
  }
}

function verifyAdminMiddleware(requiredPermissions = null) {
  return async (req, res, next) => {
    try {
      const adminData = await verifyAdminAccess(req, requiredPermissions);
      req.admin = adminData;
      next();
    } catch (error) {
      res.status(error.httpErrorCode?.status || 500).json({
        error: error.message
      });
    }
  };
}

module.exports = {
  verifyAdminAccess,
  verifyAdminMiddleware,
  ADMIN_ROLES,
  ADMIN_PERMISSIONS,
  ROLE_PERMISSIONS
};

