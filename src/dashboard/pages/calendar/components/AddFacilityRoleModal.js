import React, { useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { get } from 'lodash';
import { FiUsers, FiPlus, FiTrash2, FiCalendar, FiX, FiAlertTriangle } from 'react-icons/fi';
import { CALENDAR_COLORS } from '../utils/constants';
import { useDashboard } from '../../../contexts/DashboardContext';
import { db } from '../../../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';

import InputField from '../../../../components/BoxedInputFields/Personnalized-InputField';
import Button from '../../../../components/BoxedInputFields/Button';
import DropdownField from '../../../../components/BoxedInputFields/Dropdown-Field';
import ColorPicker from '../../../components/ColorPicker/ColorPicker';
import Dialog from '../../../../components/Dialog/Dialog';

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
  formActions: "flex justify-between gap-4 w-full max-w-[1000px] mx-auto"
};

const WORKER_TYPES = [
  { value: 'pharmacist', labelKey: 'operations.workerTypes.pharmacist' },
  { value: 'cashier', labelKey: 'operations.workerTypes.cashier' },
  { value: 'assistant', labelKey: 'operations.workerTypes.assistant' },
  { value: 'pharmacy_technician', labelKey: 'operations.workerTypes.pharmacyTechnician' },
  { value: 'other', labelKey: 'operations.workerTypes.other' }
];

