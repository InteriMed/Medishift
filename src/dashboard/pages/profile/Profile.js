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
import { mergeOnboardingDocuments } from '../../utils/mergeOnboardingDocuments';
import { getAllMockData, getMockDataForTab } from './utils/mockProfileData';
import PersonalDetails from './professionals/components/PersonalDetails';
import ProfessionalBackground from './professionals/components/ProfessionalBackground';
import BillingInformation from './professionals/components/BillingInformation';
import ProfessionalDocumentUploads from './professionals/components/DocumentUploads';
import ProfessionalAccount from './professionals/components/Account';
import ProfessionalSettings from './professionals/components/Settings';
import FacilityDetails from './facilities/components/FacilityDetails';
import FacilityDocumentUploads from './facilities/components/DocumentUploads';
import FacilityAccount from './facilities/components/Account';
import FacilitySettings from './facilities/components/Settings';
import { cn } from '../../../utils/cn';

import { useProfileTutorial } from './hooks/useProfileTutorial';
import { useProfileConfig } from './hooks/useProfileConfig';
import { useProfileValidation } from './hooks/useProfileValidation';
import { useProfileDocumentProcessing } from './hooks/useProfileDocumentProcessing';
import { useProfileFormHandlers } from './hooks/useProfileFormHandlers';
import { calculateProfileCompleteness, isTabCompleted, isTabAccessible } from './utils/profileUtils';

console.log('[Profile] Module loaded');

export { calculateProfileCompleteness, isTabCompleted, isTabAccessible };

