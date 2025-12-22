const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { VertexAI } = require('@google-cloud/vertexai');
const vision = require('@google-cloud/vision');

// SWISS/EU COMPLIANCE CONFIGURATION
// This configuration ensures all data processing remains within Switzerland/EU
// and is fully compliant with Swiss nFADP (revDSG):
//
// - Cloud Functions: europe-west6 (Zurich) - Set globally in functions/index.js
// - OCR (Vision API): eu-vision.googleapis.com (EU endpoint - Adequate Protection for Switzerland)
// - AI (Gemini): europe-west3 (Frankfurt) - Processing in Germany - legally compliant with Swiss nFADP (revDSG)
// - Storage: europe-west6 (Zurich) - Data at rest in Switzerland
//
// Note: Vision API does not have a Zurich-only endpoint, but the EU endpoint
// is legally considered "Adequate Protection" by Switzerland.

// CONFIGURE OCR TO USE EU ENDPOINT (Strictly EU processing)
const visionClient = new vision.ImageAnnotatorClient({
  apiEndpoint: 'eu-vision.googleapis.com'
});

// CONFIGURE AI (GEMINI) TO RUN IN ZURICH
const vertexAI = new VertexAI({
  project: process.env.GCLOUD_PROJECT || 'medishift-620fd',
  location: 'europe-west3'
});

/**
 * Process uploaded document using Vertex AI (Gemini) Multimodal capabilities
 * 
 * This function:
 * 1. Receives a document Storage Path (gs://...)
 * 2. Uses Gemini 1.5 Flash to directly process the file (PDF/Image)
 * 3. Returns structured JSON for form auto-fill
 */
exports.processDocument = onCall(
  {
    cors: true, // Enable CORS for all origins
    maxInstances: 10,
    timeoutSeconds: 300, // 5 minutes for processing
    memory: '1GiB' // Increase memory for AI processing
  },
  async (request) => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated to process documents'
      );
    }

    const userId = request.auth.uid;
    const { documentUrl, documentType, storagePath, mimeType } = request.data;

    // Rate limiting: 2 scans per minute
    const rateLimitRef = admin.firestore().collection('rateLimits').doc(userId);
    const rateLimitDoc = await rateLimitRef.get();
    const now = Date.now();
    const oneMinuteAgo = now - 60000; // 60 seconds

    if (rateLimitDoc.exists) {
      const data = rateLimitDoc.data();
      // Filter scans from the last minute
      const recentScans = (data.scans || []).filter(timestamp => timestamp > oneMinuteAgo);

      if (recentScans.length >= 2) {
        const oldestScan = Math.min(...recentScans);
        const waitTime = Math.ceil((oldestScan + 60000 - now) / 1000);
        throw new HttpsError(
          'resource-exhausted',
          `Rate limit exceeded. Please wait ${waitTime} seconds before processing another document.`
        );
      }

      // Update with current scan
      await rateLimitRef.update({
        scans: [...recentScans, now]
      });
    } else {
      // First scan for this user
      await rateLimitRef.set({
        scans: [now]
      });
    }

    // Fallback: If no storagePath is provided (legacy calls), we simply can't process reliably without gs:// URI for Gemini.
    // However, if we have documentUrl (https), we might be able to download it, but gs:// is preferred.
    // For now, we enforce storagePath.
    if (!storagePath) {
      console.warn('Missing storagePath, attempting to rely on legacy Vision API logic? No, failing for now to enforce migration.');
    }

    if (!storagePath) {
      throw new HttpsError(
        'invalid-argument',
        'Document Storage Path is required for AI processing'
      );
    }

    try {
      console.log(`Processing document: ${storagePath} (${mimeType}) for user: ${request.auth.uid}`);

      // Verify file exists in storage before processing
      const bucket = admin.storage().bucket();
      const file = bucket.file(storagePath);

      const [exists] = await file.exists();
      if (!exists) {
        console.error(`File not found in storage: ${storagePath}`);
        throw new HttpsError(
          'not-found',
          `Document not found at path: ${storagePath}. Please ensure the file was uploaded successfully.`
        );
      }

      // Construct gs:// URI
      const bucketName = bucket.name;
      const gsUri = `gs://${bucketName}/${storagePath}`;

      console.log(`Using GS URI: ${gsUri}`);

      // Step 1: Use Gemini to extract data directly
      const extractionResult = await extractStructuredDataWithGemini(gsUri, mimeType || 'application/pdf', documentType);

      console.log('[ProcessDocument] Extracted data structure:', JSON.stringify({
        hasStudies: !!extractionResult.parsedData?.professionalBackground?.studies,
        studiesCount: extractionResult.parsedData?.professionalBackground?.studies?.length || 0,
        hasWorkExperience: !!extractionResult.parsedData?.professionalBackground?.workExperience,
        workExperienceCount: extractionResult.parsedData?.professionalBackground?.workExperience?.length || 0,
        workExperienceSample: extractionResult.parsedData?.professionalBackground?.workExperience?.[0] || null
      }, null, 2));

      // Step 2: Save to transient cache (15 minutes TTL)
      const cacheRef = admin.firestore().collection('extractedDataCache').doc(userId);
      await cacheRef.set({
        data: extractionResult.parsedData,
        createdAt: now,
        expiresAt: now + (15 * 60 * 1000) // 15 minutes from now
      });

      // Step 3: Return the structured data with verification details
      return {
        success: true,
        data: extractionResult.parsedData,
        verificationDetails: {
          aiPrompt: extractionResult.prompt,
          rawAiResponse: extractionResult.rawResponse,
          sortedData: extractionResult.parsedData
        },
        cached: true,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      };

    } catch (error) {
      console.error('Error processing document:', error);
      throw new HttpsError(
        'internal',
        `Failed to process document: ${error.message}`
      );
    }
  }
);

