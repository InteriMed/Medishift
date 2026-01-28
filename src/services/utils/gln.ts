/**
 * GLN (Global Location Number) Validation and Utilities
 * Swiss healthcare provider and facility verification
 */

/**
 * Validates GLN checksum (13-digit format)
 */
export const validateGLNChecksum = (gln: string): boolean => {
  return /^\d{13}$/.test(gln);
};

/**
 * Validates Swiss UID format (CHE-XXX.XXX.XXX)
 */
export const validateSwissUID = (uid: string): boolean => {
  if (!uid) return false;
  return /^CHE-\d{3}\.\d{3}\.\d{3}$/.test(uid);
};

/**
 * Normalize GLN data from different registry sources
 */
export const normalizeGLNData = (source: any, type: 'medReg' | 'gesReg' | 'betReg'): any => {
  if (!source) return null;

  if (type === 'medReg') {
    // Source is an entry from medReg search
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
    // Source is an entry from gesReg (usually inside Data or as a flat object)
    return {
      name: source.PersonLastName || '',
      firstName: source.PersonFirstName || '',
      gln: source.PersonGlnNumber,
      primaryProfession: source.Diplomas?.[0]?.ProfessionName || source.ProfessionName || '',
      professions: source.Diplomas?.map((d: any) => ({ profession: { textEn: d.ProfessionName } })) || [],
      registry: 'gesReg'
    };
  }

  if (type === 'betReg') {
    // Source is company details from BetReg
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

/**
 * Extract street name from full address
 */
export const extractStreetName = (fullStreet: string): string => {
  if (!fullStreet) return '';
  return fullStreet.replace(/\s+\d+[a-zA-Z]?$/, '').trim();
};

/**
 * Extract house number from full address
 */
export const extractHouseNumber = (fullStreet: string): string => {
  if (!fullStreet) return '';
  const match = fullStreet.match(/(\d+[a-zA-Z]?)$/);
  return match ? match[1] : '';
};

export interface CloudFunctionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export const commercialRegistrySearchAPI = async (criteria: string): Promise<CloudFunctionResult> => {
  try {
    const { functions } = await import('../services/firebase');
    const { httpsCallable } = await import('firebase/functions');
    
    const searchFunction = httpsCallable(functions, 'commercialRegistrySearchAPI');
    const result = await searchFunction({ criteria });
    
    const data = result.data as any;
    return {
      success: data.success || true,
      data: data.data || data
    };
  } catch (error: any) {
    console.error('[CloudFunctions] Commercial registry search failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to search commercial registry'
    };
  }
};

export const companySearchAPI = async (gln: string): Promise<CloudFunctionResult> => {
  try {
    const { functions } = await import('../services/firebase');
    const { httpsCallable } = await import('firebase/functions');
    
    const searchFunction = httpsCallable(functions, 'companySearchAPI');
    const result = await searchFunction({ gln });
    
    const data = result.data as any;
    return {
      success: data.success || true,
      data: data.data || data
    };
  } catch (error: any) {
    console.error('[CloudFunctions] Company search failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to search company'
    };
  }
};

export const companyDetailsAPI = async (gln: string): Promise<CloudFunctionResult> => {
  try {
    const { functions } = await import('../services/firebase');
    const { httpsCallable } = await import('firebase/functions');
    
    const detailsFunction = httpsCallable(functions, 'companyDetailsAPI');
    const result = await detailsFunction({ gln });
    
    const data = result.data as any;
    return {
      success: data.success || true,
      data: data.data || data
    };
  } catch (error: any) {
    console.error('[CloudFunctions] Company details failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to get company details'
    };
  }
};

export const healthRegistryAPI = async (gln: string): Promise<CloudFunctionResult> => {
  try {
    const { functions } = await import('../services/firebase');
    const { httpsCallable } = await import('firebase/functions');
    
    const registryFunction = httpsCallable(functions, 'healthRegistryAPI');
    const result = await registryFunction({ gln });
    
    const data = result.data as any;
    return {
      success: data.success || true,
      data: data.data || data
    };
  } catch (error: any) {
    console.error('[CloudFunctions] Health registry lookup failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to lookup health registry'
    };
  }
};

export const gesRegAPI = async (gln: string): Promise<CloudFunctionResult> => {
  try {
    const { functions } = await import('../services/firebase');
    const { httpsCallable } = await import('firebase/functions');
    
    const gesRegFunction = httpsCallable(functions, 'gesRegAPI');
    const result = await gesRegFunction({ gln });
    
    const data = result.data as any;
    return {
      success: data.success || true,
      data: data.data || data
    };
  } catch (error: any) {
    console.error('[CloudFunctions] GesReg API failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to query GesReg'
    };
  }
};

