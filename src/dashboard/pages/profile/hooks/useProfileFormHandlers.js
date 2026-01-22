import { useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { get, set, cloneDeep, isEqual } from 'lodash';
import { useDashboard } from '../../../contexts/DashboardContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import { isTabCompleted, isTabAccessible } from '../utils/profileUtils';

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

    const isFormModified = useMemo(() => {
        if (!originalData.current || !formData) return false;
        return !isEqual(originalData.current, formData);
    }, [formData, originalData]);

    const handleInputChange = useCallback((name, value) => {
        setFormData(currentFormData => {
            const newFormData = cloneDeep(currentFormData);
            set(newFormData, name, value);
            return newFormData;
        });
        setErrors(prevErrors => {
            const newErrors = cloneDeep(prevErrors);
            set(newErrors, name, undefined);
            return newErrors;
        });
    }, [setFormData, setErrors]);

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

                if (isTutorialActive && (activeTutorial === 'profileTabs' || activeTutorial === 'facilityProfileTabs')) {
                    const isCurrentTabComplete = isTabCompleted(updatedData, activeTab, profileConfig);
                    if (isCurrentTabComplete) {
                        console.log('[Profile] Tab completed:', activeTab, '- notifying tutorial context');
                        onTabCompleted(activeTab, true);
                    } else {
                        console.log('[Profile] Tab saved but not complete yet:', activeTab);
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
        if (!isTabAccessible(formData, tabId, profileConfig)) {
            showNotification(t('validation:completePreviousSteps'), 'warning');
            return;
        }
        
        validateCurrentTabData();
        
        if (isFormModified) {
            await handleSave({ navigateToNextTab: false });
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

