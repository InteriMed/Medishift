import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CSSTransition } from 'react-transition-group';
import { useTranslation } from 'react-i18next';
import './styles/Signup.css';
import logoImage from "../../assets/global/logo.png";
import Page1 from './components/signup/Page1';
import Page2_Employee from './components/signup/Page2_Employee';
import Page2_Manager from './components/signup/Page2_Manager';
import Page3_Manager from './components/signup/Page3_Manager';
import Page3_Employee from './components/signup/Page3_Employee';
import NavigationBar from './components/navigation_bar/NavigationBar';
import Page4_Employee from './components/signup/Page4_Employee';
import PageValidation from './components/signup/PageValidation';
import PagePassword from './components/signup/PagePassword';
import { validateInput, validatePassword } from './utils/validation';
import { API_ENDPOINTS } from './config/api';
import { getFirebaseAuth } from './utils/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import API_CONFIG from '../../config/api.config';

// ... rest of the code
const initialFormData = {
  name: '',
  surname: '',
  email: '',
  birthdate: '',
  country: '',
  phoneNumber: '',
  category: '',
  company: '',
  software: '',
  jobTitle: '',
  isFranchise: false,
  franchiseName: '',
  preferredWorkLocation: '',
  yearsOfExperience: '',
  certifications: '',
  isNotEmployed: false, // Add this field
};

