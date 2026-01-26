import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import { useDashboard } from '../../../contexts/DashboardContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import Dialog from '../../../../components/Dialog/Dialog';
import InputField from '../../../../components/BoxedInputFields/Personnalized-InputField';
import Button from '../../../../components/BoxedInputFields/Button';
import DropdownField from '../../../../components/BoxedInputFields/Dropdown-Field';
import { FiUsers } from 'react-icons/fi';

const CreateFacilityRoleModal = ({ isOpen, onClose, onRoleCreated }) => {
  const { t } = useTranslation(['organization', 'common']);
  const { selectedWorkspace } = useDashboard();
  const { showNotification } = useNotification();
  const [facilityType, setFacilityType] = useState(null);
  const [loadingFacilityType, setLoadingFacilityType] = useState(true);
  const [roleName, setRoleName] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [customRoleName, setCustomRoleName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchFacilityType = async () => {
      if (!selectedWorkspace?.facilityId) {
        setLoadingFacilityType(false);
        return;
      }

      try {
        const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, selectedWorkspace.facilityId);
        const facilitySnap = await getDoc(facilityRef);
        
        if (facilitySnap.exists()) {
          const facilityData = facilitySnap.data();
          const type = facilityData.facilityDetails?.facilityType || facilityData.facilityType || 'other';
          setFacilityType(type);
        }
      } catch (error) {
        console.error('Error fetching facility type:', error);
        setFacilityType('other');
      } finally {
        setLoadingFacilityType(false);
      }
    };

    if (isOpen) {
      fetchFacilityType();
      setRoleName('');
      setSelectedRole('');
      setCustomRoleName('');
      setErrors({});
    }
  }, [isOpen, selectedWorkspace?.facilityId]);

  const getRoleOptions = useCallback(() => {
    if (!facilityType) return [];
    
    const rolesByType = t(`organization:facilityRoles.rolesByFacilityType.${facilityType}`, { returnObjects: true });
    
    if (typeof rolesByType === 'object' && rolesByType !== null) {
      return Object.entries(rolesByType).map(([key, value]) => ({
        value: key,
        label: value
      }));
    }
    
    return [];
  }, [facilityType, t]);

  const handleCreateRole = async () => {
    const newErrors = {};
    
    if (!selectedRole && !customRoleName.trim()) {
      newErrors.role = t('organization:facilityRoles.selectRole', 'Please select or enter a role');
    }
    
    if (selectedRole === 'custom' && !customRoleName.trim()) {
      newErrors.customRoleName = t('organization:facilityRoles.roleName', 'Role name is required');
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsProcessing(true);
    try {
      const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, selectedWorkspace.facilityId);
      const facilitySnap = await getDoc(facilityRef);

      if (facilitySnap.exists()) {
        const facilityData = facilitySnap.data();
        const customRoles = facilityData.customRoles || [];
        
        const finalRoleName = selectedRole === 'custom' 
          ? customRoleName.trim()
          : (getRoleOptions().find(r => r.value === selectedRole)?.label || selectedRole);

        const newRole = {
          id: Date.now().toString(),
          name: finalRoleName,
          roleKey: selectedRole === 'custom' ? null : selectedRole,
          facilityType: facilityType,
          createdAt: serverTimestamp()
        };

        const updatedRoles = [...customRoles, newRole];

        await updateDoc(facilityRef, {
          customRoles: updatedRoles,
          updatedAt: serverTimestamp()
        });

        showNotification(t('organization:admin.roles.created', 'Role created successfully'), 'success');
        if (onRoleCreated) {
          onRoleCreated(newRole);
        }
        onClose();
      }
    } catch (error) {
      console.error('Error creating role:', error);
      showNotification(t('organization:errors.saveFailed', 'Failed to create role'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const roleOptions = getRoleOptions();
  const hasCustomOption = roleOptions.length > 0;

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('organization:facilityRoles.createRoleTitle', 'Create Facility Role')}
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
            <Button
              onClick={handleCreateRole}
              variant="primary"
              type="button"
              disabled={isProcessing || (!selectedRole && !customRoleName.trim())}
            >
              {isProcessing ? t('common:saving', 'Saving...') : t('common:save', 'Save')}
            </Button>
          </div>
        </>
      }
    >
      <div className="space-y-4" style={{ minHeight: '300px' }}>
        {loadingFacilityType ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="mb-4 pb-4 border-b border-border">
              <p className="text-sm text-muted-foreground">
                {t('organization:facilityRoles.subtitle', 'Create a new role for your facility based on your facility type.')}
              </p>
            </div>

            {hasCustomOption ? (
              <>
                <DropdownField
                  label={t('organization:facilityRoles.selectRole', 'Select Role')}
                  options={[
                    { value: '', label: t('organization:facilityRoles.selectRole', 'Select Role') },
                    ...roleOptions,
                    { value: 'custom', label: t('common:other', 'Other (Custom)') }
                  ]}
                  value={selectedRole}
                  onChange={(value) => {
                    setSelectedRole(value);
                    if (value !== 'custom') {
                      setCustomRoleName('');
                    }
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.role;
                      return newErrors;
                    });
                  }}
                  required={true}
                  error={errors.role}
                />

                {selectedRole === 'custom' && (
                  <InputField
                    label={t('organization:facilityRoles.roleName', 'Role Name')}
                    value={customRoleName}
                    onChange={(e) => {
                      setCustomRoleName(e.target.value);
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.customRoleName;
                        return newErrors;
                      });
                    }}
                    placeholder={t('organization:facilityRoles.roleNamePlaceholder', 'Enter role name')}
                    required={true}
                    error={errors.customRoleName}
                  />
                )}
              </>
            ) : (
              <InputField
                label={t('organization:facilityRoles.roleName', 'Role Name')}
                value={customRoleName}
                onChange={(e) => {
                  setCustomRoleName(e.target.value);
                  setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.customRoleName;
                    return newErrors;
                  });
                }}
                placeholder={t('organization:facilityRoles.roleNamePlaceholder', 'Enter role name')}
                required={true}
                error={errors.customRoleName}
              />
            )}
          </>
        )}
      </div>
    </Dialog>
  );
};

export default CreateFacilityRoleModal;

