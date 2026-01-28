import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../../../contexts/dashboardContext';
import { useNotification } from '../../../../contexts/notificationContext';
import { useAction } from '../../../../services/actions/hook';
import modal from '../../../../components/modals/modal';
import InputField from '../../../../components/boxedInputFields/personnalizedInputField';
import Button from '../../../../components/boxedInputFields/button';
import { FiTrash2, FiEdit } from 'react-icons/fi';

const AVAILABLE_PERMISSIONS = [
  'manage_employees',
  'view_employees',
  'invite_users',
  'manage_schedules',
  'view_schedules',
  'manage_contracts',
  'view_contracts',
  'manage_settings',
  'view_reports',
  'manage_organization'
];

const FacilityRolesModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation(['organization', 'common']);
  const { selectedWorkspace } = useDashboard();
  const { showNotification } = useNotification();
  const { execute } = useAction();
  const [customRoles, setCustomRoles] = useState([]);
  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [editingRole, setEditingRole] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const facilityId = selectedWorkspace?.facilityId;

  const loadCustomRoles = useCallback(async () => {
    if (!facilityId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const facilityData = await execute('profile.facility.get_data', {
        facilityId
      });

      if (facilityData) {
        setCustomRoles(facilityData.customRoles || []);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
      showNotification(t('organization:errors.loadFailed', 'Failed to load roles'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [facilityId, execute, showNotification, t]);

  useEffect(() => {
    if (isOpen && facilityId) {
      loadCustomRoles();
    }
  }, [isOpen, facilityId, loadCustomRoles]);

  const handleCreateRole = async () => {
    if (!facilityId || !roleName.trim()) {
      showNotification(t('organization:admin.roles.errors.nameRequired', 'Role name is required'), 'error');
      return;
    }

    if (selectedPermissions.length === 0) {
      showNotification(t('organization:admin.roles.errors.permissionsRequired', 'At least one permission is required'), 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const facilityData = await execute('profile.facility.get_data', {
        facilityId
      });

      if (facilityData) {
        const existingRoles = facilityData.customRoles || [];

        const newRole = {
          id: Date.now().toString(),
          name: roleName.trim(),
          permissions: selectedPermissions,
          createdAt: new Date().toISOString()
        };

        const updatedRoles = [...existingRoles, newRole];

        await execute('profile.facility.update_settings', {
          facilityId,
          customRoles: updatedRoles
        });

        showNotification(t('organization:admin.roles.created', 'Role created successfully'), 'success');
        setRoleName('');
        setSelectedPermissions([]);
        loadCustomRoles();
      }
    } catch (error) {
      console.error('Error creating role:', error);
      showNotification(t('organization:errors.saveFailed', 'Failed to create role'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!facilityId || !editingRole) return;

    if (selectedPermissions.length === 0) {
      showNotification(t('organization:admin.roles.errors.permissionsRequired', 'At least one permission is required'), 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const facilityData = await execute('profile.facility.get_data', {
        facilityId
      });

      if (facilityData) {
        const customRoles = facilityData.customRoles || [];
        const updatedCustomRoles = customRoles.map(role =>
          role.id === editingRole.id
            ? { ...role, permissions: selectedPermissions, updatedAt: new Date().toISOString() }
            : role
        );

        await execute('profile.facility.update_settings', {
          facilityId,
          customRoles: updatedCustomRoles
        });

        showNotification(t('organization:admin.roles.updated', 'Role updated successfully'), 'success');
        setEditingRole(null);
        setRoleName('');
        setSelectedPermissions([]);
        loadCustomRoles();
      }
    } catch (error) {
      console.error('Error updating role:', error);
      showNotification(t('organization:errors.saveFailed', 'Failed to update role'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!facilityId) return;

    if (!window.confirm(t('organization:admin.roles.confirmDelete', 'Are you sure you want to delete this role?'))) {
      return;
    }

    setIsProcessing(true);
    try {
      const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
      const facilitySnap = await getDoc(facilityRef);

      if (facilitySnap.exists()) {
        const facilityData = facilitySnap.data();
        const customRoles = facilityData.customRoles || [];
        const updatedCustomRoles = customRoles.filter(role => role.id !== roleId);

        await updateDoc(facilityRef, {
          customRoles: updatedCustomRoles,
          updatedAt: serverTimestamp()
        });

        showNotification(t('organization:admin.roles.deleted', 'Role deleted successfully'), 'success');
        if (editingRole && editingRole.id === roleId) {
          setEditingRole(null);
          setRoleName('');
          setSelectedPermissions([]);
        }
        loadCustomRoles();
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      showNotification(t('organization:errors.deleteFailed', 'Failed to delete role'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setSelectedPermissions(role.permissions || []);
  };

  const handleCancelEdit = () => {
    setEditingRole(null);
    setRoleName('');
    setSelectedPermissions([]);
  };

  const togglePermission = (permission) => {
    if (selectedPermissions.includes(permission)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permission));
    } else {
      setSelectedPermissions([...selectedPermissions, permission]);
    }
  };

  const handleSave = () => {
    if (editingRole) {
      handleUpdateRole();
    } else {
      handleCreateRole();
    }
  };

  if (!isOpen) return null;

  return (
    <modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('organization:roles.title', 'Manage Roles')}
      size="medium"
      closeOnBackdropClick={!isProcessing}
      actions={
        <>
          <div className="flex items-center gap-2">
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onClose}
              variant="secondary"
              type="button"
              disabled={isProcessing}
            >
              {t('common:cancel', 'Cancel')}
            </Button>
            {editingRole && (
              <Button
                onClick={handleSave}
                variant="primary"
                type="button"
                disabled={isProcessing || selectedPermissions.length === 0}
              >
                {isProcessing ? t('common:saving', 'Saving...') : t('organization:roles.editRole', 'Update Role')}
              </Button>
            )}
            {!editingRole && (
              <Button
                onClick={handleSave}
                variant="primary"
                type="button"
                disabled={isProcessing || !roleName.trim() || selectedPermissions.length === 0}
              >
                {isProcessing ? t('common:saving', 'Saving...') : t('organization:roles.create', 'Create Role')}
              </Button>
            )}
          </div>
        </>
      }
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div>
              <h3 className="text-lg font-semibold mb-3">{t('organization:roles.title', 'Custom Roles')}</h3>
              {customRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('organization:roles.empty', 'No custom roles created yet')}</p>
              ) : (
                <div className="space-y-2">
                  {customRoles.map(role => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:border-primary/50 transition-colors"
                    >
                      <div>
                        <div className="font-medium">{role.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {role.permissions?.length || 0} {t('organization:roles.permissions', 'permissions')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditRole(role)}
                          className="p-1.5 hover:bg-muted rounded transition-colors"
                          disabled={isProcessing}
                        >
                          <FiEdit className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          className="p-1.5 hover:bg-destructive/10 rounded transition-colors"
                          disabled={isProcessing}
                        >
                          <FiTrash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="text-lg font-semibold mb-3">
                {editingRole ? t('organization:roles.editRole', 'Edit Role') : t('organization:roles.createRole', 'Create New Role')}
              </h3>
              <div className="space-y-4">
                <InputField
                  label={t('organization:roles.roleName', 'Role Name')}
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder={t('organization:roles.roleNamePlaceholder', 'e.g., Manager')}
                  disabled={isProcessing || !!editingRole}
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t('organization:roles.permissions', 'Permissions')}
                  </label>
                  <div className="border border-border rounded-lg p-3 max-h-[300px] overflow-y-auto space-y-2">
                    {AVAILABLE_PERMISSIONS.map(permission => (
                      <label
                        key={permission}
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(permission)}
                          onChange={() => togglePermission(permission)}
                          disabled={isProcessing}
                          className="rounded border-border"
                        />
                        <span className="text-sm">{permission.replace(/_/g, ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {editingRole && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                      {t('common:cancel', 'Cancel Edit')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </modal>
  );
};

export default FacilityRolesModal;

