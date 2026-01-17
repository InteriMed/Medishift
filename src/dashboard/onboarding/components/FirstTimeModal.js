import React, { useState, useEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import Button from '../../../components/BoxedInputFields/Button';
import SimpleDropdown from '../../../components/BoxedInputFields/Dropdown-Field';
import PersonnalizedInputField from '../../../components/BoxedInputFields/Personnalized-InputField';
import { useDropdownOptions } from '../../pages/profile/utils/DropdownListsImports';
import { useDashboard } from '../../contexts/DashboardContext';
import { useTutorial } from '../../contexts/TutorialContext';
import { FiBriefcase, FiSearch, FiCheck, FiArrowRight, FiHome, FiAlertTriangle, FiX, FiLink, FiHelpCircle, FiLoader } from 'react-icons/fi';
import GLNVerificationStep from './GLNVerificationStep';
import PhoneVerificationStep from './PhoneVerificationStep';

// Styles
const styles = {
  modalOverlay: "fixed inset-0 bg-white/10 backdrop-blur-md z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-300",
  modal: "bg-background border border-border rounded-xl shadow-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 font-sans [&_button]:!text-sm",
  modalHeader: "p-6 border-b border-border flex justify-between items-center bg-muted/20",
  twoColumnGrid: "grid grid-cols-1 gap-6",
  modalTitle: "text-xl font-semibold text-foreground",
  modalContent: "p-8 overflow-y-auto custom-scrollbar flex-1",
  modalFooter: "p-6 border-t border-border flex justify-end gap-4 items-center bg-muted/20",
  stepIndicator: "flex items-center space-x-2 mb-8 justify-center",
  stepDot: "w-2.5 h-2.5 rounded-full transition-all duration-300",
  cardGrid: "grid grid-cols-1 md:grid-cols-3 gap-4 mt-4",
  selectionCard: "p-6 rounded-xl border-2 transition-all duration-300 cursor-pointer flex flex-col items-center text-center hover:bg-muted/50 relative",
  switchGroup: "flex items-center justify-between space-x-4 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors",
  switchLabel: "text-sm font-medium",
  searchInput: "w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background focus:ring-2",
};

// Switch Component
const ToggleSwitch = ({ checked, onChange }) => (
  <div
    className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${checked ? '' : 'bg-gray-300 dark:bg-gray-600'}`}
    style={checked ? { backgroundColor: 'var(--color-logo-1)' } : {}}
    onClick={() => onChange(!checked)}
  >
    <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${checked ? 'translate-x-[20px]' : 'translate-x-0'}`} />
  </div>
);

ToggleSwitch.propTypes = {
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired
};