/**
 * Extract structured data using Gemini 1.5 Flash Multimodal
 */
async function extractStructuredDataWithGemini(gsUri, mimeType, documentType) {
  const model = vertexAI.getGenerativeModel({
    model: 'gemini-2.5-flash'
  });

  const prompt = getExtractionPrompt(documentType);

  const filePart = {
    fileData: {
      fileUri: gsUri,
      mimeType: mimeType
    }
  };

  const textPart = {
    text: prompt
  };

  const request = {
    contents: [
      {
        role: 'user',
        parts: [filePart, textPart]
      }
    ]
  };

  const result = await model.generateContent(request);
  const response = result.response;

  // Extract text from response - SDK v1.9.0 structure
  let extractedText;
  if (response.candidates && response.candidates[0] && response.candidates[0].content) {
    extractedText = response.candidates[0].content.parts[0].text;
  } else if (typeof response.text === 'function') {
    extractedText = response.text();
  } else {
    throw new Error('Unable to extract text from AI response');
  }

  console.log('Gemini extraction complete, length:', extractedText.length);

  // Parse the JSON response
  let parsedData;
  try {
    // Remove markdown code blocks if present
    const jsonText = extractedText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    parsedData = JSON.parse(jsonText);
  } catch (parseError) {
    console.error('Failed to parse AI response:', extractedText);
    throw new Error('Failed to parse structured data from AI response');
  }

  return {
    prompt: prompt,
    rawResponse: extractedText,
    parsedData: parsedData
  };
}

/**
 * Generate extraction prompt based on document type
 */
