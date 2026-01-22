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

// CONFIGURE AI (GEMINI) TO RUN IN EUROPE-WEST1 (Belgium - Better Availability)
const vertexAI = new VertexAI({
  project: process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'interimed-620fd',
  location: 'europe-west1'
});

const db = admin.firestore();

/**
 * Detect MIME type from file magic bytes (file signature)
 * More reliable than trusting metadata or extension
 */
function detectMimeTypeFromMagicBytes(buffer, fallbackMimeType) {
  if (!buffer || buffer.length < 4) {
    console.warn('[MagicBytes] Buffer too small, using fallback:', fallbackMimeType);
    return fallbackMimeType || 'application/octet-stream';
  }

  // JPEG: starts with FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  // PNG: starts with 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }

  // GIF: starts with GIF87a or GIF89a
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif';
  }

  // WebP: starts with RIFF....WEBP
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return 'image/webp';
  }

  // PDF: starts with %PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf';
  }

  // HEIC/HEIF: starts with ftyp at byte 4 (after size bytes)
  // Check for 'ftyp' signature followed by heic, heix, hevc, mif1, etc.
  if (buffer.length >= 12) {
    const ftypIndex = 4; // ftyp starts at byte 4
    if (buffer[ftypIndex] === 0x66 && buffer[ftypIndex + 1] === 0x74 &&
      buffer[ftypIndex + 2] === 0x79 && buffer[ftypIndex + 3] === 0x70) {
      // Check brand: heic, heix, mif1, msf1
      const brand = String.fromCharCode(buffer[8], buffer[9], buffer[10], buffer[11]);
      if (['heic', 'heix', 'mif1', 'msf1', 'hevc'].includes(brand.toLowerCase())) {
        return 'image/heic';
      }
    }
  }

  // BMP: starts with BM
  if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
    return 'image/bmp';
  }

  // TIFF: starts with II or MM
  if ((buffer[0] === 0x49 && buffer[1] === 0x49) || (buffer[0] === 0x4D && buffer[1] === 0x4D)) {
    return 'image/tiff';
  }

  console.warn('[MagicBytes] Unknown format, first 8 bytes:',
    Array.from(buffer.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' '),
    'Using fallback:', fallbackMimeType);

  return fallbackMimeType || 'application/octet-stream';
}

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
    timeoutSeconds: 600, // 10 minutes for processing during onboarding
    memory: '1GiB', // Increase memory for AI processing
    database: 'medishift'
  },
  async (request) => {
    const logPrefix = `[ProcessDocument-${request.auth ? request.auth.uid : 'anon'}-${Date.now()}]`;
    console.log(`${logPrefix} STARTING execution`);

    // Verify authentication
    if (!request.auth) {
      console.warn(`${logPrefix} Unauthenticated request`);
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated to process documents'
      );
    }

    const userId = request.auth.uid;
    const { documentUrl, documentType, storagePath, mimeType, dropdownOptions } = request.data;
    console.log(`${logPrefix} Request data:`, { documentUrl, documentType, storagePath, mimeType, userId, hasDropdownOptions: !!dropdownOptions });

    // Rate limiting: 2 scans per minute
    try {
      const rateLimitRef = db.collection('rateLimits').doc(userId);
      const rateLimitDoc = await rateLimitRef.get();
      const now = Date.now();
      const oneMinuteAgo = now - 60000; // 60 seconds

      if (rateLimitDoc.exists) {
        const data = rateLimitDoc.data();
        // Filter scans from the last minute
        const recentScans = (data.scans || []).filter(timestamp => timestamp > oneMinuteAgo);

        if (recentScans.length >= 2) {
          console.warn(`${logPrefix} Rate limit exceeded`);
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
    } catch (rateLimitError) {
      console.error(`${logPrefix} Rate limit check failed:`, rateLimitError);
      // Don't block execution on rate limit DB error, but log it
      if (rateLimitError.code === 'resource-exhausted') throw rateLimitError;
    }

    if (!storagePath) {
      console.error(`${logPrefix} Missing storagePath`);
      throw new HttpsError(
        'invalid-argument',
        'Document Storage Path is required for AI processing'
      );
    }

    try {
      console.log(`${logPrefix} Verifying file existence: ${storagePath}`);

      // Verify file exists in storage before processing
      const bucket = admin.storage().bucket();
      const file = bucket.file(storagePath);

      console.log(`${logPrefix} Bucket: ${bucket.name}, File object created`);

      const [exists] = await file.exists();
      if (!exists) {
        console.error(`${logPrefix} File NOT found at ${storagePath}`);
        throw new HttpsError(
          'not-found',
          `Document not found at path: ${storagePath}. Please ensure the file was uploaded successfully.`
        );
      }
      console.log(`${logPrefix} File exists.`);

      // Construct gs:// URI
      const bucketName = bucket.name;
      const gsUri = `gs://${bucketName}/${storagePath}`;

      console.log(`${logPrefix} Using GS URI: ${gsUri}`);

      // Check file metadata to detect actual content type
      const [metadata] = await file.getMetadata();
      const metadataContentType = metadata.contentType || mimeType;

      console.log(`${logPrefix} Metadata ContentType: ${metadataContentType}, Size: ${metadata.size}`);

      // Download file header to detect actual format from magic bytes
      console.log(`${logPrefix} Downloading magic bytes...`);
      const [fileBuffer] = await file.download({ start: 0, end: 32 }); // First 32 bytes for magic detection
      const actualMimeType = detectMimeTypeFromMagicBytes(fileBuffer, metadataContentType);

      console.log(`${logPrefix} Magic detection: ${actualMimeType} (Metadata: ${metadataContentType})`);

      // Validate supported formats
      const fileExtension = storagePath.split('.').pop()?.toLowerCase();

      // Check for completely unsupported or undetectable formats
      if (actualMimeType === 'application/octet-stream') {
        console.error(`${logPrefix} MIME detection failed for extension .${fileExtension}`);
        throw new HttpsError(
          'invalid-argument',
          'Unable to detect image format. The uploaded file may be corrupted or in an unsupported format. Please try uploading a JPEG or PNG image.'
        );
      }

      // Use the magic-byte detected mime type (most accurate)
      const effectiveMimeType = actualMimeType;

      // Step 1: Use Gemini to extract data directly (pass file object for base64 fallback)
      console.log(`${logPrefix} calling extractStructuredDataWithGemini...`);
      const extractionResult = await extractStructuredDataWithGemini(gsUri, effectiveMimeType, documentType, file, dropdownOptions);
      console.log(`${logPrefix} extraction returned success`);

      console.log(`${logPrefix} Extracted data keys:`, Object.keys(extractionResult.parsedData || {}));

      // Step 2: Save to transient cache (15 minutes TTL)
      try {
        const cacheRef = db.collection('extractedDataCache').doc(userId);
        await cacheRef.set({
          data: extractionResult.parsedData,
          createdAt: now,
          expiresAt: now + (15 * 60 * 1000) // 15 minutes from now
        });
        console.log(`${logPrefix} Cache saved.`);
      } catch (cacheError) {
        console.error(`${logPrefix} Cache save failed (non-fatal):`, cacheError);
      }

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
      console.error(`${logPrefix} FATAL ERROR:`, error);
      console.error(`${logPrefix} FATAL ERROR JSON:`, JSON.stringify(error, Object.getOwnPropertyNames(error)));

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        `Failed to process document: ${error.message} (LogID: ${logPrefix})`
      );
    }
  }
);

