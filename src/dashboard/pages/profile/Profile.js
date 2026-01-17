import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { get, set, cloneDeep, isEqual } from 'lodash';
import { FiUpload, FiFileText, FiZap } from 'react-icons/fi';

import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import useProfileData from '../../hooks/useProfileData';
import { useDashboard } from '../../contexts/DashboardContext';
import { useTutorial } from '../../contexts/TutorialContext';
import { useMobileView } from '../../hooks/useMobileView';
import { usePageMobile } from '../../contexts/PageMobileContext';

import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';
import Button from '../../../components/BoxedInputFields/Button';
import Dialog from '../../../components/Dialog/Dialog';
import UploadFile from '../../../components/BoxedInputFields/UploadFile';
import SimpleDropdown from '../../../components/BoxedInputFields/Dropdown-Field';
import ProfileHeader from './components/ProfileHeader'; // Is now our Sidebar
import { uploadFile } from '../../../services/storageService';
import { processDocumentWithAI, mergeExtractedData, getCachedExtractedData } from '../../../services/documentProcessingService';
import { mergeOnboardingDocuments } from '../../utils/mergeOnboardingDocuments';
import { getAllMockData, getMockDataForTab } from './utils/mockProfileData';

// --- Professional Profile Section Components ---
import PersonalDetails from './professionals/components/PersonalDetails';
import ProfessionalBackground from './professionals/components/ProfessionalBackground';
import BillingInformation from './professionals/components/BillingInformation';
import ProfessionalDocumentUploads from './professionals/components/DocumentUploads';
import ProfessionalSettings from './professionals/components/Settings';

// --- Facility Profile Section Components ---
import FacilityDetails from './facilities/components/FacilityDetails';
import FacilityDocumentUploads from './facilities/components/DocumentUploads';
import FacilitySettings from './facilities/components/Settings';

import { cn } from '../../../utils/cn';

// --- Helper Functions ---
export const calculateProfileCompleteness = (data, config) => {
    if (!data || !config?.tabs) return 0;
    const TABS_FOR_COMPLETENESS = config.tabs.map(t => t.id);
    const completedTabs = TABS_FOR_COMPLETENESS.filter(tabId => isTabCompleted(data, tabId, config));
    return TABS_FOR_COMPLETENESS.length > 0 ? Math.round((completedTabs.length / TABS_FOR_COMPLETENESS.length) * 100) : 0;
};

export const isTabCompleted = (profileData, tabId, config) => {
    if (!profileData || !config?.fields || !config.fields[tabId]) return false;
    const fieldsOrRules = config.fields[tabId];

    if (Array.isArray(fieldsOrRules)) {
        return fieldsOrRules.every(field => {
            if (!field.required) return true;
            if (field.dependsOn) {
                const dependentValue = get(profileData, field.dependsOn);
                if (field.dependsOnValue && !field.dependsOnValue.includes(dependentValue)) return true;
                if (field.dependsOnValueExclude && field.dependsOnValueExclude.includes(dependentValue)) return true;
            }
            const value = get(profileData, field.name);
            // Strict check for empty strings and null/undefined for required fields
            return value !== null && value !== undefined && String(value).trim() !== '';
        });
    }
    else if (typeof fieldsOrRules === 'object') {
        let isComplete = true;
        Object.entries(fieldsOrRules).forEach(([key, rules]) => {
            if (rules.required && rules.minItems > 0) {
                const list = get(profileData, key);
                if (!Array.isArray(list) || list.length < rules.minItems) {
                    isComplete = false;
                }
            }
        });
        return isComplete;
    }
    return true;
};

export const isTabAccessible = (profileData, tabId, config) => {
    if (!config?.tabs) return tabId === config?.tabs?.[0]?.id;
    const tabIndex = config.tabs.findIndex(t => t.id === tabId);
    if (tabIndex <= 0) return true;

    for (let i = 0; i < tabIndex; i++) {
        if (!isTabCompleted(profileData, config.tabs[i].id, config)) {
            return false;
        }
    }
    return true;
};

