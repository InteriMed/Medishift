import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { cloneDeep } from 'lodash';
import { FiUpload, FiFileText, FiZap } from 'react-icons/fi';

import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import useProfileData from '../../hooks/useProfileData';
import { useDashboard } from '../../contexts/DashboardContext';
import { useMobileView } from '../../hooks/useMobileView';
import { usePageMobile } from '../../contexts/PageMobileContext';

import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';
import Button from '../../../components/BoxedInputFields/Button';
import Dialog from '../../../components/Dialog/Dialog';
import UploadFile from '../../../components/BoxedInputFields/UploadFile';
import SimpleDropdown from '../../../components/BoxedInputFields/Dropdown-Field';
import ProfileHeader from './components/ProfileHeader';
import PageHeader from '../../components/PageHeader/PageHeader';
import { buildDashboardUrl, getWorkspaceIdForUrl } from '../../utils/pathUtils';
import { mergeOnboardingDocuments } from '../../utils/mergeOnboardingDocuments';
import { getAllMockData, getMockDataForTab } from './utils/mockProfileData';
import PersonalDetails from './professionals/components/PersonalDetails';
import ProfessionalBackground from './professionals/components/ProfessionalBackground';
import BillingInformation from './professionals/components/BillingInformation';
import ProfessionalDocumentUploads from './professionals/components/DocumentUploads';
import ProfessionalAccount from './professionals/components/Account';
import ProfessionalSettings from './professionals/components/Settings';
import FacilityDetails from './facilities/components/FacilityDetails';
import FacilityAccount from './facilities/components/Account';
import FacilitySettings from './facilities/components/Settings';
import { cn } from '../../../utils/cn';
import { WORKSPACE_TYPES } from '../../../utils/sessionAuth';
import { TUTORIAL_IDS, PROFILE_TAB_IDS } from '../../../config/tutorialConfig';

import { useProfileTutorial } from './hooks/useProfileTutorial';
import { useProfileConfig } from './hooks/useProfileConfig';
import { useProfileValidation } from './hooks/useProfileValidation';
import { useProfileDocumentProcessing } from './hooks/useProfileDocumentProcessing';
import { useProfileFormHandlers } from './hooks/useProfileFormHandlers';
import { calculateProfileCompleteness, isTabCompleted, isTabAccessible } from './utils/profileUtils';

export { calculateProfileCompleteness, isTabCompleted, isTabAccessible };

