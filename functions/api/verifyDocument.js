/**
 * Safe Document Verification API
 * 
 * Verifies pharmacy documents (letterhead, invoices) using EU-compliant
 * OCR and AI processing. Strictly prevents patient data extraction.
 * 
 * Regions:
 * - OCR: eu-vision.googleapis.com (EU)
 * - AI: europe-west3 (Frankfurt)
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const config = require('../config');

// Safe extraction prompt with strict guardrails
const SAFE_EXTRACTION_PROMPT = `
You are a document verification assistant for a Swiss healthcare staffing platform.

CRITICAL SAFETY GUARDRAILS:
1. Extract ONLY business/company information from letterheads and invoices
2. DO NOT extract any patient names, medical information, or prescription data
3. If you detect ANY patient data, health data, or prescription information, 
   immediately stop and return: { "error": "patient_data_detected", "message": "Document contains patient data. Please upload business letterhead or invoice only." }

EXTRACT THE FOLLOWING BUSINESS INFORMATION:
- Company/Pharmacy Name
- Business Address (Street, Postal Code, City, Canton if visible)
- GLN Number (13-digit Swiss Global Location Number if visible)
- UID/VAT Number (format: CHE-XXX.XXX.XXX if visible)
- Email address (business contact if visible)
- Phone number (business line if visible)

Return a JSON object with this exact structure:
{
  "success": true,
  "companyName": "Pharmacy Name AG",
  "address": {
    "street": "Street Name 123",
    "postalCode": "1234",
    "city": "City Name",
    "canton": "ZH"
  },
  "gln": "7601234567890",
  "uid": "CHE-123.456.789",
  "email": "contact@pharmacy.ch",
  "phone": "+41 XX XXX XX XX",
  "confidence": 0.95
}

If a field is not found, set it to null. Always include the confidence score (0-1).
`;

/**
 * Verify a pharmacy document using EU-compliant OCR and AI
 * 
 * @param {Object} request - Firebase callable request
 * @param {string} request.data.imageUrl - URL or base64 of the document image
 * @param {string} request.data.documentType - Type: 'letterhead', 'invoice', 'registration'
 */
const verifyPharmacyDocument = onCall(
    {
        region: config.region,
        database: 'medishift',
        enforceAppCheck: false // Enable in production
    },
    async (request) => {
        // Authentication check
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'You must be logged in to verify documents');
        }

        const { imageUrl, imageBase64, documentType = 'letterhead' } = request.data;

        if (!imageUrl && !imageBase64) {
            throw new HttpsError('invalid-argument', 'Either imageUrl or imageBase64 is required');
        }

        const userId = request.auth.uid;
        logger.info(`Document verification started for user ${userId}`, { documentType });

        try {
            // Step 1: Perform OCR using Google Cloud Vision API (EU endpoint)
            const extractedText = await performOCR(imageUrl, imageBase64);

            if (!extractedText || extractedText.trim().length < 20) {
                throw new HttpsError(
                    'invalid-argument',
                    'Could not extract sufficient text from document. Please upload a clearer image.'
                );
            }

            logger.info('OCR completed successfully', {
                textLength: extractedText.length,
                userId
            });

            // Step 2: AI Analysis using Gemini (Frankfurt region)
            const extractedData = await analyzeWithGemini(extractedText);

            // Step 3: Check for patient data violation
            if (extractedData.error === 'patient_data_detected') {
                logger.warn('Patient data detected in document', { userId });
                throw new HttpsError(
                    'invalid-argument',
                    'This document appears to contain patient information. Please upload a business letterhead or invoice without patient data.'
                );
            }

            // Step 4: Validate extracted data
            const validationResult = validateExtractedData(extractedData);

            // Step 5: Log verification attempt
            await logVerificationAttempt(userId, {
                documentType,
                success: validationResult.isValid,
                extractedFields: Object.keys(extractedData).filter(k => extractedData[k] !== null),
                confidence: extractedData.confidence || 0
            });

            logger.info('Document verification completed', {
                userId,
                success: validationResult.isValid,
                confidence: extractedData.confidence
            });

            return {
                success: true,
                data: extractedData,
                validation: validationResult,
                message: validationResult.isValid
                    ? 'Document verified successfully'
                    : 'Document verified with warnings'
            };

        } catch (error) {
            logger.error('Document verification failed', {
                error: error.message,
                userId,
                documentType
            });

            // Log failed attempt
            await logVerificationAttempt(userId, {
                documentType,
                success: false,
                error: error.message
            });

            if (error instanceof HttpsError) {
                throw error;
            }

            throw new HttpsError(
                'internal',
                'Document verification failed. Please try again or contact support.'
            );
        }
    }
);