const Profile = () => {
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
        updateProfileData,
        initializeProfileDocument,
        refreshProfileData
    } = useProfileData();

    const [activeTab, setActiveTab] = useState('');
    const [formData, setFormData] = useState(null);
    const [profileConfig, setProfileConfig] = useState(null);
    const [isLoadingConfig, setIsLoadingConfig] = useState(false);
    const originalData = useRef(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [subscriptionStatus, setSubscriptionStatus] = useState('free');
    const [isProfileMenuCollapsed, setIsProfileMenuCollapsed] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);

    // Dialog states
    const [showConfirmTabDialog, setShowConfirmTabDialog] = useState(false);
    const [nextTabToNavigate, setNextTabToNavigate] = useState('');
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [showAutoFillDialog, setShowAutoFillDialog] = useState(false);
    const [showDocumentsView, setShowDocumentsView] = useState(false);
    const [selectedDocumentType, setSelectedDocumentType] = useState(null);

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [extractedData, setExtractedData] = useState(null);
    const [showAnalysisConfirmation, setShowAnalysisConfirmation] = useState(false);
    const [cachedData, setCachedData] = useState(null);

    // Load cached extracted data on mount
    useEffect(() => {
        const loadCachedData = async () => {
            if (currentUser?.uid) {
                // console.log('[Profile] Attempting to load cached data for user:', currentUser.uid);
                const cached = await getCachedExtractedData(currentUser.uid);
                // console.log('[Profile] Cached data result:', cached);
                if (cached) {
                    // console.log('[Profile] Setting cached extracted data');
                    setCachedData(cached);
                } else {
                    // console.log('[Profile] No cached data found or cache expired');
                }
            }
        };
        loadCachedData();
    }, [currentUser]);

    const autoFillButtonRef = useRef(null);

    const isFormModified = useMemo(() => {
        if (!originalData.current || !formData) return false;
        return !isEqual(originalData.current, formData);
    }, [formData]);

    // --- Initialization ---
    useEffect(() => {
        if (currentUser && !initialProfileData && !isLoadingData && !profileError) {
            initializeProfileDocument().then(success => {
                if (success) refreshProfileData();
            });
        }
    }, [currentUser, initialProfileData, isLoadingData, profileError, initializeProfileDocument, refreshProfileData]);

    // Handle profile tutorial start - only when user navigates here during main tutorial
    const { tutorialPassed, startTutorial, activeTutorial, completedTutorials, isTutorialActive, stepData, currentStep, isWaitingForSave, onTabCompleted } = useTutorial();
    const profileTutorialStartedRef = useRef(false);

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const uploadInputRef = useRef(null);
    const isProfessional = formData?.role === 'professional';


    useEffect(() => {
        // Start profile tutorial only if:
        // 1. User is logged in
        // 2. Profile data is loaded (formData exists)
        // 3. Global tutorial is not passed (user is in onboarding flow)
        // 4. ProfileTabs tutorial hasn't been completed yet
        // 5. Not already in the profileTabs tutorial
        // 6. Haven't already started the profile tutorial
        // 7. Either in dashboard tutorial or just navigated from it
        const shouldStartProfileTutorial =
            currentUser &&
            formData &&
            !tutorialPassed &&
            !completedTutorials?.profileTabs &&
            activeTutorial !== 'profileTabs' &&
            !profileTutorialStartedRef.current &&
            (activeTutorial === 'dashboard' || location.pathname.includes('/profile'));

        if (shouldStartProfileTutorial) {
            // Small delay to ensure navigation is complete
            const timer = setTimeout(() => {
                profileTutorialStartedRef.current = true;
                startTutorial('profileTabs');
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [tutorialPassed, activeTutorial, startTutorial, currentUser, formData, completedTutorials, isTutorialActive, location.pathname]);

    // Tutorial step syncing is handled by TutorialContext based on URL
    // Users can navigate freely to accessible tabs, tutorial follows their location


    useEffect(() => {
        if (initialProfileData?.profileType && initialProfileData?.role) {
            const role = initialProfileData.role;
            const type = initialProfileData.profileType;
            const loadConfig = async () => {
                setIsLoadingConfig(true);
                setProfileConfig(null);
                try {
                    let configModule;
                    if (role === 'professional') {
                        configModule = await import(`./professionals/configs/professionals-${type}.json`);
                    } else if (role === 'facility' || role === 'company') {
                        configModule = await import(`./facilities/configs/facility.json`);
                    } else {
                        throw new Error(`Unknown role: ${role}`);
                    }
                    setProfileConfig(configModule.default || configModule);
                    const deepCopiedData = cloneDeep(initialProfileData);
                    setFormData(deepCopiedData);
                    originalData.current = deepCopiedData;
                    setActiveTab(configModule?.default?.tabs?.[0]?.id || configModule?.tabs?.[0]?.id || '');
                } catch (e) {
                    console.error('[Profile] Error loading config:', e);
                    showNotification(t('errors.loadingConfig'), 'error');
                    setErrors({ _config: t('errors.loadingConfig') });
                } finally {
                    setIsLoadingConfig(false);
                }
            };
            loadConfig();
        }
    }, [initialProfileData, t, showNotification]);

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

    // --- Merge Onboarding Documents ---
    useEffect(() => {
        if (formData && currentUser && !formData._onboardingDocumentsMerged) {
            mergeOnboardingDocuments(formData, setFormData, currentUser);
        }
    }, [formData, currentUser]);


    // --- Navigation ---
    useEffect(() => {
        if (!profileConfig || !formData || isLoadingConfig || isLoadingData) return;
        const pathParts = location.pathname.split('/');
        const tabFromUrl = pathParts[pathParts.length - 1];
        const validTabIds = profileConfig.tabs.map(t => t.id);

        let targetTab = activeTab || validTabIds[0];

        if (tabFromUrl && validTabIds.includes(tabFromUrl)) {
            if (isTabAccessible(formData, tabFromUrl, profileConfig)) {
                targetTab = tabFromUrl;
            } else {
                targetTab = validTabIds.find(id => isTabAccessible(formData, id, profileConfig)) || validTabIds[0];
            }
        } else if (location.pathname.endsWith('/profile') || location.pathname.endsWith('/profile/')) {
            targetTab = validTabIds.find(id => isTabAccessible(formData, id, profileConfig)) || validTabIds[0];
        }

        if (targetTab !== activeTab) {
            setActiveTab(targetTab);
        }
        const currentUrlEnd = location.pathname.substring(location.pathname.lastIndexOf('/') + 1);
        if (targetTab && targetTab !== currentUrlEnd) {
            navigate(`/dashboard/profile/${targetTab}`, { replace: true });
        }
    }, [location.pathname, profileConfig, formData, isLoadingConfig, isLoadingData, activeTab, navigate]);

    // --- Form Handlers ---
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
    }, []);

    const handleArrayChange = useCallback((arrayName, newArray) => {
        setFormData(prev => ({ ...prev, [arrayName]: newArray }));
        setErrors(prevErrors => {
            const newErrors = { ...prevErrors };
            delete newErrors[arrayName];
            return newErrors;
        });
    }, []);

    const getNestedValue = useCallback((obj, path) => get(obj, path), []);

    const processAndFillProfile = useCallback(async (document) => {
        if (!document || !document.storageUrl) return;

        try {
            setIsAnalyzing(true);
            showNotification(t('dashboardProfile:documents.analyzing', 'Analyzing document...'), 'info');

            const docType = document.type || (isProfessional ? 'cv' : 'businessDocument');
            const mimeType = document.mimeType || document.fileType || 'application/pdf'; // Default to PDF if unknown

            const result = await processDocumentWithAI(document.storageUrl, docType, document.storagePath, mimeType);

            if (result.success && result.data) {
                setExtractedData(result.data);
                setCachedData(result.data);
                setShowAnalysisConfirmation(true);
            } else {
                throw new Error('Analysis failed or returned no data');
            }
        } catch (error) {
            console.error('[Profile] Error analyzing document:', error);
            showNotification(t('dashboardProfile:documents.analysisError', 'Failed to analyze document'), 'error');
        } finally {
            setIsAnalyzing(false);
        }
    }, [isProfessional, showNotification, t]);

    const handleCloseAutoFillDialog = useCallback(() => {
        setShowAutoFillDialog(false);
        setSelectedDocumentType(null);
    }, []);

    const handleFileUpload = useCallback(async (files) => {
        if (!files || files.length === 0 || !currentUser) return;

        if (!selectedDocumentType) {
            showNotification(t('dashboardProfile:documents.selectDocumentTypeFirst', 'Please select a document type first'), 'warning');
            return;
        }

        const file = files[0];
        setIsUploading(true);
        setUploadProgress(0);

        try {
            const userId = currentUser.uid;
            const docType = selectedDocumentType;
            const timestamp = Date.now();
            const fileExtension = file.name.split('.').pop();
            const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            const normalizedFileName = `${baseName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${timestamp}.${fileExtension}`;
            const path = isProfessional
                ? `documents/${userId}/${docType}/${normalizedFileName}`
                : `documents/facilities/${userId}/${docType}/${normalizedFileName}`;

            const downloadURL = await uploadFile(file, path, (progress) => {
                setUploadProgress(progress);
            });

            const fileMetadata = {
                documentId: `${docType}_${Date.now()}`,
                userId: userId,
                type: docType,
                category: docType,
                fileName: normalizedFileName,
                originalFileName: file.name,
                storageUrl: downloadURL,
                storagePath: path,
                fileSize: file.size,
                fileType: file.type || 'application/octet-stream',
                mimeType: file.type || 'application/octet-stream',
                uploadedAt: new Date().toISOString(),
                status: 'pending_verification'
            };

            if (!formData) return;

            const updatedFormData = cloneDeep(formData);

            const documentFieldConfig = profileConfig?.fields?.documentUploads?.find(f => f.docType === docType);
            const fieldName = documentFieldConfig?.name || (docType === 'cv' ? 'cvUrl' : 'verificationDocumentsProvided');

            if (docType === 'cv' || fieldName === 'cvUrl') {
                if (!updatedFormData.documents) {
                    updatedFormData.documents = {};
                }
                if (!updatedFormData.documents.cv) {
                    updatedFormData.documents.cv = [];
                }
                updatedFormData.documents.cv.push(fileMetadata);
            } else if (isProfessional) {
                const fieldPath = fieldName.includes('.') ? fieldName : `documents.${fieldName}`;
                const currentList = getNestedValue(updatedFormData, fieldPath) || [];
                set(updatedFormData, fieldPath, [...currentList, fileMetadata]);
            } else {
                if (!updatedFormData.verification) {
                    updatedFormData.verification = {};
                }
                if (!updatedFormData.verification.verificationDocumentsProvided) {
                    updatedFormData.verification.verificationDocumentsProvided = [];
                }
                updatedFormData.verification.verificationDocumentsProvided.push(fileMetadata);
            }

            setFormData(updatedFormData);

            // Persist to database
            try {
                await updateProfileData(updatedFormData);
                console.log('[Profile] Document metadata saved to database');
                showNotification(t('dashboardProfile:documents.uploadSuccess', 'Document uploaded successfully'), 'success');

                // Trigger Auto Fill Analysis
                setTimeout(() => {
                    handleCloseAutoFillDialog();
                    processAndFillProfile(fileMetadata);
                }, 500);
            } catch (dbError) {
                console.error('[Profile] Error saving document metadata to database:', dbError);
                showNotification(t('dashboardProfile:documents.uploadSuccessButSaveError', 'Document uploaded but failed to save metadata. Please try again.'), 'warning');
            }

            setIsUploading(false);
            setUploadProgress(0);
        } catch (error) {
            console.error('[Profile] Error uploading file:', error);
            setIsUploading(false);
            setUploadProgress(0);
            showNotification(t('dashboardProfile:documents.uploadError', 'Error uploading document'), 'error');
        }
    }, [currentUser, isProfessional, formData, profileConfig, selectedDocumentType, showNotification, t, updateProfileData, processAndFillProfile, handleCloseAutoFillDialog, getNestedValue]); // eslint-disable-line no-use-before-define

    const handleUploadButtonClick = useCallback(() => {
        if (uploadInputRef.current) {
            uploadInputRef.current.click();
        }
    }, []);

    const isTutorialStep1 = isTutorialActive && activeTutorial === 'profileTabs' && currentStep === 0;
    const isAutoFillDisabled = isTutorialStep1 && !isWaitingForSave;

    const handleAutoFillClick = useCallback(() => {
        if (isAutoFillDisabled) return;
        setSelectedDocumentType(null);
        setShowAutoFillDialog(true);
    }, [isAutoFillDisabled]);

    const handleCloseDocumentsView = useCallback(() => {
        setShowDocumentsView(false);
    }, []);

    const handleSelectDocument = useCallback((document) => {
        console.log('Selected document:', document);
        setShowDocumentsView(false);
        processAndFillProfile(document);
    }, [processAndFillProfile]);

    const applyExtractedData = useCallback(async () => {
        if (!extractedData || !formData) return;

        try {
            setIsSubmitting(true);

            const updatedFormData = mergeExtractedData(formData, extractedData);

            setFormData(updatedFormData);

            await updateProfileData(updatedFormData);

            showNotification(t('dashboardProfile:documents.autoFillSuccess', 'Profile auto-filled successfully!'), 'success');
            setShowAnalysisConfirmation(false);
            setExtractedData(null);
        } catch (error) {
            console.error('[Profile] Error applying extracted data:', error);
            showNotification(t('dashboardProfile:documents.autoFillError', 'Error updating profile'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    }, [extractedData, formData, updateProfileData, showNotification, t]);

    const handleFillEmptyFields = useCallback(() => {
        applyExtractedData();
    }, [applyExtractedData]);

    const cancelAnalysis = useCallback(() => {
        setShowAnalysisConfirmation(false);
        setExtractedData(null);
    }, []);

    const handleAutofill = useCallback((scope = 'all') => {
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
    }, [formData, activeTab, t, showNotification]);

    const availableDocuments = useMemo(() => {
        if (!formData) return [];
        const verificationDocs = getNestedValue(formData, 'verification.verificationDocuments') || [];
        const cvDocs = getNestedValue(formData, 'documents.cv') || [];
        const providedDocs = getNestedValue(formData, 'verification.verificationDocumentsProvided') || [];

        // Combine all document sources
        const allDocs = [...verificationDocs, ...cvDocs, ...providedDocs];

        return allDocs.filter(doc => doc && doc.storageUrl);
    }, [formData, getNestedValue]);

    const documentTypeOptions = useMemo(() => {
        if (!profileConfig) return [];

        const documentFields = profileConfig.fields?.documentUploads || [];
        return documentFields.map(field => {
            const label = field.labelKey
                ? t(`dashboardProfile:${field.labelKey}`, field.docType)
                : t(`dashboardProfile:documents.${field.docType}`, field.docType);
            return {
                value: field.docType,
                label: label,
                accept: field.accept || '.pdf,.doc,.docx,.jpg,.png'
            };
        });
    }, [profileConfig, t]);

    const selectedDocumentTypeConfig = useMemo(() => {
        if (!selectedDocumentType || !profileConfig) return null;
        return profileConfig.fields?.documentUploads?.find(f => f.docType === selectedDocumentType);
    }, [selectedDocumentType, profileConfig]);


    const handleUseCachedData = useCallback(() => {
        if (cachedData) {
            handleCloseAutoFillDialog();
            setExtractedData(cachedData);
            setShowAnalysisConfirmation(true);
        }
    }, [cachedData, handleCloseAutoFillDialog]);

    // --- Validation & Saving ---
    const validateCurrentTabData = useCallback(() => {
        if (!profileConfig || !formData) return false;
        const currentTabId = activeTab;
        const fieldsOrRules = profileConfig.fields[currentTabId];
        let isValid = true;
        const newErrors = {};

        const checkField = (fieldRule) => {
            const { name, required, dependsOn, dependsOnValue, dependsOnValueExclude, validationRules } = fieldRule;
            let isActuallyRequired = required;
            let shouldValidate = true;

            if (dependsOn) {
                const dependentValue = get(formData, dependsOn);
                let conditionMet = true;
                if (dependsOnValue && !dependsOnValue.includes(dependentValue)) conditionMet = false;
                if (dependsOnValueExclude && dependsOnValueExclude.includes(dependentValue)) conditionMet = false;
                if (!conditionMet) { isActuallyRequired = false; shouldValidate = false; }
            }

            const value = get(formData, name);
            // Strict check for required fields including whitespace-only strings
            if (isActuallyRequired && (value === null || value === undefined || String(value).trim() === '')) {
                isValid = false;
                set(newErrors, name, t('validation:required'));
                shouldValidate = false;
            }

            if (shouldValidate && value && validationRules) {
                if (validationRules.minLength && String(value).length < validationRules.minLength) {
                    isValid = false;
                    set(newErrors, name, t('validation:minLength', { count: validationRules.minLength }));
                } else if (validationRules.pattern) {
                    try {
                        const regex = new RegExp(validationRules.pattern);
                        if (!regex.test(String(value))) {
                            isValid = false;
                            set(newErrors, name, t(validationRules.patternErrorKey || 'validation:invalidFormat'));
                        }
                    } catch (e) { }
                }
            }
        };

        if (Array.isArray(fieldsOrRules)) {
            fieldsOrRules.forEach(checkField);
        } else if (typeof fieldsOrRules === 'object') {
            Object.entries(fieldsOrRules).forEach(([key, rules]) => {
                if (rules.required && rules.minItems > 0) {
                    const list = get(formData, key);
                    if (!Array.isArray(list) || list.length < rules.minItems) {
                        isValid = false;
                        set(newErrors, key, t('validation:minItemsRequired', { count: rules.minItems }));
                    }
                }
            });
        }
        setErrors(newErrors);
        return isValid;
    }, [activeTab, formData, profileConfig, t]);

    const handleSave = useCallback(async (options = {}) => {
        const { navigateToNextTab = false } = options;
        if (!currentUser || !formData) { showNotification(t('errors.notLoggedIn'), 'error'); return false; }
        const isDataValid = validateCurrentTabData();
        if (navigateToNextTab && !isDataValid) { showNotification(t('validation:errorFixFieldsBeforeContinuing'), 'warning'); return false; }

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

                if (isTutorialActive && activeTutorial === 'profileTabs') {
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
            } else { throw new Error("Profile update failed silently."); }
        } catch (err) {
            showNotification(err.message || t('validation:errorSavingProfile'), 'error');
            return false;
        } finally { setIsSubmitting(false); }
    }, [currentUser, formData, updateProfileData, validateCurrentTabData, showNotification, t, activeTab, profileConfig, navigate, setProfileCompletionStatus, isTutorialActive, activeTutorial, onTabCompleted]);

    const handleSaveAndContinue = useCallback(async () => {
        // handleSave already handles tutorial continuation logic
        // Just call it with navigateToNextTab
        await handleSave({ navigateToNextTab: true });
    }, [handleSave]);

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

    const handleTabChange = useCallback((tabId) => {
        if (tabId === activeTab) return;
        if (!isTabAccessible(formData, tabId, profileConfig)) { showNotification(t('validation:completePreviousSteps'), 'warning'); return; }
        if (isFormModified) { setNextTabToNavigate(tabId); setShowConfirmTabDialog(true); }
        else {
            navigate(`/dashboard/profile/${tabId}`);
            setErrors({});
            if (isMobile) {
                setShowSidebar(false);
            }
        }
    }, [isFormModified, activeTab, navigate, formData, profileConfig, showNotification, t, isMobile]);

    const confirmAndSwitchTab = useCallback(async () => {
        setShowConfirmTabDialog(false);
        const savedSuccessfully = await handleSave({ navigateToNextTab: false });
        navigate(`/dashboard/profile/${nextTabToNavigate}`);
        if (!savedSuccessfully) refreshProfileData();
    }, [handleSave, nextTabToNavigate, navigate, refreshProfileData]);

    const cancelTabSwitch = useCallback(() => { setShowConfirmTabDialog(false); setNextTabToNavigate(''); }, []);
    const handleCancelChanges = useCallback(() => { isFormModified ? setShowCancelDialog(true) : showNotification(t('common:noChangesToCancel'), 'info'); }, [isFormModified, showNotification, t]);
    const confirmCancelChanges = useCallback(() => { if (originalData.current) setFormData(cloneDeep(originalData.current)); setErrors({}); setShowCancelDialog(false); showNotification(t('common:changesDiscarded'), 'info'); }, [showNotification, t]);
    const declineCancelChanges = useCallback(() => { setShowCancelDialog(false); }, []);

    // --- Render Helpers ---
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
        const commonProps = { formData, config: profileConfig, errors, isSubmitting, onInputChange: handleInputChange, onArrayChange: handleArrayChange, onSaveAndContinue: handleSaveAndContinue, onCancel: handleCancelChanges, getNestedValue };

        // Determine if we should use facility components
        const isFacility = formData.role === 'facility' || formData.role === 'company';

        switch (activeTab) {
            // Professional Tabs
            case 'personalDetails': return <PersonalDetails {...commonProps} onTriggerUpload={handleUploadButtonClick} />;
            case 'professionalBackground': return <ProfessionalBackground {...commonProps} />;
            case 'billingInformation': return <BillingInformation {...commonProps} />;
            case 'documentUploads': return <ProfessionalDocumentUploads {...commonProps} />;

            // Facility Tabs
            case 'facilityCoreDetails': return <FacilityDetails activeTab={activeTab} {...commonProps} />;
            case 'facilityLegalBilling': return <FacilityDetails activeTab={activeTab} {...commonProps} />;
            case 'facilityDocuments': return <FacilityDocumentUploads {...commonProps} />;

            // Shared/Common Tabs using ID 'settings'
            case 'settings':
                return isFacility ? <FacilitySettings {...commonProps} /> : <ProfessionalSettings {...commonProps} />;

            default: return <div>{t('common.selectTab')}</div>;
        }
    };

    const completionPercentage = useMemo(() => calculateProfileCompleteness(formData, profileConfig), [formData, profileConfig]);

    const nextIncompleteTab = useMemo(() => {
        if (!profileConfig || !formData) return null;
        const tabs = profileConfig.tabs || [];
        for (const tab of tabs) {
            if (!isTabCompleted(formData, tab.id, profileConfig) && isTabAccessible(formData, tab.id, profileConfig)) {
                return tab.id;
            }
        }
        return null;
    }, [formData, profileConfig]);


    return (
        <div className={cn(
            "h-full flex flex-col overflow-hidden animate-in fade-in duration-500 [&_button]:!text-sm",
            isMobile && "overflow-y-hidden"
        )}>
            {/* 1. Top Bar - Enhanced Design - Normalized */}
            {/* 1. Top Bar - Enhanced Design - Normalized */}
            <div className={cn(
                "shrink-0 w-full z-20 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm h-16 flex items-center",
                isMobile ? "px-4" : "px-6"
            )}>
                <div className="flex items-center justify-between gap-4 w-full">
                    {/* Subscription Status - Top Left */}
                    <div className={cn(
                        "flex items-center gap-2 px-3 h-9 rounded-lg border transition-colors",
                        subscriptionStatus === 'premium'
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "bg-muted/30 border-border/50 text-muted-foreground"
                    )}>
                        <span className="text-xs font-medium">
                            {t('dashboardProfile:subscription.status')}:
                        </span>
                        <span className="text-sm font-semibold">
                            {subscriptionStatus === 'premium'
                                ? t('dashboardProfile:subscription.premium')
                                : t('dashboardProfile:subscription.free')}
                        </span>
                    </div>

                    {/* Upload Button - Centered */}
                    <div className="flex-1 flex justify-center">
                        <div className="relative" ref={autoFillButtonRef}>
                            <button
                                onClick={handleAutoFillClick}
                                disabled={isUploading || isAnalyzing || isAutoFillDisabled}
                                className={cn(
                                    "h-9 px-4 flex items-center justify-center gap-2 rounded-lg border transition-all shrink-0",
                                    "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                    (isUploading || isAnalyzing || isAutoFillDisabled) && "opacity-50 cursor-not-allowed"
                                )}
                                data-tutorial="profile-upload-button"
                            >
                                {isAnalyzing ? <LoadingSpinner size="sm" /> : <FiUpload className="w-4 h-4" />}
                                <span className="text-sm font-medium">
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

                    {/* Completion Status - Enhanced */}
                    {formData && (
                        <div className="flex items-center gap-3 px-3 h-9 bg-muted/30 rounded-lg border border-border/50">
                            <span className="text-xs font-medium text-muted-foreground">Profile Completion</span>
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
                        >
                            {t('common.cancel')}
                        </Button>
                        {cachedData && (
                            <Button
                                variant="primary"
                                onClick={handleUseCachedData}
                            >
                                {t('personalDetails.useExistingData', 'Use Existing Data')}
                            </Button>
                        )}
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
                        <div>
                            <SimpleDropdown
                                label={t('dashboardProfile:documents.selectDocumentType', 'Document Type')}
                                options={documentTypeOptions}
                                value={selectedDocumentType}
                                onChange={setSelectedDocumentType}
                                placeholder={t('dashboardProfile:documents.selectDocumentTypePlaceholder', 'Select document type...')}
                            />
                        </div>

                        <div className="mt-10">
                            <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(var(--foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                                {t('personalDetails.upload', 'Upload')}
                            </label>
                            <div className="relative">
                                <UploadFile
                                    onChange={handleFileUpload}
                                    isLoading={isUploading}
                                    progress={uploadProgress}
                                    accept={selectedDocumentTypeConfig?.accept || '.pdf,.doc,.docx,.jpg,.png'}
                                    label=""
                                    documentName={t('dashboardProfile:documents.clickToUpload', 'click to upload')}
                                    disabled={!selectedDocumentType}
                                />
                                {!isUploading && (
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <FiUpload className="text-primary/50" size={24} />
                                    </div>
                                )}
                            </div>
                            {!selectedDocumentType && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t('dashboardProfile:documents.selectDocumentTypeFirst', 'Please select a document type first')}
                                </p>
                            )}
                        </div>
                    </div>
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
                            disabled={isSubmitting}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleFillEmptyFields}
                            isLoading={isSubmitting}
                        >
                            {t('dashboardProfile:documents.fillEmptyFields', 'Fill Empty Fields')}
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

            {/* 2. Main Split Content */}
            <div className={cn(
                "flex-1 flex overflow-hidden min-h-0 relative",
                isMobile ? "p-0" : "p-4 gap-4"
            )}>
                {/* Left: Sidebar Navigation */}
                <div className={cn(
                    "flex flex-col transition-all duration-300 shrink-0",
                    isMobile
                        ? cn(
                            "absolute inset-0 z-10 bg-background overflow-y-auto",
                            showSidebar ? "translate-x-0" : "-translate-x-full"
                        )
                        : cn(
                            isProfileMenuCollapsed ? "w-[70px]" : "w-full md:w-[320px] lg:w-[360px]",
                            "overflow-hidden"
                        )
                )}>
                    {/* Re-using ProfileHeader as vertical sidebar */}
                    {profileConfig && formData && (
                        <ProfileHeader
                            profile={formData}
                            config={profileConfig}
                            activeTab={activeTab}
                            onTabChange={handleTabChange}
                            isTabCompleted={(tabId) => isTabCompleted(formData, tabId, profileConfig)}
                            isTabAccessible={(data, tabId, config) => isTabAccessible(data, tabId, config)}
                            nextIncompleteSection={nextIncompleteTab}
                            highlightTabId={stepData?.highlightTab || nextIncompleteTab}
                            collapsed={isProfileMenuCollapsed}
                            onToggle={() => setIsProfileMenuCollapsed(!isProfileMenuCollapsed)}
                            onAutofill={handleAutofill}
                        />
                    )}
                </div>

                {/* Right: Content Area (Form) */}
                <div className={cn(
                    "flex-1 flex flex-col bg-transparent relative min-w-0 min-h-0 transition-all duration-300 custom-scrollbar",
                    isMobile && !showSidebar ? "translate-x-0 overflow-y-auto" : isMobile ? "translate-x-full absolute inset-0 z-20 overflow-y-auto" : "overflow-y-auto"
                )} style={{ scrollbarGutter: 'stable' }}>
                    {renderLoadingOrError() || (
                        <div className="flex-1">
                            <div className="w-full">
                                <div className="animate-in slide-in-from-bottom-2 duration-500">
                                    {currentTabComponent()}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Dialogs */}
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
                                        <div className="shrink-0">
                                            {/* Button removed as per design change */}
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
                isOpen={showConfirmTabDialog}
                onClose={cancelTabSwitch}
                title={t('validation:confirmTabChangeTitle')}
                actions={<><Button onClick={cancelTabSwitch} variant="secondary">{t('common:cancel')}</Button><Button onClick={confirmAndSwitchTab} variant="confirmation">{t('common:saveAndContinue')}</Button></>}
            ><p>{t('validation:unsavedChangesWarningNavigate')}</p></Dialog>

            <Dialog
                isOpen={showCancelDialog}
                onClose={declineCancelChanges}
                title={t('validation:confirmCancelTitle')}
                messageType="warning"
                actions={<><Button onClick={declineCancelChanges} variant="secondary">{t('common:no')}</Button><Button onClick={confirmCancelChanges} variant="warning">{t('common:yesDiscard')}</Button></>}
            ><p>{t('validation:discardChangesWarning')}</p></Dialog>
        </div>
    );
};

export default Profile;