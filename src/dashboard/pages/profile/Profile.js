import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { cloneDeep } from 'lodash';
import { FiFileText, FiZap, FiUser, FiBriefcase, FiCreditCard, FiSettings, FiHome } from 'react-icons/fi';

import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import useProfileData from '../../hooks/useProfileData';
import { useDashboard } from '../../contexts/DashboardContext';
import { buildDashboardUrl, getWorkspaceIdForUrl } from '../../../config/routeUtils';

import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';
import Button from '../../../components/BoxedInputFields/Button';
import Dialog from '../../../components/Dialog/Dialog';
import UploadFile from '../../../components/BoxedInputFields/UploadFile';
import SimpleDropdown from '../../../components/BoxedInputFields/Dropdown-Field';
import PageHeader from '../../components/PageHeader/PageHeader';
import { mergeOnboardingDocuments } from '../../utils/mergeOnboardingDocuments';
import { getAllMockData, getMockDataForTab } from './utils/mockProfileData';
import PersonalDetails from './professionals/components/PersonalDetails';
import ProfessionalBackground from './professionals/components/ProfessionalBackground';
import BillingInformation from './professionals/components/BillingInformation';
import ProfessionalDocumentUploads from './professionals/components/DocumentUploads';
import ProfessionalAccount from './professionals/components/Account';
import ProfessionalSettings from './professionals/components/Settings';
import FacilityDetails from './facilities/components/FacilityDetails';
import FacilityBillingInformation from './facilities/components/BillingInformation';
import FacilityAccount from './facilities/components/Account';
import FacilitySettings from './facilities/components/Settings';
import OrganizationDetails from './organizations/components/OrganizationDetails';
import OrganizationBillingInformation from './organizations/components/OrganizationBillingInformation';
import OrganizationVerification from './organizations/components/OrganizationVerification';
import OrganizationAccount from './organizations/components/Account';
import { cn } from '../../../utils/cn';
import { WORKSPACE_TYPES } from '../../../utils/sessionAuth';
import { isAdminSync } from '../../../config/workspaceDefinitions';

import { useProfileConfig } from './hooks/useProfileConfig';
import { useProfileValidation } from './hooks/useProfileValidation';
import { useProfileDocumentProcessing } from './hooks/useProfileDocumentProcessing';
import { useProfileFormHandlers } from './hooks/useProfileFormHandlers';
import { calculateProfileCompleteness, isTabCompleted, isTabAccessible } from './utils/profileUtils';

export { calculateProfileCompleteness, isTabCompleted, isTabAccessible };

