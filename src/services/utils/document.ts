/**
 * Document Processing Utilities
 */

/**
 * Get proper MIME type from file
 */
export const getMimeType = (file: File): string => {
  const ext = file.name?.split('.').pop()?.toLowerCase();

  const unsupportedFormats = ['heic', 'heif'];
  if (unsupportedFormats.includes(ext || '') || file.type === 'image/heic' || file.type === 'image/heif') {
    return 'image/jpeg';
  }

  if (file.type && file.type !== '' && file.type !== 'application/octet-stream') {
    return file.type;
  }

  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };

  return mimeTypes[ext || ''] || 'image/jpeg';
};

/**
 * Check document expiry status
 */
export const checkDocumentExpiry = (expiryDateString: string) => {
  if (!expiryDateString) return { isExpired: false, isExpiringSoon: false, daysUntilExpiry: null };

  const expiryDate = new Date(expiryDateString);
  const now = new Date();
  const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    isExpired: expiryDate < now,
    isExpiringSoon: daysUntilExpiry < 90 && daysUntilExpiry >= 0,
    daysUntilExpiry
  };
};

/**
 * Generate unique document identifier
 */
export const generateDocumentUID = (): string => {
  return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Convert permit type to profile format
 */
export const convertPermitTypeToProfileFormat = (permitType: string): string | null => {
  if (!permitType) return null;
  return `permit_${permitType.toLowerCase()}`;
};

