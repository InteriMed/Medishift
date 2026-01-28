/**
 * Phone Number Utilities
 * E.164 compliance and formatting
 */

interface PhoneFormatResult {
  cleanNumber: string;
  cleanPrefix: string;
  fullNumber: string;
}

/**
 * Formats a phone number for E.164 compliance
 * Removes all non-digits and leading zeros
 * @param number - The phone number to format
 * @param prefix - Optional country prefix (e.g. +41)
 * @returns { cleanNumber, fullNumber, cleanPrefix }
 */
export const formatPhoneNumber = (number: string, prefix: string = ''): PhoneFormatResult => {
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

