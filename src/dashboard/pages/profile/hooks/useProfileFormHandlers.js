import { useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { get, set, cloneDeep, isEqual } from 'lodash';
import { useDashboard } from '../../../contexts/DashboardContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import { isTabCompleted, isTabAccessible } from '../utils/profileUtils';
import { isProfileTutorial } from '../../../../config/tutorialSystem';
import { getLocalStorageKey } from '../../../../config/keysDatabase';

export const useProfileFormHandlers = (
    formData,
    setFormData,
    profileConfig,
    activeTab,
    setActiveTab,
    originalData,
    updateProfileData,
    validateCurrentTabData,
    setErrors,
    isTutorialActive,
    activeTutorial,
    onTabCompleted,
    setIsSubmitting
) => {
    const { t } = useTranslation(['validation', 'common', 'dashboardProfile']);
    const navigate = useNavigate();
    const { setProfileCompletionStatus } = useDashboard();
    const { showNotification } = useNotification();
    const localSaveTimeoutRef = useRef(null);

    const isFormModified = useMemo(() => {
        if (!originalData.current || !formData) return false;
        return !isEqual(originalData.current, formData);
    }, [formData, originalData]);

    const saveToLocalStorage = useCallback((data) => {
        try {
            const localStorageKey = getLocalStorageKey('PROFILE_DRAFT', activeTab);
            localStorage.setItem(localStorageKey, JSON.stringify(data));
        } catch (error) {
            // Error saving to localStorage
        }
    }, [activeTab]);

    const handleInputChange = useCallback((name, value) => {
        setFormData(currentFormData => {
            const newFormData = cloneDeep(currentFormData);
            set(newFormData, name, value);
            
            if (localSaveTimeoutRef.current) {
                clearTimeout(localSaveTimeoutRef.current);
            }
            localSaveTimeoutRef.current = setTimeout(() => {
                saveToLocalStorage(newFormData);
                validateCurrentTabData(newFormData, activeTab, true);
                
                // Always check for completion during tutorial, even if validation fails (it might be partial)
                if (isTutorialActive && isProfileTutorial(activeTutorial)) {
                    const isCurrentTabComplete = isTabCompleted(newFormData, activeTab, profileConfig);
                    console.log('[useProfileFormHandlers] Input change check:', { activeTab, isCurrentTabComplete });
                    if (isCurrentTabComplete) {
                        onTabCompleted(activeTab, true);
                    }
                }
            }, 300);
            
            return newFormData;
        });
        setErrors(prevErrors => {
            const newErrors = cloneDeep(prevErrors);
            set(newErrors, name, undefined);
            return newErrors;
        });
    }, [setFormData, setErrors, saveToLocalStorage, validateCurrentTabData, activeTab, isTutorialActive, activeTutorial, profileConfig, onTabCompleted]);

    const handleArrayChange = useCallback((arrayName, newArray) => {
        setFormData(prev => ({ ...prev, [arrayName]: newArray }));
        setErrors(prevErrors => {
            const newErrors = { ...prevErrors };
            delete newErrors[arrayName];
            return newErrors;
        });
    }, [setFormData, setErrors]);

    const getNestedValue = useCallback((obj, path) => get(obj, path), []);

    const handleSave = useCallback(async (options = {}) => {
        const { navigateToNextTab = false } = options;
        if (!formData) {
            showNotification(t('errors.notLoggedIn'), 'error');
            return false;
        }
        const isDataValid = validateCurrentTabData();

        if (navigateToNextTab && !isDataValid) {
            showNotification(t('validation:errorFixFieldsBeforeContinuing'), 'warning');
            return false;
        }

        setIsSubmitting(true);
        try {
            let shouldUpdateProfileCompletionStatus = false;
            if (isDataValid) {
                const updatedFormData = cloneDeep(formData);
                const allTabsComplete = profileConfig.tabs.every(tab =>
                    tab.id === activeTab ? true : isTabCompleted(updatedFormData, tab.id, profileConfig)
                );
                shouldUpdateProfileCompletionStatus = allTabsComplete;
            }

            const updatedData = await updateProfileData(formData);
            if (updatedData) {
                originalData.current = cloneDeep(updatedData);
                setFormData(cloneDeep(updatedData));
                showNotification(t('validation:profileSaved'), 'success');
                if (shouldUpdateProfileCompletionStatus) await setProfileCompletionStatus(true);

                if (isTutorialActive && isProfileTutorial(activeTutorial)) {
                    // Force re-check of tab completion with updated data
                    const isCurrentTabComplete = isTabCompleted(updatedData, activeTab, profileConfig);
                    console.log('[useProfileFormHandlers] Save check:', { activeTab, isCurrentTabComplete });
                    if (isCurrentTabComplete) {
                        onTabCompleted(activeTab, true);
                    }
                }

                if (navigateToNextTab && isDataValid) {
                    const currentIndex = profileConfig.tabs.findIndex(t => t.id === activeTab);
                    const nextTab = profileConfig.tabs[currentIndex + 1];
                    if (nextTab) navigate(`/dashboard/profile/${nextTab.id}`);
                }
                return true;
            } else {
                throw new Error("Profile update failed silently.");
            }
        } catch (err) {
            showNotification(err.message || t('validation:errorSavingProfile'), 'error');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, updateProfileData, validateCurrentTabData, showNotification, t, activeTab, profileConfig, navigate, setProfileCompletionStatus, isTutorialActive, activeTutorial, onTabCompleted, setFormData, originalData, setIsSubmitting]);

    const handleSaveOnly = useCallback(async () => {
        await handleSave({ navigateToNextTab: false });
    }, [handleSave]);

    const handleSaveAndContinue = useCallback(async () => {
        await handleSave({ navigateToNextTab: true });
    }, [handleSave]);

    const handleTabChange = useCallback(async (tabId) => {
        if (tabId === activeTab) return;
        
        const tabOrder = profileConfig?.tabs?.map(t => t.id) || [];
        const currentIndex = tabOrder.indexOf(activeTab);
        const targetIndex = tabOrder.indexOf(tabId);
        const isGoingForward = targetIndex > currentIndex;
        
        if (isGoingForward) {
            const isCurrentTabValid = validateCurrentTabData(formData, activeTab, false);
            
            if (!isCurrentTabValid) {
                showNotification(t('validation:errorFixFieldsBeforeContinuing'), 'warning');
                return;
            }
            
            if (!isTabAccessible(formData, tabId, profileConfig)) {
                showNotification(t('validation:completePreviousSteps'), 'warning');
                return;
            }
        }
        
        if (isFormModified) {
            const saveSuccess = await handleSave({ navigateToNextTab: false });
            if (!saveSuccess) {
                return;
            }
        }
        
        navigate(`/dashboard/profile/${tabId}`);
    }, [isFormModified, activeTab, navigate, formData, profileConfig, showNotification, t, handleSave, validateCurrentTabData]);

    const handleCancelChanges = useCallback(() => {
        if (isFormModified) {
            return true;
        } else {
            showNotification(t('common:noChangesToCancel'), 'info');
            return false;
        }
    }, [isFormModified, showNotification, t]);

    const confirmCancelChanges = useCallback(() => {
        if (originalData.current) {
            setFormData(cloneDeep(originalData.current));
            setErrors({});
        }
        showNotification(t('common:changesDiscarded'), 'info');
    }, [setFormData, setErrors, showNotification, t, originalData]);

    return {
        handleInputChange,
        handleArrayChange,
        getNestedValue,
        handleSave,
        handleSaveOnly,
        handleSaveAndContinue,
        handleTabChange,
        handleCancelChanges,
        confirmCancelChanges,
        isFormModified
    };
};

