const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

const healthRegistryAPI = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be logged in to use this API'
    );
  }

  const { gln } = request.data;

  if (!gln) {
    throw new HttpsError(
      'invalid-argument',
      'GLN is required'
    );
  }

  try {
    const requestBody = {
      cetTitleKindIds: null,
      city: null,
      firstName: null,
      genderId: null,
      gln: gln,
      houseNumber: null,
      languageId: null,
      name: null,
      nationalityId: null,
      permissionCantonId: null,
      privateLawCetTitleKindIds: null,
      professionId: 2,
      professionalPracticeLicenseId: null,
      street: null,
      zip: null
    };

    const response = await fetch('https://www.healthreg-public.admin.ch/medreg/api/public/person/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Health registry API returned status ${response.status}`);
    }

    const result = await response.json();

    return {
      success: true,
      data: result
    };
  } catch (error) {
    logger.error('Error in health registry API:', error);
    throw new HttpsError(
      'internal',
      error.message || 'Failed to query health registry'
    );
  }
});

const companySearchAPI = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be logged in to use this API'
    );
  }

  const { glnCompany } = request.data;

  if (!glnCompany) {
    throw new HttpsError(
      'invalid-argument',
      'GLN Company is required'
    );
  }

  try {
    const requestBody = {
      name: '',
      companyTypeId: null,
      glnCompany: glnCompany,
      permissionCantonId: null,
      zip: null,
      city: null
    };

    const response = await fetch('https://www.healthreg-public.admin.ch/betreg/api/public/company/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Company search API returned status ${response.status}`);
    }

    const result = await response.json();

    return {
      success: true,
      data: result
    };
  } catch (error) {
    logger.error('Error in company search API:', error);
    throw new HttpsError(
      'internal',
      error.message || 'Failed to query company registry'
    );
  }
});

const companyDetailsAPI = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be logged in to use this API'
    );
  }

  const { companyId } = request.data;

  if (!companyId) {
    throw new HttpsError(
      'invalid-argument',
      'Company ID is required'
    );
  }

  try {
    const response = await fetch(`https://www.healthreg-public.admin.ch/betreg/api/public/company/${companyId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Company details API returned status ${response.status}`);
    }

    const result = await response.json();

    return {
      success: true,
      data: result
    };
  } catch (error) {
    logger.error('Error in company details API:', error);
    throw new HttpsError(
      'internal',
      error.message || 'Failed to query company details'
    );
  }
});

const verifyProfileAPI = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be logged in to use this API'
    );
  }

  try {
    const userId = request.auth.uid;
    const userDocRef = admin.firestore().collection('users').doc(userId);

    await userDocRef.update({
      is_verified_profile: true,
      profileVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      message: 'Profile verification status updated'
    };
  } catch (error) {
    logger.error('Error in verify profile API:', error);
    throw new HttpsError(
      'internal',
      error.message || 'Failed to verify profile'
    );
  }
});

module.exports = {
  healthRegistryAPI,
  companySearchAPI,
  companyDetailsAPI,
  verifyProfileAPI
};

