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
  // User requested to remove checksum and only keep 13-digit validation
  return /^\d{13}$/.test(gln);
};

export const normalizeGLNData = (source, type) => {
  if (!source) return null;

  if (type === 'medReg') {
    // source is an entry from medReg search
    const profession = source.professions?.[0]?.profession;
    return {
      name: source.name || '',
      firstName: source.firstName || '',
      gln: source.gln,
      professions: source.professions || [],
      primaryProfession: profession?.textEn || profession?.textFr || profession?.textDe || '',
      nationality: source.nationality?.textEn || '',
      gender: source.gender?.textEn || '',
      registry: 'medReg'
    };
  }

  if (type === 'gesReg') {
    // source is an entry from gesReg (usually inside Data or as a flat object)
    return {
      name: source.PersonLastName || '',
      firstName: source.PersonFirstName || '',
      gln: source.PersonGlnNumber,
      primaryProfession: source.Diplomas?.[0]?.ProfessionName || source.ProfessionName || '',
      professions: source.Diplomas?.map(d => ({ profession: { textEn: d.ProfessionName } })) || [],
      registry: 'gesReg'
    };
  }

  if (type === 'betReg') {
    // source is company details from BetReg
    return {
      name: source.name || '',
      additionalName: source.additionalName || '',
      gln: source.glnCompany || source.uid,
      uid: source.uid,
      streetWithNumber: `${source.street || ''} ${source.streetNumber || ''}`.trim(),
      zip: source.zip,
      city: source.city,
      canton: source.canton,
      responsiblePersons: source.responsiblePersons || [],
      registry: 'betReg'
    };
  }

  return source;
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