const AddFacilityRoleModal = ({
  isOpen,
  onClose,
  profileData,
  onSave,
  onDelete,
  editingRole = null,
}) => {
  const { t } = useTranslation(['dashboardProfile', 'common']);
  const { selectedWorkspace } = useDashboard();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [showWorkerSelect, setShowWorkerSelect] = useState(null);
  const [formData, setFormData] = useState({
    workerType: 'none',
    workerTypeOther: '',
    assignedWorkers: [],
    appliesToAllDays: false,
    specificDays: []
  });
  const [workerErrors, setWorkerErrors] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [facilityCustomRoles, setFacilityCustomRoles] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedWorkspace?.facilityId) return;
      
      setLoadingTeamMembers(true);
      try {
        const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, selectedWorkspace.facilityId);
        const facilitySnap = await getDoc(facilityRef);
        
        if (facilitySnap.exists()) {
          const facilityData = facilitySnap.data();
          const employeesList = facilityData.employees || [];
          const admins = employeesList.filter(emp => emp.roles?.includes('admin')).map(emp => emp.user_uid);
          const employees = employeesList.filter(emp => !emp.roles?.includes('admin')).map(emp => emp.user_uid);
          const allMemberIds = [...new Set([...admins, ...employees])];
          
          const memberPromises = allMemberIds.map(async (userId) => {
            try {
              const professionalProfileRef = doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, userId);
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
        console.error('Error fetching data:', error);
      } finally {
        setLoadingTeamMembers(false);
      }
    };
    
    if (selectedWorkspace?.facilityId) {
      fetchData();
    }
  }, [selectedWorkspace?.facilityId, isOpen]);


  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleUpdateField = useCallback((field, value) => {
    setFormData(prev => {
      if (field === 'appliesToAllDays') {
        return { ...prev, appliesToAllDays: value, specificDays: value ? [] : prev.specificDays };
      }
      if (field === 'toggleDay') {
        const dayIndex = prev.specificDays.indexOf(value);
        const newDays = dayIndex >= 0
          ? prev.specificDays.filter(d => d !== value)
          : [...prev.specificDays, value];
        return { ...prev, specificDays: newDays };
      }
      if (field === 'workerType') {
        if (value === 'none') {
          return { ...prev, [field]: value, workerTypeOther: '', assignedWorkers: [] };
        }
        if (value !== 'other') {
          return { ...prev, [field]: value, workerTypeOther: '' };
        }
      }
      return { ...prev, [field]: value };
    });
    
    if (field === 'workerType') {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.workerType;
        return newErrors;
      });
    }
    
    if (field === 'workerTypeOther') {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.workerTypeOther;
        return newErrors;
      });
    }
  }, []);

  const validateAllFields = useCallback(() => {
    const fieldErrors = {};
    const workerErrors = {};
    let isValid = true;
    
    if (!formData.workerType || formData.workerType === 'none') {
      isValid = false;
      fieldErrors.workerType = t('operations.workerTypeRequired', 'Role type is required');
    }
    
    if (formData.workerType === 'other' && (!formData.workerTypeOther || !formData.workerTypeOther.trim())) {
      isValid = false;
      fieldErrors.workerTypeOther = t('operations.workerTypeOtherRequired', 'Custom role type is required');
    }
    
    const workers = formData.assignedWorkers || [];
    
    if (workers.length === 0) {
      isValid = false;
      workerErrors._general = t('operations.atLeastOneWorkerRequired', 'At least one worker is required');
    }
    
    workers.forEach(worker => {
      const workerId = worker.workerId || '';
      const placeholderName = worker.placeholderName || '';
      
      if (!workerId || workerId === '') {
        isValid = false;
        workerErrors[`${worker.id}_workerId`] = t('operations.workerSelectionRequired', 'Worker selection is required');
      } else if (workerId === 'placeholder' && !placeholderName.trim()) {
        isValid = false;
        workerErrors[`${worker.id}_placeholderName`] = t('operations.placeholderNameRequired', 'Placeholder name is required');
      }
    });
    
    setFieldErrors(fieldErrors);
    setWorkerErrors(workerErrors);
    return isValid;
  }, [formData, t]);

  const handleAddWorker = useCallback(() => {
    validateAllFields();
    
    const currentWorkers = formData.assignedWorkers || [];
    let workerColor;
    
    if (currentWorkers.length > 0) {
      const lastWorker = currentWorkers[currentWorkers.length - 1];
      workerColor = {
        color: lastWorker.color || CALENDAR_COLORS[0].color,
        color1: lastWorker.color1 || CALENDAR_COLORS[0].color1
      };
    } else {
      workerColor = CALENDAR_COLORS[0];
    }
    
    const newWorker = {
      id: Date.now().toString(),
      workerId: '',
      placeholderName: '',
      color: workerColor.color,
      color1: workerColor.color1
    };
    setFormData(prev => ({
      ...prev,
      assignedWorkers: [...(prev.assignedWorkers || []), newWorker]
    }));
    setShowWorkerSelect(newWorker.id);
  }, [formData, validateAllFields]);

  const handleRemoveWorker = useCallback((workerId) => {
    setFormData(prev => ({
      ...prev,
      assignedWorkers: (prev.assignedWorkers || []).filter(w => w.id !== workerId)
    }));
    setWorkerErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`${workerId}_workerId`];
      delete newErrors[`${workerId}_placeholderName`];
      return newErrors;
    });
  }, []);

  const handleUpdateWorker = useCallback((workerId, field, value) => {
    setFormData(prev => ({
      ...prev,
      assignedWorkers: (prev.assignedWorkers || []).map(worker => {
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
    }));
    
    if (field === 'workerId' || field === 'placeholderName') {
      setWorkerErrors(prev => {
        const newErrors = { ...prev };
        if (field === 'workerId') {
          delete newErrors[`${workerId}_workerId`];
          if (value === 'placeholder') {
            delete newErrors[`${workerId}_placeholderName`];
          }
        } else if (field === 'placeholderName') {
          delete newErrors[`${workerId}_placeholderName`];
        }
        return newErrors;
      });
    }
  }, []);

  const validateWorkers = useCallback(() => {
    const errors = {};
    let isValid = true;
    
    const workers = formData.assignedWorkers || [];
    
    if (workers.length === 0) {
      isValid = false;
      errors._general = t('operations.atLeastOneWorkerRequired', 'At least one worker is required');
    }
    
    workers.forEach(worker => {
      const workerId = worker.workerId || '';
      const placeholderName = worker.placeholderName || '';
      
      if (!workerId || workerId === '') {
        isValid = false;
        errors[`${worker.id}_workerId`] = t('operations.workerSelectionRequired', 'Worker selection is required');
      } else if (workerId === 'placeholder' && !placeholderName.trim()) {
        isValid = false;
        errors[`${worker.id}_placeholderName`] = t('operations.placeholderNameRequired', 'Placeholder name is required');
      }
    });
    
    setWorkerErrors(errors);
    return isValid;
  }, [formData.assignedWorkers, t]);

  const getWorkerTypeOptions = useCallback(() => {
    const options = [
      { value: 'none', label: t('operations.workerTypes.none', 'None') }
    ];
    return [...options, ...WORKER_TYPES.map(type => ({
      value: type.value,
      label: t(type.labelKey)
    }))];
  }, [t]);

  const handleSave = useCallback(() => {
    if (!validateWorkers()) {
      return;
    }
    
    const currentRequirements = get(profileData, 'operationalSettings.workerRequirements') || [];
    let updated;
    
    if (editingRole) {
      updated = currentRequirements.map(req => 
        req.id === editingRole.id 
          ? { ...req, ...formData }
          : req
      );
    } else {
      const existingRoleIndex = currentRequirements.findIndex(role => {
        if (formData.workerType === 'other') {
          return role.workerType === 'other' && 
                 role.workerTypeOther === formData.workerTypeOther &&
                 formData.workerTypeOther?.trim() !== '';
        }
        return role.workerType === formData.workerType && role.workerType !== 'other';
      });

      if (existingRoleIndex >= 0) {
        updated = currentRequirements.map((req, index) => 
          index === existingRoleIndex
            ? { 
                ...req, 
                ...formData
              }
            : req
        );
      } else {
        const newRequirement = {
          id: Date.now().toString(),
          ...formData
        };
        updated = [...currentRequirements, newRequirement];
      }
    }
    
    onSave(updated);
    onClose();
  }, [formData, profileData, onSave, onClose, editingRole, validateWorkers]);

  const handleDelete = useCallback(() => {
    if (onDelete && editingRole) {
      const currentRequirements = get(profileData, 'operationalSettings.workerRequirements') || [];
      const updated = currentRequirements.filter(req => req.id !== editingRole.id);
      onDelete(updated);
      setShowDeleteConfirm(false);
      onClose();
    }
  }, [onDelete, editingRole, profileData, onClose]);


  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={editingRole ? t('operations.editWorkerRequirement', 'Edit Facility Role') : t('operations.addWorker', 'Add Worker')}
      size="medium"
      closeOnBackdropClick={true}
      actions={
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-2">
            {editingRole && onDelete && (
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="danger"
                type="button"
              >
                <FiTrash2 className="w-4 h-4" />
                {t('common:delete', 'Delete')}
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="secondary"
              type="button"
            >
              {t('common:cancel', 'Cancel')}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              variant="primary"
              type="button"
            >
              {t('common:save', 'Save')}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col" style={{ minHeight: '500px' }}>
        <div className="mb-6 pb-4 border-b border-border">
          <p className="text-sm text-muted-foreground">
            {t('operations.subtitle', 'Configure opening hours and staff requirements for your facility.')}
          </p>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto">
          <div className="mt-4">
            <DropdownField
              label={t('operations.workerType', 'Role Type')}
              options={getWorkerTypeOptions()}
              value={formData.workerType}
              onChange={(value) => handleUpdateField('workerType', value)}
              placeholder={t('operations.selectWorkerType')}
              required={true}
              error={fieldErrors.workerType}
            />

            {formData.workerType === 'other' && (
              <InputField
                label={t('operations.workerTypeOther')}
                type="text"
                value={formData.workerTypeOther || ''}
                onChange={(e) => handleUpdateField('workerTypeOther', e.target.value)}
                placeholder={t('operations.workerTypeOtherPlaceholder')}
                required={true}
                error={fieldErrors.workerTypeOther}
              />
            )}
          </div>

          {formData.workerType && formData.workerType !== 'none' && (
            <>
              <div className="border-t border-border my-6"></div>
              {(() => {
                const allWorkers = formData.assignedWorkers || [];
                const assignedWorkers = allWorkers.filter(worker => worker.workerId || worker.placeholderName);
                const newWorkers = allWorkers.filter(worker => !worker.workerId && !worker.placeholderName && showWorkerSelect === worker.id);
                
                return (
                  <>
                    {assignedWorkers.length > 0 && (
                      <div className="mb-4">
                        {assignedWorkers.map((worker) => {
                        const workerName = worker.workerId && worker.workerId !== 'placeholder'
                          ? (() => {
                              const member = teamMembers.find(m => m.uid === worker.workerId);
                              return member ? `${member.firstName} ${member.lastName}`.trim() : 'Unknown';
                            })()
                          : worker.placeholderName || t('operations.placeholder', 'Placeholder');
                        
                        const allExistingRoles = get(profileData, 'operationalSettings.workerRequirements') || [];
                        const otherRoles = editingRole 
                          ? allExistingRoles.filter(r => r.id !== editingRole.id)
                          : allExistingRoles;
                        
                        const assignedWorkerIdsFromOtherRoles = new Set(
                          otherRoles.flatMap(role => 
                            (role.assignedWorkers || [])
                              .filter(w => 
                                w.workerId && 
                                w.workerId !== '' && 
                                w.workerId !== 'placeholder'
                              )
                              .map(w => String(w.workerId))
                          )
                        );
                        
                        const assignedWorkerIdsFromCurrentForm = new Set(
                          (formData.assignedWorkers || [])
                            .filter(w => 
                              w.id !== worker.id && 
                              w.workerId && 
                              w.workerId !== '' && 
                              w.workerId !== 'placeholder'
                            )
                            .map(w => String(w.workerId))
                        );
                        
                        const allAssignedWorkerIds = new Set([
                          ...assignedWorkerIdsFromOtherRoles,
                          ...assignedWorkerIdsFromCurrentForm
                        ]);
                        
                        const currentWorkerId = worker.workerId && worker.workerId !== 'placeholder' ? String(worker.workerId) : null;
                        
                        const availableTeamMembers = (teamMembers || []).filter(m => {
                          if (!m || !m.uid) return false;
                          const memberId = String(m.uid);
                          const isAssigned = allAssignedWorkerIds.has(memberId);
                          const isCurrent = memberId === currentWorkerId;
                          return !isAssigned || isCurrent;
                        });
                        
                        return (
                          <div 
                            key={worker.id}
                            className="flex items-center gap-3 p-4 border border-border rounded-lg bg-card hover:border-primary/30 transition-colors mb-2"
                          >
                            <ColorPicker
                              color={worker.color}
                              color1={worker.color1}
                              onChange={(color, color1) => handleUpdateWorker(worker.id, 'color', color)}
                              size={32}
                            />
                            <div className="flex-1">
                                {showWorkerSelect === worker.id || (!worker.workerId && !worker.placeholderName) ? (
                                  <>
                                    <DropdownField
                                      key={`${worker.id}-${allAssignedWorkerIds.size}-${availableTeamMembers.length}`}
                                      label={t('operations.selectWorkerOrPlaceholder', 'Select Worker or Placeholder')}
                                      options={[
                                        { value: '', label: t('operations.selectWorkerOrPlaceholder', 'Select Worker or Placeholder') },
                                        ...availableTeamMembers.map(m => ({
                                          value: m.uid,
                                          label: `${m.firstName} ${m.lastName}`.trim() || 'Unknown'
                                        })),
                                        { value: 'placeholder', label: t('operations.usePlaceholderName', 'Enter Placeholder Name') }
                                      ]}
                                      value={worker.workerId === 'placeholder' ? 'placeholder' : (worker.workerId || '')}
                                      onChange={(value) => {
                                        if (value === 'placeholder') {
                                          handleUpdateWorker(worker.id, 'workerId', 'placeholder');
                                          handleUpdateWorker(worker.id, 'placeholderName', '');
                                          setShowWorkerSelect(worker.id);
                                        } else if (value) {
                                          handleUpdateWorker(worker.id, 'workerId', value);
                                          handleUpdateWorker(worker.id, 'placeholderName', '');
                                          setShowWorkerSelect(null);
                                        } else {
                                          handleUpdateWorker(worker.id, 'workerId', '');
                                          handleUpdateWorker(worker.id, 'placeholderName', '');
                                          setShowWorkerSelect(null);
                                        }
                                      }}
                                      required={true}
                                      error={workerErrors[`${worker.id}_workerId`]}
                                    />
                                    {worker.workerId === 'placeholder' && (
                                      <InputField
                                        label={t('operations.placeholderName', 'Placeholder Name')}
                                        type="text"
                                        value={worker.placeholderName || ''}
                                        onChange={(e) => {
                                          handleUpdateWorker(worker.id, 'placeholderName', e.target.value);
                                        }}
                                        placeholder={t('operations.placeholderNamePlaceholder', 'Enter name')}
                                        required={true}
                                        error={workerErrors[`${worker.id}_placeholderName`]}
                                      />
                                    )}
                                  </>
                                ) : (
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{workerName}</span>
                                    <button
                                      type="button"
                                      onClick={() => setShowWorkerSelect(worker.id)}
                                      className="p-1 text-muted-foreground hover:bg-muted rounded transition-colors text-xs"
                                    >
                                      {t('common.edit', 'Edit')}
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveWorker(worker.id)}
                                  className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                                >
                                  <FiTrash2 size={16} />
                                </button>
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    )}
                    
                    {assignedWorkers.length === 0 && (!formData.assignedWorkers || formData.assignedWorkers.length === 0 || (formData.assignedWorkers.every(w => !w.workerId && !w.placeholderName) && !showWorkerSelect)) && (
                      <div className="py-8 text-center">
                        <p className="text-sm text-muted-foreground mb-2">
                          {t('operations.noWorkersAssigned', 'No workers assigned. Click "Add Worker" to assign.')}
                        </p>
                        {workerErrors._general && (
                          <p className="text-sm text-destructive mt-2">
                            {workerErrors._general}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {newWorkers.map((worker) => {
                      const allExistingRoles = get(profileData, 'operationalSettings.workerRequirements') || [];
                      const otherRoles = editingRole 
                        ? allExistingRoles.filter(r => r.id !== editingRole.id)
                        : allExistingRoles;
                      
                      const assignedWorkerIdsFromOtherRoles = new Set(
                        otherRoles.flatMap(role => 
                          (role.assignedWorkers || [])
                            .filter(w => 
                              w.workerId && 
                              w.workerId !== '' && 
                              w.workerId !== 'placeholder'
                            )
                            .map(w => String(w.workerId))
                        )
                      );
                      
                      const assignedWorkerIdsFromCurrentForm = new Set(
                        (formData.assignedWorkers || [])
                          .filter(w => 
                            w.id !== worker.id && 
                            w.workerId && 
                            w.workerId !== '' && 
                            w.workerId !== 'placeholder'
                          )
                          .map(w => String(w.workerId))
                      );
                      
                      const allAssignedWorkerIds = new Set([
                        ...assignedWorkerIdsFromOtherRoles,
                        ...assignedWorkerIdsFromCurrentForm
                      ]);
                      
                      const currentWorkerId = worker.workerId && worker.workerId !== 'placeholder' ? String(worker.workerId) : null;
                      
                      const availableTeamMembers = (teamMembers || []).filter(m => {
                        if (!m || !m.uid) return false;
                        const memberId = String(m.uid);
                        const isAssigned = allAssignedWorkerIds.has(memberId);
                        const isCurrent = memberId === currentWorkerId;
                        return !isAssigned || isCurrent;
                      });
                      
                      return (
                        <div 
                          key={worker.id}
                          className="flex items-center gap-3 p-4 border border-border rounded-lg bg-card hover:border-primary/30 transition-colors mb-2"
                        >
                          <ColorPicker
                            color={worker.color}
                            color1={worker.color1}
                            onChange={(color, color1) => handleUpdateWorker(worker.id, 'color', color)}
                            size={32}
                          />
                          <div className="flex-1">
                              <DropdownField
                                key={`${worker.id}-${allAssignedWorkerIds.size}-${availableTeamMembers.length}`}
                                label={t('operations.selectWorkerOrPlaceholder', 'Select Worker or Placeholder')}
                                options={[
                                  { value: '', label: t('operations.selectWorkerOrPlaceholder', 'Select Worker or Placeholder') },
                                  ...availableTeamMembers.map(m => ({
                                    value: m.uid,
                                    label: `${m.firstName} ${m.lastName}`.trim() || 'Unknown'
                                  })),
                                  { value: 'placeholder', label: t('operations.usePlaceholderName', 'Enter Placeholder Name') }
                                ]}
                                value={worker.workerId === 'placeholder' ? 'placeholder' : (worker.workerId || '')}
                                onChange={(value) => {
                                  if (value === 'placeholder') {
                                    handleUpdateWorker(worker.id, 'workerId', 'placeholder');
                                    handleUpdateWorker(worker.id, 'placeholderName', '');
                                    setShowWorkerSelect(worker.id);
                                  } else if (value) {
                                    handleUpdateWorker(worker.id, 'workerId', value);
                                    handleUpdateWorker(worker.id, 'placeholderName', '');
                                    setShowWorkerSelect(null);
                                  } else {
                                    handleUpdateWorker(worker.id, 'workerId', '');
                                    handleUpdateWorker(worker.id, 'placeholderName', '');
                                    setShowWorkerSelect(worker.id);
                                  }
                                }}
                                required={true}
                                error={workerErrors[`${worker.id}_workerId`]}
                              />
                              {worker.workerId === 'placeholder' && (
                                <InputField
                                  label={t('operations.placeholderName', 'Placeholder Name')}
                                  type="text"
                                  value={worker.placeholderName || ''}
                                  onChange={(e) => {
                                    handleUpdateWorker(worker.id, 'placeholderName', e.target.value);
                                  }}
                                  placeholder={t('operations.placeholderNamePlaceholder', 'Enter name')}
                                  required={true}
                                  error={workerErrors[`${worker.id}_placeholderName`]}
                                />
                              )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleRemoveWorker(worker.id)}
                              className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    
                    <div className="border-t border-border pt-6 mt-6">
                      <Button
                        onClick={handleAddWorker}
                        variant="secondary"
                        className="w-full"
                      >
                        <FiPlus className="w-4 h-4 mr-2" />
                        {t('operations.addWorker', 'Add Worker')}
                      </Button>
                    </div>
                  </>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteConfirm(false);
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
                    backgroundColor: 'var(--white)',
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
                onClick={() => setShowDeleteConfirm(false)}
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
              className="px-6 py-4 border-t flex justify-between items-center gap-3"
              style={{
                borderTopColor: 'var(--grey-2)',
                backgroundColor: 'var(--grey-1-light)'
              }}
            >
              <div className="flex items-center gap-2">
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  variant="secondary"
                  type="button"
                >
                  {t('common:deleteConfirmation.cancel', 'Cancel')}
                </Button>
                <Button
                  onClick={handleDelete}
                  variant="danger"
                  type="button"
                >
                  {t('common:deleteConfirmation.delete', 'Delete')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
};

export default AddFacilityRoleModal;

