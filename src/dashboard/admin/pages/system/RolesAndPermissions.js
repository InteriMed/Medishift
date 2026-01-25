import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, CheckCircle2, XCircle } from 'lucide-react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { PERMISSIONS, ADMIN_ROLES, ROLE_PERMISSIONS } from '../../utils/rbac';
import { ROLE_DEFINITIONS } from '../../../../config/roleDefinitions';
import '../../../../styles/variables.css';

const RolesAndPermissions = () => {
  const { t } = useTranslation(['admin']);

  const allAdminPermissions = Object.values(PERMISSIONS);

  const getPermissionDisplayName = (permission) => {
    return permission
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderAdminRolesSection = () => {
    return (
      <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-lg)', border: '1px solid var(--grey-2)', boxShadow: 'var(--shadow-sm)', marginBottom: 'var(--spacing-lg)' }}>
        <h2 style={{ fontSize: 'var(--font-size-xxlarge)', fontWeight: 'var(--font-weight-large)', color: 'var(--text-color)', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <Shield size={24} />
          Admin Roles & Permissions
        </h2>
        <p style={{ color: 'var(--text-light-color)', marginBottom: 'var(--spacing-lg)' }}>
          Complete list of admin roles and their associated permissions. Super Admin has access to all permissions.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--grey-2)' }}>
                <th style={{ textAlign: 'left', padding: 'var(--spacing-md)', fontSize: 'var(--font-size-medium)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-color)' }}>
                  Role
                </th>
                {allAdminPermissions.map((permission) => (
                  <th key={permission} style={{ textAlign: 'center', padding: 'var(--spacing-md)', fontSize: 'var(--font-size-small)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-light-color)', minWidth: '120px' }}>
                    {getPermissionDisplayName(permission)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(ROLE_PERMISSIONS).map(([roleKey, rolePerms]) => {
                const roleName = roleKey
                  .split('_')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
                const isSuperAdmin = roleKey === ADMIN_ROLES.SUPER_ADMIN;
                const hasAllPermissions = isSuperAdmin;

                return (
                  <tr key={roleKey} style={{ borderBottom: '1px solid var(--grey-2)', transition: 'background-color 0.2s' }} className="hover:bg-grey-1">
                    <td style={{ padding: 'var(--spacing-md)', fontSize: 'var(--font-size-medium)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        {isSuperAdmin && <Shield size={16} style={{ color: 'var(--blue-4)' }} />}
                        {roleName}
                        {isSuperAdmin && (
                          <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--blue-4)', marginLeft: 'var(--spacing-xs)' }}>
                            (All Permissions)
                          </span>
                        )}
                      </div>
                    </td>
                    {allAdminPermissions.map((permission) => {
                      const hasPermission = hasAllPermissions || rolePerms.includes(permission);
                      return (
                        <td key={permission} style={{ textAlign: 'center', padding: 'var(--spacing-md)' }}>
                          {hasPermission ? (
                            <CheckCircle2 size={20} style={{ color: 'var(--green-4)', margin: '0 auto' }} />
                          ) : (
                            <XCircle size={20} style={{ color: 'var(--grey-3)', margin: '0 auto' }} />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-md)', backgroundColor: 'var(--blue-1)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--blue-2)' }}>
          <h3 style={{ fontSize: 'var(--font-size-medium)', fontWeight: 'var(--font-weight-medium)', color: 'var(--blue-4)', marginBottom: 'var(--spacing-xs)' }}>
            Permission Summary
          </h3>
          {Object.entries(ROLE_PERMISSIONS).map(([roleKey, rolePerms]) => {
            const roleName = roleKey
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            const isSuperAdmin = roleKey === ADMIN_ROLES.SUPER_ADMIN;
            const permissionCount = isSuperAdmin ? allAdminPermissions.length : rolePerms.length;

            return (
              <div key={roleKey} style={{ marginTop: 'var(--spacing-sm)', fontSize: 'var(--font-size-small)', color: 'var(--text-color)' }}>
                <strong>{roleName}:</strong> {permissionCount} permission{permissionCount !== 1 ? 's' : ''}
                {isSuperAdmin && ' (All permissions)'}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderFacilityRolesSection = () => {
    const facilityRoles = ROLE_DEFINITIONS.FACILITY || {};
    const adminRoles = ROLE_DEFINITIONS.ADMIN || {};

    return (
      <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-lg)', border: '1px solid var(--grey-2)', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontSize: 'var(--font-size-xxlarge)', fontWeight: 'var(--font-weight-large)', color: 'var(--text-color)', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <Shield size={24} />
          Facility & Platform Roles
        </h2>
        <p style={{ color: 'var(--text-light-color)', marginBottom: 'var(--spacing-lg)' }}>
          Roles available for facility organizations and platform-level access.
        </p>

        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h3 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-color)', marginBottom: 'var(--spacing-md)' }}>
            Facility Roles
          </h3>
          {Object.entries(facilityRoles).map(([roleKey, roleDef]) => (
            <div key={roleKey} style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)', backgroundColor: 'var(--grey-1)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--grey-2)' }}>
              <div style={{ fontSize: 'var(--font-size-medium)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-color)', marginBottom: 'var(--spacing-xs)' }}>
                {roleDef.name}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-xs)' }}>
                {roleDef.permissions.map((permission) => (
                  <span
                    key={permission}
                    style={{
                      padding: 'var(--spacing-xs) var(--spacing-sm)',
                      borderRadius: 'var(--border-radius-sm)',
                      fontSize: 'var(--font-size-small)',
                      backgroundColor: 'var(--blue-1)',
                      color: 'var(--blue-4)',
                      border: '1px solid var(--blue-2)'
                    }}
                  >
                    {getPermissionDisplayName(permission)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div>
          <h3 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-color)', marginBottom: 'var(--spacing-md)' }}>
            Platform Admin Roles (Legacy)
          </h3>
          {Object.entries(adminRoles).map(([roleKey, roleDef]) => (
            <div key={roleKey} style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)', backgroundColor: 'var(--grey-1)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--grey-2)' }}>
              <div style={{ fontSize: 'var(--font-size-medium)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-color)', marginBottom: 'var(--spacing-xs)' }}>
                {roleDef.name}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-xs)' }}>
                {roleDef.permissions.map((permission) => (
                  <span
                    key={permission}
                    style={{
                      padding: 'var(--spacing-xs) var(--spacing-sm)',
                      borderRadius: 'var(--border-radius-sm)',
                      fontSize: 'var(--font-size-small)',
                      backgroundColor: 'var(--blue-1)',
                      color: 'var(--blue-4)',
                      border: '1px solid var(--blue-2)'
                    }}
                  >
                    {getPermissionDisplayName(permission)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_AUDIT_LOGS}>
      <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xxxlarge)', fontWeight: 'var(--font-weight-large)', color: 'var(--text-color)', marginBottom: 0 }}>
            {t('admin:system.rolesPermissions.title', 'Roles & Permissions')}
          </h1>
          <p style={{ color: 'var(--text-light-color)', marginTop: 'var(--spacing-xs)' }}>
            {t('admin:system.rolesPermissions.subtitle', 'Complete documentation of all roles and their associated permissions')}
          </p>
        </div>

        {renderAdminRolesSection()}
        {renderFacilityRolesSection()}
      </div>
    </ProtectedRoute>
  );
};

export default RolesAndPermissions;

