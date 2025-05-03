import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMultiStepForm } from '../../hooks/useMultiStepForm';
import FormProgress from '../../components/common/FormProgress';
import StepPersonalInfo from '../../components/signup/StepPersonalInfo';
import StepEmployeeDetails from '../../components/signup/StepEmployeeDetails';
import StepManagerDetails from '../../components/signup/StepManagerDetails';
import StepPassword from '../../components/signup/StepPassword';
import StepValidation from '../../components/signup/StepValidation';
import { registerUser } from '../../services/authService';
import styles from './SignUp.module.css';

const INITIAL_DATA = {
  // Personal details
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  userType: 'employee', // 'employee' or 'manager'
  
  // Employee-specific fields
  specializationArea: [],
  yearsOfExperience: '',
  availability: [],
  preferredWorkplaces: [],
  softwareExperience: [],
  
  // Manager-specific fields
  companyName: '',
  position: '',
  companySize: '',
  sector: '',
  
  // Password
  password: '',
  confirmPassword: '',
  
  // Validation
  acceptTerms: false,
};

const SignUp = () => {
  const [formData, setFormData] = useState(INITIAL_DATA);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const navigate = useNavigate();
  
  // Update the steps based on user type selection
  const getSteps = () => {
    const commonSteps = [
      <StepPersonalInfo 
        formData={formData} 
        updateFields={updateFields} 
        errors={errors}
      />,
      formData.userType === 'employee' 
        ? <StepEmployeeDetails 
            formData={formData} 
            updateFields={updateFields} 
            errors={errors}
          />
        : <StepManagerDetails 
            formData={formData} 
            updateFields={updateFields} 
            errors={errors} 
          />,
      <StepPassword 
        formData={formData} 
        updateFields={updateFields} 
        errors={errors}
      />,
      <StepValidation 
        formData={formData} 
        updateFields={updateFields} 
        errors={errors}
      />
    ];
    return commonSteps;
  };

  const { 
    currentStepIndex, 
    step, 
    steps, 
    isFirstStep, 
    isLastStep,
    next, 
    back, 
    goTo 
  } = useMultiStepForm(getSteps());
  
  // If user type changes, we need to recreate the steps
  useEffect(() => {
    // Rebuild the steps when userType changes
  }, [formData.userType]);
  
  const updateFields = (fields) => {
    setFormData(prev => ({ ...prev, ...fields }));
    
    // If changing userType, may need to reset some fields
    if (fields.userType && fields.userType !== formData.userType) {
      setFormData(prev => {
        const newData = { ...prev, ...fields };
        
        // Reset user-type-specific fields
        if (fields.userType === 'employee') {
          return {
            ...newData,
            companyName: '',
            position: '',
            companySize: '',
            sector: ''
          };
        } else {
          return {
            ...newData,
            specializationArea: [],
            yearsOfExperience: '',
            availability: [],
            preferredWorkplaces: [],
            softwareExperience: []
          };
        }
      });
    }
  };
  
  const validateCurrentStep = () => {
    const newErrors = {};
    
    // Validation logic for each step
    switch (currentStepIndex) {
      case 0: // Personal Info
        if (!formData.firstName) newErrors.firstName = 'First name is required';
        if (!formData.lastName) newErrors.lastName = 'Last name is required';
        if (!formData.email) {
          newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = 'Email is invalid';
        }
        if (!formData.phone) newErrors.phone = 'Phone number is required';
        break;
        
      case 1: // Employee/Manager Details
        if (formData.userType === 'employee') {
          if (!formData.specializationArea || formData.specializationArea.length === 0) {
            newErrors.specializationArea = 'Please select at least one specialization area';
          }
          if (!formData.yearsOfExperience) {
            newErrors.yearsOfExperience = 'Years of experience is required';
          }
        } else {
          if (!formData.companyName) newErrors.companyName = 'Company name is required';
          if (!formData.position) newErrors.position = 'Position is required';
        }
        break;
        
      case 2: // Password
        if (!formData.password) {
          newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        }
        
        if (!formData.confirmPassword) {
          newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
        break;
        
      case 3: // Validation
        if (!formData.acceptTerms) {
          newErrors.acceptTerms = 'You must accept the terms to proceed';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleNext = () => {
    if (validateCurrentStep()) {
      next();
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateCurrentStep()) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await registerUser(formData);
      setRegistrationComplete(true);
      
      // Redirect to verify email page or dashboard
      setTimeout(() => {
        navigate('/verify-email', { state: { email: formData.email } });
      }, 2000);
    } catch (error) {
      setErrors({
        submit: error.message || 'Registration failed. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const stepLabels = ['Personal Details', 'Professional Info', 'Security', 'Verification'];
  
  return (
    <div className={styles.signupContainer}>
      <h1 className={styles.title}>Create an Account</h1>
      
      <FormProgress 
        currentStep={currentStepIndex} 
        totalSteps={steps.length} 
        stepLabels={stepLabels}
      />
      
      <form onSubmit={handleSubmit} className={styles.form}>
        {registrationComplete ? (
          <div className={styles.success}>
            <h2>Registration Successful!</h2>
            <p>Redirecting you to verify your email...</p>
          </div>
        ) : (
          <>
            <div className={styles.formContent}>
              {step}
            </div>
            
            {errors.submit && (
              <div className={styles.error}>{errors.submit}</div>
            )}
            
            <div className={styles.formNavigation}>
              {!isFirstStep && (
                <button 
                  type="button" 
                  onClick={back} 
                  className={styles.backButton}
                  disabled={isSubmitting}
                >
                  Back
                </button>
              )}
              
              <button 
                type={isLastStep ? "submit" : "button"} 
                onClick={isLastStep ? undefined : handleNext} 
                className={styles.nextButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : (isLastStep ? 'Create Account' : 'Next')}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

export default SignUp; 