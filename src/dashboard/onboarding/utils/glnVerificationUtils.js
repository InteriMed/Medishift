export const getMimeType = (file) => {
  const ext = file.name?.split('.').pop()?.toLowerCase();

  const unsupportedFormats = ['heic', 'heif'];
  if (unsupportedFormats.includes(ext) || file.type === 'image/heic' || file.type === 'image/heif') {
    console.warn('[getMimeType] HEIC/HEIF detected - these formats may not be supported. Consider converting to JPEG.');
    return 'image/jpeg';
  }

  if (file.type && file.type !== '' && file.type !== 'application/octet-stream') {
    return file.type;
  }

  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };

  return mimeTypes[ext] || 'image/jpeg';
};

export const extractStreetName = (fullStreet) => {
  if (!fullStreet) return '';
  return fullStreet.replace(/\s+\d+[a-zA-Z]?$/, '').trim();
};

export const extractHouseNumber = (fullStreet) => {
  if (!fullStreet) return '';
  const match = fullStreet.match(/(\d+[a-zA-Z]?)$/);
  return match ? match[1] : '';
};

export const convertPermitTypeToProfileFormat = (permitType) => {
  if (!permitType) return null;
  return `permit_${permitType.toLowerCase()}`;
};

export const validateGLNChecksum = (gln) => {
  if (!/^\d{13}$/.test(gln)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    let digit = parseInt(gln[i]);
    if ((12 - i) % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(gln[12]);
};

export const validateSwissUID = (uid) => {
  if (!uid) return false;
  return /^CHE-\d{3}\.\d{3}\.\d{3}$/.test(uid);
};

export const checkDocumentExpiry = (expiryDateString) => {
  if (!expiryDateString) return { isExpired: false, isExpiringSoon: false, daysUntilExpiry: null };

  const expiryDate = new Date(expiryDateString);
  const now = new Date();
  const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));

  return {
    isExpired: expiryDate < now,
    isExpiringSoon: daysUntilExpiry < 90 && daysUntilExpiry >= 0,
    daysUntilExpiry
  };
};

export const generateDocumentUID = () => {
  return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Formats a phone number for E.164 compliance
 * Removes all non-digits and leading zeros
 * @param {string} number - The phone number to format
 * @param {string} prefix - Optional country prefix (e.g. +41)
 * @returns {Object} { cleanNumber, fullNumber, cleanPrefix }
 */
export const formatPhoneNumber = (number, prefix = '') => {
  if (!number) return { cleanNumber: '', fullNumber: '', cleanPrefix: prefix };

  // 1. Normalize prefix
  const cleanPrefix = prefix.startsWith('+') ? prefix : `+${prefix.replace(/[^0-9]/g, '')}`;
  const prefixDigits = cleanPrefix.replace('+', '');

  // 2. Clean main number
  let cleanNumber = number.replace(/[^0-9]/g, '');

  // 3. Handle international prefixes (00 instead of +)
  if (cleanNumber.startsWith('00')) {
    cleanNumber = cleanNumber.substring(2);
  }

  // 4. Remove duplicated prefix if present in the main number
  if (prefixDigits && cleanNumber.startsWith(prefixDigits)) {
    cleanNumber = cleanNumber.substring(prefixDigits.length);
  }

  // 5. Remove leading zero (standard trunk prefix for national formatting)
  if (cleanNumber.startsWith('0')) {
    cleanNumber = cleanNumber.substring(1);
  }

  return {
    cleanNumber,
    cleanPrefix,
    fullNumber: `${cleanPrefix}${cleanNumber}`
  };
};


