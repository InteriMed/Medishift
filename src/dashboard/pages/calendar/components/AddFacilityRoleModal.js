import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX, FiPlus, FiTrash2, FiAlertTriangle, FiShare2, FiMail, FiCopy, FiLoader } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import { CALENDAR_COLORS } from '../utils/constants';
import { get } from 'lodash';
import InputField from '../../../../components/BoxedInputFields/Personnalized-InputField';
import Button from '../../../../components/BoxedInputFields/Button';
import DropdownField from '../../../../components/BoxedInputFields/Dropdown-Field';
import { cn } from '../../../../utils/cn';
import { useDashboard } from '../../../contexts/DashboardContext';
import { db } from '../../../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import ColorPicker from '../../../components/ColorPicker/ColorPicker';
import { generateFacilityRoleInvitation } from '../../../../services/cloudFunctions';
import { useNotification } from '../../../../contexts/NotificationContext';

const DAYS_OF_WEEK = [
  { key: 'monday', labelKey: 'operations.monday' },
  { key: 'tuesday', labelKey: 'operations.tuesday' },
  { key: 'wednesday', labelKey: 'operations.wednesday' },
  { key: 'thursday', labelKey: 'operations.thursday' },
  { key: 'friday', labelKey: 'operations.friday' },
  { key: 'saturday', labelKey: 'operations.saturday' },
  { key: 'sunday', labelKey: 'operations.sunday' }
];

const WORKER_TYPES = [
  { value: 'pharmacist', labelKey: 'operations.workerTypes.pharmacist' },
  { value: 'cashier', labelKey: 'operations.workerTypes.cashier' },
  { value: 'assistant', labelKey: 'operations.workerTypes.assistant' },
  { value: 'pharmacy_technician', labelKey: 'operations.workerTypes.pharmacyTechnician' },
  { value: 'other', labelKey: 'operations.workerTypes.other' }
];

