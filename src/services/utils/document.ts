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

export type DocumentType = 'identity' | 'work_permit' | 'diploma' | 'billing' | 'commercial_registry' | 'gln_certificate' | 'generic';

export interface DocumentProcessingOptions {
  documentType: DocumentType;
  extractFields?: string[];
  dropdownOptions?: Record<string, any[]>;
}

export interface ProcessedDocument {
  success: boolean;
  documentType: string;
  fields: Record<string, any>;
  confidence: number;
  rawText?: string;
  error?: string;
}

export const processDocumentWithAI = async (
  documentUrl: string,
  documentType: string,
  storagePath?: string,
  mimeType?: string,
  dropdownOptions?: Record<string, any[]>
): Promise<ProcessedDocument> => {
  try {
    const { functions } = await import('../services/firebase');
    const { httpsCallable } = await import('firebase/functions');
    
    const processDocumentFunction = httpsCallable(functions, 'processDocument');
    
    const result = await processDocumentFunction({
      documentUrl,
      documentType,
      storagePath,
      mimeType,
      dropdownOptions
    });

    const data = result.data as any;
    
    return {
      success: data.success || false,
      documentType,
      fields: data.fields || {},
      confidence: data.confidence || 0,
      rawText: data.rawText,
      error: data.error
    };
  } catch (error: any) {
    console.error('[DocumentProcessing] Failed to process document:', error);
    return {
      success: false,
      documentType,
      fields: {},
      confidence: 0,
      error: error.message || 'Failed to process document'
    };
  }
};

