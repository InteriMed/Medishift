import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { get } from 'lodash';
import { FiUsers, FiPlus, FiTrash2, FiCalendar, FiX, FiAlertTriangle } from 'react-icons/fi';
import { CALENDAR_COLORS } from '../../../calendar/utils/constants';
import { useDashboard } from '../../../../contexts/DashboardContext';
import { db } from '../../../../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '../../../../../config/keysDatabase';

import InputField from '../../../../../components/BoxedInputFields/Personnalized-InputField';
import Button from '../../../../../components/BoxedInputFields/Button';
import DropdownField from '../../../../../components/BoxedInputFields/Dropdown-Field';
import ColorPicker from '../../../../components/ColorPicker/ColorPicker';

const styles = {
  sectionContainer: "flex flex-col gap-6 p-1 w-full max-w-[1000px] mx-auto",
  headerCard: "bg-card rounded-xl border border-border p-6 pb-4 shadow-md w-full max-w-[1000px] mx-auto",
  sectionTitle: "text-2xl font-semibold mb-2",
  sectionTitleStyle: { fontSize: '18px', color: 'hsl(var(--foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionSubtitle: "text-sm font-medium text-muted-foreground",
  subtitleRow: "flex items-end justify-between gap-4",
  mandatoryFieldLegend: "text-xs text-muted-foreground",
  mandatoryMark: "text-destructive",
  sectionsWrapper: "flex flex-col gap-6 w-full max-w-[1000px] mx-auto",
  sectionCard: "bg-card rounded-xl border border-border p-6 shadow-md w-full",
  cardHeader: "flex items-center gap-4 mb-6",
  cardIconWrapper: "p-2 rounded-lg bg-primary/10 text-primary",
  cardTitle: "flex-1",
  cardTitleH3: "m-0",
  cardTitleH3Style: { color: 'hsl(var(--card-foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  workerRequirementCard: "border border-border/60 rounded-lg p-5 mb-4 bg-card/50 transition-all hover:border-primary/30",
  workerRequirementHeader: "flex items-center justify-between mb-4",
  workerRequirementTitle: "font-semibold text-sm text-foreground",
  removeButton: "p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors",
  formActions: "flex justify-end gap-4 w-full max-w-[1000px] mx-auto"
};

const WORKER_TYPES = [
  { value: 'pharmacist', labelKey: 'operations.workerTypes.pharmacist' },
  { value: 'cashier', labelKey: 'operations.workerTypes.cashier' },
  { value: 'assistant', labelKey: 'operations.workerTypes.assistant' },
  { value: 'pharmacy_technician', labelKey: 'operations.workerTypes.pharmacyTechnician' },
  { value: 'other', labelKey: 'operations.workerTypes.other' }
];

const FacilityRoles = ({
  formData,
  config,
  errors,
  isSubmitting,
  onInputChange,
  onSaveAndContinue,
  onCancel,
  getNestedValue,
}) => {
  const { t } = useTranslation(['dashboardProfile', 'dropdowns', 'common', 'validation']);
  const navigate = useNavigate();
  const { selectedWorkspace } = useDashboard();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [showWorkerSelect, setShowWorkerSelect] = useState(null);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!selectedWorkspace?.facilityId) return;
      
      setLoadingTeamMembers(true);
      try {
        const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, selectedWorkspace.facilityId);
        const facilitySnap = await getDoc(facilityRef);
        
        if (facilitySnap.exists()) {
          const facilityData = facilitySnap.data();
          const employeesList = facilityData.employees || [];
          const admins = employeesList.filter(emp => emp.rights === 'admin').map(emp => emp.uid);
          const employees = employeesList.filter(emp => emp.rights !== 'admin').map(emp => emp.uid);
          const allMemberIds = [...new Set([...admins, ...employees])];
          
          const memberPromises = allMemberIds.map(async (userId) => {
            try {
              const professionalProfileRef = doc(db, 'professionalProfiles', userId);
              const professionalProfileSnap = await getDoc(professionalProfileRef);
              
              if (professionalProfileSnap.exists()) {
                const professionalData = professionalProfileSnap.data();
                const identity = professionalData.identity || {};
                const firstName = identity.legalFirstName || identity.firstName || '';
                const lastName = identity.legalLastName || identity.lastName || '';
                
                return {
                  uid: userId,
                  firstName: firstName,
                  lastName: lastName,
                  email: professionalData.contact?.primaryEmail || ''
                };
              } else {
                const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
                const userSnap = await getDoc(userRef);
                
                if (userSnap.exists()) {
                  const userData = userSnap.data();
                  return {
                    uid: userId,
                    firstName: userData.firstName || '',
                    lastName: userData.lastName || '',
                    email: userData.email || ''
                  };
                }
              }
            } catch (error) {
              console.error(`Error fetching profile for user ${userId}:`, error);
            }
            return null;
          });
          
          const members = (await Promise.all(memberPromises)).filter(m => m !== null);
          setTeamMembers(members);
        }
      } catch (error) {
        console.error('Error fetching team members:', error);
      } finally {
        setLoadingTeamMembers(false);
      }
    };
    
    if (selectedWorkspace?.facilityId) {
      fetchTeamMembers();
    }
  }, [selectedWorkspace?.facilityId]);

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  const handlePersonnalize = useCallback(async () => {
    if (onSaveAndContinue) {
      await onSaveAndContinue();
    }
    navigate('/dashboard/calendar?view=team');
  }, [navigate, onSaveAndContinue]);

  const workerRequirements = useMemo(() => {
    return getNestedValue(formData, 'operationalSettings.workerRequirements') || [];
  }, [formData, getNestedValue]);

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteWorkerConfirm, setDeleteWorkerConfirm] = useState(null);

  const handleAddWorkerRequirement = useCallback(() => {
    const current = workerRequirements || [];
    const newRequirement = {
      id: Date.now().toString(),
      workerType: 'pharmacist',
      workerTypeOther: '',
      assignedWorkers: [],
      appliesToAllDays: false,
      specificDays: []
    };
    const updated = [...current, newRequirement];
    onInputChange('operationalSettings.workerRequirements', updated);
  }, [workerRequirements, onInputChange]);

  const handleAddWorker = useCallback((requirementId) => {
    const updated = workerRequirements.map(req => {
      if (req.id === requirementId) {
        const defaultColor = CALENDAR_COLORS[0];
        const newWorker = {
          id: Date.now().toString(),
          workerId: '',
          placeholderName: '',
          color: defaultColor.color,
          color1: defaultColor.color1
        };
        const newWorkers = [...(req.assignedWorkers || []), newWorker];
        return {
          ...req,
          assignedWorkers: newWorkers
        };
      }
      return req;
    });
    onInputChange('operationalSettings.workerRequirements', updated);
    const newWorkerId = updated.find(r => r.id === requirementId)?.assignedWorkers?.slice(-1)[0]?.id;
    if (newWorkerId) {
      setShowWorkerSelect(`${requirementId}-${newWorkerId}`);
    }
  }, [workerRequirements, onInputChange]);

  const handleRemoveWorker = useCallback((requirementId, workerId) => {
    const updated = workerRequirements.map(req => {
      if (req.id === requirementId) {
        return {
          ...req,
          assignedWorkers: (req.assignedWorkers || []).filter(w => w.id !== workerId)
        };
      }
      return req;
    });
    onInputChange('operationalSettings.workerRequirements', updated);
  }, [workerRequirements, onInputChange]);

  const handleUpdateWorker = useCallback((requirementId, workerId, field, value) => {
    const updated = workerRequirements.map(req => {
      if (req.id === requirementId) {
        return {
          ...req,
          assignedWorkers: (req.assignedWorkers || []).map(worker => {
            if (worker.id === workerId) {
              if (field === 'color') {
                const colorOption = CALENDAR_COLORS.find(c => c.color === value);
                return {
                  ...worker,
                  color: value,
                  color1: colorOption?.color1 || value
                };
              }
              return { ...worker, [field]: value };
            }
            return worker;
          })
        };
      }
      return req;
    });
    onInputChange('operationalSettings.workerRequirements', updated);
  }, [workerRequirements, onInputChange]);

  const handleUpdateWorkerRequirement = useCallback((id, field, value) => {
    const updated = workerRequirements.map(req => {
      if (req.id === id) {
        if (field === 'appliesToAllDays') {
          return { ...req, appliesToAllDays: value, specificDays: value ? [] : req.specificDays };
        }
        if (field === 'toggleDay') {
          const dayIndex = req.specificDays.indexOf(value);
          const newDays = dayIndex >= 0
            ? req.specificDays.filter(d => d !== value)
            : [...req.specificDays, value];
          return { ...req, specificDays: newDays };
        }
        if (field === 'color') {
          const colorOption = CALENDAR_COLORS.find(c => c.color === value);
          return { 
            ...req, 
            color: value,
            color1: colorOption?.color1 || value
          };
        }
        return { ...req, [field]: value };
      }
      return req;
    });
    onInputChange('operationalSettings.workerRequirements', updated);
  }, [workerRequirements, onInputChange]);

  const handleRemoveWorkerRequirement = useCallback((id) => {
    const updated = workerRequirements.filter(req => req.id !== id);
    onInputChange('operationalSettings.workerRequirements', updated);
    setDeleteConfirmId(null);
  }, [workerRequirements, onInputChange]);

  const getWorkerTypeOptions = useCallback(() => {
    return WORKER_TYPES.map(type => ({
      value: type.value,
      label: t(type.labelKey)
    }));
  }, [t]);

  return (
    <div className={styles.sectionContainer}>
      <div 
        className="w-full max-w-[1000px] mx-auto rounded-xl overflow-hidden shadow-md mb-6 bg-card border border-border"
      >
        <div className="p-6 pb-4">
          <h2 
            className="text-2xl font-semibold mb-2"
            style={{ 
              color: 'hsl(var(--foreground))',
              fontFamily: 'var(--font-family-text, Roboto, sans-serif)' 
            }}
          >
            {t('operations.facilityRolesTitle')}
          </h2>
          <div className="flex items-end justify-between gap-4">
            <p 
              className="text-sm font-medium text-muted-foreground"
              style={{ 
                fontFamily: 'var(--font-family-text, Roboto, sans-serif)' 
              }}
            >
              {t('operations.facilityRolesDescription')}
            </p>
            <div className="text-xs text-muted-foreground">
              <span className="text-destructive">*</span> {t('common.mandatoryFields')}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.sectionsWrapper}>
        <div className={styles.sectionCard}>
          <div>
            <Button
              onClick={handleAddWorkerRequirement}
              variant="secondary"
            >
              <FiPlus className="mr-2" />
              {t('operations.addWorkerRequirement')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-[1000px] mx-auto">
          {workerRequirements.map((requirement, index) => {
            const firstWorkerColor = requirement.assignedWorkers?.[0]?.color || CALENDAR_COLORS[0].color;
            const roleTypeLabel = requirement.workerType === 'other' 
              ? requirement.workerTypeOther 
              : t(`operations.workerTypes.${requirement.workerType}`);
            
            return (
            <div 
              key={requirement.id} 
              className="bg-card rounded-xl border border-border overflow-hidden shadow-md transition-all"
            >
                <div 
                  className="h-16 flex items-center justify-between px-6"
                  style={{ backgroundColor: firstWorkerColor }}
                >
                  <h4 
                    className="text-lg font-semibold"
                    style={{ color: 'var(--white)' }}
                  >
                    {roleTypeLabel || `${t('operations.workerRequirement')} #${index + 1}`}
                  </h4>
                  <button
                    onClick={() => setDeleteConfirmId(requirement.id)}
                    className="p-1.5 text-white hover:bg-white/20 rounded transition-colors"
                    type="button"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
                <div className="p-5">
              <div className="mb-4">
                <DropdownField
                  label={t('operations.workerType')}
                  options={getWorkerTypeOptions()}
                  value={requirement.workerType}
                  onChange={(value) => handleUpdateWorkerRequirement(requirement.id, 'workerType', value)}
                  placeholder={t('operations.selectWorkerType')}
                />
              </div>

              {requirement.workerType === 'other' && (
                <div className="mb-4">
                  <InputField
                    label={t('operations.workerTypeOther')}
                    type="text"
                    value={requirement.workerTypeOther || ''}
                    onChange={(e) => handleUpdateWorkerRequirement(requirement.id, 'workerTypeOther', e.target.value)}
                    placeholder={t('operations.workerTypeOtherPlaceholder')}
                  />
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">
                    {t('operations.assignedWorkers', 'Assigned Workers')}
                  </label>
                  <Button
                    onClick={() => handleAddWorker(requirement.id)}
                    variant="secondary"
                    className="text-xs py-1 px-2"
                  >
                    <FiPlus className="w-3 h-3 mr-1" />
                    {t('operations.addWorker', 'Add Worker')}
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {(requirement.assignedWorkers || []).map((worker) => {
                    const workerName = worker.workerId && worker.workerId !== 'placeholder'
                      ? (() => {
                          const member = teamMembers.find(m => m.uid === worker.workerId);
                          return member ? `${member.firstName} ${member.lastName}`.trim() : 'Unknown';
                        })()
                      : worker.placeholderName || t('operations.placeholder', 'Placeholder');
                    
                    return (
                      <div 
                        key={worker.id} 
                        className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card/50"
                      >
                        <ColorPicker
                          color={worker.color}
                          color1={worker.color1}
                          onChange={(color, color1) => handleUpdateWorker(requirement.id, worker.id, 'color', color)}
                          size={32}
                        />
                        <div className="flex-1">
                          {showWorkerSelect === `${requirement.id}-${worker.id}` || (!worker.workerId && !worker.placeholderName) ? (
                            <div className="space-y-2">
                              <DropdownField
                                options={[
                                  { value: '', label: t('operations.selectWorkerOrPlaceholder', 'Select Worker or Placeholder') },
                                  ...teamMembers.map(m => ({
                                    value: m.uid,
                                    label: `${m.firstName} ${m.lastName}`.trim() || 'Unknown'
                                  })),
                                  { value: 'placeholder', label: t('operations.usePlaceholderName', 'Enter Placeholder Name') }
                                ]}
                                value={worker.workerId === 'placeholder' ? 'placeholder' : (worker.workerId || '')}
                                onChange={(value) => {
                                  if (value === 'placeholder') {
                                    handleUpdateWorker(requirement.id, worker.id, 'workerId', 'placeholder');
                                    handleUpdateWorker(requirement.id, worker.id, 'placeholderName', '');
                                    setShowWorkerSelect(`${requirement.id}-${worker.id}`);
                                  } else if (value && value !== '') {
                                    handleUpdateWorker(requirement.id, worker.id, 'workerId', value);
                                    handleUpdateWorker(requirement.id, worker.id, 'placeholderName', '');
                                    setShowWorkerSelect(null);
                                  } else {
                                    handleUpdateWorker(requirement.id, worker.id, 'workerId', '');
                                    handleUpdateWorker(requirement.id, worker.id, 'placeholderName', '');
                                    setShowWorkerSelect(null);
                                  }
                                }}
                              />
                              {worker.workerId === 'placeholder' && (
                                <InputField
                                  label={t('operations.placeholderName', 'Placeholder Name')}
                                  type="text"
                                  value={worker.placeholderName || ''}
                                  onChange={(e) => {
                                    handleUpdateWorker(requirement.id, worker.id, 'placeholderName', e.target.value);
                                  }}
                                  placeholder={t('operations.placeholderNamePlaceholder', 'Enter name')}
                                />
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{workerName}</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setShowWorkerSelect(`${requirement.id}-${worker.id}`)}
                                  className="p-1 text-muted-foreground hover:bg-muted rounded transition-colors text-xs"
                                >
                                  {t('common.edit', 'Edit')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteWorkerConfirm({ requirementId: requirement.id, workerId: worker.id })}
                                  className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {(!requirement.assignedWorkers || requirement.assignedWorkers.length === 0) && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      {t('operations.noWorkersAssigned', 'No workers assigned. Click "Add Worker" to assign.')}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <Button
                  onClick={handlePersonnalize}
                  variant="secondary"
                  disabled={isSubmitting}
                  className="flex items-center gap-2"
                >
                  <FiCalendar className="w-4 h-4" />
                  {t('operations.personnalize', 'Personnalize')}
                </Button>
              </div>
                </div>
              </div>
            );
            })}
        </div>

      <div className={styles.sectionCard}>
        <div className={styles.formActions} style={{ marginTop: 0 }}>
          <Button onClick={handleCancel} variant="secondary" disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onSaveAndContinue} variant="confirmation" disabled={isSubmitting}>
            {isSubmitting ? t('common.saving') : t('common.saveAndContinue')}
          </Button>
        </div>
      </div>
      </div>

      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDeleteConfirmId(null);
            }
          }}
        >
          <div
            className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col transform transition-all duration-200 scale-100 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--background-div-color)',
              borderColor: 'var(--grey-2)',
              boxShadow: 'var(--box-shadow-md)'
            }}
          >
            <div
              className="flex items-center justify-between px-6 py-5 border-b"
              style={{
                borderBottomColor: 'var(--red-2)',
                backgroundColor: 'var(--red-1)'
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-full"
                  style={{
                    backgroundColor: 'var(--red-2)',
                    color: 'var(--red-4)'
                  }}
                >
                  <FiAlertTriangle size={24} />
                </div>
                <h3
                  className="text-xl font-semibold tracking-tight"
                  style={{
                    color: 'var(--red-4)',
                    fontFamily: 'var(--font-family-headings)',
                    fontSize: 'var(--font-size-large)'
                  }}
                >
                  {t('common:deleteConfirmation.title', 'Delete Facility Role')}
                </h3>
              </div>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="p-2 rounded-full transition-colors hover:bg-black/5"
                style={{
                  color: 'var(--red-4)'
                }}
                aria-label="Close"
              >
                <FiX size={20} />
              </button>
            </div>

            <div
              className="p-6 flex-1"
              style={{
                color: 'var(--text-color)',
                fontFamily: 'var(--font-family-text)',
                fontSize: 'var(--font-size-medium)',
                lineHeight: '1.6'
              }}
            >
              <p style={{ marginBottom: 'var(--spacing-md)' }}>
                {t('common:deleteConfirmation.message', 'Are you sure you want to delete this facility role? This action cannot be undone.')}
              </p>
            </div>

            <div
              className="px-6 py-4 border-t flex justify-end gap-3"
              style={{
                borderTopColor: 'var(--grey-2)',
                backgroundColor: 'var(--grey-1-light)'
              }}
            >
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              >
                {t('common:deleteConfirmation.cancel', 'Cancel')}
              </button>
              <button
                onClick={() => handleRemoveWorkerRequirement(deleteConfirmId)}
                className="px-4 py-2 text-sm font-medium text-white bg-destructive hover:bg-destructive/90 rounded-md shadow-sm transition-all hover:shadow-md active:scale-95"
              >
                {t('common:deleteConfirmation.delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteWorkerConfirm && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDeleteWorkerConfirm(null);
            }
          }}
        >
          <div
            className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col transform transition-all duration-200 scale-100 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--background-div-color)',
              borderColor: 'var(--grey-2)',
              boxShadow: 'var(--box-shadow-md)'
            }}
          >
            <div
              className="flex items-center justify-between px-6 py-5 border-b"
              style={{
                borderBottomColor: 'var(--red-2)',
                backgroundColor: 'var(--red-1)'
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-full"
                  style={{
                    backgroundColor: 'var(--red-2)',
                    color: 'var(--red-4)'
                  }}
                >
                  <FiAlertTriangle size={24} />
                </div>
                <h3
                  className="text-xl font-semibold tracking-tight"
                  style={{
                    color: 'var(--red-4)',
                    fontFamily: 'var(--font-family-headings)',
                    fontSize: 'var(--font-size-large)'
                  }}
                >
                  {t('common:deleteConfirmation.removeWorker', 'Remove Worker')}
                </h3>
              </div>
              <button
                onClick={() => setDeleteWorkerConfirm(null)}
                className="p-2 rounded-full transition-colors hover:bg-black/5"
                style={{
                  color: 'var(--red-4)'
                }}
                aria-label="Close"
              >
                <FiX size={20} />
              </button>
            </div>

            <div
              className="p-6 flex-1"
              style={{
                color: 'var(--text-color)',
                fontFamily: 'var(--font-family-text)',
                fontSize: 'var(--font-size-medium)',
                lineHeight: '1.6'
              }}
            >
              <p style={{ marginBottom: 'var(--spacing-md)' }}>
                {t('common:deleteConfirmation.removeWorkerMessage', 'Are you sure you want to remove this worker from the role? This action cannot be undone.')}
              </p>
            </div>

            <div
              className="px-6 py-4 border-t flex justify-end gap-3"
              style={{
                borderTopColor: 'var(--grey-2)',
                backgroundColor: 'var(--grey-1-light)'
              }}
            >
              <button
                onClick={() => setDeleteWorkerConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              >
                {t('common:deleteConfirmation.cancel', 'Cancel')}
              </button>
              <button
                onClick={() => {
                  handleRemoveWorker(deleteWorkerConfirm.requirementId, deleteWorkerConfirm.workerId);
                  setDeleteWorkerConfirm(null);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-destructive hover:bg-destructive/90 rounded-md shadow-sm transition-all hover:shadow-md active:scale-95"
              >
                {t('common:deleteConfirmation.remove', 'Remove')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacilityRoles;