const Signup = () => {
  const { t } = useTranslation();
  const { lang } = useParams();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [userType, setUserType] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isLargePage, setIsLargePage] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [fadeIn, setFadeIn] = useState(true);
  const [generalError, setGeneralError] = useState('');
  const [isCurrentlyEmployed, setIsCurrentlyEmployed] = useState(true);
  const [isFranchise, setIsFranchise] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showLegalNotice, setShowLegalNotice] = useState(false);
  const [showUnemployedButton, setShowUnemployedButton] = useState(false);
  const [showNavigation, setShowNavigation] = useState(true);
  const [hideNextButton, setHideNextButton] = useState(false);
  const [isNotEmployed, setIsNotEmployed] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Add handleErrorReset function to clear specific errors
  const handleErrorReset = useCallback((fieldName) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      
      // If resetting a birthdate-related field, also clear the general birthdate error
      if (fieldName.startsWith('birthdate_')) {
        delete newErrors.birthdate;
      }
      
      // If all errors are cleared, also reset showErrors
      if (Object.keys(newErrors).length === 0) {
        setShowErrors(false);
      }
      return newErrors;
    });
  }, []);

  // Replace the static totalPages with a computed value
  const getTotalPages = useCallback(() => {
    return userType === 'Employee' ? 6 : 5;
  }, [userType]);

  // Use this instead of the totalPages variable
  const totalPages = getTotalPages();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 500);
      setIsLargePage(window.innerHeight > 1000);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    navigate(`/${lang}/signup`);

    const handlePopState = (event) => {
      event.preventDefault();
      if (currentPage > 1) {
        handleNavigation('prev');
      } else {
        navigate(`/${lang}`);
      }
    };

    const handleBeforeUnload = (e) => {
      if (currentPage > 1 || Object.values(formData).some(value => value !== '')) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentPage, navigate, formData, lang]);

  const handleUserTypeChange = useCallback((type) => {
    setFadeIn(false);
    setTimeout(() => {
      setUserType(type);
      setFormData(prev => ({ ...prev, userType: type }));
      setCurrentPage(prev => prev + 1);
      navigate(`/${lang}/signup/basic-info`);
      setFadeIn(true);
    }, 300);
  }, [navigate, lang]);

  const validateInputFields = useCallback(async () => {
    const errors = {};

    // Page 2 validations
    if (currentPage === 2) {
      console.log("Validating page 2 fields");
      
      // Validate name
      if (formData.name !== undefined) {
        const nameValidation = validateInput(formData.name, 'required|name|min:2|max:50');
        if (!nameValidation.isValid) errors.name = nameValidation.errorMessage;
      }

      // Validate surname
      if (formData.surname !== undefined) {
        const surnameValidation = validateInput(formData.surname, 'required|name|min:2|max:50');
        if (!surnameValidation.isValid) errors.surname = surnameValidation.errorMessage;
      }

      // Validate email
      if (formData.email !== undefined) {
        const emailValidation = validateInput(formData.email, 'required|email|max:300');
        if (!emailValidation.isValid) {
          errors.email = emailValidation.errorMessage;
        } else {
          try {
            console.log("Checking email availability in Firebase...");
            const auth = getFirebaseAuth();
            if (!auth) {
              throw new Error('Firebase authentication not initialized');
            }

            // Try both methods for checking email existence
            
            // Method 1: fetchSignInMethodsForEmail
            const signInMethods = await fetchSignInMethodsForEmail(auth, formData.email);
            console.log("Sign-in methods for email:", signInMethods);
            
            if (signInMethods && signInMethods.length > 0) {
              console.log("Email already exists in Firebase (method 1)");
              errors.email = 'An account with this email already exists';
            } else {
              // Method 2: Try to create a temporary user with a random password
              // This is more reliable as it will catch the error if the email exists
              try {
                console.log("Trying alternate method to check email...");
                // Generate a temporary random password
                const tempPassword = Math.random().toString(36).slice(-8);
                
                // Try to create a user - if email exists, this will throw an error
                await createUserWithEmailAndPassword(auth, formData.email, tempPassword)
                  .then(async (userCredential) => {
                    // If user was created successfully, email doesn't exist, so immediately delete it
                    console.log("Temporary user created, email is available");
                    await userCredential.user.delete();
                  });
              } catch (createError) {
                console.error("Error in email validation method 2:", createError);
                if (createError.code === 'auth/email-already-in-use') {
                  console.log("Email already exists in Firebase (method 2)");
                  errors.email = 'An account with this email already exists';
                }
              }
            }
          } catch (error) {
            console.error('Firebase email check error:', error);
            if (error.code === 'auth/invalid-email') {
              errors.email = 'Invalid email format';
            } else {
              errors.email = 'Error checking email availability';
            }
          }
        }
      }

      // Validate phone number if it exists
      if (formData.phoneNumber) {
        const phoneValidation = validateInput(formData.phoneNumber, 'phone|min:10');
        if (!phoneValidation.isValid) errors.phoneNumber = phoneValidation.errorMessage;
      } else {
        errors.phoneNumber = "Phone number is required";
      }

      // Validate country
      if (!formData.country) {
        errors.country = "Country is required";
      }

      // Validate birthdate for Employee
      if (userType === 'Employee') {
        if (formData.birthdate) {
          // Split the birthdate into its components
          const [year, month, day] = formData.birthdate.split('-');
          
          // Validate each component separately
          if (!day) {
            errors.birthdate_day = "Day is required";
          } else if (isNaN(parseInt(day)) || parseInt(day) < 1 || parseInt(day) > 31) {
            errors.birthdate_day = "Invalid day";
          }
          
          if (!month) {
            errors.birthdate_month = "Month is required";
          } else if (isNaN(parseInt(month)) || parseInt(month) < 1 || parseInt(month) > 12) {
            errors.birthdate_month = "Invalid month";
          }
          
          if (!year) {
            errors.birthdate_year = "Year is required";
          } else if (isNaN(parseInt(year)) || year.length !== 4) {
            errors.birthdate_year = "Invalid year";
          }
          
          // Only validate the complete date if all components are present
          if (day && month && year) {
            try {
              // Create a date object and validate it
              const birthDate = new Date(`${year}-${month}-${day}`);
              if (isNaN(birthDate.getTime())) {
                // If the date is invalid, determine which part is causing the issue
                const lastDayOfMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
                if (parseInt(day) > lastDayOfMonth) {
                  errors.birthdate_day = `This month has only ${lastDayOfMonth} days`;
                } else {
                  // Generic error if we can't determine the specific issue
                  errors.birthdate = "Invalid date combination";
                }
              } else {
                // Check if the user is at least 18 years old
                const today = new Date();
                const age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - (birthDate.getMonth() - 1); // Adjust for 0-indexed months
                
                if (age < 18 || (age === 18 && monthDiff < 0) || 
                   (age === 18 && monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                  errors.birthdate = "You must be at least 18 years old";
                }
              }
            } catch (e) {
              errors.birthdate = "Invalid date";
            }
          } else if (!day && !month && !year) {
            // If all components are missing, show a general error
            errors.birthdate = "Date of birth is required";
          }
        } else {
          // If no birthdate at all, show a general error
          errors.birthdate = "Date of birth is required";
        }
      }
    }

    console.log("Validation errors:", errors);
    return errors;
  }, [formData, userType, currentPage]);

  const handleNavigation = useCallback((direction) => {
    if (direction === 'prev' && currentPage > 1) {
      setCurrentPage(currentPage - 1);
      navigate(`/${lang}/signup?page=${currentPage - 1}`);
    } else if (direction === 'next' && currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      navigate(`/${lang}/signup?page=${currentPage + 1}`);
    }
  }, [currentPage, totalPages, navigate, lang]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      
      // If birthdate is updated, clear all related errors
      if (name === 'birthdate') {
        delete newErrors.birthdate;
        delete newErrors.birthdate_day;
        delete newErrors.birthdate_month;
        delete newErrors.birthdate_year;
      }
      
      // Only reset showErrors if there are no more errors
      if (Object.keys(newErrors).length === 0) {
        setShowErrors(false);
      }
      return newErrors;
    });
  }, []);

  const handleNext = useCallback(async () => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      setShowErrors(true);
      setGeneralError('');

      // Validate current page fields
      const validationErrors = await validateInputFields();
      
      if (Object.keys(validationErrors).length > 0) {
        console.log("Validation failed with errors:", validationErrors);
        setErrors(validationErrors);
        if (validationErrors.validation) {
          setGeneralError(validationErrors.validation);
        }
        setIsLoading(false);
        return;
      }

      if (currentPage === 1 && !userType) {
          setErrors({ userType: "Please select a user type" });
          return;
      }

      if (currentPage === 3) {
        let validationErrors = {};
        if (userType === 'Employee') {
          // Validate job title first
          if (!formData.jobTitle?.trim()) validationErrors.jobTitle = 'Job title is required';
          
          if (isCurrentlyEmployed) {
            if (!formData.company?.trim()) validationErrors.company = 'Company is required';
            if (isFranchise && !formData.franchiseName?.trim()) {
              validationErrors.franchiseName = 'Franchise Name is required';
            }
          }
        } else {
          if (!formData.company?.trim()) validationErrors.company = 'Company is required';
          if (!formData.software?.trim()) validationErrors.software = 'Software is required';
          if (isFranchise && !formData.franchiseName?.trim()) {
            validationErrors.franchiseName = 'Franchise Name is required';
          }
        }
        
        if (Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors);
          return;
        }
      }

      if (currentPage === 4 && userType === 'Employee') {
        let errors = {};
        if (!formData.preferredWorkLocation) errors.preferredWorkLocation = 'Preferred work location is required';
        
        if (Object.keys(errors).length > 0) {
          setErrors(errors);
          return;
        }
      }

      // Password page validation (for both Manager and Employee)
      if ((currentPage === 4 && userType === 'Manager') || (currentPage === 5 && userType === 'Employee')) {
        console.log('Starting password validation...');
        let validationErrors = {};
        
        // Validate password
        if (!formData.password?.trim()) {
          validationErrors.password = 'Password is required';
        } else {
          const passwordError = validatePassword(formData.password);
          if (passwordError) {
            validationErrors.password = passwordError;
          }
        }

        // Validate confirm password
        if (!formData.confirmPassword?.trim()) {
          validationErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
          validationErrors.confirmPassword = 'Passwords do not match';
        }
        
        if (Object.keys(validationErrors).length > 0) {
          console.log('Password validation failed:', validationErrors);
          setErrors(validationErrors);
          return;
        }

        console.log('Password validation passed, proceeding with user creation...');

        if (Object.keys(validationErrors).length === 0) {
          try {
            const auth = getFirebaseAuth();
            if (!auth) {
              throw new Error('Firebase authentication not initialized');
            }

            // Create user in Firebase
            const result = await createUserWithEmailAndPassword(
              auth,
              formData.email,
              formData.password
            );
            const user = result.user;
            
            // Get fresh token
            const freshToken = await user.getIdToken(true);
            console.log('Got fresh token:', freshToken.substring(0, 20) + '...');

            // Create username from email (before @ symbol)
            const username = formData.email.split('@')[0];
            
            // Format birthdate properly if it exists
            let formattedBirthdate = '';
            if (formData.birthdate) {
              const [year, month, day] = formData.birthdate.split('-');
              // Only format if all parts exist
              if (year && month && day) {
                formattedBirthdate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              }
            }

            // Prepare the user data
            const userData = {
              username: username,
              email: formData.email,
              name: formData.name,
              surname: formData.surname || '',
              gender: 'Female', // As specified in requirements
              birthdate: formattedBirthdate || '', // Use formatted birthdate
              phone: formData.phoneNumber || '',
              location: formData.preferredWorkLocation || 'Zurich',
              user_type: userType,
              company: formData.company || '',
              job_title: formData.jobTitle || 'Pharmacist',
              employment_status: isCurrentlyEmployed ? 'employed' : 'unemployed',
              firebase_uid: user.uid,
              category: formData.category || 'pharmacist',
              certifications: formData.certifications || 'FPH',
              missions_completed: 19, // As specified in requirements
              title: 'FPH', // As specified in requirements
              picture_url: "John's Picture", // As specified in requirements
              country: formData.country || 'Switzerland',
              creation_date: new Date().toISOString(),
              points: 0,
              status: 'incomplete'
            };

            // Store user data in localStorage regardless of backend success
            localStorage.setItem('userData', JSON.stringify(userData));
            localStorage.setItem('userId', user.uid);
            localStorage.setItem('firebaseUid', user.uid);
            localStorage.setItem('token', freshToken);

            try {
              // Try to register with backend, but continue even if it fails
              console.log('Sending registration request to backend...');
              const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USER_REGISTER}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${freshToken}`
                },
                body: JSON.stringify(userData)
              });
              
              if (response.ok) {
                const responseData = await response.json();
                console.log('Registration response:', responseData);
                
                // Update localStorage with backend data if available
                if (responseData.user && responseData.user.id) {
                  localStorage.setItem('userId', responseData.user.id);
                }

                // Create empty documents in other collections with the same uid
                await Promise.all([
                  fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WORKERS_CREATE_EMPTY}`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${freshToken}`
                    },
                    body: JSON.stringify({ uid: user.uid })
                  }),
                  fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MESSAGES_CREATE_EMPTY}`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${freshToken}`
                    },
                    body: JSON.stringify({ uid: user.uid })
                  }),
                  fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOBS_CREATE_EMPTY}`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${freshToken}`
                    },
                    body: JSON.stringify({ uid: user.uid })
                  }),
                  fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CONTRACTS_CREATE_EMPTY}`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${freshToken}`
                    },
                    body: JSON.stringify({ uid: user.uid })
                  })
                ]).catch(err => {
                  console.log('Error creating empty documents:', err);
                  // Continue with registration process even if these fail
                });
              } else {
                console.log('Backend registration failed, but continuing with Firebase authentication');
              }
            } catch (backendError) {
              console.error('Backend registration error:', backendError);
              console.log('Continuing with Firebase authentication only');
            }

            // Clear errors and navigate regardless of backend success
            setErrors({});
            setGeneralError('');
            handleNavigation('next');
          } catch (error) {
            console.error('Firebase registration error:', error);
            
            if (error.code === 'auth/email-already-in-use') {
              setGeneralError('This email is already in use. Please try logging in instead.');
            } else {
              setGeneralError(error.message || 'Failed to create account');
            }
            
            // Clean up Firebase user if registration fails
            try {
              const auth = getFirebaseAuth();
              if (auth.currentUser) {
                await auth.currentUser.delete();
              }
            } catch (deleteError) {
              console.error('Error cleaning up Firebase user:', deleteError);
            }
          }
        }
      } else {
        // For other pages, just navigate to next
        handleNavigation('next');
      }
    } catch (error) {
      console.error('Error in handleNext:', error);
      setGeneralError(error.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, userType, formData, isCurrentlyEmployed, handleNavigation, validateInputFields]);

  const handleEmploymentSwitch = useCallback((value) => {
    setIsTransitioning(true);
    setIsCurrentlyEmployed(value);
    setShowLegalNotice(false);
    setShowUnemployedButton(false);
    setIsNotEmployed(false); // Reset the isNotEmployed state when switching
    
    // Add this line to update the formData
    setFormData(prev => ({ ...prev, isNotEmployed: false }));

    setShowNavigation(true);

    if (!value && currentPage === 3 && userType === 'Employee') {
      setTimeout(() => {
        setHideNextButton(true);
      }, 0);
    } else {
      setErrors(prev => ({
        ...prev,
        company: '',
        franchiseName: '',
        // Remove software from the error fields
      }));
      setFormData(prev => ({
        ...prev,
        company: '',
        franchiseName: '',
        // Remove software from the form data reset
      }));
      setTimeout(() => {
        setHideNextButton(false);
      }, 300);
    }

    setTimeout(() => {
      setIsTransitioning(false);
      if (!value) {
        setShowLegalNotice(true);
        setTimeout(() => {
          setShowUnemployedButton(true);
        }, 1000);
      }
    }, 300);
  }, [currentPage, userType]);

  const handleFranchiseSwitch = useCallback((value) => {
    setIsFranchise(value);
    if (!value) {
      setFormData(prev => ({ ...prev, franchiseName: '' }));
    }
  }, []);

  const handleDotNavigation = useCallback((pageNumber) => {
    if (pageNumber <= currentPage) {
      setFadeIn(false);
      setTimeout(() => {
        setCurrentPage(pageNumber);
        navigate(`/${lang}/signup?page=${pageNumber}`);
        setFadeIn(true);
      }, 300);
    }
  }, [currentPage, navigate]);

  const handleNotEmployedChange = useCallback((e) => {
    const notEmployed = e.target.checked;
    setIsNotEmployed(notEmployed);
    setHideNextButton(!notEmployed); // Set hideNextButton to false when checkbox is checked
    setFormData(prev => ({ ...prev, isNotEmployed: notEmployed }));
  }, []);

  // Add this useEffect to listen for URL query changes
  useEffect(() => {
    // Extract page from URL query
    const queryParams = new URLSearchParams(window.location.search);
    const pageParam = queryParams.get('page');
    
    // If there's a valid page parameter that's different from currentPage, update currentPage
    if (pageParam && !isNaN(pageParam) && parseInt(pageParam) !== currentPage) {
      const pageNumber = parseInt(pageParam);
      // Only allow valid page numbers
      if (pageNumber >= 1 && pageNumber <= totalPages) {
        setFadeIn(false);
        setTimeout(() => {
          setCurrentPage(pageNumber);
          setFadeIn(true);
        }, 300);
      }
    }
  }, [window.location.search, currentPage, totalPages]);

  // Improve the handleEmailChange function
  const handleEmailChange = useCallback(async (e) => {
    const { value } = e.target;
    setFormData(prev => ({ ...prev, email: value }));
    
    // Clear existing email error
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.email;
      return newErrors;
    });
    
    // If email is valid format, check availability
    const emailValidation = validateInput(value, 'email|max:300');
    if (emailValidation.isValid && value.trim()) {
      try {
        console.log("Checking email availability for:", value);
        const auth = getFirebaseAuth();
        if (!auth) {
          throw new Error('Firebase authentication not initialized');
        }

        // Try method 1: fetchSignInMethodsForEmail
        const signInMethods = await fetchSignInMethodsForEmail(auth, value);
        console.log("Sign-in methods for email:", signInMethods);
        
        if (signInMethods && signInMethods.length > 0) {
          console.log("Email already exists in Firebase!");
          setErrors(prev => ({ 
            ...prev, 
            email: 'An account with this email already exists' 
          }));
        } else {
          // Try method 2: Attempt to create a user to see if it's taken
          try {
            // Generate a temporary random password
            const tempPassword = Math.random().toString(36).slice(-8);
            
            // Try to create a user - if email exists, this will throw an error
            await createUserWithEmailAndPassword(auth, value, tempPassword)
              .then(async (userCredential) => {
                // If user was created successfully, email doesn't exist, so immediately delete it
                console.log("Temporary user created, email is available");
                await userCredential.user.delete();
              });
          } catch (createError) {
            console.log("Create user error:", createError);
            if (createError.code === 'auth/email-already-in-use') {
              console.log("Email already exists (method 2)!");
              setErrors(prev => ({ 
                ...prev, 
                email: 'An account with this email already exists' 
              }));
            }
          }
        }
      } catch (error) {
        console.error("Email validation error:", error);
        // Only set error if it's a specific invalid email problem
        if (error.code === 'auth/invalid-email') {
          setErrors(prev => ({ 
            ...prev, 
            email: 'Invalid email format' 
          }));
        }
      }
    }
  }, []);

  return (
    <div className={`signup-container ${isLargePage ? 'large-page' : ''}`}>
      <div className="signup-content">
        {isLargePage && <div className="spacer"></div>}
        <div className="signup-container-header">
          <img src={logoImage} alt="Logo" className="login-logo" style={{height: '6vh', marginBottom: '0', marginTop: '0'}}/>
        </div>
        {isLargePage && <div className="spacer"></div>}
        <div className="form-container">
          <CSSTransition in={fadeIn} timeout={300} classNames="fade" unmountOnExit>
            <div>
              {currentPage === 1 && (
                <Page1
                  userType={userType}
                  handleUserTypeChange={handleUserTypeChange}
                  textColor="#000000"
                />
              )}
              {currentPage === 2 && (
                <>
                  {userType === 'Employee' ? (
                    <Page2_Employee 
                      formData={formData}
                      handleInputChange={handleInputChange}
                      handleEmailChange={handleEmailChange}
                      errors={errors}
                      handleErrorReset={handleErrorReset}
                      showErrors={showErrors}
                    />
                  ) : (
                    <Page2_Manager 
                      formData={formData}
                      handleInputChange={handleInputChange}
                      handleEmailChange={handleEmailChange}
                      errors={errors}
                      handleErrorReset={handleErrorReset}
                      showErrors={showErrors}
                    />
                  )}
                </>
              )}
              {currentPage === 3 && (
                <>
                  {userType === 'Employee' ? (
                    <Page3_Employee
                      isCurrentlyEmployed={isCurrentlyEmployed}
                      handleEmploymentSwitch={handleEmploymentSwitch}
                      isFranchise={isFranchise}
                      handleFranchiseSwitch={handleFranchiseSwitch}
                      formData={formData}
                      handleInputChange={handleInputChange}
                      errors={errors}
                      handleErrorReset={handleErrorReset}
                      isTransitioning={isTransitioning}
                      showLegalNotice={showLegalNotice}
                      showUnemployedButton={showUnemployedButton}
                      setShowNavigation={setShowNavigation}
                      handleNavigation={handleNavigation}
                      isNotEmployed={formData.isNotEmployed}
                      handleNotEmployedChange={handleNotEmployedChange}
                      showErrors={showErrors}
                    />
                  ) : (
                    <Page3_Manager
                      formData={formData}
                      handleInputChange={handleInputChange}
                      errors={errors}
                      handleErrorReset={handleErrorReset}
                      isFranchise={isFranchise}
                      handleFranchiseSwitch={handleFranchiseSwitch}
                      showErrors={showErrors}
                    />
                  )}
                </>
              )}
              {currentPage === 4 && userType === 'Employee' && (
                <Page4_Employee
                  formData={formData}
                  handleInputChange={handleInputChange}
                  errors={errors}
                  handleErrorReset={handleErrorReset}
                  showErrors={showErrors}
                >
                  <h2 className="page-title">Additional Information</h2>
                  <p className="page-subtitle">Tell us about your experience and preferences</p>
                </Page4_Employee>
              )}
              {currentPage === 4 && userType === 'Manager' && (
                <PagePassword 
                  formData={formData}
                  handleInputChange={handleInputChange}
                  errors={errors}
                  handleErrorReset={handleErrorReset}
                />
              )}
              {currentPage === 5 && userType === 'Employee' && (
                <PagePassword 
                  formData={formData}
                  handleInputChange={handleInputChange}
                  errors={errors}
                  handleErrorReset={handleErrorReset}
                />
              )}
              {((currentPage === 5 && userType === 'Manager') || (currentPage === 6 && userType === 'Employee')) && (
                <PageValidation />
              )}
            </div>
          </CSSTransition>
        </div>
        {showNavigation && currentPage !== 1 && currentPage !== getTotalPages() && (
          <NavigationBar
            zIndex="0"
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={() => handleNavigation('prev')}
            onNext={handleNext}
            onDotClick={handleDotNavigation}
            isMobile={isMobile}
            dotActiveColor="#000000"
            dotInactiveColor="#e0e0e0"
            dotBorderColor="#000000"
            dotBorderWidth="0"
            maxWidth="533px"
            isFixed={true}
            hideNext={hideNextButton && currentPage === 3 && userType === 'Employee' && !isCurrentlyEmployed && !isNotEmployed}
            isNotEmployed={formData.isNotEmployed}
          />
        )}
      </div>
    </div>
  );
};

export default Signup;