/**
 * Extract structured data using Gemini 1.5 Flash Multimodal
 * @param {string} gsUri - The GS URI to the file (gs://bucket/path)
 * @param {string} mimeType - The MIME type of the file
 * @param {string} documentType - Type of document for prompt selection
 * @param {Object} file - Optional Firebase Storage file object for base64 fallback
 */
async function extractStructuredDataWithGemini(gsUri, mimeType, documentType, file = null, dropdownOptions = null) {
  // Updated to use standard aliases for better resolution in europe-west1
  const models = ['gemini-2.5-flash-lite', 'gemini-2.5-flash-lite', 'gemini-1.5-pro'];
  let lastError = null;

  for (const modelName of models) {
    try {
      console.log(`[Gemini] Trying model: ${modelName}`);

      const model = vertexAI.getGenerativeModel({
        model: modelName
      });

      const prompt = getExtractionPrompt(documentType, dropdownOptions);

      console.log(`[Gemini] Processing: gsUri=${gsUri}, mimeType=${mimeType}, documentType=${documentType}`);

      // Try GS URI first, fallback to base64 if it fails
      let filePart;

      try {
        // First attempt: Use GS URI (more efficient for large files)
        filePart = {
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

        console.log('[Gemini] Attempting with GS URI...');
        const result = await model.generateContent(request);
        const response = result.response;

        return processGeminiResponse(response, prompt);

      } catch (gsError) {
        console.warn(`[Gemini] GS URI failed with ${modelName}, trying base64 fallback:`, gsError.message);

        // If we have the file object, try base64 approach
        if (file) {
          try {
            // Download the file content
            console.log('[Gemini] Downloading file for base64 encoding...');
            const [fileBuffer] = await file.download();
            const base64Data = fileBuffer.toString('base64');

            console.log(`[Gemini] File downloaded: ${fileBuffer.length} bytes, base64 length: ${base64Data.length}`);

            // Validate the file isn't empty
            if (fileBuffer.length === 0) {
              throw new Error('Downloaded file is empty');
            }

            // Use inline data instead of GS URI
            filePart = {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
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

            console.log('[Gemini] Attempting with base64 inline data...');
            const result = await model.generateContent(request);
            const response = result.response;

            return processGeminiResponse(response, prompt);

          } catch (base64Error) {
            console.error(`[Gemini] Base64 fallback also failed with ${modelName}:`, base64Error.message);
            // Save error and try next model
            lastError = new Error(`Image processing failed with ${modelName}. GS URI error: ${gsError.message}. Base64 error: ${base64Error.message}`);
            continue; // TRY NEXT MODEL
          }
        } else {
          // No file object provided, throw the original error (or save and continue)
          console.warn(`[Gemini] No file object for fallback with ${modelName}.`);
          lastError = gsError;
          continue; // TRY NEXT MODEL
        }
      }
    } catch (modelError) {
      console.warn(`[Gemini] Model ${modelName} failed or crashed:`, modelError.message);
      lastError = modelError;
      continue; // TRY NEXT MODEL
    }
  }

  // If we get here, all models failed
  console.error('[Gemini] All models failed. Last error:', lastError);
  throw lastError || new Error('All Gemini models failed to process the document.');
}

/**
 * Process Gemini response and extract text
 */
function filterEmptyQualifications(qualifications) {
  if (!Array.isArray(qualifications)) {
    return [];
  }

  return qualifications
    .filter(qual => {
      if (!qual || typeof qual !== 'object') {
        return false;
      }

      const title = qual.title || qual.name || '';
      const hasTitle = typeof title === 'string' && title.trim().length > 0;

      if (!hasTitle) {
        return false;
      }

      return true;
    })
    .map(qual => {
      const cleaned = {};

      if (qual.title) {
        cleaned.title = qual.title.trim();
      } else if (qual.name) {
        cleaned.title = qual.name.trim();
      }

      if (qual.type && typeof qual.type === 'string' && qual.type.trim().length > 0) {
        cleaned.type = qual.type.trim();
      }

      if (qual.institution && typeof qual.institution === 'string' && qual.institution.trim().length > 0) {
        cleaned.institution = qual.institution.trim();
      } else if (qual.issuingOrganization && typeof qual.issuingOrganization === 'string' && qual.issuingOrganization.trim().length > 0) {
        cleaned.institution = qual.issuingOrganization.trim();
      }

      if (qual.licenseNumber && typeof qual.licenseNumber === 'string' && qual.licenseNumber.trim().length > 0) {
        cleaned.licenseNumber = qual.licenseNumber.trim();
      }

      if (qual.dateObtained && typeof qual.dateObtained === 'string' && qual.dateObtained.trim().length > 0) {
        cleaned.dateObtained = qual.dateObtained.trim();
      } else if (qual.issueDate && typeof qual.issueDate === 'string' && qual.issueDate.trim().length > 0) {
        cleaned.dateObtained = qual.issueDate.trim();
      }

      if (qual.expiryDate && typeof qual.expiryDate === 'string' && qual.expiryDate.trim().length > 0) {
        cleaned.expiryDate = qual.expiryDate.trim();
      }

      if (typeof qual.validForLife === 'boolean') {
        cleaned.validForLife = qual.validForLife;
      }

      if (qual.source) {
        cleaned.source = qual.source;
      }

      return cleaned;
    });
}

function processGeminiResponse(response, prompt) {
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

  if (parsedData.professionalBackground?.qualifications) {
    parsedData.professionalBackground.qualifications = filterEmptyQualifications(
      parsedData.professionalBackground.qualifications
    );
    console.log(`[processDocument] Filtered qualifications: ${parsedData.professionalBackground.qualifications.length} valid items`);
  }

  return {
    prompt: prompt,
    rawResponse: extractedText,
    parsedData: parsedData
  };
}

function getExtractionPrompt(documentType, dropdownOptions = null) {
  const basePrompt = `You are a data extraction assistant. Extract information from the attached document and return it as a valid JSON object. Only include fields where you found actual data. Use null for missing data.
`;

  // Helper to format dropdown options for the prompt (max 10)
  const formatOptions = (key) => {
    if (!dropdownOptions || !dropdownOptions[key] || !Array.isArray(dropdownOptions[key])) return '';
    const options = dropdownOptions[key].slice(0, 10);
    return options.map(opt => `- "${opt.value}": ${opt.label}`).join('\n');
  };

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
    "education": [
      {
        "degree": "string (MUST be one of the options below)",
        "field": "string (REQUIRED - field of study)",
        "institution": "string (REQUIRED - institution name)",
        "startDate": "YYYY-MM-DD (REQUIRED - IMPORTANT: ensure this is extracted if present)",
        "endDate": "YYYY-MM-DD (REQUIRED if currentlyStudying is false - IMPORTANT: ensure this is extracted if present)",
        "currentlyStudying": false,
        "gpa": "string or null",
        "honors": "string or null"
      }
    ],
    "qualifications": [
      {
        "type": "string (MUST be one of the options below)",
        "title": "string (REQUIRED - qualification title)",
        "institution": "string (REQUIRED - issuing organization)",
        "licenseNumber": "string or null",
        "dateObtained": "YYYY-MM-DD (REQUIRED - IMPORTANT: ensure this is extracted if present)",
        "expiryDate": "YYYY-MM-DD (REQUIRED if validForLife is false - IMPORTANT: ensure this is extracted if present)",
        "validForLife": false
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
        "jobTitle": "string (REQUIRED)",
        "employer": "string (REQUIRED)",
        "location": "string (REQUIRED)",
        "startDate": "YYYY-MM-DD (REQUIRED - IMPORTANT: ensure this is extracted if present)",
        "endDate": "YYYY-MM-DD (REQUIRED if current is false - IMPORTANT: ensure this is extracted if present)",
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

FIELD DEFINITIONS AND DROPDOWN OPTIONS:

**EDUCATION LEVEL OPTIONS (for "degree" field in education):**
${formatOptions('educationLevels') || '- "high_school": High School Diploma\n- "vocational": Vocational Training\n- "bachelors": Bachelor\'s Degree\n- "masters": Master\'s Degree\n- "doctorate": Doctorate / PhD\n- "other": Other'}

**QUALIFICATION TYPE OPTIONS (for "type" field in qualifications):**
${formatOptions('qualificationTypes') || '- "license": Professional License\n- "certification": Professional Certification\n- "diploma": Diploma\n- "degree": Academic Degree\n- "training": Training Certificate\n- "membership": Professional Membership\n- "other": Other'}

1. **education** (formerly "studies"): Academic education and formal degrees (e.g., Medical School, Bachelor's, Master's, PhD)
   - REQUIRED FIELDS: degree (must match dropdown options above), field, institution, startDate
   - REQUIRED IF NOT CURRENTLY STUDYING: endDate
   - OPTIONAL: gpa, honors, currentlyStudying (set to true if still studying)
   - Include university degrees, medical school, residency programs
   - Extract ALL dates in YYYY-MM-DD format
   - For "degree" field, you MUST use one of the exact values from the dropdown options above

2. **qualifications**: Professional certifications and credentials (NOT academic degrees)
   - Examples: Vaccination certificates (e.g., Hepatitis B, COVID-19), CAS certificates, board certifications, professional licenses, CPR certifications, ACLS, BLS
   - REQUIRED FIELDS: type (must match dropdown options above), title, institution, dateObtained
   - REQUIRED IF NOT VALID FOR LIFE: expiryDate (if validForLife is false, expiryDate is required)
   - OPTIONAL: licenseNumber for license/certificate numbers if present
   - Set "validForLife" to true if qualification never expires, false otherwise
   - For "type" field, you MUST use one of the exact values from the dropdown options above
   - CRITICAL: Only include qualifications with at least a "title" field. Exclude any qualification item where title is empty, null, or whitespace.
   - Do NOT include university degrees here (those go in "education")

3. **workExperience**: Professional work history and employment
   - REQUIRED FIELDS: jobTitle, employer, location, startDate
   - REQUIRED IF NOT CURRENT: endDate (if current is false, endDate is required)
   - OPTIONAL: description, current (set to true if currently working there)
   - Extract ALL dates in YYYY-MM-DD format
   - Include all employment history, internships, and relevant work experience

4. **skills**: Translational and transferable skills with proficiency levels
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
  } else if (documentType === 'invoice' || documentType === 'bill' || documentType === 'tax_document' || documentType === 'bank_statement') {
    // Invoice/billing/bank statement/debit card extraction
    const docTypeSpecific = documentType === 'bank_statement' ? 'bank statement or debit card' : 'invoice or tax document';
    return basePrompt + `Extract business and billing information from this ${docTypeSpecific}.

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