/**
 * Perform OCR using Google Cloud Vision API with EU endpoint
 */
async function performOCR(imageUrl, imageBase64) {
    try {
        // Dynamic import for Vision API
        const vision = require('@google-cloud/vision');

        // Initialize client with EU endpoint
        const client = new vision.ImageAnnotatorClient({
            apiEndpoint: config.visionEndpoint
        });

        let request;
        if (imageBase64) {
            // Base64 image
            request = {
                image: { content: imageBase64 },
                features: [{ type: 'DOCUMENT_TEXT_DETECTION' }]
            };
        } else {
            // Image URL
            request = {
                image: { source: { imageUri: imageUrl } },
                features: [{ type: 'DOCUMENT_TEXT_DETECTION' }]
            };
        }

        const [result] = await client.annotateImage(request);

        if (result.error) {
            throw new Error(`Vision API error: ${result.error.message}`);
        }

        const fullTextAnnotation = result.fullTextAnnotation;
        return fullTextAnnotation ? fullTextAnnotation.text : '';

    } catch (error) {
        logger.error('OCR failed', { error: error.message });
        throw new HttpsError('internal', 'Failed to process document image');
    }
}

/**
 * Analyze extracted text using Gemini AI (Frankfurt region)
 */
async function analyzeWithGemini(extractedText) {
    try {
        // Dynamic import for Vertex AI
        const { VertexAI } = require('@google-cloud/vertexai');

        // Initialize with Frankfurt region
        const vertexAI = new VertexAI({
            project: process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT,
            location: config.aiRegion  // europe-west3 (Frankfurt)
        });

        // Use stable model
        const model = vertexAI.getGenerativeModel({
            model: 'gemini-2.5-flash-lite',
            generationConfig: {
                temperature: 0.1,  // Low temperature for consistent extraction
                maxOutputTokens: 1024
            }
        });

        const prompt = `${SAFE_EXTRACTION_PROMPT}\n\n--- DOCUMENT TEXT ---\n${extractedText}\n--- END DOCUMENT ---`;

        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [{ text: prompt }]
            }]
        });

        const responseText = result.response.candidates[0].content.parts[0].text;

        // Parse JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Could not parse AI response');
        }

        return JSON.parse(jsonMatch[0]);

    } catch (error) {
        logger.error('Gemini analysis failed', { error: error.message });

        // Return partial data instead of failing completely
        return {
            success: false,
            error: 'ai_analysis_failed',
            message: 'AI analysis failed. Manual verification may be required.'
        };
    }
}

/**
 * Validate extracted data completeness
 */
function validateExtractedData(data) {
    const warnings = [];
    const required = ['companyName'];
    const recommended = ['address', 'gln', 'uid'];

    // Check required fields
    for (const field of required) {
        if (!data[field]) {
            warnings.push(`Required field missing: ${field}`);
        }
    }

    // Check recommended fields
    for (const field of recommended) {
        if (!data[field]) {
            warnings.push(`Recommended field missing: ${field}`);
        }
    }

    // Validate GLN format (13 digits)
    if (data.gln && !/^\d{13}$/.test(data.gln)) {
        warnings.push('GLN format invalid (must be 13 digits)');
    }

    // Validate UID format (CHE-XXX.XXX.XXX)
    if (data.uid && !/^CHE-\d{3}\.\d{3}\.\d{3}$/.test(data.uid)) {
        warnings.push('UID format invalid (expected CHE-XXX.XXX.XXX)');
    }

    // Check confidence threshold
    const lowConfidence = data.confidence && data.confidence < 0.7;
    if (lowConfidence) {
        warnings.push('Low confidence score. Manual review recommended.');
    }

    return {
        isValid: warnings.filter(w => w.includes('Required')).length === 0,
        warnings,
        requiresManualReview: lowConfidence || warnings.length > 2
    };
}

/**
 * Log verification attempt to audit log
 */
async function logVerificationAttempt(userId, data) {
    try {
        const db = admin.firestore();
        await db.collection('audit_logs').add({
            type: 'document_verification',
            userId,
            ...data,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            region: config.region
        });
    } catch (error) {
        logger.error('Failed to log verification attempt', { error: error.message });
        // Don't throw - logging failure shouldn't block verification
    }
}

module.exports = {
    verifyPharmacyDocument
};
