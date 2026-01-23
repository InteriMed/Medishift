export const ROLE_DEFINITIONS = {
  FACILITY: {
    ADMIN: {
      name: 'Admin',
      permissions: [
        'manage_employees',
        'manage_schedules',
        'post_positions',
        'manage_contracts',
        'view_analytics',
        'manage_settings',
        'invite_users',
        'manage_organization'
      ]
    },
    SCHEDULER: {
      name: 'Scheduler',
      permissions: [
        'manage_schedules',
        'view_employees',
        'view_contracts',
        'request_staffing'
      ]
    },
    RECRUITER: {
      name: 'Recruiter',
      permissions: [
        'post_positions',
        'view_applications',
        'manage_contracts',
        'view_professionals'
      ]
    },
    EMPLOYEE: {
      name: 'Employee',
      permissions: [
        'view_schedule',
        'request_timeoff',
        'view_contracts'
      ]
    }
  },
  ADMIN: {
    SUPER_ADMIN: {
      name: 'Super Admin',
      permissions: [
        'manage_all',
        'manage_admins',
        'manage_users',
        'manage_facilities',
        'view_analytics',
        'system_settings'
      ]
    },
    ADMIN: {
      name: 'Admin',
      permissions: [
        'manage_users',
        'manage_facilities',
        'view_analytics',
        'support_tools'
      ]
    },
    SUPPORT: {
      name: 'Support',
      permissions: [
        'view_users',
        'view_facilities',
        'support_tools'
      ]
    }
  }
};

export const ROLE_SETUP_PRESETS = {
  FACILITY: [
    {
      name: 'Full Admin',
      roles: ['admin']
    },
    {
      name: 'HR Manager',
      roles: ['scheduler', 'recruiter']
    },
    {
      name: 'Team Lead',
      roles: ['scheduler', 'employee']
    },
    {
      name: 'Staff Member',
      roles: ['employee']
    }
  ],
  ADMIN: [
    {
      name: 'Super Admin',
      roles: ['super_admin']
    },
    {
      name: 'Platform Admin',
      roles: ['admin']
    },
    {
      name: 'Support Agent',
      roles: ['support']
    }
  ]
};

export const hasPermission = (userRoles, requiredPermission) => {
  if (!userRoles || !Array.isArray(userRoles)) return false;
  
  return userRoles.some(role => {
    const roleDef = Object.values(ROLE_DEFINITIONS.FACILITY).find(r => r.name.toLowerCase() === role.toLowerCase()) ||
                   Object.values(ROLE_DEFINITIONS.ADMIN).find(r => r.name.toLowerCase() === role.toLowerCase());
    
    return roleDef?.permissions.includes(requiredPermission);
  });
};

export const hasAnyPermission = (userRoles, requiredPermissions) => {
  return requiredPermissions.some(permission => hasPermission(userRoles, permission));
};

export const hasAllPermissions = (userRoles, requiredPermissions) => {
  return requiredPermissions.every(permission => hasPermission(userRoles, permission));
};

export default {
  ROLE_DEFINITIONS,
  ROLE_SETUP_PRESETS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions
};