function getExtractionPrompt(documentType) {
  const basePrompt = `You are a data extraction assistant. Extract information from the attached document and return it as a valid JSON object. Only include fields where you found actual data. Use null for missing data.
`;

  if (documentType === 'cv' || documentType === 'resume') {
    return basePrompt + `Extract the following information for a healthcare professional's CV/Resume:

Return a JSON object with this structure:
{
  "personalDetails": {
    "identity": {
      "legalFirstName": "string or null",
      "legalLastName": "string or null",
      "dateOfBirth": "YYYY-MM-DD or null",
      "nationality": "string or null"
    },
    "address": {
      "street": "string or null",
      "city": "string or null",
      "postalCode": "string or null",
      "canton": "string or null",
      "country": "string or null"
    },
    "contact": {
      "primaryEmail": "string or null",
      "primaryPhone": "string or null",
      "primaryPhonePrefix": "string or null"
    }
  },
  "professionalBackground": {
    "professionalSummary": "string or null",
    "studies": [
      {
        "degree": "string",
        "institution": "string",
        "year": "number or null",
        "field": "string or null",
        "startDate": "YYYY-MM-DD or null",
        "endDate": "YYYY-MM-DD or null"
      }
    ],
    "qualifications": [
      {
        "name": "string",
        "issuingOrganization": "string or null",
        "issueDate": "YYYY-MM-DD or null",
        "expiryDate": "YYYY-MM-DD or null"
      }
    ],
    "skills": [
      {
        "category": "language|software|technical|other",
        "name": "string",
        "proficiency": "string or null"
      }
    ],
    "specialties": ["string"],
    "workExperience": [
      {
        "jobTitle": "string",
        "employer": "string",
        "location": "string or null",
        "startDate": "YYYY-MM-DD or null",
        "endDate": "YYYY-MM-DD or null",
        "current": false,
        "description": "string or null"
      }
    ]
  },
  "billingInformation": {
    "bankDetails": {
      "accountHolderName": "string or null",
      "iban": "string or null",
      "bankName": "string or null"
    }
  }
}

Important:
- Extract dates in YYYY-MM-DD format
- For phone numbers, separate the prefix (e.g., "+41") from the number
- Only include data you can confidently extract
- Return valid JSON only, no additional text

FIELD DEFINITIONS:

1. **studies**: Academic education and formal degrees (e.g., Medical School, Bachelor's, Master's, PhD)
   - Include university degrees, medical school, residency programs
   - Extract start/end dates if available

2. **qualifications**: Professional certifications and credentials (NOT academic degrees)
   - Examples: Vaccination certificates, CAS certificates, board certifications, professional licenses
   - Include issuing organization and dates
   - Do NOT include university degrees here

3. **skills**: Translational and transferable skills with proficiency levels
   - ONLY extract major, relevant professional skills
   - Categories:
     * "language": Spoken languages (e.g., "French: B2", "English: C1", "German: Native")
     * "software": Professional software/tools (e.g., "EPIC EMR: Advanced", "Microsoft Office: Expert")
     * "technical": Technical skills (e.g., "Ultrasound: Proficient", "CPR: Certified")
     * "other": Other relevant skills
   - For proficiency, use specific levels when mentioned (A1-C2 for languages, Basic/Intermediate/Advanced/Expert for others)
   - Be selective - only include professionally relevant skills

CRITICAL - Professional Summary Guidelines:
For the "professionalSummary" field, you MUST generate a high-quality, compelling professional summary by:
1. Analyzing the entire CV/resume to understand the candidate's career trajectory, expertise, and unique value
2. Writing a concise (3-5 sentences) professional summary that:
   - Highlights their primary healthcare specialty and years of experience
   - Emphasizes their most impressive qualifications, certifications, or achievements
   - Showcases their unique skills or areas of expertise
   - Uses professional, confident language (third-person perspective)
   - Avoids generic phrases - be specific to this individual's background
3. The summary should read like it was written by a professional career consultant
4. Start with their professional title/role (e.g., "Board-certified cardiologist with...")
5. Focus on what makes them stand out in their field

Example of a GOOD summary:
"Board-certified emergency medicine physician with 8+ years of experience in high-volume urban trauma centers. Specialized in critical care management and advanced cardiac life support, with additional certification in ultrasound-guided procedures. Demonstrated expertise in leading multidisciplinary teams during mass casualty events and implementing evidence-based protocols that reduced patient wait times by 30%."

Example of a BAD summary (too generic):
"Experienced doctor with good skills and knowledge in medicine. Works well with others and dedicated to patient care."

If you cannot extract enough meaningful information to write a quality summary, set the field to null rather than writing something generic.`;
  } else if (documentType === 'businessDocument') {
    return basePrompt + `Extract the following information for a healthcare facility's business document:

Return a JSON object with this structure:
{
  "personalDetails": {
    "identity": {
      "legalFirstName": "Facility Name or null",
      "legalLastName": "string or null"
    },
    "address": {
      "street": "string or null",
      "city": "string or null",
      "postalCode": "string or null",
      "canton": "string or null",
      "country": "string or null"
    },
    "contact": {
      "primaryEmail": "string or null",
      "primaryPhone": "string or null",
      "primaryPhonePrefix": "string or null"
    }
  },
  "facilityDetails": {
    "facilityType": "string or null",
    "registrationNumber": "string or null",
    "taxId": "string or null",
    "capacity": "number or null"
  },
  "billingInformation": {
    "bankDetails": {
      "accountHolderName": "string or null",
      "iban": "string or null",
      "bankName": "string or null"
    }
  }
}

Important:
- Extract all contact and address information
- Look for registration numbers, tax IDs, or business identifiers
- Only include data you can confidently extract
- Return valid JSON only, no additional text`;
  } else if (documentType === 'identity' || documentType === 'identity_card' || documentType === 'passport' || documentType === 'swiss_permit' || documentType === 'authorization_card') {
    // Identity document extraction (ID cards, passports, Swiss permits)
    return basePrompt + `Extract identity information from this OFFICIAL IDENTITY DOCUMENT (ID card, passport, or Swiss residence permit).

IMPORTANT: This is an official government-issued identity document. Extract data precisely as it appears on the document.

Return a JSON object with this structure:
{
  "personalDetails": {
    "identity": {
      "firstName": "Given names as on document (string)",
      "lastName": "Family name/Surname as on document (string)",
      "legalFirstName": "Official given names exactly as written (string)",
      "legalLastName": "Official surname exactly as written (string)",
      "dateOfBirth": "YYYY-MM-DD format",
      "placeOfBirth": "City/Place of birth if shown (string or null)",
      "gender": "M or F (from document or MRZ)",
      "nationality": "3-letter ISO country code (e.g., FRA, CHE, DEU)",
      "citizenCountry": "Full country name if different from nationality code"
    },
    "address": {
      "street": "Street address if shown (string or null)",
      "city": "City if shown (string or null)",
      "postalCode": "Postal code if shown (string or null)",
      "canton": "Swiss canton code if shown (e.g., GE, VD, ZH) (string or null)",
      "country": "Country code (default CH for Swiss documents)"
    },
    "contact": {
      "primaryEmail": null,
      "primaryPhone": null,
      "primaryPhonePrefix": null
    }
  },
  "additionalInfo": {
    "documentType": "IDENTITY_CARD | PASSPORT | SWISS_PERMIT_B | SWISS_PERMIT_C | SWISS_PERMIT_L | SWISS_PERMIT_G | SWISS_PERMIT_OTHER",
    "documentNumber": "Document/Card number",
    "documentCategory": "Category description if visible (e.g., 'Permis UE/AELE')",
    "documentSubCategoryDescription": "Sub-category (e.g., 'valable pour toute la Suisse')",
    "dateOfIssue": "YYYY-MM-DD",
    "dateOfExpiry": "YYYY-MM-DD",
    "issuingAuthority": "Authority that issued the document",
    "cantonalReference": "Cantonal reference number if present",
    "personalIdentificationNumber": "Personal ID number if present (e.g., AVS/AHV)",
    "dateOfEntry": "Date of entry into Switzerland if shown (YYYY-MM-DD or null)",
    "documentTitleTranslations": {
      "German": "German title if shown",
      "French": "French title if shown", 
      "Italian": "Italian title if shown"
    },
    "mrz": ["Line 1 of MRZ", "Line 2 of MRZ", "Line 3 of MRZ (if present)"]
  }
}

CRITICAL EXTRACTION RULES:
1. For MRZ (Machine Readable Zone - the lines of code at bottom of document):
   - Extract each line as a separate string in the mrz array
   - Parse the MRZ to extract: surname, given names, date of birth, gender, nationality, document number
   - MRZ supersedes visual fields if there's a discrepancy

2. For Swiss Residence Permits:
   - "TITRE DE SÉJOUR" / "AUFENTHALTSTITEL" = Residence permit
   - Extract the permit type (B, C, L, G, etc.) from visual text or category
   - Extract expiry date and issue date
   - Extract cantonal reference (e.g., "GE47658LC")
   
3. For dates:
   - Always convert to YYYY-MM-DD format
   - MRZ dates are YYMMDD format - convert properly
   - Be careful with 2-digit years (assume 19xx for years > 30, 20xx otherwise)

4. For names:
   - Preserve special characters (é, ë, ç, etc.) if visible
   - legalFirstName and legalLastName should be EXACTLY as printed
   - firstName and lastName can be normalized (first letter uppercase)

5. For nationality:
   - Use 3-letter ISO codes: FRA (France), DEU (Germany), CHE (Switzerland), ITA (Italy), etc.

Return valid JSON only, no additional text.`;
  } else if (documentType === 'invoice' || documentType === 'bill' || documentType === 'tax_document') {
    // Invoice/billing document extraction
    return basePrompt + `Extract business and billing information from this invoice or tax document.

Return a JSON object with this structure:
{
  "personalDetails": {
    "identity": {
      "legalFirstName": null,
      "legalLastName": null
    },
    "address": {
      "street": "Company street address",
      "city": "City",
      "postalCode": "Postal code",
      "canton": "Swiss canton code (e.g., GE, VD) or null",
      "country": "Country code (CH by default)"
    },
    "contact": {
      "primaryEmail": "Business email if visible",
      "primaryPhone": "Business phone if visible",
      "primaryPhonePrefix": "Phone prefix (+41, etc)"
    }
  },
  "invoiceDetails": {
    "legalName": "Legal company name",
    "companyName": "Trading/display name if different",
    "uid": "UID/VAT number (CHE-XXX.XXX.XXX format)",
    "vatNumber": "Same as UID or alternative VAT number",
    "invoiceNumber": "Invoice number if visible",
    "invoiceDate": "YYYY-MM-DD",
    "billingAddress": {
      "street": "string",
      "city": "string",
      "postalCode": "string",
      "canton": "string or null",
      "country": "string"
    },
    "email": "Invoice/billing email",
    "invoiceEmail": "Same as email",
    "phone": "Business phone"
  },
  "businessDetails": {
    "legalName": "Legal company name (same as invoiceDetails.legalName)",
    "companyName": "Trading name",
    "uid": "UID number",
    "vatNumber": "VAT number",
    "address": {
      "street": "string",
      "city": "string", 
      "postalCode": "string",
      "canton": "string or null",
      "country": "string"
    }
  }
}

Important:
- Look for letterhead information at the top of the document
- Extract UID/VAT numbers (Swiss format: CHE-XXX.XXX.XXX)
- Extract complete address information
- Return valid JSON only, no additional text`;
  } else {
    // Generic document extraction
    return basePrompt + `Extract any personal, contact, or professional information you can find.

Return a JSON object with any relevant fields you can extract. Use a structure similar to:
{
  "personalDetails": {
    "identity": {},
    "address": {},
    "contact": {}
  },
  "additionalInfo": {}
}

Return valid JSON only, no additional text`;
  }
}

module.exports = {
  processDocument: exports.processDocument
};