const Profile = () => {
    const { t } = useTranslation(['dashboardProfile', 'common', 'validation']);
    const { currentUser } = useAuth();
    const { showNotification } = useNotification();
    const navigate = useNavigate();
    const location = useLocation();
    const { setProfileCompletionStatus, selectedWorkspace } = useDashboard();
    const isMobile = useMobileView();
    const pageMobileContext = usePageMobile();

    const {
        profileData: initialProfileData,
        isLoading: isLoadingData,
        error: profileError,
        updateProfileData
    } = useProfileData();


    const [activeTab, setActiveTab] = useState('');
    const [subscriptionStatus, setSubscriptionStatus] = useState('free');
    const [isProfileMenuCollapsed, setIsProfileMenuCollapsed] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const originalData = useRef(null);
    const autoFillButtonRef = useRef(null);

    const { profileConfig, isLoadingConfig, formData, setFormData } = useProfileConfig(initialProfileData);

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

    const { errors, setErrors, validateCurrentTabData } = useProfileValidation(
        formData,
        profileConfig,
        activeTab,
        isLoadingConfig,
        isLoadingData
    );

    const tutorial = useProfileTutorial(formData);
    const { isTutorialActive, activeTutorial, stepData, onTabCompleted, maxAccessedProfileTab, registerValidation } = tutorial;

    // Register validation for tutorial
    useEffect(() => {
        if (!registerValidation || !isTutorialActive) return;

        return registerValidation(TUTORIAL_IDS.PROFILE_TABS, () => {
            // Check if current tab is completed
            if (!activeTab || !formData) return false;
            const isComplete = isTabCompleted(formData, activeTab, profileConfig);
            return isComplete;
        });
    }, [registerValidation, isTutorialActive, activeTab, formData, isTabCompleted, profileConfig]);

    // TUTORIAL-AWARE TAB ACCESSIBILITY (moved down to ensure tutorial is initialized)
    const isTabAccessibleDuringTutorial = useCallback((data, tabId, config) => {
        // Normal accessibility check
        const normalAccessibility = isTabAccessible(data, tabId, config);

        // During tutorial, also check against maxAccessedProfileTab
        if (isTutorialActive && maxAccessedProfileTab) {
            const tabOrder = ['personalDetails', 'professionalBackground', 'billingInformation', 'documentUploads', 'account', 'settings'];
            const maxIndex = tabOrder.indexOf(maxAccessedProfileTab);
            const requestedIndex = tabOrder.indexOf(tabId);

            if (maxIndex === -1 || requestedIndex === -1) return normalAccessibility;

            // If requested tab is completed, allow access to next tab (max + 1)
            if (isTabCompleted(data, maxAccessedProfileTab, config)) {
                return normalAccessibility && requestedIndex <= maxIndex + 1;
            }

            // Otherwise, only allow up to maxAccessedProfileTab
            return normalAccessibility && requestedIndex <= maxIndex;
        }

        return normalAccessibility;
    }, [isTutorialActive, maxAccessedProfileTab]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
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
        isTutorialActive,
        activeTutorial,
        onTabCompleted,
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
        const fetchSubscriptionStatus = () => {
            if (formData) {
                const subscription = formData.platformSubscriptionPlan ||
                    formData.subscriptionTier ||
                    formData.subscription?.tier ||
                    'free';
                const isPremium = subscription &&
                    subscription !== 'free' &&
                    subscription !== 'starter' &&
                    subscription.toLowerCase() !== 'free';
                setSubscriptionStatus(isPremium ? 'premium' : 'free');
            } else if (initialProfileData) {
                const subscription = initialProfileData.platformSubscriptionPlan ||
                    initialProfileData.subscriptionTier ||
                    initialProfileData.subscription?.tier ||
                    'free';
                const isPremium = subscription &&
                    subscription !== 'free' &&
                    subscription !== 'starter' &&
                    subscription.toLowerCase() !== 'free';
                setSubscriptionStatus(isPremium ? 'premium' : 'free');
            }
        };
        fetchSubscriptionStatus();
    }, [formData, initialProfileData]);

    useEffect(() => {
        if (!profileConfig || !formData || isLoadingConfig || isLoadingData) return;

        const pathParts = location.pathname.split('/');
        const tabFromUrl = pathParts[pathParts.length - 1];
        const validTabIds = profileConfig.tabs.map(t => t.id);

        let targetTab = '';

        // If tab from URL is valid and accessible, use it
        if (tabFromUrl && validTabIds.includes(tabFromUrl)) {
            const isAccessible = isTabAccessibleDuringTutorial(formData, tabFromUrl, profileConfig);
            if (isAccessible) {
                targetTab = tabFromUrl;
            } else {
                // Fallback to first accessible tab if URL tab is locked by tutorial
                targetTab = validTabIds.find(id => isTabAccessibleDuringTutorial(formData, id, profileConfig)) || validTabIds[0];
                showNotification(t('validation:completePreviousSteps'), 'warning');
            }
        }
        // Otherwise, if it's the root profile page or an invalid tab for this config, default to first accessible
        else {
            targetTab = validTabIds.find(id => isTabAccessibleDuringTutorial(formData, id, profileConfig)) || validTabIds[0];
        }

        if (targetTab !== activeTab) {
            setActiveTab(targetTab);
        }

        const currentUrlEnd = location.pathname.substring(location.pathname.lastIndexOf('/') + 1);
        if (targetTab && targetTab !== currentUrlEnd) {
            const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);
            navigate(buildDashboardUrl(`/profile/${targetTab}`, workspaceId), { replace: true });
        }
    }, [location.pathname, profileConfig, formData, isLoadingConfig, isLoadingData, activeTab, navigate, showNotification, t, selectedWorkspace, isTabAccessibleDuringTutorial]);

    useEffect(() => {
        const setPageMobileState = pageMobileContext?.setPageMobileState;
        if (!setPageMobileState || typeof setPageMobileState !== 'function') {
            return;
        }
        if (isMobile && activeTab && !showSidebar) {
            const handleBack = () => {
                setActiveTab(profileConfig?.tabs?.[0]?.id || '');
                setShowSidebar(true);
            };
            setPageMobileState(true, handleBack);
        } else {
            setPageMobileState(false, null);
        }
    }, [isMobile, activeTab, showSidebar, profileConfig, pageMobileContext]);

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
    const renderLoadingOrError = () => {
        if (isLoading && !formData) return <LoadingSpinner />;
        if (profileError) return <div className="p-8 text-center text-red-500">{t('errors.loadingProfile')}: {profileError.message}</div>;
        if (!profileConfig && !isLoading && initialProfileData) return <div className="p-8 text-center text-red-500">{t('errors.loadingConfig')}</div>;
        const validRoles = ['professional', 'facility', 'company'];
        if (initialProfileData && initialProfileData.role && !validRoles.includes(initialProfileData.role)) {
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
            onSaveAndContinue: handleSaveAndContinue,
            onSave: handleSaveOnly,
            onCancel: handleCancelClick,
            getNestedValue,
            validateCurrentTabData,
            onTabCompleted,
            isTutorialActive,
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

        switch (activeTab) {
            case 'personalDetails': return <PersonalDetails {...commonProps} onTriggerUpload={handleUploadButtonClick} t={t} stepData={stepData} />;
            case 'professionalBackground': return <ProfessionalBackground {...commonProps} t={t} stepData={stepData} />;
            case 'billingInformation': return <BillingInformation {...commonProps} t={t} stepData={stepData} />;
            case 'documentUploads': return <ProfessionalDocumentUploads {...commonProps} t={t} stepData={stepData} />;
            case 'facilityCoreDetails': return <FacilityDetails activeTab={activeTab} {...commonProps} t={t} stepData={stepData} />;
            case 'facilityLegalBilling': return <FacilityDetails activeTab={activeTab} {...commonProps} t={t} stepData={stepData} />;
            case 'account':
                return isFacility ? <FacilityAccount {...commonProps} t={t} stepData={stepData} /> : <ProfessionalAccount {...commonProps} t={t} stepData={stepData} />;
            case 'subscription':
            case 'settings':
                return isFacility ? <FacilitySettings {...commonProps} t={t} stepData={stepData} /> : <ProfessionalSettings {...commonProps} t={t} stepData={stepData} />;
            default: return <div>{t('common.selectTab')}</div>;
        }
    };

    const completionPercentage = useMemo(() => calculateProfileCompleteness(formData, profileConfig), [formData, profileConfig]);


    const nextIncompleteTab = useMemo(() => {
        if (!profileConfig || !formData) return null;
        const tabs = profileConfig.tabs || [];
        for (const tab of tabs) {
            if (!isTabCompleted(formData, tab.id, profileConfig) && isTabAccessibleDuringTutorial(formData, tab.id, profileConfig)) {
                return tab.id;
            }
        }
        return null;
    }, [formData, profileConfig, isTabAccessibleDuringTutorial]);

    const getNextTab = useCallback((currentTabId) => {
        if (!profileConfig) return null;
        const tabs = profileConfig.tabs || [];
        const currentIndex = tabs.findIndex(t => t.id === currentTabId);
        if (currentIndex >= 0 && currentIndex < tabs.length - 1) {
            return tabs[currentIndex + 1].id;
        }
        return null;
    }, [profileConfig]);

    return (
        <>
            <div className={cn(
                "h-full flex flex-col animate-in fade-in duration-500 [&_button]:!text-sm profile-page"
            )} style={{ overflow: 'visible' }}>

                <Dialog
                    isOpen={showAutoFillDialog}
                    onClose={handleCloseAutoFillDialog}
                    title={t('dashboardProfile:documents.autofill', 'Auto Fill')}
                    size="medium"
                    actions={
                        <>
                            <Button
                                variant="secondary"
                                onClick={handleCloseAutoFillDialog}
                                disabled={isUploading}
                            >
                                {t('common.cancel')}
                            </Button>
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
                                variant="info"
                                onClick={handleAutoFillProcess}
                                isLoading={isUploading}
                                disabled={isUploading}
                            >
                                {t('dashboardProfile:documents.autofill', 'Auto Fill')}
                            </Button>
                        </>
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
                        <>
                            <Button
                                variant="secondary"
                                onClick={cancelAnalysis}
                                disabled={isSubmittingDocument}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleFillEmptyFields}
                                isLoading={isSubmittingDocument}
                            >
                                {t('dashboardProfile:documents.fillProfile', 'Fill Profile')}
                            </Button>
                        </>
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

                <div className={cn(
                    "flex-1 flex min-h-0 relative ml-4 my-4 overflow-visible",
                    isMobile ? "p-0" : "gap-6"
                )}>
                    <div
                        className={cn(
                            "dashboard-sidebar-container",
                            isMobile
                                ? cn(
                                    "dashboard-sidebar-container-mobile",
                                    showSidebar ? "translate-x-0" : "-translate-x-full"
                                )
                                : cn(
                                    isProfileMenuCollapsed ? "w-[70px]" : "dashboard-sidebar-container-desktop"
                                )
                        )}
                        style={{ overflow: 'visible' }}
                    >
                        {profileConfig && formData && (
                            <ProfileHeader
                                profile={formData}
                                config={profileConfig}
                                activeTab={activeTab}
                                onTabChange={handleTabChange}
                                isTabCompleted={(tabId) => isTabCompleted(formData, tabId, profileConfig)}
                                isTabAccessible={(data, tabId, config) => isTabAccessibleDuringTutorial(data, tabId, config)}
                                nextIncompleteSection={nextIncompleteTab}
                                highlightTabId={(() => {
                                    // During tutorial, highlight the first incomplete tab within accessible range
                                    // This ensures the highlight moves as tabs are completed
                                    if (isTutorialActive && maxAccessedProfileTab) {
                                        const tabOrder = ['personalDetails', 'professionalBackground', 'billingInformation', 'documentUploads', 'account', 'settings'];
                                        const maxIdx = tabOrder.indexOf(maxAccessedProfileTab);

                                        // Find first incomplete tab up to max accessible
                                        for (let i = 0; i <= maxIdx; i++) {
                                            const tab = tabOrder[i];
                                            if (!isTabCompleted(formData, tab, profileConfig)) {
                                                console.log('[Profile] highlightTabId: first incomplete tab', tab);
                                                return tab;
                                            }
                                        }

                                        // All accessible tabs complete - highlight max accessible
                                        const result = tabOrder[maxIdx];
                                        console.log('[Profile] highlightTabId: all complete, using max', result);
                                        return result;
                                    }

                                    return nextIncompleteTab;
                                })()}
                                collapsed={isProfileMenuCollapsed}
                                onToggle={() => setIsProfileMenuCollapsed(!isProfileMenuCollapsed)}
                                onAutofill={handleAutofill}
                            />
                        )}
                    </div>

                    <div className={cn(
                        "dashboard-main-content h-full",
                        isMobile && !showSidebar ? "translate-x-0 dashboard-main-content-mobile" : isMobile ? "translate-x-full dashboard-main-content-mobile" : ""
                    )} style={{ scrollbarGutter: 'stable', overflowY: 'auto', overflowX: 'hidden' }}>
                        {renderLoadingOrError() || (
                            <div className="animate-in slide-in-from-bottom-2 duration-500 h-full">
                                {currentTabComponent()}
                            </div>
                        )}
                    </div>
                </div>

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