const Profile = () => {
    const { t } = useTranslation(['dashboardProfile', 'common', 'validation']);
    const { currentUser, userProfile } = useAuth();
    const { showNotification } = useNotification();
    const navigate = useNavigate();
    const location = useLocation();
    const { selectedWorkspace } = useDashboard();

    const {
        profileData: initialProfileData,
        isLoading: isLoadingData,
        error: profileError,
        updateProfileData
    } = useProfileData();


    const [activeTab, setActiveTab] = useState('');
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [windowWidth, setWindowWidth] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth;
        }
        return 1200;
    });
    const originalData = useRef(null);
    const autoFillButtonRef = useRef(null);

    const { profileConfig: baseProfileConfig, isLoadingConfig, formData, setFormData } = useProfileConfig(initialProfileData);

    const profileConfig = useMemo(() => {
        if (!baseProfileConfig || !userProfile) return baseProfileConfig;

        return baseProfileConfig;
    }, [baseProfileConfig, userProfile, selectedWorkspace, formData]);

    useEffect(() => {
        if (formData && profileConfig) {
            const deepCopiedData = cloneDeep(formData);
            originalData.current = deepCopiedData;
            const firstTabId = profileConfig?.tabs?.[0]?.id || '';
            if (firstTabId && !activeTab) {
                setActiveTab(firstTabId);
            }
        }
    }, [formData, profileConfig, activeTab]);

    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { errors, setErrors, validateCurrentTabData } = useProfileValidation(
        formData,
        profileConfig,
        activeTab,
        isLoadingConfig,
        isLoadingData
    );


    const [isSubmitting, setIsSubmitting] = useState(false);

    const isInOrganizationContext = location.pathname.includes('/organization') || location.pathname.includes('/facility');

    const {
        handleInputChange,
        handleArrayChange,
        handleBatchChange,
        getNestedValue,
        handleSave,
        handleSaveOnly,
        handleSaveAndContinue,
        handleCancelChanges,
        confirmCancelChanges,
        isFormModified
    } = useProfileFormHandlers(
        formData,
        setFormData,
        profileConfig,
        activeTab,
        setActiveTab,
        originalData,
        updateProfileData,
        validateCurrentTabData,
        setErrors,
        setIsSubmitting
    );

    const documentProcessing = useProfileDocumentProcessing(
        formData,
        profileConfig,
        setFormData,
        updateProfileData,
        validateCurrentTabData,
        getNestedValue
    );

    const {
        isUploading,
        uploadProgress,
        isAnalyzing,
        isSubmitting: isSubmittingDocument,
        extractedData,
        showAnalysisConfirmation,
        cachedData,
        selectedFile,
        selectedDocumentType,
        setSelectedDocumentType,
        documentTypeError,
        fileUploadError,
        showAutoFillDialog,
        showDocumentsView,
        uploadInputRef,
        handleFileUpload,
        handleAutoFillProcess,
        handleUploadButtonClick,
        handleAutoFillClick,
        handleCloseAutoFillDialog,
        handleCloseDocumentsView,
        handleSelectDocument,
        handleFillEmptyFields,
        cancelAnalysis,
        handleUseCachedData,
        availableDocuments,
        documentTypeOptions,
        selectedDocumentTypeConfig
    } = documentProcessing;

    useEffect(() => {
        if (formData && currentUser && !formData._onboardingDocumentsMerged) {
            mergeOnboardingDocuments(formData, setFormData, currentUser);
        }
    }, [formData, currentUser, setFormData]);


    useEffect(() => {
        if (!profileConfig || !formData || isLoadingConfig || isLoadingData) return;

        const searchParams = new URLSearchParams(location.search);
        const tabFromUrl = searchParams.get('tab');
        const validTabIds = profileConfig.tabs.map(t => t.id);

        if (tabFromUrl && validTabIds.includes(tabFromUrl) && tabFromUrl !== activeTab) {
            setActiveTab(tabFromUrl);
        } else if (!tabFromUrl && activeTab) {
            const pathParts = location.pathname.split('/').filter(Boolean);
            const profileIndex = pathParts.findIndex(part => part === 'profile');
            const tabFromPath = profileIndex >= 0 && profileIndex < pathParts.length - 1
                ? pathParts[profileIndex + 1]
                : null;

            if (tabFromPath && validTabIds.includes(tabFromPath) && tabFromPath !== activeTab) {
                setActiveTab(tabFromPath);
            }
        }
    }, [location.pathname, location.search, profileConfig, formData, isLoadingConfig, isLoadingData, activeTab]);

    const handleCancelClick = () => {
        const shouldShowDialog = handleCancelChanges();
        if (shouldShowDialog) {
            setShowCancelDialog(true);
        }
    };

    const handleConfirmCancel = () => {
        confirmCancelChanges();
        setShowCancelDialog(false);
    };

    const handleAutofill = (scope = 'all') => {
        if (!formData) return;

        let mockData;
        let successMsg;

        if (scope === 'current') {
            mockData = getMockDataForTab(activeTab);
            successMsg = t('dashboardProfile:common.autofillTabSuccess', 'Current tab populated with test data (Beta)');
        } else {
            mockData = getAllMockData();
            successMsg = t('dashboardProfile:common.autofillSuccess', 'Full profile populated with test data (Beta)');
        }

        setFormData(current => ({
            ...current,
            ...mockData
        }));
        showNotification(successMsg, 'success');
    };

    const isLoading = isLoadingData || isLoadingConfig;
    const isProfessional = initialProfileData?.role === 'professional';
    const renderLoadingOrError = () => {
        if (isLoading && !formData && !initialProfileData) return <LoadingSpinner />;
        if (profileError) return <div className="p-8 text-center text-red-500">{t('errors.loadingProfile')}: {profileError.message}</div>;
        if (!profileConfig && !isLoading && initialProfileData) return <div className="p-8 text-center text-red-500">{t('errors.loadingConfig')}</div>;
        if (!initialProfileData && !isLoading && !profileError) {
            return <div className="p-8 text-center text-red-500">{t('errors.loadingProfile', 'Failed to load profile data. Please refresh the page.')}</div>;
        }
        const isAdmin = isAdminSync(userProfile);
        const validRoles = ['professional', 'facility', 'company', 'organization'];
        if (initialProfileData && initialProfileData.role && !validRoles.includes(initialProfileData.role) && !isAdmin) {
            return <div className="p-8 text-center text-red-500">{t('errors.accessDenied')}</div>;
        }
        return null;
    };

    const currentTabComponent = () => {
        if (!profileConfig || !formData || !activeTab) return null;
        const commonProps = {
            formData,
            config: profileConfig,
            errors,
            isSubmitting,
            onInputChange: handleInputChange,
            onArrayChange: handleArrayChange,
            onBatchChange: handleBatchChange,
            onSaveAndContinue: handleSaveAndContinue,
            onSave: handleSaveOnly,
            onCancel: handleCancelClick,
            getNestedValue,
            validateCurrentTabData,
            completionPercentage,
            handleAutoFillClick,
            isUploading,
            isAnalyzing,
            autoFillButtonRef,
            uploadInputRef,
            handleFileUpload,
            uploadProgress
        };

        const isFacility = selectedWorkspace?.type === WORKSPACE_TYPES.TEAM;
        const isOrganization = selectedWorkspace?.type === 'organization' || initialProfileData?.role === 'organization';

        switch (activeTab) {
            case 'personalDetails': return <PersonalDetails {...commonProps} onTriggerUpload={handleUploadButtonClick} t={t} />;
            case 'professionalBackground': return <ProfessionalBackground {...commonProps} t={t} />;
            case 'billingInformation': return <BillingInformation {...commonProps} t={t} />;
            case 'documentUploads': return <ProfessionalDocumentUploads {...commonProps} t={t} />;
            case 'facilityCoreDetails': return <FacilityDetails activeTab={activeTab} {...commonProps} t={t} />;
            case 'facilityLegalBilling': return <FacilityBillingInformation {...commonProps} t={t} />;
            case 'organizationCoreDetails': return <OrganizationDetails activeTab={activeTab} {...commonProps} t={t} />;
            case 'organizationLegalBilling': return <OrganizationBillingInformation {...commonProps} t={t} />;
            case 'organizationVerification': return <OrganizationVerification {...commonProps} t={t} />;
            case 'account':
                if (isOrganization) return <OrganizationAccount {...commonProps} t={t} />;
                return isFacility ? <FacilityAccount {...commonProps} t={t} /> : <ProfessionalAccount {...commonProps} t={t} />;
            case 'subscription':
            case 'marketplace':
                return isFacility ? <FacilitySettings {...commonProps} t={t} /> : <ProfessionalSettings {...commonProps} t={t} />;
            default: return <div>{t('common.selectTab')}</div>;
        }
    };

    const completionPercentage = useMemo(() => calculateProfileCompleteness(formData, profileConfig), [formData, profileConfig]);

    const getIconForTab = useCallback((tabId) => {
        switch (tabId) {
            case 'personalDetails':
                return <FiUser className="w-4 h-4 shrink-0" />;
            case 'professionalBackground':
                return <FiBriefcase className="w-4 h-4 shrink-0" />;
            case 'billingInformation':
                return <FiCreditCard className="w-4 h-4 shrink-0" />;
            case 'documentUploads':
                return <FiFileText className="w-4 h-4 shrink-0" />;
            case 'facilityCoreDetails':
                return <FiUser className="w-4 h-4 shrink-0" />;
            case 'facilityLegalBilling':
                return <FiCreditCard className="w-4 h-4 shrink-0" />;
            case 'settings':
                return <FiBriefcase className="w-4 h-4 shrink-0" />;
            case 'marketplace':
                return <FiHome className="w-4 h-4 shrink-0" />;
            case 'account':
                return <FiSettings className="w-4 h-4 shrink-0" />;
            default:
                return <FiUser className="w-4 h-4 shrink-0" />;
        }
    }, []);

    const getSingleWordLabel = useCallback((labelKey) => {
        const fullLabel = t(labelKey);
        const firstWord = fullLabel.split(' ')[0];
        return firstWord;
    }, [t]);

    const getTabTitle = useCallback((tabId) => {
        if (!profileConfig) return '';
        const tab = profileConfig.tabs.find(t => t.id === tabId);
        if (tab) {
            return t(tab.labelKey, tab.id);
        }
        return '';
    }, [profileConfig, t]);

    const getTabSubtitle = useCallback((tabId) => {
        switch (tabId) {
            case 'personalDetails':
                return t('dashboardProfile:personalDetails.subtitle', 'Manage your personal information and contact details.');
            case 'professionalBackground':
                return t('dashboardProfile:professionalBackground.subtitle', 'Manage your work experience and education');
            case 'billingInformation':
                return t('dashboardProfile:billingInformation.subtitle', 'Manage your banking details and billing information for payments.');
            case 'documentUploads':
                return t('dashboardProfile:documents.subtitle', 'Securely upload and manage your required documents');
            case 'facilityCoreDetails':
                return t('dashboardProfile:facilityDetails.subtitle', 'Please ensure facility details are accurate and up to date.');
            case 'facilityLegalBilling':
                return t('dashboardProfile:billingInformation.subtitle', 'Manage your banking details and billing information for payments.');
            case 'marketplace':
            case 'settings':
                return t('dashboardProfile:settings.subtitle', 'Customize your platform experience, manage notifications, and control your account settings.');
            case 'account':
                return t('dashboardProfile:account.subtitle', 'Manage your subscription, password, and account settings.');
            default:
                return '';
        }
    }, [t]);

    const [showAutofillMenu, setShowAutofillMenu] = useState(false);
    const autofillMenuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (autofillMenuRef.current && !autofillMenuRef.current.contains(event.target)) {
                setShowAutofillMenu(false);
            }
        };
        if (showAutofillMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showAutofillMenu]);

    return (
        <>
            <div className={cn(
                "h-full flex flex-col animate-in fade-in duration-500 [&_button]:!text-sm profile-page"
            )} style={{ overflow: 'visible' }}>
                {isProfessional && !isInOrganizationContext ? (
                    <>
                        {!isInOrganizationContext && (
                            <PageHeader
                                title={activeTab ? getTabTitle(activeTab) : t('dashboardProfile:title', 'Profile')}
                                subtitle={activeTab ? getTabSubtitle(activeTab) : t('dashboardProfile:subtitle', 'Manage your profile information')}
                                actions={
                                    <div className="relative" ref={autofillMenuRef}>
                                        {showAutofillMenu && (
                                            <div className="absolute right-0 top-full mt-2 w-64 bg-white border-2 border-[var(--red-2)] rounded-lg shadow-xl z-[200000] animate-in slide-in-from-top-2 duration-200 overflow-hidden">
                                                <div className="px-4 py-3 bg-white border-b-2 border-[var(--red-2)] text-[var(--red-4)] flex gap-3 items-center">
                                                    <div className="flex-shrink-0">
                                                        <div className="w-8 h-8 rounded-full bg-[var(--red-2)]/20 flex items-center justify-center border-2 border-[var(--red-2)]">
                                                            <FiZap className="w-4 h-4 text-[var(--red-4)]" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-sm text-[var(--red-4)]">{t('dashboardProfile:common.autofillOptions')}</h4>
                                                    </div>
                                                </div>
                                                <div className="px-4 py-3 flex items-center justify-between gap-3">
                                                    <button
                                                        onClick={() => {
                                                            handleAutofill('current');
                                                            setShowAutofillMenu(false);
                                                        }}
                                                        className="flex-1 text-left px-4 py-2.5 text-sm text-[var(--red-4)]/90 hover:bg-[var(--red-2)]/10 transition-colors flex items-center gap-2 rounded"
                                                    >
                                                        <FiZap className="w-3.5 h-3.5 text-[var(--red-4)]" />
                                                        {t('dashboardProfile:common.fillCurrentTab')}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            handleAutofill('all');
                                                            setShowAutofillMenu(false);
                                                        }}
                                                        className="flex-1 text-right px-4 py-2.5 text-sm font-semibold text-[var(--red-4)] hover:bg-[var(--red-2)]/10 transition-colors flex items-center justify-end gap-2 rounded"
                                                    >
                                                        {t('dashboardProfile:common.fillAll')}
                                                        <FiZap className="w-3.5 h-3.5 text-[var(--red-4)]" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => setShowAutofillMenu(!showAutofillMenu)}
                                            data-tutorial="profile-upload-button"
                                            className={cn(
                                                "flex items-center gap-2 px-4 py-2 rounded-lg border border-border",
                                                "hover:bg-muted transition-colors",
                                                showAutofillMenu && "bg-muted/30"
                                            )}
                                            title={t('dashboardProfile:common.autofillOptions')}
                                        >
                                            <FiZap className="w-4 h-4" />
                                            <span className="text-sm font-medium">{t('dashboardProfile:common.betaFill')}</span>
                                        </button>
                                    </div>
                                }
                                variant="default"
                            />
                        )}

                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            {profileConfig && formData && (
                                <div className="shrink-0 pt-0">
                                    <div className="flex gap-2 border-b border-border overflow-x-auto max-w-[1400px] mx-auto px-6">
                                        {profileConfig.tabs.map((tab) => {
                                            const isTabCompletedValue = isTabCompleted(formData, tab.id, profileConfig);
                                            const isActive = activeTab === tab.id;
                                            const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);

                                            return (
                                                <button
                                                    key={tab.id}
                                                    onClick={async () => {
                                                        if (tab.id === activeTab) return;

                                                        if (isFormModified) {
                                                            const saveSuccess = await handleSave({ navigateToNextTab: false });
                                                            if (saveSuccess) {
                                                                setActiveTab(tab.id);
                                                                const profilePath = isInOrganizationContext
                                                                    ? 'organization/profile'
                                                                    : 'profile';
                                                                navigate(buildDashboardUrl(`${profilePath}?tab=${tab.id}`, workspaceId));
                                                            }
                                                        } else {
                                                            setActiveTab(tab.id);
                                                            const profilePath = isInOrganizationContext
                                                                ? 'organization/profile'
                                                                : 'profile';
                                                            navigate(buildDashboardUrl(`${profilePath}?tab=${tab.id}`, workspaceId));
                                                        }
                                                    }}
                                                    className={cn(
                                                        "px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap",
                                                        isActive
                                                            ? "border-primary text-primary"
                                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    {windowWidth >= 700 && getIconForTab(tab.id)}
                                                    <span>{getSingleWordLabel(tab.labelKey)}</span>
                                                    {isTabCompletedValue && (
                                                        <span className="text-green-500">✓</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 overflow-auto p-6">
                                {renderLoadingOrError() || (
                                    <div className="animate-in slide-in-from-bottom-2 duration-500 h-full">
                                        {currentTabComponent()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {!isInOrganizationContext && (
                            <PageHeader
                                title={activeTab ? getTabTitle(activeTab) : t('dashboardProfile:title', 'Profile')}
                                subtitle={activeTab ? getTabSubtitle(activeTab) : t('dashboardProfile:subtitle', 'Manage your profile information')}
                                actions={
                                    <div className="relative" ref={autofillMenuRef}>
                                        {showAutofillMenu && (
                                            <div className="absolute right-0 top-full mt-2 w-64 bg-white border-2 border-[var(--red-2)] rounded-lg shadow-xl z-[200000] animate-in slide-in-from-top-2 duration-200 overflow-hidden">
                                                <div className="px-4 py-3 bg-white border-b-2 border-[var(--red-2)] text-[var(--red-4)] flex gap-3 items-center">
                                                    <div className="flex-shrink-0">
                                                        <div className="w-8 h-8 rounded-full bg-[var(--red-2)]/20 flex items-center justify-center border-2 border-[var(--red-2)]">
                                                            <FiZap className="w-4 h-4 text-[var(--red-4)]" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-sm text-[var(--red-4)]">{t('dashboardProfile:common.autofillOptions')}</h4>
                                                    </div>
                                                </div>
                                                <div className="px-4 py-3 flex items-center justify-between gap-3">
                                                    <button
                                                        onClick={() => {
                                                            handleAutofill('current');
                                                            setShowAutofillMenu(false);
                                                        }}
                                                        className="flex-1 text-left px-4 py-2.5 text-sm text-[var(--red-4)]/90 hover:bg-[var(--red-2)]/10 transition-colors flex items-center gap-2 rounded"
                                                    >
                                                        <FiZap className="w-3.5 h-3.5 text-[var(--red-4)]" />
                                                        {t('dashboardProfile:common.fillCurrentTab')}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            handleAutofill('all');
                                                            setShowAutofillMenu(false);
                                                        }}
                                                        className="flex-1 text-right px-4 py-2.5 text-sm font-semibold text-[var(--red-4)] hover:bg-[var(--red-2)]/10 transition-colors flex items-center justify-end gap-2 rounded"
                                                    >
                                                        {t('dashboardProfile:common.fillAll')}
                                                        <FiZap className="w-3.5 h-3.5 text-[var(--red-4)]" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => setShowAutofillMenu(!showAutofillMenu)}
                                            data-tutorial="profile-upload-button"
                                            className={cn(
                                                "flex items-center gap-2 px-4 py-2 rounded-lg border border-border",
                                                "hover:bg-muted transition-colors",
                                                showAutofillMenu && "bg-muted/30"
                                            )}
                                            title={t('dashboardProfile:common.autofillOptions')}
                                        >
                                            <FiZap className="w-4 h-4" />
                                            <span className="text-sm font-medium">{t('dashboardProfile:common.betaFill')}</span>
                                        </button>
                                    </div>
                                }
                                variant="default"
                            />
                        )}

                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            {profileConfig && formData && (
                                <div className="shrink-0 pt-0">
                                    <div className="flex gap-2 border-b border-border overflow-x-auto max-w-[1400px] mx-auto px-6">
                                        {profileConfig.tabs.map((tab) => {
                                            const isTabCompletedValue = isTabCompleted(formData, tab.id, profileConfig);
                                            const isActive = activeTab === tab.id;
                                            const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);

                                            return (
                                                <button
                                                    key={tab.id}
                                                    onClick={async () => {
                                                        if (tab.id === activeTab) return;

                                                        if (isFormModified) {
                                                            const saveSuccess = await handleSave({ navigateToNextTab: false });
                                                            if (saveSuccess) {
                                                                setActiveTab(tab.id);
                                                                const profilePath = isInOrganizationContext
                                                                    ? 'organization/profile'
                                                                    : 'profile';
                                                                navigate(buildDashboardUrl(`${profilePath}?tab=${tab.id}`, workspaceId));
                                                            }
                                                        } else {
                                                            setActiveTab(tab.id);
                                                            const profilePath = isInOrganizationContext
                                                                ? 'organization/profile'
                                                                : 'profile';
                                                            navigate(buildDashboardUrl(`${profilePath}?tab=${tab.id}`, workspaceId));
                                                        }
                                                    }}
                                                    className={cn(
                                                        "px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap",
                                                        isActive
                                                            ? "border-primary text-primary"
                                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    {windowWidth >= 700 && getIconForTab(tab.id)}
                                                    <span>{getSingleWordLabel(tab.labelKey)}</span>
                                                    {isTabCompletedValue && (
                                                        <span className="text-green-500">✓</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 overflow-auto p-6">
                                {renderLoadingOrError() || (
                                    <div className="animate-in slide-in-from-bottom-2 duration-500 h-full">
                                        {currentTabComponent()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                <Dialog
                    isOpen={showAutoFillDialog}
                    onClose={handleCloseAutoFillDialog}
                    title={t('dashboardProfile:documents.autofill', 'Auto Fill')}
                    size="medium"
                    actions={
                        <div className="flex justify-between flex-nowrap gap-3 w-full">
                            <div className="flex gap-3">
                                <Button
                                    variant="secondary"
                                    onClick={handleCloseAutoFillDialog}
                                    disabled={isUploading}
                                >
                                    {t('common.cancel')}
                                </Button>
                            </div>
                            <div className="flex gap-3">
                                {cachedData && (
                                    <Button
                                        variant="primary"
                                        onClick={handleUseCachedData}
                                        disabled={isUploading}
                                    >
                                        {t('personalDetails.useExistingData', 'Use Existing Data')}
                                    </Button>
                                )}
                                <Button
                                    variant="success"
                                    onClick={handleAutoFillProcess}
                                    isLoading={isUploading}
                                    disabled={isUploading}
                                    data-tutorial="profile-upload-button"
                                >
                                    {t('dashboardProfile:documents.autofill', 'Auto Fill')}
                                </Button>
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        {cachedData && (
                            <div className="p-4 rounded-lg bg-primary/10 border-2 border-primary">
                                <div className="flex items-center gap-3 mb-2">
                                    <FiZap className="text-primary" size={18} />
                                    <div className="flex-1">
                                        <div className="font-semibold text-sm text-primary flex items-center gap-2">
                                            {t('personalDetails.useExistingData', 'Use Existing Data')}
                                            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                                                {t('common.cached', 'Cached')}
                                            </span>
                                        </div>
                                        <div className="text-xs text-primary/80 mt-1">
                                            {t('personalDetails.recentlyExtractedData', 'Recently extracted data available')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="pt-3">
                                <SimpleDropdown
                                    label={t('dashboardProfile:documents.selectDocumentType', 'Document Type')}
                                    options={documentTypeOptions}
                                    value={selectedDocumentType}
                                    onChange={(value) => {
                                        setSelectedDocumentType(value);
                                    }}
                                    placeholder={t('dashboardProfile:documents.selectDocumentTypePlaceholder', 'Select document type...')}
                                    error={documentTypeError}
                                />
                            </div>

                            <div className="mt-10">
                                <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(var(--foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                                    {t('personalDetails.upload', 'Upload')}
                                </label>
                                <UploadFile
                                    onChange={handleFileUpload}
                                    isLoading={isUploading}
                                    progress={uploadProgress}
                                    accept={selectedDocumentTypeConfig?.accept || '.pdf,.doc,.docx,.jpg,.png'}
                                    label=""
                                    documentName=""
                                    error={fileUploadError}
                                />
                                {selectedFile && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {t('dashboardProfile:documents.selectedFile', 'Selected file:')} {selectedFile.name}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="border-t border-border mt-12 pt-0"></div>
                    </div>
                </Dialog>

                <Dialog
                    isOpen={showAnalysisConfirmation}
                    onClose={cancelAnalysis}
                    title={t('dashboardProfile:documents.autoFillTitle', 'Auto Fill Profile?')}
                    actions={
                        <div className="flex justify-between flex-nowrap gap-3 w-full">
                            <div className="flex gap-3">
                                <Button
                                    variant="secondary"
                                    onClick={cancelAnalysis}
                                    disabled={isSubmittingDocument}
                                >
                                    {t('common.cancel')}
                                </Button>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="success"
                                    onClick={handleFillEmptyFields}
                                    isLoading={isSubmittingDocument}
                                >
                                    {t('dashboardProfile:documents.fillProfile', 'Fill Profile')}
                                </Button>
                            </div>
                        </div>
                    }
                >
                    <p className="mb-4">{t('dashboardProfile:documents.autoFillDescription', 'We have extracted information from your document. This will fill empty fields in your profile (Personal Details, Professional Background, etc.). Existing data will NOT be overwritten. Do you want to proceed?')}</p>
                    <div
                        className="p-4 rounded-lg border text-sm bg-primary/5 border-primary/20 text-secondary"
                    >
                        <p className="mb-2 font-medium">
                            {t('dashboardProfile:documents.extractedSummary', 'Extracted Data Summary:')}
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            {extractedData?.personalDetails?.identity?.legalFirstName &&
                                <li>{t('personalDetails.firstName')}: {extractedData.personalDetails.identity.legalFirstName}</li>}
                            {extractedData?.personalDetails?.identity?.legalLastName &&
                                <li>{t('personalDetails.lastName')}: {extractedData.personalDetails.identity.legalLastName}</li>}
                            {extractedData?.personalDetails?.contact?.primaryEmail &&
                                <li>{t('personalDetails.email')}: {extractedData.personalDetails.contact.primaryEmail}</li>}
                            {extractedData?.professionalBackground?.professionalSummary &&
                                <li className="mt-2">
                                    <span className="font-medium">{t('professionalBackground.summary', 'Professional Summary')}:</span>
                                    <p className="mt-1 italic">
                                        "{extractedData.professionalBackground.professionalSummary}"
                                    </p>
                                </li>}
                            {extractedData?.professionalBackground?.workExperience?.length > 0 &&
                                <li>{t('professionalBackground.experience')}: {extractedData.professionalBackground.workExperience.length} items</li>}
                        </ul>
                    </div>
                </Dialog>

                {showDocumentsView && (
                    <Dialog
                        isOpen={showDocumentsView}
                        onClose={handleCloseDocumentsView}
                        title={t('personalDetails.selectDocument', 'Select Document')}
                        size="small"
                    >
                        <div className="space-y-4">
                            {availableDocuments.length === 0 ? (
                                <div className="text-center py-12 animate-in fade-in duration-500">
                                    <div
                                        className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6 shadow-lg shadow-primary/15"
                                    >
                                        <FiFileText className="text-primary/60" size={36} />
                                    </div>
                                    <p className="text-muted-foreground text-base" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                                        {t('personalDetails.noDocumentsAvailable', 'No documents available. Please upload a document first.')}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                                    {availableDocuments.map((doc, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between gap-4 p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                                            onClick={() => handleSelectDocument(doc)}
                                        >
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                                    <FiFileText size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-sm truncate mb-1" style={{ color: 'hsl(var(--foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                                                        {doc.originalFileName || doc.fileName || `Document ${index + 1}`}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                                                        {doc.type && (
                                                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                                                {t(`dashboardProfile:documents.${doc.type}`, doc.type)}
                                                            </span>
                                                        )}
                                                        {doc.uploadedAt && (
                                                            <span>• {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <Button
                                    variant="secondary"
                                    onClick={handleCloseDocumentsView}
                                >
                                    {t('common.cancel')}
                                </Button>
                            </div>
                        </div>
                    </Dialog>
                )}
                <Dialog
                    isOpen={showCancelDialog}
                    onClose={() => setShowCancelDialog(false)}
                    title={t('validation:confirmCancelTitle')}
                    messageType="warning"
                    actions={<><Button onClick={() => setShowCancelDialog(false)} variant="secondary">{t('common:no')}</Button><Button onClick={handleConfirmCancel} variant="warning">{t('common:yesDiscard')}</Button></>}
                ><p>{t('validation:discardChangesWarning')}</p></Dialog>
            </div>

            {(isUploading || isAnalyzing) && createPortal(
                <div className="fixed inset-0 z-[200000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="flex flex-col items-center gap-4 p-8 bg-card rounded-lg shadow-2xl border border-border">
                        <LoadingSpinner size="large" />
                        <div className="text-center">
                            <p className="text-lg font-semibold text-foreground">
                                {isAnalyzing
                                    ? t('dashboardProfile:documents.analyzing', 'Analyzing...')
                                    : t('dashboardProfile:documents.uploading', 'Uploading...')
                                }
                            </p>
                            {isUploading && uploadProgress > 0 && (
                                <p className="text-sm text-muted-foreground mt-2">
                                    {uploadProgress}%
                                </p>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default Profile;
