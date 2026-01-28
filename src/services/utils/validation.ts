export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  return input.replace(/<[^>]*>/g, '');
};

export const validateName = (name: string): string => {
  const sanitizedName = sanitizeInput(name);
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]{2,50}$/;

  if (!sanitizedName) return "Name is required";
  if (!nameRegex.test(sanitizedName)) return "Name can only contain letters, spaces, hyphens and apostrophes";
  if (sanitizedName.length > 50) return "Name must be less than 50 characters";
  return "";
};

export const validateEmail = (email: string): boolean => {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

export const validatePhone = (phone: string): string => {
  if (!phone) return "";
  const phoneRegex = /^\+?[\d\s-]{8,15}$/;

  if (!phoneRegex.test(phone)) return "Please enter a valid phone number";
  return "";
};

export const validateDate = (date: string): string => {
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

interface PasswordValidation {
  isValid: boolean;
  message: string;
}

export const validatePassword = (password: string): PasswordValidation => {
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

export const validateConfirmPassword = (password: string, confirmPassword: string): string => {
  if (!confirmPassword) return "Please confirm your password";
  if (password !== confirmPassword) return "Passwords do not match";
  return "";
};

export const validatePhoneNumber = (phoneNumber: string): boolean => {
  return !!phoneNumber && phoneNumber.length >= 8;
};

export const passwordsMatch = (password: string, confirmPassword: string): boolean => {
  return password === confirmPassword;
};

export const validateVerificationCode = (code: string): boolean => {
  const re = /^\d{6}$/;
  return re.test(code);
};

interface ValidationResult {
  isValid: boolean;
  errorMessage: string;
}

export const validateInput = (value: string, verification?: string): ValidationResult => {
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

