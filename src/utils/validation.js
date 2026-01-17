// Input sanitization
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input.replace(/<[^>]*>/g, ''); // Basic XSS prevention
};

// Name validation
export const validateName = (name) => {
  const sanitizedName = sanitizeInput(name);
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]{2,50}$/;
  
  if (!sanitizedName) return "Name is required";
  if (!nameRegex.test(sanitizedName)) return "Name can only contain letters, spaces, hyphens and apostrophes";
  if (sanitizedName.length > 50) return "Name must be less than 50 characters";
  return "";
};

// Email validation
export const validateEmail = (email) => {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

// Phone number validation
export const validatePhone = (phone) => {
  if (!phone) return ""; // Phone is optional
  const phoneRegex = /^\+?[\d\s-]{8,15}$/;
  
  if (!phoneRegex.test(phone)) return "Please enter a valid phone number";
  return "";
};

// Date validation
export const validateDate = (date) => {
  if (!date) return "Date is required";
  
  const [year, month, day] = date.split('-').map(Number);
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  const minAge = 18;
  const maxAge = 100;
  
  if (isNaN(birthDate.getTime())) return "Please enter a valid date";
  
  const age = today.getFullYear() - birthDate.getFullYear();
  if (age < minAge) return `You must be at least ${minAge} years old`;
  if (age > maxAge) return "Please enter a valid birth date";
  
  return "";
};

// Password validation
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters' };
  }
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  
  if (!hasUpperCase) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!hasLowerCase) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!hasNumber) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  
  if (!hasSpecialChar) {
    return { isValid: false, message: 'Password must contain at least one special character' };
  }
  
  return { isValid: true, message: 'Password is strong' };
};

// Confirm password validation
export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) return "Please confirm your password";
  if (password !== confirmPassword) return "Passwords do not match";
  return "";
};

// Country validation
export const validateCountry = (country) => {
  if (!country) return "Country is required";
  return "";
};

// Company validation
export const validateCompany = (company) => {
  if (!company) return "Company is required";
  return "";
};

// Software validation
export const validateSoftware = (software) => {
  if (!software) return "Software is required";
  return "";
};

// Franchise name validation
export const validateFranchiseName = (name, isFranchise) => {
  if (isFranchise && !name) return "Franchise name is required";
  return "";
};

// Preferred work location validation
export const validateWorkLocation = (locations) => {
  if (!locations || locations.length === 0) return "At least one preferred work location is required";
  return "";
};

export const validateInput = (value, verification) => {
    if (!verification) return { isValid: true, errorMessage: '' };
    
    const rules = verification.split('|');
    let isValid = true;
    let errorMessage = '';
    const emailRegex = /^[a-zA-Z0-9!#$%&'*+\-/=?^_`{|}~]+(\.[a-zA-Z0-9!#$%&'*+\-/=?^_`{|}~]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
    const nameRegex = /^[a-zA-ZÀ-ÖØ-öø-ÿ'' -]+$/;
    const phoneRegex = /^\+?[0-9\s\-()]{7,15}$/;
    
    rules.forEach(rule => {
        if (value == null) {
            isValid = false;
            errorMessage = 'Value cannot be empty';
            return;
        }
    
        if (rule === 'required') {
            if (!value.trim()) {
                isValid = false;
                errorMessage = 'This field is required';
            }
        } else if (rule === 'email') {
            if (!emailRegex.test(value) || value.length > 300) {
                isValid = false;
                errorMessage = 'Please enter a valid email address (max 300 characters)';
            }
        } else if (rule === 'name') {
            if (!nameRegex.test(value)) {
                isValid = false;
                errorMessage = 'Name can only contain letters, spaces, hyphens, and apostrophes';
            }
        } else if (rule === 'phone') {
            if (!phoneRegex.test(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid phone number (7-15 digits, spaces, dashes, or parentheses allowed)';
            }
        } else if (rule.startsWith('min:')) {
            const minLength = parseInt(rule.split(':')[1]);
            if (value.length < minLength) {
                isValid = false;
                errorMessage = `Minimum length is ${minLength} characters`;
            }
        } else if (rule.startsWith('max:')) {
            const maxLength = parseInt(rule.split(':')[1]);
            if (value.length > maxLength) {
                isValid = false;
                errorMessage = `Maximum length is ${maxLength} characters`;
            }
        }
    });
    
    return { isValid, errorMessage };
};

/**
 * Validates phone number format (basic check)
 * @param {string} phoneNumber - The phone number to validate
 * @returns {boolean} - Whether the phone number is valid
 */
export const validatePhoneNumber = (phoneNumber) => {
  // This is a basic validation, you might want to use a more sophisticated approach
  return phoneNumber && phoneNumber.length >= 8;
};

/**
 * Validates that two passwords match
 * @param {string} password - The original password
 * @param {string} confirmPassword - The confirmation password
 * @returns {boolean} - Whether the passwords match
 */
export const passwordsMatch = (password, confirmPassword) => {
  return password === confirmPassword;
};

/**
 * Validates a verification code format (usually 6 digits)
 * @param {string} code - The verification code to validate
 * @returns {boolean} - Whether the code is valid
 */
export const validateVerificationCode = (code) => {
  const re = /^\d{6}$/;
  return re.test(code);
}; 