const AddFacilityRoleModal = ({ isOpen, onClose, profileData, onSave, editingRole = null, onDelete = null }) => {
  const { t } = useTranslation(['dashboardProfile', 'common']);
  const { selectedWorkspace } = useDashboard();
  const [formData, setFormData] = useState({
    workerType: 'none',
    workerTypeOther: '',
    assignedWorkers: [],
    appliesToAllDays: false,
    specificDays: []
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [showWorkerSelect, setShowWorkerSelect] = useState(null);
  const [selectedHeaderColor, setSelectedHeaderColor] = useState(null);
  const [workerErrors, setWorkerErrors] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [workerInvitations, setWorkerInvitations] = useState({});
  const [generatingInvitation, setGeneratingInvitation] = useState({});
  const { showSuccess, showError } = useNotification();
  const previousWorkerTypeRef = useRef(null);
  const previousWorkerTypeOtherRef = useRef(null);

  useEffect(() => {
    if (editingRole) {
      const assignedWorkers = editingRole.assignedWorkers || [];
      if (assignedWorkers.length === 0 && (editingRole.assignedPharmacistId || editingRole.placeholderName)) {
        const defaultColor = CALENDAR_COLORS[0];
        assignedWorkers.push({
          id: Date.now().toString(),
          workerId: editingRole.assignedPharmacistId || '',
          placeholderName: editingRole.placeholderName || '',
          color: editingRole.color || defaultColor.color,
          color1: editingRole.color1 || defaultColor.color1
        });
      }
      setFormData({
        workerType: editingRole.workerType || 'pharmacist',
        workerTypeOther: editingRole.workerTypeOther || '',
        assignedWorkers: assignedWorkers,
        appliesToAllDays: editingRole.appliesToAllDays || false,
        specificDays: editingRole.specificDays || []
      });
      const firstWorkerColor = assignedWorkers.length > 0 && assignedWorkers[0].color 
        ? assignedWorkers[0].color 
        : (editingRole.color || CALENDAR_COLORS[0].color);
      setSelectedHeaderColor(firstWorkerColor);
    } else {
      setFormData({
        workerType: 'none',
        workerTypeOther: '',
        assignedWorkers: [],
        appliesToAllDays: false,
        specificDays: []
      });
      setSelectedHeaderColor(null);
    }
    setWorkerErrors({});
    setFieldErrors({});
    setWorkerInvitations({});
  }, [editingRole, isOpen]);

  const getUnusedColor = useCallback(() => {
    const allExistingRoles = get(profileData, 'operationalSettings.workerRequirements') || [];
    const usedColors = new Set();
    
    allExistingRoles.forEach(role => {
      const workers = role.assignedWorkers || [];
      workers.forEach(worker => {
        if (worker.color) {
          usedColors.add(worker.color);
        }
      });
      if (role.color) {
        usedColors.add(role.color);
      }
    });
    
    const currentWorkers = formData.assignedWorkers || [];
    currentWorkers.forEach(worker => {
      if (worker.color) {
        usedColors.add(worker.color);
      }
    });
    
    const availableColor = CALENDAR_COLORS.find(color => !usedColors.has(color.color));
    return availableColor || CALENDAR_COLORS[0];
  }, [profileData, formData.assignedWorkers]);

  useEffect(() => {
    if (!editingRole && isOpen && formData.workerType && formData.workerType !== 'none') {
      const isInitialSelection = previousWorkerTypeRef.current === null;
      const workerTypeChanged = previousWorkerTypeRef.current !== null && 
                                previousWorkerTypeRef.current !== formData.workerType;
      const workerTypeOtherChanged = formData.workerType === 'other' && 
                                     previousWorkerTypeOtherRef.current !== formData.workerTypeOther &&
                                     formData.workerTypeOther?.trim() !== '';

      if (isInitialSelection || workerTypeChanged || workerTypeOtherChanged) {
        const allExistingRoles = get(profileData, 'operationalSettings.workerRequirements') || [];
        const existingRole = allExistingRoles.find(role => {
          if (formData.workerType === 'other') {
            return role.workerType === 'other' && 
                   role.workerTypeOther === formData.workerTypeOther &&
                   formData.workerTypeOther?.trim() !== '';
          }
          return role.workerType === formData.workerType && role.workerType !== 'other';
        });

        if (existingRole) {
          const existingWorkers = existingRole.assignedWorkers || [];
          const mergedWorkers = existingWorkers.map(worker => ({
            ...worker,
            id: worker.id || Date.now().toString() + Math.random()
          }));

          setFormData(prev => ({
            ...prev,
            assignedWorkers: mergedWorkers,
            appliesToAllDays: existingRole.appliesToAllDays || prev.appliesToAllDays,
            specificDays: existingRole.specificDays || prev.specificDays
          }));

          if (mergedWorkers.length > 0) {
            const firstWorkerColor = mergedWorkers[0].color || CALENDAR_COLORS[0].color;
            setSelectedHeaderColor(firstWorkerColor);
          }
        } else {
          setFormData(prev => ({
            ...prev,
            assignedWorkers: [],
            appliesToAllDays: false,
            specificDays: []
          }));
          
          setSelectedHeaderColor(null);
          setShowWorkerSelect(null);
        }
      }

      previousWorkerTypeRef.current = formData.workerType;
      previousWorkerTypeOtherRef.current = formData.workerTypeOther;
    } else if (!isOpen) {
      previousWorkerTypeRef.current = null;
      previousWorkerTypeOtherRef.current = null;
    }
  }, [formData.workerType, formData.workerTypeOther, editingRole, isOpen, profileData, getUnusedColor]);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!isOpen || !selectedWorkspace?.facilityId) return;
      
      setLoadingTeamMembers(true);
      try {
        const facilityRef = doc(db, 'facilityProfiles', selectedWorkspace.facilityId);
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
                  email: professionalData.contact?.primaryEmail || '',
                  isAdmin: admins.includes(userId)
                };
              } else {
                const userRef = doc(db, 'users', userId);
                const userSnap = await getDoc(userRef);
                
                if (userSnap.exists()) {
                  const userData = userSnap.data();
                  return {
                    uid: userId,
                    firstName: userData.firstName || '',
                    lastName: userData.lastName || '',
                    email: userData.email || '',
                    isAdmin: admins.includes(userId)
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
    
    if (isOpen && formData.workerType && formData.workerType !== 'none') {
      fetchTeamMembers();
    }
  }, [isOpen, selectedWorkspace?.facilityId, formData.workerType]);

  useEffect(() => {
    const workers = formData.assignedWorkers || [];
    if (workers.length > 0) {
      const firstWorkerWithColor = workers.find(w => w.color) || workers[0];
      if (firstWorkerWithColor && firstWorkerWithColor.color) {
        setSelectedHeaderColor(firstWorkerWithColor.color);
      }
    } else if (!editingRole) {
      setSelectedHeaderColor(null);
    }
  }, [formData.assignedWorkers, editingRole]);

  const openingHours = useMemo(() => {
    const hours = get(profileData, 'operationalSettings.standardOpeningHours') || {};
    return DAYS_OF_WEEK.map(day => {
      const dayValue = hours[day.key] || '';
      const isClosed = dayValue === 'closed' || dayValue === '';
      let openingTime = '08:00';
      let closingTime = '18:00';

      if (!isClosed && dayValue.includes('-')) {
        const parts = dayValue.split('-');
        openingTime = parts[0]?.trim() || '08:00';
        closingTime = parts[1]?.trim() || '18:00';
      }

      return {
        ...day,
        isClosed,
        openingTime,
        closingTime,
        rawValue: dayValue
      };
    });
  }, [profileData]);

  const getWorkerTypeOptions = useCallback(() => {
    const options = [
      { value: 'none', label: t('operations.workerTypes.none', 'None') }
    ];
    return [...options, ...WORKER_TYPES.map(type => ({
      value: type.value,
      label: t(type.labelKey)
    }))];
  }, [t]);

  const getPharmacistOptions = useCallback(() => {
    const options = [
      { value: '', label: t('operations.selectPharmacistOrPlaceholder', 'Select Pharmacist or Enter Placeholder') }
    ];
    
    teamMembers.forEach(member => {
      const firstName = member.firstName || '';
      const lastName = member.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      options.push({
        value: member.uid,
        label: fullName || `${firstName}${lastName}` || 'Unknown'
      });
    });
    
    options.push({
      value: 'placeholder',
      label: t('operations.usePlaceholderName', 'Enter Placeholder Name')
    });
    
    return options;
  }, [teamMembers, t]);

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

  const handleAddWorker = useCallback(() => {
    if (!formData.workerType || formData.workerType === 'none') {
      setFieldErrors({ workerType: t('operations.workerTypeRequired', 'Role type is required') });
      showError(t('operations.workerTypeRequired', 'Role type is required'));
      return;
    }

    if (formData.workerType === 'other' && !formData.workerTypeOther?.trim()) {
      setFieldErrors({ workerTypeOther: t('operations.workerTypeOtherRequired', 'Role type name is required') });
      showError(t('operations.workerTypeOtherRequired', 'Role type name is required'));
      return;
    }

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
    setSelectedHeaderColor(workerColor.color);
    setShowWorkerSelect(newWorker.id);
  }, [formData.assignedWorkers, formData.workerType, formData.workerTypeOther, t, showError]);

  const handleRemoveWorker = useCallback((workerId) => {
    setFormData(prev => ({
      ...prev,
      assignedWorkers: (prev.assignedWorkers || []).filter(w => w.id !== workerId)
    }));
    setWorkerErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`${workerId}_workerId`];
      delete newErrors[`${workerId}_placeholderName`];
      if (Object.keys(newErrors).length === 1 && newErrors._general) {
        delete newErrors._general;
      }
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
            const updatedWorker = {
              ...worker,
              color: value,
              color1: colorOption?.color1 || value
            };
            setSelectedHeaderColor(value);
            return updatedWorker;
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
    const fieldErrs = {};
    let isValid = true;
    
    if (!formData.workerType || formData.workerType === 'none') {
      isValid = false;
      fieldErrs.workerType = t('operations.workerTypeRequired', 'Role type is required');
    }
    
    if (formData.workerType === 'other' && !formData.workerTypeOther?.trim()) {
      isValid = false;
      fieldErrs.workerTypeOther = t('operations.workerTypeOtherRequired', 'Role type name is required');
    }
    
    if (formData.workerType && formData.workerType !== 'none') {
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
    }
    
    setWorkerErrors(errors);
    setFieldErrors(fieldErrs);
    return isValid;
  }, [formData.assignedWorkers, formData.workerType, formData.workerTypeOther, t]);

  const validateInvitation = useCallback(() => {
    if (!formData.workerType || formData.workerType === 'none') {
      setFieldErrors({ workerType: t('operations.workerTypeRequired', 'Role type is required') });
      return false;
    }
    if (formData.workerType === 'other' && !formData.workerTypeOther?.trim()) {
      setFieldErrors({ workerTypeOther: t('operations.workerTypeOtherRequired', 'Role type name is required') });
      return false;
    }
    setFieldErrors({});
    return true;
  }, [formData.workerType, formData.workerTypeOther, t]);

  const handleGenerateInvitation = useCallback(async (workerId) => {
    if (!selectedWorkspace?.facilityId) {
      showError(t('operations.facilityRequired', 'Facility is required'));
      return;
    }

    if (!formData.workerType || formData.workerType === 'none') {
      setFieldErrors({ workerType: t('operations.workerTypeRequired', 'Role type is required') });
      showError(t('operations.workerTypeRequired', 'Role type is required'));
      return;
    }

    if (formData.workerType === 'other' && !formData.workerTypeOther?.trim()) {
      setFieldErrors({ workerTypeOther: t('operations.workerTypeOtherRequired', 'Role type name is required') });
      showError(t('operations.workerTypeOtherRequired', 'Role type name is required'));
      return;
    }

    setGeneratingInvitation(prev => ({ ...prev, [workerId]: true }));
    try {
      const currentRequirements = get(profileData, 'operationalSettings.workerRequirements') || [];
      let roleId;
      
      if (editingRole) {
        roleId = editingRole.id;
      } else {
        roleId = Date.now().toString();
      }

      const result = await generateFacilityRoleInvitation(
        selectedWorkspace.facilityId,
        roleId,
        formData.workerType,
        formData.workerTypeOther,
        workerId
      );

      if (result.success) {
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/invite/${result.invitationToken}`;
        setWorkerInvitations(prev => ({
          ...prev,
          [workerId]: {
            link,
            token: result.invitationToken
          }
        }));
        showSuccess(t('operations.invitationGenerated', 'Invitation link generated successfully'));
      } else {
        showError(result.error || t('operations.invitationGenerationFailed', 'Failed to generate invitation'));
      }
    } catch (error) {
      console.error('Error generating invitation:', error);
      showError(t('operations.invitationGenerationFailed', 'Failed to generate invitation'));
    } finally {
      setGeneratingInvitation(prev => ({ ...prev, [workerId]: false }));
    }
  }, [formData, profileData, selectedWorkspace, editingRole, t, showSuccess, showError]);

  const handleCopyLink = useCallback((link) => {
    navigator.clipboard.writeText(link);
    showSuccess(t('common.linkCopied', 'Link copied to clipboard'));
  }, [t, showSuccess]);

  const handleShareEmail = useCallback((link) => {
    const subject = encodeURIComponent(t('operations.invitationEmailSubject', 'Join our facility team'));
    const body = encodeURIComponent(t('operations.invitationEmailBody', `You've been invited to join our facility team. Click the link to accept: ${link}`));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }, [t]);

  const handleShareWhatsApp = useCallback((link) => {
    const text = encodeURIComponent(t('operations.invitationWhatsAppMessage', `You've been invited to join our facility team. Click here: ${link}`));
    window.open(`https://wa.me/?text=${text}`, '_blank');
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
    setFormData({
      workerType: 'none',
      workerTypeOther: '',
      assignedWorkers: [],
      appliesToAllDays: false,
      specificDays: []
    });
    setShowWorkerSelect(null);
    setWorkerErrors({});
    setWorkerInvitations({});
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
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-card rounded-xl shadow-xl max-w-[448px] w-full max-h-[600px] min-h-[600px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="p-6 border-b border-border flex items-center justify-between rounded-t-xl transition-colors shrink-0"
          style={{ 
            backgroundColor: selectedHeaderColor || 'transparent',
            borderBottomColor: selectedHeaderColor ? 'rgba(255, 255, 255, 0.2)' : undefined
          }}
        >
          <h3 
            className="text-xl font-semibold transition-colors"
            style={{ color: selectedHeaderColor ? '#ffffff' : undefined }}
          >
            {editingRole ? t('operations.editWorkerRequirement', 'Edit Facility Role') : t('operations.addWorkerRequirement')}
          </h3>
          <div className="flex items-center gap-2">
            {editingRole && onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                style={{ 
                  color: selectedHeaderColor ? '#ffffff' : undefined,
                  backgroundColor: selectedHeaderColor ? 'rgba(255, 255, 255, 0.1)' : undefined
                }}
                onMouseEnter={(e) => {
                  if (selectedHeaderColor) {
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedHeaderColor) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                aria-label="Delete"
              >
                <FiTrash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              style={{ 
                color: selectedHeaderColor ? '#ffffff' : undefined,
                backgroundColor: selectedHeaderColor ? 'rgba(255, 255, 255, 0.1)' : undefined
              }}
              onMouseEnter={(e) => {
                if (selectedHeaderColor) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedHeaderColor) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              aria-label="Close"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            <div className="mb-4">
              <DropdownField
                label={t('operations.workerType', 'Role Type')}
                options={getWorkerTypeOptions()}
                value={formData.workerType}
                onChange={(value) => handleUpdateField('workerType', value)}
                placeholder={t('operations.selectWorkerType')}
                required={true}
                error={fieldErrors.workerType}
              />
            </div>

            {formData.workerType === 'other' && (
              <div className="mb-4">
                <InputField
                  label={t('operations.workerTypeOther')}
                  type="text"
                  value={formData.workerTypeOther || ''}
                  onChange={(e) => handleUpdateField('workerTypeOther', e.target.value)}
                  placeholder={t('operations.workerTypeOtherPlaceholder')}
                  required={true}
                  error={fieldErrors.workerTypeOther}
                />
              </div>
            )}

            {formData.workerType && formData.workerType !== 'none' && (
            <div className="mb-4">
              {(() => {
                const allWorkers = formData.assignedWorkers || [];
                const assignedWorkers = allWorkers.filter(worker => worker.workerId || worker.placeholderName);
                const newWorkers = allWorkers.filter(worker => !worker.workerId && !worker.placeholderName && showWorkerSelect === worker.id);
                
                return (
                  <>
                    {assignedWorkers.length > 0 && (
                      <div className="space-y-2 mb-4">
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
                  <div key={worker.id} className="space-y-2">
                    <div 
                      className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card/50"
                    >
                      <ColorPicker
                        color={worker.color}
                        color1={worker.color1}
                        onChange={(color, color1) => handleUpdateWorker(worker.id, 'color', color)}
                        size={32}
                      />
                      <div className="flex-1">
                        {showWorkerSelect === worker.id || (!worker.workerId && !worker.placeholderName) ? (
                          <div className="space-y-2">
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
                          </div>
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
                        {(!worker.workerId || worker.workerId === 'placeholder') && (
                          <button
                            type="button"
                            onClick={() => handleGenerateInvitation(worker.id)}
                            disabled={generatingInvitation[worker.id] || !formData.workerType || formData.workerType === 'none' || (formData.workerType === 'other' && !formData.workerTypeOther?.trim())}
                            className="p-1 text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={(!formData.workerType || formData.workerType === 'none') ? t('operations.workerTypeRequired', 'Role type is required') : generatingInvitation[worker.id] ? t('operations.generatingInvitation', 'Generating...') : t('operations.generateInvitationLink', 'Generate Invitation Link')}
                          >
                            {generatingInvitation[worker.id] ? (
                              <FiLoader size={16} className="animate-spin" />
                            ) : (
                              <FiShare2 size={16} />
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveWorker(worker.id)}
                          className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {workerInvitations[worker.id] && (
                      <div className="p-3 border border-border rounded-lg bg-card/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-semibold">{t('operations.sendInvitation', 'Send Invitation')}</h5>
                          <button
                            onClick={() => setWorkerInvitations(prev => {
                              const next = { ...prev };
                              delete next[worker.id];
                              return next;
                            })}
                            className="p-1 text-muted-foreground hover:text-foreground"
                          >
                            <FiX size={12} />
                          </button>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <div className="p-2 bg-white rounded-lg">
                            <QRCodeSVG value={workerInvitations[worker.id].link} size={120} />
                          </div>
                          <InputField
                            type="text"
                            value={workerInvitations[worker.id].link}
                            readOnly
                            className="w-full text-xs"
                          />
                          <div className="flex gap-2 w-full">
                            <Button
                              onClick={() => handleCopyLink(workerInvitations[worker.id].link)}
                              variant="secondary"
                              className="flex-1 text-xs py-1"
                            >
                              <FiCopy size={12} className="mr-1" />
                              {t('common.copy', 'Copy')}
                            </Button>
                            <Button
                              onClick={() => handleShareEmail(workerInvitations[worker.id].link)}
                              variant="secondary"
                              className="flex-1 text-xs py-1"
                            >
                              <FiMail size={12} className="mr-1" />
                              {t('operations.shareEmail', 'Email')}
                            </Button>
                            <Button
                              onClick={() => handleShareWhatsApp(workerInvitations[worker.id].link)}
                              variant="secondary"
                              className="flex-1 text-xs py-1"
                            >
                              <FaWhatsapp size={12} className="mr-1" />
                              {t('operations.shareWhatsApp', 'WhatsApp')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
                        })}
                      </div>
                    )}
                    
                    {assignedWorkers.length > 0 && (
                      <div className="my-4 border-t border-border"></div>
                    )}
                    
                    <div className="space-y-2">
                      {assignedWorkers.length === 0 && (!formData.assignedWorkers || formData.assignedWorkers.length === 0 || (formData.assignedWorkers.every(w => !w.workerId && !w.placeholderName) && !showWorkerSelect)) && (
                        <div>
                          <p className="text-xs text-muted-foreground text-center py-2">
                            {t('operations.noWorkersAssigned', 'No workers assigned. Click "Add Worker" to assign.')}
                          </p>
                          {workerErrors._general && (
                            <p className="text-xs text-destructive text-center py-1">
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
                  <div key={worker.id} className="space-y-2">
                    <div 
                      className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card/50"
                    >
                      <ColorPicker
                        color={worker.color}
                        color1={worker.color1}
                        onChange={(color, color1) => handleUpdateWorker(worker.id, 'color', color)}
                        size={32}
                      />
                      <div className="flex-1">
                        <div className="space-y-2">
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
                                handleRemoveWorker(worker.id);
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
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleGenerateInvitation(worker.id)}
                          disabled={generatingInvitation[worker.id] || !formData.workerType || formData.workerType === 'none' || (formData.workerType === 'other' && !formData.workerTypeOther?.trim())}
                          className="p-1 text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={(!formData.workerType || formData.workerType === 'none') ? t('operations.workerTypeRequired', 'Role type is required') : generatingInvitation[worker.id] ? t('operations.generatingInvitation', 'Generating...') : t('operations.generateInvitationLink', 'Generate Invitation Link')}
                        >
                          {generatingInvitation[worker.id] ? (
                            <FiLoader size={16} className="animate-spin" />
                          ) : (
                            <FiShare2 size={16} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveWorker(worker.id)}
                          className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {workerInvitations[worker.id] && (
                      <div className="p-3 border border-border rounded-lg bg-card/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-semibold">{t('operations.sendInvitation', 'Send Invitation')}</h5>
                          <button
                            onClick={() => setWorkerInvitations(prev => {
                              const next = { ...prev };
                              delete next[worker.id];
                              return next;
                            })}
                            className="p-1 text-muted-foreground hover:text-foreground"
                          >
                            <FiX size={12} />
                          </button>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <div className="p-2 bg-white rounded-lg">
                            <QRCodeSVG value={workerInvitations[worker.id].link} size={120} />
                          </div>
                          <InputField
                            type="text"
                            value={workerInvitations[worker.id].link}
                            readOnly
                            className="w-full text-xs"
                          />
                          <div className="flex gap-2 w-full">
                            <Button
                              onClick={() => handleCopyLink(workerInvitations[worker.id].link)}
                              variant="secondary"
                              className="flex-1 text-xs py-1"
                            >
                              <FiCopy size={12} className="mr-1" />
                              {t('common.copy', 'Copy')}
                            </Button>
                            <Button
                              onClick={() => handleShareEmail(workerInvitations[worker.id].link)}
                              variant="secondary"
                              className="flex-1 text-xs py-1"
                            >
                              <FiMail size={12} className="mr-1" />
                              {t('operations.shareEmail', 'Email')}
                            </Button>
                            <Button
                              onClick={() => handleShareWhatsApp(workerInvitations[worker.id].link)}
                              variant="secondary"
                              className="flex-1 text-xs py-1"
                            >
                              <FaWhatsapp size={12} className="mr-1" />
                              {t('operations.shareWhatsApp', 'WhatsApp')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
                      })}
                      
                      <div className="mt-3">
                        <Button
                          onClick={handleAddWorker}
                          variant="secondary"
                          className="text-xs py-1 px-2"
                        >
                          <FiPlus className="w-3 h-3 mr-1" />
                          {t('operations.addWorker', 'Add Worker')}
                        </Button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
            )}
        </div>

        <div className="p-6 border-t border-border flex gap-3 justify-end shrink-0 bg-card rounded-b-xl">
          <Button 
            onClick={onClose} 
            variant="secondary"
            className="px-6 py-2.5 bg-white border-2 border-border text-foreground hover:bg-muted"
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button 
            onClick={handleSave} 
            variant="confirmation"
            className="px-6 py-2.5"
          >
            {t('common.save', 'Save')}
          </Button>
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
              className="px-6 py-4 border-t flex justify-end gap-3"
              style={{
                borderTopColor: 'var(--grey-2)',
                backgroundColor: 'var(--grey-1-light)'
              }}
            >
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              >
                {t('common:deleteConfirmation.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-destructive hover:bg-destructive/90 rounded-md shadow-sm transition-all hover:shadow-md active:scale-95"
              >
                {t('common:deleteConfirmation.delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AddFacilityRoleModal;

