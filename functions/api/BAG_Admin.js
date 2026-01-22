const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

const healthRegistryAPI = onCall({ region: 'europe-west6', database: 'medishift', cors: true }, async (request) => {
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
      professionId: null,
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

const companySearchAPI = onCall({ region: 'europe-west6', database: 'medishift', cors: true }, async (request) => {
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

const companyDetailsAPI = onCall({ region: 'europe-west6', database: 'medishift', cors: true }, async (request) => {
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

const verifyProfileAPI = onCall({ region: 'europe-west6', database: 'medishift', cors: true }, async (request) => {
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

const uidAPI = onCall({ region: 'europe-west6', database: 'medishift', cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be logged in to use this API'
    );
  }

  const { uid } = request.data;

  if (!uid) {
    throw new HttpsError(
      'invalid-argument',
      'UID is required'
    );
  }

  try {
    const uidFormatted = uid.trim().toUpperCase();
    const detailUrl = `https://www.uid.admin.ch/Detail.aspx?uid_id=${encodeURIComponent(uidFormatted)}`;

    logger.info('Fetching UID data from:', detailUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response;
    try {
      response = await fetch(detailUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
          'Referer': 'https://www.uid.admin.ch/Search.aspx?lang=en'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout: The UID registry did not respond within 30 seconds');
      }
      throw new Error(`Network error: ${fetchError.message}`);
    }

    if (!response.ok) {
      logger.error(`UID registry API returned status ${response.status}`);
      const errorText = await response.text().catch(() => '');
      throw new Error(`UID registry API returned status ${response.status}: ${response.statusText}. Response: ${errorText.substring(0, 200)}`);
    }

    const html = await response.text();

    if (!html || html.length === 0) {
      throw new Error('Empty response from UID registry');
    }

    logger.info('HTML received, length:', html.length);

    if (html.includes('Error') && html.includes('unbekannt')) {
      throw new Error('UID not found or invalid');
    }

    const extractUIDData = (htmlContent) => {
      const data = {
        uid: uidFormatted,
        name: null,
        additionalName: null,
        translation: null,
        street: null,
        postalCode: null,
        city: null,
        canton: null,
        country: null,
        municipality: null,
        municipalityNumber: null,
        egid: null,
        deliverable: null,
        lastCheck: null,
        legalForm: null,
        hrStatus: null,
        hrReference: null,
        vatStatus: null,
        vatNumber: null,
        vatStartDate: null,
        vatEndDate: null,
        vatGroupUID: null
      };

      const extractField = (html, patterns) => {
        for (const pattern of patterns) {
          const match = html.match(pattern);
          if (match && match[1]) {
            const value = match[1].trim();
            return value.length > 0 ? value : null;
          }
        }
        return null;
      };

      data.name = extractField(htmlContent, [
        /<span[^>]*id="[^"]*lblName[^"]*"[^>]*>([^<]*)<\/span>/i,
        /<td[^>]*>[\s\S]*?Name[\s\S]*?<\/td>[\s\S]*?<td[^>]*>([^<]*)<\/td>/i,
        /Name[:\s]*<[^>]*>([^<]+)</i
      ]);

      data.additionalName = extractField(htmlContent, [
        /<span[^>]*id="[^"]*lblAdditionalName[^"]*"[^>]*>([^<]*)<\/span>/i,
        /Zusätzlicher Name[:\s]*<[^>]*>([^<]+)</i
      ]);

      data.translation = extractField(htmlContent, [
        /<span[^>]*id="[^"]*lblTranslation[^"]*"[^>]*>([^<]*)<\/span>/i,
        /Übersetzung[:\s]*<[^>]*>([^<]+)</i
      ]);

      data.street = extractField(htmlContent, [
        /<span[^>]*id="[^"]*lblStreet[^"]*"[^>]*>([^<]*)<\/span>/i,
        /Strasse[:\s\/]*<[^>]*>([^<]+)</i,
        /boulevard[^<]*/i
      ]);

      if (!data.street) {
        const streetMatch = htmlContent.match(/boulevard[^<]*/i);
        if (streetMatch) {
          data.street = streetMatch[0].trim();
        }
      }

      data.postalCode = extractField(htmlContent, [
        /<span[^>]*id="[^"]*lblPostalCode[^"]*"[^>]*>([^<]*)<\/span>/i,
        /PLZ[:\s]*<[^>]*>([^<]+)</i,
        /(\d{4})\s*Genève/i
      ]);

      data.city = extractField(htmlContent, [
        /<span[^>]*id="[^"]*lblCity[^"]*"[^>]*>([^<]*)<\/span>/i,
        /Ort[:\s]*<[^>]*>([^<]+)</i,
        /\d{4}\s*(Genève|Zürich|Bern|Basel|Lausanne)/i
      ]);

      data.canton = extractField(htmlContent, [
        /<span[^>]*id="[^"]*lblCanton[^"]*"[^>]*>([^<]*)<\/span>/i,
        /Kanton[:\s]*<[^>]*>([^<]+)</i,
        /(GE|ZH|BE|BS|VD|AG|SG|LU|TI|VS|FR|NE|GR|TG|SH|AR|AI|GL|NW|OW|UR|SZ|ZG|BL|SO)/i
      ]);

      data.country = extractField(htmlContent, [
        /<span[^>]*id="[^"]*lblCountry[^"]*"[^>]*>([^<]*)<\/span>/i,
        /Land[:\s]*<[^>]*>([^<]+)</i
      ]);

      data.municipality = extractField(htmlContent, [
        /<span[^>]*id="[^"]*lblMunicipality[^"]*"[^>]*>([^<]*)<\/span>/i,
        /Gemeinde[:\s]*<[^>]*>([^<]+)</i
      ]);

      data.municipalityNumber = extractField(htmlContent, [
        /<span[^>]*id="[^"]*lblMunicipalityNumber[^"]*"[^>]*>([^<]*)<\/span>/i,
        /Gemeinde-Nr\.[:\s]*<[^>]*>([^<]+)</i
      ]);

      data.egid = extractField(htmlContent, [
        /<span[^>]*id="[^"]*lblEGID[^"]*"[^>]*>([^<]*)<\/span>/i,
        /EGID[:\s]*<[^>]*>([^<]+)</i
      ]);

      data.deliverable = extractField(htmlContent, [
        /<span[^>]*id="[^"]*lblDeliverable[^"]*"[^>]*>([^<]*)<\/span>/i,
        /Zustellbar[:\s]*<[^>]*>([^<]+)</i
      ]);

      data.lastCheck = extractField(htmlContent, [
        /<span[^>]*id="[^"]*lblLastCheck[^"]*"[^>]*>([^<]*)<\/span>/i,
        /Letzte Prüfung[:\s]*<[^>]*>([^<]+)</i
      ]);

      data.legalForm = extractField(htmlContent, [
        /<span[^>]*id="[^"]*lblLegalForm[^"]*"[^>]*>([^<]*)<\/span>/i,
        /Rechtsform[:\s]*<[^>]*>([^<]+)</i,
        /(\d{4}\s*-\s*[^<]+)/i
      ]);

      data.hrStatus = extractField(htmlContent, [
        /<span[^>]*id="[^"]*lblHRStatus[^"]*"[^>]*>([^<]*)<\/span>/i,
        /Status HR[:\s]*<[^>]*>([^<]+)</i
      ]);

      data.hrReference = extractField(htmlContent, [
        /<span[^>]*id="[^"]*lblHRReference[^"]*"[^>]*>([^<]*)<\/span>/i,
        /Referenznummer[:\s]*<[^>]*>([^<]+)</i
      ]);

      data.vatStatus = extractField(htmlContent, [
        /<span[^>]*id="[^"]*lblVATStatus[^"]*"[^>]*>([^<]*)<\/span>/i,
        /Status MWST-Register[:\s]*<[^>]*>([^<]+)</i
      ]);

      data.vatNumber = extractField(htmlContent, [
        /<span[^>]*id="[^"]*lblVATNumber[^"]*"[^>]*>([^<]*)<\/span>/i,
        /MWST-Nummer[:\s]*<[^>]*>([^<]+)</i
      ]);

      data.vatStartDate = extractField(htmlContent, [
        /<span[^>]*id="[^"]*lblVATStartDate[^"]*"[^>]*>([^<]*)<\/span>/i,
        /Beginn MWST-Pflicht[:\s]*<[^>]*>([^<]+)</i
      ]);

      data.vatEndDate = extractField(htmlContent, [
        /<span[^>]*id="[^"]*lblVATEndDate[^"]*"[^>]*>([^<]*)<\/span>/i,
        /Ende MWST-Pflicht[:\s]*<[^>]*>([^<]+)</i
      ]);

      data.vatGroupUID = extractField(htmlContent, [
        /<span[^>]*id="[^"]*lblVATGroupUID[^"]*"[^>]*>([^<]*)<\/span>/i,
        /UID der MWST-Gruppe[:\s]*<[^>]*>([^<]+)</i
      ]);

      return data;
    };

    const extractedData = extractUIDData(html);

    logger.info('Extracted data:', JSON.stringify(extractedData, null, 2));

    return {
      success: true,
      data: extractedData
    };
  } catch (error) {
    logger.error('Error in UID API:', error);
    logger.error('Error stack:', error.stack);
    logger.error('Error message:', error.message);
    logger.error('Error name:', error.name);

    const errorMessage = error.message || error.toString() || 'Failed to query UID registry';

    return {
      success: false,
      error: `UID API Error: ${errorMessage}`,
      errorCode: error.name || 'UnknownError',
      errorDetails: error.stack ? error.stack.substring(0, 500) : undefined
    };
  }
});

const gesRegAPI = onCall({ region: 'europe-west6', database: 'medishift', cors: true }, async (request) => {
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
    // GesReg request details
    // URL: https://www.gesreg.admin.ch/Search/Read?PersonGlnNumber=[GLN]
    // Method: POST
    // Content-Type: application/x-www-form-urlencoded; charset=UTF-8

    const params = new URLSearchParams();
    params.append('PersonGlnNumber', gln);
    // Add other empty filters if needed to match the browser request exactly, 
    // though usually just the relevant one is enough.
    // Based on user request data:
    // Filter=PersonLastName%3D%26PersonFirstName%3D%26CodeDiplomaProfession%3D%26CodeDiplomaDiplomaType%3D%26DiplomaSrkRegisterId%3D%26PersonGlnNumber%3D7601001676183%26CodeLicenceCanton%3D%26CodeSearchLicenceStatus%3D%26AddressStreet%3D%26AddressZip%3D%26AddressPlace%3D
    // We can try sending just the GLN first, or reconstruct the full filter string if strictness is required.
    // The user provided "Request URL" has the GLN in the query string as well: ?PersonGlnNumber=...

    // Constructing the URL with query param as shown in "Request URL"
    const url = `https://www.gesreg.admin.ch/Search/Read?PersonGlnNumber=${gln}`;

    // Body content based on "content-type: application/x-www-form-urlencoded; charset=UTF-8"
    // and "cookie: Filter=..." which suggests the server might rely on cookies or body. 
    // The user showed "Request Method: POST" and "content-length: 354" for the request, 
    // but the payload wasn't fully shown in the snippet, assuming it's the filter parameters.
    // Let's try to mimic the form data.

    // Recreating the filter string from the cookie/payload hint
    // PersonLastName=&PersonFirstName=&CodeDiplomaProfession=&CodeDiplomaDiplomaType=&DiplomaSrkRegisterId=&PersonGlnNumber=7601001676183&CodeLicenceCanton=&CodeSearchLicenceStatus=&AddressStreet=&AddressZip=&AddressPlace=

    const formData = new URLSearchParams();
    formData.append('PersonLastName', '');
    formData.append('PersonFirstName', '');
    formData.append('CodeDiplomaProfession', '');
    formData.append('CodeDiplomaDiplomaType', '');
    formData.append('DiplomaSrkRegisterId', '');
    formData.append('PersonGlnNumber', gln);
    formData.append('CodeLicenceCanton', '');
    formData.append('CodeSearchLicenceStatus', '');
    formData.append('AddressStreet', '');
    formData.append('AddressZip', '');
    formData.append('AddressPlace', '');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'
      },
      body: formData.toString()
    });

    if (!response.ok) {
      throw new Error(`GesReg API returned status ${response.status}`);
    }

    const result = await response.json();

    return {
      success: true,
      data: result
    };
  } catch (error) {
    logger.error('Error in GesReg API:', error);
    throw new HttpsError(
      'internal',
      error.message || 'Failed to query GesReg'
    );
  }
});

module.exports = {
  healthRegistryAPI,
  companySearchAPI,
  companyDetailsAPI,
  verifyProfileAPI,
  uidAPI,
  gesRegAPI
};

