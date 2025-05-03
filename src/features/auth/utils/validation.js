/**
 * Email validation regex
 * @type {RegExp}
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Password validation regex 
 * At least 8 characters, one uppercase, one lowercase, one number
 * @type {RegExp}
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{8,}$/;

/**
 * Phone number validation - allows different formats
 * @type {RegExp}
 */
const PHONE_REGEX = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;

/**
 * Validates personal information form
 * @param {Object} data - Form data
 * @returns {Object} Validation errors
 */
export const validatePersonalInfo = (data) => {
  const errors = {};
  
  if (!data.firstName?.trim()) {
    errors.firstName = 'First name is required';
  }
  
  if (!data.lastName?.trim()) {
    errors.lastName = 'Last name is required';
  }
  
  if (!data.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(data.email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  if (data.phone && !PHONE_REGEX.test(data.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }
  
  if (!data.userType) {
    errors.userType = 'Please select an account type';
  }
  
  return errors;
};

/**
 * Validates employee details form
 * @param {Object} data - Form data
 * @returns {Object} Validation errors
 */
export const validateEmployeeDetails = (data) => {
  const errors = {};
  
  if (!data.specializationArea?.length) {
    errors.specializationArea = 'Please select at least one specialization area';
  }
  
  if (!data.yearsOfExperience) {
    errors.yearsOfExperience = 'Please select your experience level';
  }
  
  return errors;
};

/**
 * Validates manager details form
 * @param {Object} data - Form data
 * @returns {Object} Validation errors
 */
export const validateManagerDetails = (data) => {
  const errors = {};
  
  if (!data.companyName?.trim()) {
    errors.companyName = 'Company name is required';
  }
  
  if (!data.position?.trim()) {
    errors.position = 'Position is required';
  }
  
  if (!data.companySize) {
    errors.companySize = 'Please select company size';
  }
  
  if (!data.sector) {
    errors.sector = 'Please select your sector';
  }
  
  return errors;
};

/**
 * Validates password form
 * @param {Object} data - Form data
 * @returns {Object} Validation errors
 */
export const validatePassword = (data) => {
  const errors = {};
  
  if (!data.password) {
    errors.password = 'Password is required';
  } else if (!PASSWORD_REGEX.test(data.password)) {
    errors.password = 'Password must be at least 8 characters and include uppercase, lowercase, and numbers';
  }
  
  if (!data.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  
  return errors;
};

/**
 * Validates final step with terms
 * @param {Object} data - Form data
 * @returns {Object} Validation errors
 */
export const validateFinalStep = (data) => {
  const errors = {};
  
  if (!data.acceptTerms) {
    errors.acceptTerms = 'You must accept the terms and conditions to continue';
  }
  
  return errors;
};

/**
 * Validates login form
 * @param {Object} data - Login data
 * @returns {Object} Validation errors
 */
export const validateLogin = (data) => {
  const errors = {};
  
  if (!data.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(data.email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  if (!data.password) {
    errors.password = 'Password is required';
  }
  
  return errors;
};

/**
 * Validates password reset request
 * @param {Object} data - Form data
 * @returns {Object} Validation errors
 */
export const validatePasswordResetRequest = (data) => {
  const errors = {};
  
  if (!data.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(data.email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  return errors;
}; 