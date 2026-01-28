import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/authContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../services/services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../config/keysDatabase';
import Button from '../../../components/boxedInputFields/button';
import SimpleDropdown from '../../../components/boxedInputFields/dropdownField';
import PersonnalizedInputField from '../../../components/boxedInputFields/personnalizedInputField';
import { useDropdownOptions } from '../../../pages/profile/utils/DropdownListsImports';
import { useDashboard } from '../../contexts/dashboardContext';
import { useTutorial } from '../../../TutorialContext/TutorialContext';
import { FiBriefcase, FiSearch, FiCheck, FiArrowRight, FiHome, FiAlertTriangle, FiX, FiLink, FiHelpCircle, FiLoader } from 'react-icons/fi';
import ProfessionalGLNVerification from './professionalGLNVerification';
import FacilityGLNVerification from './facilityGLNVerification';
import PhoneVerificationStep from './phoneVerificationStep';

// Styles
const styles = {
  // Main modal structure (using global classes from modals.css)
  modalOverlay: "modal-overlay",
  modal: "modal-content",
  modalHeader: "modal-header",
  modalTitle: "modal-title",
  modalContent: "modal-body custom-scrollbar",
  modalFooter: "modal-footer",

  // Onboarding specific styles
  twoColumnGrid: "grid grid-cols-1 gap-6",
  stepIndicator: "flex items-center space-x-2 mb-8 justify-center",
  stepDot: "w-2.5 h-2.5 rounded-full transition-all duration-300",
  cardGrid: "grid grid-cols-1 md:grid-cols-3 gap-4 mt-4",
  selectionCard: "p-6 rounded-xl border-2 transition-[transform,box-shadow] duration-300 cursor-pointer flex flex-col items-center text-center hover:bg-muted/50 relative [&_.onboarding-icon-no-transition]:!transition-none",
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
  const [displayStep, setDisplayStep] = useState(1); // Step to actually display (separate from step for smooth transitions)
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

  const [documentsReady, setDocumentsReady] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [contentOpacity, setContentOpacity] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [shouldRenderContent, setShouldRenderContent] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const actionTimeoutRef = useRef(null);
  const mountedRef = useRef(true);
  const glnVerificationRef = useRef(null);
  const verifyHandlerRef = useRef(null);
  const contentWrapperRef = useRef(null);
  const prevTwoColumnLayoutRef = useRef(false);

  // Sync displayStep with step when not transitioning
  useEffect(() => {
    if (!isTransitioning) {
      setDisplayStep(step);
      setContentOpacity(1);
      setShouldRenderContent(true);
    }
  }, [step, isTransitioning]);

  // Helper function to check if user is in dashboard
  const isInDashboard = useMemo(() => {
    // Allow both dashboard and onboarding pages
    const inDashboard = location.pathname.includes('/dashboard') || location.pathname.includes('/onboarding');
    return inDashboard;
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
        const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const onboardingProgress = userData.onboardingProgress || {};

          // Get progress for the current onboarding type
          const typeProgress = onboardingProgress[onboardingType] || {};

          // Check if this type of onboarding is already completed
          if (typeProgress.completed) {
            setIsLoadingProgress(false);
            return;
          }

          // Also check legacy fields for professional onboarding
          if (onboardingType === 'professional') {
            const isVerifiedProfile = !!userData.GLN_certified;
            const legacyCompleted = userData.onboardingCompleted || onboardingProgress.completed;
            if (isVerifiedProfile || legacyCompleted) {
              setIsLoadingProgress(false);
              return;
            }
          }

          // Load saved progress for this onboarding type
          if (Object.keys(typeProgress).length > 0) {
            const { step: savedStep, role: savedRole, isEmployed: savedIsEmployed, accessTeam: savedAccessTeam, selectedCompany: savedCompany, legalConsiderationsConfirmed: savedLegalConfirmed, generalWorkingLawsConfirmed: savedGeneralWorkingLawsConfirmed, hasGLN: savedHasGLN, chainPhonePrefix: savedChainPhonePrefix, chainPhoneNumber: savedChainPhoneNumber } = typeProgress;

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
    } catch (error) {
      // Error saving onboarding progress
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

  const showValidationLoading = (step === 4 && (isVerifying || isProcessing)) && (role === 'worker' || role === 'company');

  const handleNext = async () => {
    setIsTransitioning(true);
    setContentOpacity(0);
    // Wait for fade-out to complete (200ms transition + buffer)
    await new Promise(resolve => setTimeout(resolve, 250));

    const maxStep = role === 'chain' ? 3 : 4;

    if (step < maxStep) {
      let newStep = step + 1;

      // SKIP LOGIC: Step 2 -> Step 4 if Step 3 (Phone) was already verified in previous attempt
      if (step === 2 && phoneVerified && role !== 'chain') {
        newStep = 4;
      }


      // Check if layout will change - if so, hide content and set resizing BEFORE step change
      const willBeTwoColumn = newStep === 3 && isEmployed && !accessTeam;
      const wasTwoColumn = step === 3 && isEmployed && !accessTeam;
      const layoutWillChange = willBeTwoColumn !== wasTwoColumn;

      if (layoutWillChange) {
        setIsResizing(true);
        setContentOpacity(0);
      }

      // Completely hide content before changing step
      setShouldRenderContent(false);

      // Wait multiple frames to ensure content is fully unmounted and browser has painted
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 50));

      // Update step state (but don't display yet) - this will trigger layout change
      setStep(newStep);

      // If layout changed, wait for resize animation BEFORE mounting new content
      if (layoutWillChange) {
        await new Promise(resolve => setTimeout(resolve, 350));
      }

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

      // Wait for React to process state update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Now update displayStep and re-enable rendering
      // But keep opacity at 0 and transitioning true
      setDisplayStep(newStep);
      setShouldRenderContent(true);

      // Wait for React to mount new content and browser to paint
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify element exists and is hidden before showing
      if (contentWrapperRef.current) {
        const element = contentWrapperRef.current;
        element.style.display = 'none';
        element.style.opacity = '0';
        element.style.visibility = 'hidden';
      }

      // Wait one more frame to ensure styles are applied
      await new Promise(resolve => requestAnimationFrame(resolve));

      // Clear resizing state BEFORE fade-in to hide overlay
      if (layoutWillChange) {
        setIsResizing(false);
        // Small delay to ensure overlay fades out
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Now fade in the new content
      if (contentWrapperRef.current) {
        contentWrapperRef.current.style.display = 'block';
      }
      setContentOpacity(1);
      // Small delay before clearing transitioning flag
      await new Promise(resolve => setTimeout(resolve, 50));
      setIsTransitioning(false);
    } else {
      setIsTransitioning(false);
      setShouldRenderContent(true);
      handleComplete();
    }
  };

  const handleBack = async () => {
    if (step > 1) {
      setIsTransitioning(true);
      setContentOpacity(0);
      // Wait for fade-out to complete (200ms transition + buffer)
      await new Promise(resolve => setTimeout(resolve, 250));

      let newStep = step - 1;

      // SKIP LOGIC: Step 4 -> Step 2 if Step 3 (Phone) was skipped
      if (step === 4 && phoneVerified && role !== 'chain') {
        newStep = 2;
      }

      // Check if layout will change - if so, hide content and set resizing BEFORE step change
      const willBeTwoColumn = newStep === 3 && isEmployed && !accessTeam;
      const wasTwoColumn = step === 3 && isEmployed && !accessTeam;
      const layoutWillChange = willBeTwoColumn !== wasTwoColumn;

      if (layoutWillChange) {
        setIsResizing(true);
        setContentOpacity(0);
      }

      // Completely hide content before changing step
      setShouldRenderContent(false);

      // Wait multiple frames to ensure content is fully unmounted and browser has painted
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 50));

      // Update step state (but don't display yet) - this will trigger layout change
      setStep(newStep);

      // If layout changed, wait for resize animation BEFORE mounting new content
      if (layoutWillChange) {
        await new Promise(resolve => setTimeout(resolve, 350));
      }

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

      // Wait for React to process state update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Now update displayStep and re-enable rendering
      // But keep opacity at 0 and transitioning true
      setDisplayStep(newStep);
      setShouldRenderContent(true);

      // Wait for React to mount new content and browser to paint
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify element exists and is hidden before showing
      if (contentWrapperRef.current) {
        const element = contentWrapperRef.current;
        element.style.display = 'none';
        element.style.opacity = '0';
        element.style.visibility = 'hidden';
      }

      // Wait one more frame to ensure styles are applied
      await new Promise(resolve => requestAnimationFrame(resolve));

      // Clear resizing state BEFORE fade-in to hide overlay
      if (layoutWillChange) {
        setIsResizing(false);
        // Small delay to ensure overlay fades out
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Now fade in the new content
      if (contentWrapperRef.current) {
        contentWrapperRef.current.style.display = 'block';
      }
      setContentOpacity(1);
      // Small delay before clearing transitioning flag
      await new Promise(resolve => setTimeout(resolve, 50));
      setIsTransitioning(false);
    }
  };

  const handleComplete = async () => {
    if (isProcessing || isBusy) return;
    setIsProcessing(true);

    try {
      if (currentUser) {
        const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid);

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

      }


      // Close the modal first
      setShowFirstTimeModal(false);

      // Then start the tutorial after a short delay to ensure modal is closed
      actionTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          startTutorial('dashboard');
          setIsProcessing(false);
        }
      }, 500);
    } catch (error) {
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
        {/* Worker option - disabled if facility onboarding */}
        <div
          onClick={() => onboardingType !== 'facility' && handleRoleChange('worker')}
          className={`${styles.selectionCard} ${role === 'worker' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border'} ${onboardingType === 'facility' ? 'opacity-50 grayscale pointer-events-none cursor-not-allowed' : ''}`}
          style={role === 'worker' ? { borderColor: 'var(--color-logo-1)', backgroundColor: 'rgba(37, 99, 235, 0.05)', boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.2)', transition: 'transform 0.3s, box-shadow 0.3s' } : {}}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 text-white shadow-sm onboarding-icon-no-transition" style={{ backgroundColor: 'var(--color-logo-1)', transition: 'none', WebkitTransition: 'none', MozTransition: 'none', OTransition: 'none', transitionProperty: 'none', transitionDuration: '0s', transitionDelay: '0s' }}>
            <FiBriefcase className="w-6 h-6" style={{ transition: 'none' }} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Worker</h3>
          <p className="text-sm text-muted-foreground">I want to work!</p>
        </div>

        <div
          onClick={() => handleRoleChange('company')}
          className={`${styles.selectionCard} ${role === 'company' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border'}`}
          style={role === 'company' ? { borderColor: onboardingType === 'facility' ? 'var(--color-logo-2)' : 'var(--color-logo-1)', backgroundColor: onboardingType === 'facility' ? 'rgba(15, 23, 42, 0.05)' : 'rgba(37, 99, 235, 0.05)', boxShadow: onboardingType === 'facility' ? '0 0 0 2px rgba(15, 23, 42, 0.2)' : '0 0 0 2px rgba(37, 99, 235, 0.2)', transition: 'transform 0.3s, box-shadow 0.3s' } : {}}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 text-white shadow-sm onboarding-icon-no-transition" style={{ backgroundColor: onboardingType === 'facility' ? 'var(--color-logo-2)' : 'var(--color-logo-1)', transition: 'none', WebkitTransition: 'none', MozTransition: 'none', OTransition: 'none', transitionProperty: 'none', transitionDuration: '0s', transitionDelay: '0s' }}>
            <FiHome className="w-6 h-6" style={{ transition: 'none' }} />
          </div>
          <h3 className="text-lg font-semibold mb-2">{onboardingType === 'facility' ? 'Single Facility' : 'Company'}</h3>
          <p className="text-sm text-muted-foreground">{onboardingType === 'facility' ? 'Set up one pharmacy/clinic' : 'I am recruiting!'}</p>
        </div>

        <div
          onClick={() => handleRoleChange('chain')}
          className={`${styles.selectionCard} ${role === 'chain' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border'}`}
          style={role === 'chain' ? { borderColor: onboardingType === 'facility' ? 'var(--color-logo-2)' : 'var(--color-logo-1)', backgroundColor: onboardingType === 'facility' ? 'rgba(15, 23, 42, 0.05)' : 'rgba(37, 99, 235, 0.05)', boxShadow: onboardingType === 'facility' ? '0 0 0 2px rgba(15, 23, 42, 0.2)' : '0 0 0 2px rgba(37, 99, 235, 0.2)', transition: 'transform 0.3s, box-shadow 0.3s' } : {}}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 text-white shadow-sm onboarding-icon-no-transition" style={{ backgroundColor: onboardingType === 'facility' ? 'var(--color-logo-2)' : 'var(--color-logo-1)', transition: 'none', WebkitTransition: 'none', MozTransition: 'none', OTransition: 'none', transitionProperty: 'none', transitionDuration: '0s', transitionDelay: '0s' }}>
            <FiLink className="w-6 h-6" style={{ transition: 'none' }} />
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

    setIsTransitioning(true);
    setContentOpacity(0);
    // Wait for fade-out to complete
    await new Promise(resolve => setTimeout(resolve, 250));

    // Completely hide content before changing step
    setShouldRenderContent(false);

    // Wait multiple frames to ensure content is fully unmounted and browser has painted
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => setTimeout(resolve, 50));

    setStep(4);

    // Wait for React to process state update
    await new Promise(resolve => setTimeout(resolve, 100));

    // Update displayStep and re-enable rendering
    // But keep opacity at 0 and transitioning true
    setDisplayStep(4);
    setShouldRenderContent(true);

    // Wait for React to mount new content and browser to paint
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => setTimeout(resolve, 50));

    // Verify element exists and is hidden before showing
    if (contentWrapperRef.current) {
      const element = contentWrapperRef.current;
      element.style.display = 'none';
      element.style.opacity = '0';
      element.style.visibility = 'hidden';
    }

    // Wait one more frame to ensure styles are applied
    await new Promise(resolve => requestAnimationFrame(resolve));

    // Now fade in the new content
    if (contentWrapperRef.current) {
      contentWrapperRef.current.style.display = 'block';
    }
    setContentOpacity(1);
    // Small delay before clearing transitioning flag
    await new Promise(resolve => setTimeout(resolve, 50));
    setIsTransitioning(false);
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
        {/* Verification Flow - Workers/Company Admin */}
        {(role === 'worker' || role === 'company') && (
          <div className="animate-in fade-in slide-in-from-top-4">
            <ProfessionalGLNVerification
              ref={glnVerificationRef}
              onComplete={() => role === 'company' ? handleNext() : handleComplete()}
              onReadyChange={(isReady) => setDocumentsReady(isReady)}
              onProcessingChange={(processing) => setIsVerifying(processing)}
              allowBypass={accessTeam === true}
            />
          </div>
        )}
      </div>
    </div>
  );


  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">
          {t('dashboard.onboarding.step5.title', 'Facility Information')}
        </h2>
        <p className="text-muted-foreground text-sm mt-2">
          {t('dashboard.onboarding.step5.description', 'Please provide the official GLN (Global Location Number) for your facility to verify your organization.')}
        </p>
      </div>

      <div className="space-y-6 max-w-lg mx-auto">
        <div className="animate-in fade-in slide-in-from-top-4">
          <FacilityGLNVerification
            ref={glnVerificationRef}
            mode="facilityInfo"
            onComplete={() => handleComplete()}
            onReadyChange={(isReady) => setDocumentsReady(isReady)}
            onProcessingChange={(processing) => setIsVerifying(processing)}
          />
        </div>
      </div>
    </div>
  );

  const getNextButtonText = () => {
    const maxStep = role === 'chain' ? 3 : (role === 'company' ? 5 : 4);
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
    if (step === 5) {
      return documentsReady;
    }
    return true;
  };

  const isTwoColumnLayout = step === 3 && isEmployed && !accessTeam;

  // Detect layout change and handle resize - but don't override step transitions
  useEffect(() => {
    const prevLayout = prevTwoColumnLayoutRef.current;
    const currentLayout = isTwoColumnLayout;

    if (prevLayout !== currentLayout && !isTransitioning) {
      setIsResizing(true);
      setContentOpacity(0);

      // Wait for resize animation to complete (300ms transition + buffer)
      const resizeTimeout = setTimeout(() => {
        setIsResizing(false);
        // Small delay before fade-in to ensure resize is fully complete
        setTimeout(() => {
          setContentOpacity(1);
        }, 50);
      }, 350);

      prevTwoColumnLayoutRef.current = currentLayout;

      return () => clearTimeout(resizeTimeout);
    } else {
      prevTwoColumnLayoutRef.current = currentLayout;
    }
  }, [isTwoColumnLayout, isTransitioning]);

  // Also check for layout change when step changes and handle it in the transition
  useEffect(() => {
    if (!isTransitioning && isTwoColumnLayout !== prevTwoColumnLayoutRef.current) {
      // Layout changed but we're not transitioning - this shouldn't happen normally
      // but handle it just in case
      console.warn('[FirstTimeModal] ⚠️ Layout changed outside transition');
    }
  }, [step, isTransitioning, isTwoColumnLayout]);

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.stopPropagation()}>
      {showValidationLoading && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-[100000] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <FiLoader className="w-10 h-10 text-primary animate-spin" style={{ color: 'var(--color-logo-1)' }} />
            <p className="text-base font-medium text-foreground animate-pulse">
              {isVerifying ? 'Verifying your account...' : 'Completing setup...'}
            </p>
          </div>
        </div>
      )}
      <div className={`${styles.modal} ${isTwoColumnLayout ? 'large' : ''} ${(displayStep === 1 || displayStep === 3) ? 'narrow' : ''}`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            <h2 className={styles.modalTitle}>
              Onboarding <span className="text-muted-foreground font-normal text-sm">Step {step}/{role === 'chain' ? 3 : 4}</span>
            </h2>
          </div>
          {profileComplete && (
            <button
              onClick={skipFirstTimeModal}
              disabled={isProcessing}
              className="modal-close-btn"
              aria-label="Close onboarding"
            >
              <FiX className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className={styles.modalContent} style={{ position: 'relative', overflow: 'hidden' }}>
          {/* Overlay to hide content during modal resize - Solution G */}
          {isResizing && (
            <div
              className="resize-overlay"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'var(--background-div-color, #ffffff)',
                zIndex: 1000,
                pointerEvents: 'none',
                opacity: 1,
                transition: 'opacity 0.15s ease-out',
                borderRadius: 'inherit'
              }}
            />
          )}
          {shouldRenderContent && (
            <div
              ref={contentWrapperRef}
              key={displayStep}
              className={`step-content-wrapper ${(isTransitioning || isResizing) && contentOpacity === 0 ? 'step-content-wrapper--hidden' : ''}`}
              style={{
                opacity: contentOpacity,
                transition: contentOpacity === 0 ? 'none' : 'opacity 0.2s ease-in-out',
                display: ((isTransitioning || isResizing) && contentOpacity === 0) ? 'none' : 'block',
                visibility: (contentOpacity === 0 || isResizing) ? 'hidden' : 'visible',
                pointerEvents: (contentOpacity === 0 || isResizing) ? 'none' : 'auto',
                transform: contentOpacity === 0 ? 'scale(0.98)' : 'scale(1)',
                willChange: (isTransitioning || isResizing) ? 'opacity, transform' : 'auto'
              }}
            >
              {displayStep === 1 && renderStep1()}
              {displayStep === 2 && renderStep2()}
              {displayStep === 3 && renderStep3()}
              {displayStep === 4 && renderStep4()}
              {displayStep === 5 && renderStep5()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          {step > 1 && (
            <Button
              onClick={handleBack}
              disabled={isProcessing}
              variant="secondary"
            >
              Back
            </Button>
          )}

          {step !== 3 && (step !== 3 || role !== 'chain') && step !== 4 && step !== 5 && (
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isProcessing}
              variant="primary"
            >
              <span>{getNextButtonText()}</span>
              {!isProcessing && <FiArrowRight className="w-5 h-5" />}
            </Button>
          )}


          {/* Step 4 & 5: Verify Account Button */}
          {(step === 4 || step === 5) && (role === 'worker' || role === 'company') && (
            <Button
              onClick={() => {
                if (glnVerificationRef.current?.handleVerify) {
                  glnVerificationRef.current.handleVerify();
                }
              }}
              disabled={!canProceed() || isProcessing || isVerifying}
              variant="primary"
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