const Profile = () => {
    console.log('[Profile] Component render started');
    const { t } = useTranslation(['dashboardProfile', 'common', 'validation']);
    const { currentUser } = useAuth();
    const { showNotification } = useNotification();
    const navigate = useNavigate();
    const location = useLocation();
    const { setProfileCompletionStatus } = useDashboard();
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
    const { isTutorialActive, activeTutorial, stepData, onTabCompleted, maxAccessedProfileTab } = tutorial;

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

        let targetTab = activeTab || validTabIds[0];

        if (tabFromUrl && validTabIds.includes(tabFromUrl)) {
            const isAccessible = isTabAccessibleDuringTutorial(formData, tabFromUrl, profileConfig);
            if (isAccessible) {
                targetTab = tabFromUrl;
            } else {
                const firstAccessibleTab = validTabIds.find(id => isTabAccessibleDuringTutorial(formData, id, profileConfig)) || validTabIds[0];
                targetTab = firstAccessibleTab;
                if (tabFromUrl !== firstAccessibleTab) {
                    showNotification(t('validation:completePreviousSteps'), 'warning');
                }
            }
        } else if (location.pathname.endsWith('/profile') || location.pathname.endsWith('/profile/')) {
            targetTab = validTabIds.find(id => isTabAccessibleDuringTutorial(formData, id, profileConfig)) || validTabIds[0];
        }

        if (targetTab !== activeTab) {
            setActiveTab(targetTab);
        }
        const currentUrlEnd = location.pathname.substring(location.pathname.lastIndexOf('/') + 1);
        if (targetTab && targetTab !== currentUrlEnd) {
            navigate(`/dashboard/profile/${targetTab}`, { replace: true });
        }
    }, [location.pathname, profileConfig, formData, isLoadingConfig, isLoadingData, activeTab, navigate, showNotification, t]);

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
            isTutorialActive
        };

        const isFacility = formData.role === 'facility' || formData.role === 'company';

        switch (activeTab) {
            case 'personalDetails': return <PersonalDetails {...commonProps} onTriggerUpload={handleUploadButtonClick} />;
            case 'professionalBackground': return <ProfessionalBackground {...commonProps} />;
            case 'billingInformation': return <BillingInformation {...commonProps} />;
            case 'documentUploads': return <ProfessionalDocumentUploads {...commonProps} />;
            case 'facilityCoreDetails': return <FacilityDetails activeTab={activeTab} {...commonProps} />;
            case 'facilityLegalBilling': return <FacilityDetails activeTab={activeTab} {...commonProps} />;
            case 'facilityDocuments': return <FacilityDocumentUploads {...commonProps} />;
            case 'account':
                return isFacility ? <FacilityAccount {...commonProps} /> : <ProfessionalAccount {...commonProps} />;
            case 'subscription':
            case 'settings':
                return isFacility ? <FacilitySettings {...commonProps} /> : <ProfessionalSettings {...commonProps} />;
            default: return <div>{t('common.selectTab')}</div>;
        }
    };

    const completionPercentage = useMemo(() => calculateProfileCompleteness(formData, profileConfig), [formData, profileConfig]);

    // TUTORIAL-AWARE TAB ACCESSIBILITY (defined before use)
    const isTabAccessibleDuringTutorial = useCallback((data, tabId, config) => {
        // Normal accessibility check
        const normalAccessibility = isTabAccessible(data, tabId, config);
        
        // During tutorial, also check against maxAccessedProfileTab
        if (isTutorialActive && maxAccessedProfileTab) {
            const tabOrder = ['personalDetails', 'professionalBackground', 'billingInformation', 'documentUploads'];
            const maxIndex = tabOrder.indexOf(maxAccessedProfileTab);
            const requestedIndex = tabOrder.indexOf(tabId);
            
            // If requested tab is completed, allow access to next tab (max + 1)
            if (isTabCompleted(data, maxAccessedProfileTab, config)) {
                return normalAccessibility && requestedIndex <= maxIndex + 1;
            }
            
            // Otherwise, only allow up to maxAccessedProfileTab
            return normalAccessibility && requestedIndex <= maxIndex;
        }
        
        return normalAccessibility;
    }, [isTutorialActive, maxAccessedProfileTab]);

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
                "h-full flex flex-col overflow-hidden animate-in fade-in duration-500 [&_button]:!text-sm profile-page",
                isMobile && "overflow-y-hidden"
            )}>
                <div className={cn(
                    "shrink-0 w-full z-20 bg-white border-b border-border shadow-sm h-16 flex items-center",
                    isMobile ? "px-4" : "px-6"
                )}>
                    <div className="flex items-center justify-between gap-4 w-full">
                        <div 
                            className={cn(
                                "flex items-center gap-2 px-4 rounded-xl border-2 transition-colors",
                                subscriptionStatus === 'premium'
                                    ? "bg-primary/10 border-primary/30 text-primary"
                                    : "bg-muted/30 border-input text-muted-foreground"
                            )}
                            style={{ height: 'var(--boxed-inputfield-height)' }}
                        >
                            <span className="text-sm font-medium">
                                {t('dashboardProfile:subscription.status')}:
                            </span>
                            <span className="text-sm font-semibold">
                                {subscriptionStatus === 'premium'
                                    ? t('dashboardProfile:subscription.premium')
                                    : t('dashboardProfile:subscription.free')}
                            </span>
                        </div>

                        <div className="flex-1 flex justify-center">
                            <div className="relative" ref={autoFillButtonRef}>
                                <button
                                    onClick={handleAutoFillClick}
                                    disabled={isUploading || isAnalyzing}
                                    className={cn(
                                        "px-4 flex items-center justify-center gap-2 rounded-xl border-2 transition-all shrink-0",
                                        "bg-background border-input text-black hover:text-black hover:bg-muted/50 hover:border-muted-foreground/30",
                                        (isUploading || isAnalyzing) && "opacity-50 cursor-not-allowed",
                                        (isTutorialActive && stepData?.highlightUploadButton) && "tutorial-highlight"
                                    )}
                                    style={{ height: 'var(--boxed-inputfield-height)' }}
                                    data-tutorial="profile-upload-button"
                                >
                                    {isAnalyzing ? <LoadingSpinner size="sm" /> : <FiUpload className="w-4 h-4 text-black" />}
                                    <span className="text-sm font-medium text-black">
                                        {isAnalyzing
                                            ? t('dashboardProfile:documents.analyzing', 'Analyzing...')
                                            : t('dashboardProfile:documents.autofill', 'Auto Fill')
                                        }
                                    </span>
                                </button>
                            </div>
                            <UploadFile
                                ref={uploadInputRef}
                                onChange={handleFileUpload}
                                isLoading={isUploading}
                                progress={uploadProgress}
                                accept=".pdf,.doc,.docx,.jpg,.png"
                                label=""
                                className="hidden"
                            />
                        </div>

                        {formData && (
                            <div className="flex items-center gap-3 px-4 bg-muted/30 rounded-xl border-2 border-input" style={{ height: 'var(--boxed-inputfield-height)' }}>
                                <span className="text-sm font-medium text-muted-foreground">{t('dashboardProfile:profile.profileCompletion')}</span>
                                <div className="w-32 h-2.5 bg-muted rounded-full overflow-hidden shadow-inner">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 rounded-full"
                                        style={{ width: `${completionPercentage}%` }}
                                    ></div>
                                </div>
                                <span className="text-sm font-semibold text-foreground">{completionPercentage}%</span>
                            </div>
                        )}
                    </div>
                </div>

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
                                variant="primary"
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
                    "flex-1 flex min-h-0 relative",
                    isMobile ? "p-0 overflow-hidden" : "p-6 gap-6 overflow-visible"
                )}>
                    <div className={cn(
                        "dashboard-sidebar-container",
                        isMobile
                            ? cn(
                                "dashboard-sidebar-container-mobile",
                                showSidebar ? "translate-x-0" : "-translate-x-full"
                            )
                            : cn(
                                isProfileMenuCollapsed ? "w-[70px]" : "dashboard-sidebar-container-desktop"
                            )
                    )}>
                        {profileConfig && formData && (
                            <ProfileHeader
                                profile={formData}
                                config={profileConfig}
                                activeTab={activeTab}
                                onTabChange={handleTabChange}
                                isTabCompleted={(tabId) => isTabCompleted(formData, tabId, profileConfig)}
                                isTabAccessible={(data, tabId, config) => isTabAccessibleDuringTutorial(data, tabId, config)}
                                nextIncompleteSection={nextIncompleteTab}
                                highlightTabId={
                                    isTutorialActive && maxAccessedProfileTab 
                                        ? (isTabCompleted(formData, maxAccessedProfileTab, profileConfig) 
                                            ? getNextTab(maxAccessedProfileTab) 
                                            : maxAccessedProfileTab
                                        ) 
                                        : nextIncompleteTab
                                }
                                collapsed={isProfileMenuCollapsed}
                                onToggle={() => setIsProfileMenuCollapsed(!isProfileMenuCollapsed)}
                                onAutofill={handleAutofill}
                            />
                        )}
                    </div>

                    <div className={cn(
                        "dashboard-main-content custom-scrollbar overflow-y-auto",
                        isMobile && !showSidebar ? "translate-x-0 dashboard-main-content-mobile" : isMobile ? "translate-x-full dashboard-main-content-mobile" : "dashboard-main-content-desktop"
                    )} style={{ scrollbarGutter: 'stable' }}>
                        {renderLoadingOrError() || (
                            <div className="animate-in slide-in-from-bottom-2 duration-500 dashboard-main-inner h-full">
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