const FirstTimeModal = () => {
  const location = useLocation();
  const { t } = useTranslation(['dashboard', 'common', 'dashboardProfile']);
  const { currentUser } = useAuth();
  const { profileComplete } = useDashboard();
  const {
    startTutorial,
    showFirstTimeModal,
    isBusy,
    skipFirstTimeModal,
    setShowFirstTimeModal,
    onboardingType // 'professional' or 'facility'
  } = useTutorial();
  const { phonePrefixOptions } = useDropdownOptions();

  // Default role based on onboarding type
  const defaultRole = onboardingType === 'facility' ? 'company' : null;
  const [step, setStep] = useState(1); // 1: Legal, 2: Role, 3: Phone, 4: GLN Verification
  const [role, setRole] = useState(defaultRole); // 'worker' | 'company' | 'chain'
  const [isEmployed, setIsEmployed] = useState(false); // boolean - default to false
  const [belongsToFacility, setBelongsToFacility] = useState(false); // For Legal step
  const [phoneVerified, setPhoneVerified] = useState(false); // Track phone verification
  const [phoneData, setPhoneData] = useState({ phoneNumber: '', verified: false });
  const [accessTeam, setAccessTeam] = useState(null); // boolean
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [legalConsiderationsConfirmed, setLegalConsiderationsConfirmed] = useState(false);
  const [generalWorkingLawsConfirmed, setGeneralWorkingLawsConfirmed] = useState(false);
  const [chainMessage, setChainMessage] = useState('');
  const [chainPhonePrefix, setChainPhonePrefix] = useState('');
  const [chainPhoneNumber, setChainPhoneNumber] = useState('');

  const [hasGLN, setHasGLN] = useState(true);
  const [documentsReady, setDocumentsReady] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const actionTimeoutRef = useRef(null);
  const mountedRef = useRef(true);
  const glnVerificationRef = useRef(null);
  const verifyHandlerRef = useRef(null);


  // Helper function to check if user is in dashboard
  const isInDashboard = useMemo(() => {
    return location.pathname.includes('/dashboard');
  }, [location.pathname]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
    };
  }, []);

  // Reset role when onboarding type changes
  useEffect(() => {
    if (onboardingType === 'facility') {
      // For facility onboarding, default to 'company' role
      setRole('company');
    }
  }, [onboardingType]);

  useEffect(() => {
    const loadOnboardingProgress = async () => {
      if (!currentUser || !showFirstTimeModal) {
        setIsLoadingProgress(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const onboardingProgress = userData.onboardingProgress || {};

          // Get progress for the current onboarding type
          const typeProgress = onboardingProgress[onboardingType] || {};

          // Check if this type of onboarding is already completed
          if (typeProgress.completed) {
            console.log(`[FirstTimeModal] ${onboardingType} onboarding already completed, skipping load`);
            setIsLoadingProgress(false);
            return;
          }

          // Also check legacy fields for professional onboarding
          if (onboardingType === 'professional') {
            const isVerifiedProfile = !!userData.GLN_certified;
            const legacyCompleted = userData.onboardingCompleted || onboardingProgress.completed;
            if (isVerifiedProfile || legacyCompleted) {
              console.log('[FirstTimeModal] Professional onboarding already completed (legacy check)');
              setIsLoadingProgress(false);
              return;
            }
          }

          // Load saved progress for this onboarding type
          if (Object.keys(typeProgress).length > 0) {
            const { step: savedStep, role: savedRole, isEmployed: savedIsEmployed, accessTeam: savedAccessTeam, selectedCompany: savedCompany, legalConsiderationsConfirmed: savedLegalConfirmed, generalWorkingLawsConfirmed: savedGeneralWorkingLawsConfirmed, hasGLN: savedHasGLN, chainPhonePrefix: savedChainPhonePrefix, chainPhoneNumber: savedChainPhoneNumber } = typeProgress;

            console.log(`[FirstTimeModal] Loading saved ${onboardingType} progress:`, { savedStep, savedRole, savedIsEmployed });

            if (savedStep && savedStep >= 1 && savedStep <= 4) {
              setStep(savedStep);
            }
            if (savedRole) {
              setRole(savedRole);
            }
            if (typeProgress.belongsToFacility !== undefined) {
              setBelongsToFacility(typeProgress.belongsToFacility);
            }
            if (typeProgress.phoneVerified !== undefined) {
              setPhoneVerified(typeProgress.phoneVerified);
            }
            if (typeProgress.phoneData) {
              setPhoneData(typeProgress.phoneData);
            }
            if (savedIsEmployed !== undefined && savedIsEmployed !== null) {
              setIsEmployed(savedIsEmployed);
            }
            if (savedAccessTeam !== undefined && savedAccessTeam !== null) {
              setAccessTeam(savedAccessTeam);
            }
            if (savedCompany) {
              setSelectedCompany(savedCompany);
            }
            if (savedLegalConfirmed !== undefined) {
              setLegalConsiderationsConfirmed(savedLegalConfirmed);
            }
            if (savedGeneralWorkingLawsConfirmed !== undefined) {
              setGeneralWorkingLawsConfirmed(savedGeneralWorkingLawsConfirmed);
            }
            if (savedHasGLN !== undefined) {
              setHasGLN(savedHasGLN);
            }
            if (savedChainPhonePrefix) {
              setChainPhonePrefix(savedChainPhonePrefix);
            }
            if (savedChainPhoneNumber) {
              setChainPhoneNumber(savedChainPhoneNumber);
            }
          }
        }
      } catch (error) {
        console.error('Error loading onboarding progress:', error);
      } finally {
        setIsLoadingProgress(false);
      }
    };

    loadOnboardingProgress();
  }, [currentUser, showFirstTimeModal, onboardingType]);

  const saveOnboardingProgress = async (progressData) => {
    if (!currentUser) return;

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);

      // Save to the new nested structure based on onboarding type
      await updateDoc(userDocRef, {
        [`onboardingProgress.${onboardingType}`]: {
          ...progressData,
          chainPhonePrefix: chainPhonePrefix,
          chainPhoneNumber: chainPhoneNumber,
          updatedAt: new Date()
        },
        updatedAt: new Date()
      });
      console.log(`[FirstTimeModal] Saved ${onboardingType} onboarding progress:`, progressData);
    } catch (error) {
      console.error('Error saving onboarding progress:', error);
    }
  };

  const handleRoleChange = async (newRole) => {
    setRole(newRole);
    await saveOnboardingProgress({
      step,
      role: newRole,
      isEmployed,
      accessTeam,
      selectedCompany,
      legalConsiderationsConfirmed,
      generalWorkingLawsConfirmed,
      hasGLN
    });
  };

  const handleEmployedChange = async (newValue) => {
    setIsEmployed(newValue);
    if (newValue) {
      setAccessTeam(true);
      setGeneralWorkingLawsConfirmed(false);
    } else {
      setAccessTeam(false);
      setSelectedCompany(null);
      setLegalConsiderationsConfirmed(false);
    }
    await saveOnboardingProgress({
      step,
      role,
      isEmployed: newValue,
      accessTeam: newValue ? true : false,
      selectedCompany: newValue ? selectedCompany : null,
      legalConsiderationsConfirmed: newValue ? legalConsiderationsConfirmed : false,
      generalWorkingLawsConfirmed: newValue ? false : generalWorkingLawsConfirmed,
      hasGLN
    });
  };

  const handleAccessTeamChange = async (newValue) => {
    setAccessTeam(newValue);
    if (!newValue) {
      setSelectedCompany(null);
      setLegalConsiderationsConfirmed(false);
    }
    await saveOnboardingProgress({
      step,
      role,
      isEmployed,
      accessTeam: newValue,
      selectedCompany: newValue ? selectedCompany : null,
      legalConsiderationsConfirmed: newValue ? legalConsiderationsConfirmed : false,
      generalWorkingLawsConfirmed,
      hasGLN
    });
  };

  const handleCompanySelect = async (company) => {
    setSelectedCompany(company);
    setSearchQuery(company.name);
    await saveOnboardingProgress({
      step,
      role,
      isEmployed,
      accessTeam,
      selectedCompany: company,
      legalConsiderationsConfirmed,
      generalWorkingLawsConfirmed,
      hasGLN
    });
  };

  const handleLegalConfirmChange = async (confirmed) => {
    setLegalConsiderationsConfirmed(confirmed);
    await saveOnboardingProgress({
      step,
      role,
      isEmployed,
      accessTeam,
      selectedCompany,
      legalConsiderationsConfirmed: confirmed,
      generalWorkingLawsConfirmed,
      hasGLN
    });
  };

  const handleGeneralWorkingLawsConfirmChange = async (confirmed) => {
    setGeneralWorkingLawsConfirmed(confirmed);
    await saveOnboardingProgress({
      step,
      role,
      isEmployed,
      accessTeam,
      selectedCompany,
      legalConsiderationsConfirmed,
      generalWorkingLawsConfirmed: confirmed,
      hasGLN
    });
  };

  // Show modal if in dashboard and modal should be shown
  // Removed profileComplete requirement - tutorial should show regardless of profile completion
  if (!isInDashboard || !showFirstTimeModal) {
    return null;
  }

  if (isLoadingProgress) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[99999] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FiLoader className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading onboarding...</p>
        </div>
      </div>
    );
  }

  const handleNext = async () => {
    console.log('[FirstTimeModal] handleNext called, current step:', step);

    const maxStep = role === 'chain' ? 3 : 4;

    if (step < maxStep) {
      let newStep = step + 1;

      // SKIP LOGIC: Step 2 -> Step 4 if Step 3 (Phone) was already verified in previous attempt
      if (step === 2 && phoneVerified && role !== 'chain') {
        newStep = 4;
      }

      console.log('[FirstTimeModal] Advancing from step', step, 'to step', newStep);
      setStep(newStep);
      await saveOnboardingProgress({
        step: newStep,
        role,
        isEmployed,
        accessTeam,
        selectedCompany,
        legalConsiderationsConfirmed,
        generalWorkingLawsConfirmed,
        hasGLN,
        belongsToFacility,
        phoneVerified,
        phoneData
      });
    } else {
      console.log(`[FirstTimeModal] Step ${maxStep} completed, calling handleComplete`);
      handleComplete();
    }
  };

  const handleBack = async () => {
    if (step > 1) {
      let newStep = step - 1;

      // SKIP LOGIC: Step 4 -> Step 2 if Step 3 (Phone) was skipped
      if (step === 4 && phoneVerified && role !== 'chain') {
        newStep = 2;
      }

      setStep(newStep);

      await saveOnboardingProgress({
        step: newStep,
        role,
        isEmployed,
        accessTeam,
        selectedCompany,
        legalConsiderationsConfirmed,
        generalWorkingLawsConfirmed,
        hasGLN,
        belongsToFacility,
        phoneVerified,
        phoneData
      });
    }
  };

  const handleComplete = async () => {
    if (isProcessing || isBusy) return;
    setIsProcessing(true);

    try {
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);

        // Save completion to the nested structure based on onboarding type
        await updateDoc(userDocRef, {
          [`onboardingProgress.${onboardingType}`]: {
            completed: true,
            step: role === 'chain' ? 3 : 4,
            role,
            isEmployed,
            accessTeam,
            selectedCompany,
            legalConsiderationsConfirmed,
            hasGLN,
            chainPhonePrefix,
            chainPhoneNumber,
            completedAt: new Date()
          },
          // Also set legacy field for professional onboarding
          ...(onboardingType === 'professional' ? { onboardingCompleted: true } : {}),
          updatedAt: new Date()
        });

        console.log(`[FirstTimeModal] ${onboardingType} onboarding marked as completed`);
      }

      console.log(`Onboarding Data (${onboardingType}):`, { role, isEmployed, accessTeam, selectedCompany });

      // Close the modal first
      setShowFirstTimeModal(false);
      console.log('[FirstTimeModal] Modal closed, starting tutorial...');

      // Then start the tutorial after a short delay to ensure modal is closed
      actionTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          console.log('[FirstTimeModal] Starting tutorial');
          startTutorial('dashboard');
          setIsProcessing(false);
        }
      }, 500);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setIsProcessing(false);
    }
  };

  // Mock Company Search
  const companies = [
    { id: 1, name: "Acme Healthcare" },
    { id: 2, name: "Global Medics" },
    { id: 3, name: "City Hospital" },
    { id: 4, name: "MediCare Plus" },
  ];
  const filteredCompanies = companies.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 flex items-center justify-center mx-auto mb-2">
          <img
            src="/logo.png"
            alt="Interimed Logo"
            className="w-20 h-20 object-contain"
          />
        </div>
        <h2 className="text-2xl font-bold" style={{ color: onboardingType === 'facility' ? 'var(--color-logo-2)' : 'var(--color-logo-1)' }}>
          Legal Considerations
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Please review the following legal requirements and confirm your understanding.
        </p>
      </div>

      <div className="bg-muted/30 p-4 rounded-xl space-y-4 border border-border">
        <div className="flex items-center justify-between p-2">
          <span className="text-sm font-medium">I belong to a facility/organization</span>
          <ToggleSwitch
            checked={belongsToFacility}
            onChange={(val) => setBelongsToFacility(val)}
          />
        </div>

        <div className="text-sm text-foreground/80 leading-relaxed max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {belongsToFacility ? (
            <div className="space-y-4">
              <p className="font-semibold text-primary">Facility/Chain Legal Notice:</p>
              <p>As a facility representative, you are responsible for ensuring that all data provided is accurate and that you have the authority to act on behalf of the organization.</p>
              <p>Swiss labor laws regarding maximum working hours (LTr) and rest periods must be strictly observed when scheduling shifts. Employers share liability for labor law violations if they are aware of a worker's secondary employment.</p>
              <p>By proceeding, you agree to our Terms of Business and data processing agreements specifically tailored for healthcare facilities in Switzerland.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="font-semibold text-primary">Professional/Worker Legal Notice:</p>
              <p>Swiss Labor Law sets a strict maximum of 50 hours per week. If you work 100% (42h), taking extra shifts may be illegal without prior authorization.</p>
              <p>The Duty of Loyalty (Art. 321a CO) requires you to obtain written permission from your main employer to work for a competitor.</p>
              <p>You must alternate rest periods: 11 consecutive hours of rest are required between shifts. Working during paid holidays (vacation) is legally restricted to recovery purposes.</p>
              <p>By proceeding, you acknowledge that you are solely responsible for managing your working hours across different employers.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 bg-primary/5 p-4 rounded-lg border border-primary/20">
        <input
          type="checkbox"
          id="legal-confirm"
          checked={legalConsiderationsConfirmed}
          onChange={(e) => setLegalConsiderationsConfirmed(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <label htmlFor="legal-confirm" className="text-sm font-medium cursor-pointer">
          I have read and agree to the legal considerations described above.
        </label>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold">
          {onboardingType === 'facility'
            ? "What type of business are you setting up?"
            : "How do you plan to use MediShift?"}
        </h2>
        <p className="text-muted-foreground text-sm">
          {onboardingType === 'facility'
            ? "Select your business type to continue."
            : "Select the role that best marks your intentions."}
        </p>
      </div>

      <div className={`${styles.cardGrid} ${onboardingType === 'facility' ? 'md:grid-cols-2' : ''} ${role === 'chain' ? 'grid-cols-1' : ''}`}>
        {/* Only show Worker option for professional onboarding */}
        {onboardingType !== 'facility' && (
          <div
            onClick={() => handleRoleChange('worker')}
            className={`${styles.selectionCard} ${role === 'worker' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border'}`}
            style={role === 'worker' ? { borderColor: 'var(--color-logo-1)', backgroundColor: 'rgba(37, 99, 235, 0.05)', boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.2)' } : {}}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 text-white shadow-sm" style={{ backgroundColor: 'var(--color-logo-1)' }}>
              <FiBriefcase className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Worker</h3>
            <p className="text-sm text-muted-foreground">I want to work!</p>
          </div>
        )}

        <div
          onClick={() => handleRoleChange('company')}
          className={`${styles.selectionCard} ${role === 'company' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border'}`}
          style={role === 'company' ? { borderColor: onboardingType === 'facility' ? 'var(--color-logo-2)' : 'var(--color-logo-1)', backgroundColor: onboardingType === 'facility' ? 'rgba(15, 23, 42, 0.05)' : 'rgba(37, 99, 235, 0.05)', boxShadow: onboardingType === 'facility' ? '0 0 0 2px rgba(15, 23, 42, 0.2)' : '0 0 0 2px rgba(37, 99, 235, 0.2)' } : {}}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 text-white shadow-sm" style={{ backgroundColor: onboardingType === 'facility' ? 'var(--color-logo-2)' : 'var(--color-logo-1)' }}>
            <FiHome className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{onboardingType === 'facility' ? 'Single Facility' : 'Company'}</h3>
          <p className="text-sm text-muted-foreground">{onboardingType === 'facility' ? 'Set up one pharmacy/clinic' : 'I am recruiting!'}</p>
        </div>

        <div
          onClick={() => handleRoleChange('chain')}
          className={`${styles.selectionCard} ${role === 'chain' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border'}`}
          style={role === 'chain' ? { borderColor: onboardingType === 'facility' ? 'var(--color-logo-2)' : 'var(--color-logo-1)', backgroundColor: onboardingType === 'facility' ? 'rgba(15, 23, 42, 0.05)' : 'rgba(37, 99, 235, 0.05)', boxShadow: onboardingType === 'facility' ? '0 0 0 2px rgba(15, 23, 42, 0.2)' : '0 0 0 2px rgba(37, 99, 235, 0.2)' } : {}}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 text-white shadow-sm" style={{ backgroundColor: onboardingType === 'facility' ? 'var(--color-logo-2)' : 'var(--color-logo-1)' }}>
            <FiLink className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Chain</h3>
          <p className="text-sm text-muted-foreground">{onboardingType === 'facility' ? 'Register a chain of facilities' : 'I want to register a chain!'}</p>
        </div>
      </div>
    </div>
  );

  const handlePhoneComplete = async (data) => {
    setPhoneData(data);
    setPhoneVerified(true);

    // Save progress immediately
    await saveOnboardingProgress({
      step: 4,
      role,
      isEmployed,
      accessTeam,
      selectedCompany,
      legalConsiderationsConfirmed,
      generalWorkingLawsConfirmed,
      hasGLN,
      belongsToFacility,
      phoneVerified: true,
      phoneData: data
    });

    setStep(4);
  };

  const renderStep3 = () => {
    if (role === 'chain') {
      const handleSendEmail = () => {
        if (!chainMessage.trim() || !chainPhonePrefix || !chainPhoneNumber.trim()) return;

        const fullPhoneNumber = chainPhonePrefix ? `${chainPhonePrefix} ${chainPhoneNumber}` : chainPhoneNumber;
        const subject = encodeURIComponent('[URGENT] CHAIN - Executive Staff Setup Request');
        const body = encodeURIComponent(`
Name: ${currentUser?.displayName || 'N/A'}
Email: ${currentUser?.email || 'N/A'}
Phone: ${fullPhoneNumber || 'N/A'}
User ID: ${currentUser?.uid || 'N/A'}

Message:
${chainMessage}
        `);

        const mailtoLink = `mailto:support@medishift.ch?subject=${subject}&body=${body}`;
        window.location.href = mailtoLink;
      };

      return (
        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">Chain Executive Staff Setup</h2>
            <p className="text-muted-foreground text-sm mt-2">
              If you are part of the executive staff of a chain, please contact us directly to set you up in our database.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={currentUser?.email || ''}
                disabled
                className="w-full px-4 py-3 border border-border rounded-lg bg-muted/50 text-muted-foreground cursor-not-allowed"
              />
            </div>

            <div className="space-y-4">
              <SimpleDropdown
                label={t('personalDetails.phonePrefix', 'Phone Prefix')}
                options={phonePrefixOptions}
                value={chainPhonePrefix}
                onChange={(value) => setChainPhonePrefix(value)}
                placeholder={t('personalDetails.selectPhonePrefix', 'Select phone prefix')}
                required
              />
              <PersonnalizedInputField
                label={t('personalDetails.phoneNumber', 'Phone Number')}
                name="chainPhoneNumber"
                type="tel"
                value={chainPhoneNumber || ''}
                onChange={(e) => setChainPhoneNumber(e.target.value)}
                placeholder={t('personalDetails.phonePlaceholder', 'Enter your phone number')}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Please provide your information and requirements:
              </label>
              <textarea
                value={chainMessage}
                onChange={(e) => setChainMessage(e.target.value)}
                placeholder="Enter your message here..."
                className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:ring-2 min-h-[200px]"
                style={{ '--tw-ring-color': 'rgba(15, 23, 42, 0.2)' }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px rgba(15, 23, 42, 0.2)'; }}
                onBlur={(e) => { e.currentTarget.style.boxShadow = ''; }}
                rows={8}
                required
              />
            </div>

            <Button
              variant="primary"
              onClick={handleSendEmail}
              disabled={!chainMessage.trim() || !chainPhonePrefix || !chainPhoneNumber.trim()}
              className="w-full"
            >
              Send Email
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              This will open your email client with a pre-filled message to our support team.
            </p>
          </div>
        </div>
      );
    }

    return (
      <PhoneVerificationStep
        onComplete={handlePhoneComplete}
        onBack={handleBack}
        initialPhoneNumber={currentUser?.phoneNumber}
      />
    );
  };

  const handleHasGLNChange = async (newValue) => {
    setHasGLN(newValue);
    await saveOnboardingProgress({
      step,
      role,
      isEmployed,
      accessTeam,
      selectedCompany,
      legalConsiderationsConfirmed,
      generalWorkingLawsConfirmed,
      hasGLN: newValue
    });
  };

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">
          {t('dashboard.onboarding.step4.title', 'Verification Setup')}
        </h2>
        <p className="text-muted-foreground text-sm mt-2">
          {t('dashboard.onboarding.step4.description', 'Please verify your professional status')}
        </p>
      </div>

      <div className="space-y-6 max-w-lg mx-auto">
        {/* Main GLN Toggle - Always Visible */}
        <div className={styles.switchGroup}>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={styles.switchLabel}>{t('dashboard.onboarding.step4.hasGLN', 'I have a GLN')}</span>
              <div className="group relative flex items-center">
                <FiHelpCircle className="w-4 h-4 text-muted-foreground cursor-help" style={{ color: 'var(--text-light-color)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-logo-2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-light-color)'; }}
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-popover text-popover-foreground text-xs rounded-lg shadow-xl border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {role === 'worker'
                    ? "Professional number required for certified medical professionals in Switzerland (pharmacists, dentists, doctors etc...). For other professions (nurse, assistants, etc.), this number is not mandatory."
                    : "Global Location Number. Unique identification number for your facility/pharmacy in the Swiss healthcare system."}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover"></div>
                </div>
              </div>
            </div>
            <span className="text-sm text-muted-foreground">{t('dashboard.onboarding.step4.hasGLNDesc', 'Enable if you have your own GLN number')}</span>
          </div>
          <ToggleSwitch
            checked={hasGLN === true}
            onChange={(val) => handleHasGLNChange(val)}
          />
        </div>

        {/* ID Verification Form - Always show for workers and companies */}
        {(role === 'worker' || role === 'company') && (
          <div className="animate-in fade-in slide-in-from-top-4">
            <GLNVerificationStep
              ref={glnVerificationRef}
              role={role}
              hasGLN={hasGLN === true}
              onComplete={() => {

                handleComplete();
              }}
              onBack={handleBack}
              showHeader={false}
              hideMainButton={true}
              onVerifyClick={(handler) => {
                // Store the verification handler from child component
                verifyHandlerRef.current = handler;
              }}
              onReadyChange={(isReady) => {
                // Update state when document readiness changes
                setDocumentsReady(isReady);
              }}
              onProcessingChange={(processing) => {
                // Track verification processing state
                setIsVerifying(processing);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );

  const getNextButtonText = () => {
    const maxStep = role === 'chain' ? 3 : 4;
    if (step === maxStep) return "Complete & Start Tutorial";
    if (step === 1) return "Continue";
    return "Next";
  };

  const canProceed = () => {
    if (step === 1) return legalConsiderationsConfirmed;
    if (step === 2) return role !== null;
    if (step === 3) {
      if (role === 'chain') return chainMessage.trim().length > 0 && chainPhonePrefix && chainPhoneNumber.trim().length > 0;
      return phoneVerified;
    }
    if (step === 4) {
      if (role === 'chain') return true;
      return documentsReady;
    }
    return true;
  };

  const isTwoColumnLayout = step === 3 && isEmployed && !accessTeam;

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.stopPropagation()}>
      <div className={`${styles.modal} ${isTwoColumnLayout ? 'max-w-4xl' : 'max-w-2xl'}`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            <span className="text-sm font-medium text-muted-foreground">Onboarding {step}/{role === 'chain' ? 3 : 4}</span>
          </div>
          {profileComplete && (
            <button
              onClick={skipFirstTimeModal}
              disabled={isProcessing}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Close onboarding"
            >
              <FiX className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className={styles.modalContent}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          {step > 1 && (
            <Button
              variant="secondary"
              onClick={handleBack}
              disabled={isProcessing}
              className="!bg-white !border !border-solid !border-gray-300 !text-gray-700 hover:!bg-gray-50 !px-6 !font-semibold transition-colors"
              style={{}}
            >
              Back
            </Button>
          )}

          {step !== 3 && (step !== 3 || role !== 'chain') && step !== 4 && (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={!canProceed() || isProcessing}
              className="flex items-center space-x-2 !text-white !px-6 !font-semibold"
              style={{ backgroundColor: 'var(--color-logo-2)', color: 'white' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.9)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-logo-2)'; }}
            >
              <span>{getNextButtonText()}</span>
              {!isProcessing && <FiArrowRight className="w-5 h-5" />}
            </Button>
          )}

          {/* Step 4: Verify Account Button */}
          {step === 4 && (role === 'worker' || role === 'company') && (
            <Button
              variant="primary"
              onClick={() => {
                if (verifyHandlerRef.current) {
                  verifyHandlerRef.current();
                }
              }}
              disabled={!canProceed() || isProcessing || isVerifying}
              className="flex items-center space-x-2 !text-white !px-6 !font-semibold"
              style={{ backgroundColor: 'var(--color-logo-2)', color: 'white', opacity: (isProcessing || isVerifying) ? 0.6 : 1 }}
              onMouseEnter={(e) => { if (!isProcessing && !isVerifying) e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.9)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-logo-2)'; }}
            >
              {isVerifying ? (
                <>
                  <FiLoader className="animate-spin w-5 h-5" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify Account</span>
                  <FiArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FirstTimeModal; 
