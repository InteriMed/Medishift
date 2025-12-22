# Document Auto-Fill Feature

## Overview
This feature allows users to upload documents (CV/Resume or Business Documents) and automatically extract information using Google Cloud Vision API (OCR) and Vertex AI (Gemini) to intelligently fill form fields.

## Architecture

### Backend (Cloud Functions)

**File**: `functions/api/processDocument.js`

**Flow**:
1. User uploads document → Firebase Storage
2. Frontend calls `processDocument` Cloud Function with document URL
3. Cloud Function uses **Google Cloud Vision API** for text extraction (OCR)
4. Extracted text is sent to **Vertex AI (Gemini 1.5 Flash)** for intelligent structuring
5. AI returns structured JSON data matching the form schema
6. Frontend merges extracted data with existing form data

**Technologies**:
- `@google-cloud/vision` - OCR text recognition
- `@google-cloud/vertexai` - AI-powered data extraction
- Firebase Cloud Functions - Serverless execution

### Frontend Integration

**Files**:
- `services/documentProcessingService.js` - Service layer
- `dashboard/pages/profile/Profile.js` - Integration point

**Flow**:
1. User clicks "Auto Fill" button
2. File upload dialog opens
3. User selects document (PDF, DOC, DOCX, JPG, PNG)
4. Document uploads to Firebase Storage
5. `processDocumentWithAI()` is called
6. Extracted data is validated
7. Form fields are auto-filled with extracted data
8. User reviews and saves

## Supported Document Types

### 1. CV/Resume (Professionals)
**Extracted Information**:
- **Personal Details**:
  - Legal first name and last name
  - Date of birth
  - Nationality
  - Address (street, city, postal code, canton, country)
  - Contact (email, phone with prefix)

- **Professional Background**:
  - Qualifications (degree, institution, year, field)
  - Specialties
  - Work experience (position, organization, dates, description)
  - Languages (language, proficiency level)

- **Billing Information**:
  - Bank details (account holder, IBAN, bank name)

### 2. Business Document (Facilities)
**Extracted Information**:
- **Facility Details**:
  - Facility name
  - Address
  - Contact information
  - Facility type
  - Registration number
  - Tax ID
  - Capacity

- **Billing Information**:
  - Bank details

## API Reference

### Cloud Function: `processDocument`

**Type**: Callable HTTPS Function

**Parameters**:
```javascript
{
  documentUrl: string,    // Firebase Storage URL
  documentType: string    // 'cv', 'resume', or 'businessDocument'
}
```

**Returns**:
```javascript
{
  success: boolean,
  data: {
    personalDetails: {
      identity: { ... },
      address: { ... },
      contact: { ... }
    },
    professionalBackground: {
      qualifications: [...],
      specialties: [...],
      workExperience: [...],
      languages: [...]
    },
    billingInformation: {
      bankDetails: { ... }
    }
  },
  extractedText: string,  // First 500 chars for verification
  timestamp: Timestamp
}
```

### Frontend Service Functions

#### `processDocumentWithAI(documentUrl, documentType)`
Calls the Cloud Function to process a document.

**Parameters**:
- `documentUrl` (string): Firebase Storage URL
- `documentType` (string): 'cv' or 'businessDocument'

**Returns**: Promise<Object> - Extracted data

#### `mergeExtractedData(existingData, extractedData)`
Intelligently merges extracted data with existing form data.

**Logic**:
- Only fills empty fields (doesn't overwrite existing data)
- Appends to arrays (qualifications, work experience, etc.)
- Preserves user-entered data

**Parameters**:
- `existingData` (Object): Current form state
- `extractedData` (Object): AI-extracted data

**Returns**: Object - Merged form data

#### `validateExtractedData(data)`
Validates extracted data before merging.

**Validations**:
- Email format
- Phone number format
- IBAN format
- Date format

**Returns**:
```javascript
{
  data: Object,        // Validated data
  warnings: string[],  // Validation warnings
  isValid: boolean     // Overall validation status
}
```

## Setup Instructions

### 1. Enable Google Cloud APIs

```bash
# Enable Cloud Vision API
gcloud services enable vision.googleapis.com

# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com
```

### 2. Install Dependencies

```bash
cd functions
npm install @google-cloud/vision @google-cloud/vertexai
```

### 3. Configure Firebase

Ensure your Firebase project has:
- Cloud Functions enabled
- Vertex AI API enabled
- Proper IAM permissions for Cloud Vision and Vertex AI

### 4. Deploy Cloud Function

```bash
cd functions
firebase deploy --only functions:processDocument
```

### 5. Test the Feature

1. Navigate to Profile page
2. Click "Auto Fill" button
3. Upload a CV or business document
4. Wait for processing (10-30 seconds)
5. Review auto-filled fields
6. Make any necessary corrections
7. Save the profile

## AI Prompts

### For CV/Resume
The AI is instructed to extract:
- Personal identification details
- Contact information
- Educational qualifications
- Professional experience
- Language skills
- Banking information

### For Business Documents
The AI is instructed to extract:
- Facility/company name
- Business address
- Contact details
- Registration numbers
- Tax identifiers
- Banking information

## Data Privacy & Security

### Security Measures:
1. **Authentication Required**: Only authenticated users can process documents
2. **User Isolation**: Users can only process their own documents
3. **Temporary Processing**: OCR text is not permanently stored
4. **Secure Storage**: Documents stored in Firebase Storage with security rules
5. **Data Validation**: All extracted data is validated before use

### Privacy Considerations:
- Documents are processed server-side
- No third-party services beyond Google Cloud
- Users can review all extracted data before saving
- Original documents remain in user's storage

## Error Handling

### Common Errors:

**1. No Text Found**
```
Error: No text found in the document
Solution: Ensure document is clear and readable
```

**2. AI Parsing Failed**
```
Error: Failed to parse structured data from AI response
Solution: Document format may be unusual, fill manually
```

**3. Authentication Error**
```
Error: User must be authenticated
Solution: User needs to log in again
```

### Error Recovery:
- Document is still uploaded even if AI processing fails
- User can fill form manually
- Partial data extraction is supported

## Performance

### Processing Time:
- **OCR (Cloud Vision)**: 2-5 seconds
- **AI Extraction (Vertex AI)**: 5-15 seconds
- **Total**: 10-30 seconds average

### Optimization:
- Async processing (non-blocking)
- Progress notifications
- Graceful degradation if AI fails

## Cost Considerations

### Google Cloud Pricing:
- **Cloud Vision API**: ~$1.50 per 1,000 pages
- **Vertex AI (Gemini)**: ~$0.00025 per 1,000 characters
- **Estimated cost per document**: $0.002 - $0.005

### Optimization Tips:
- Cache results when possible
- Limit file size (max 10MB recommended)
- Use appropriate AI model (Flash vs Pro)

## Future Enhancements

### Planned Features:
1. **Multi-page document support**
2. **Batch processing** (multiple documents)
3. **Confidence scores** for extracted fields
4. **Manual correction interface** with AI suggestions
5. **Support for more document types** (invoices, certificates)
6. **Language detection** and multi-language support
7. **Document classification** (auto-detect document type)

### Potential Improvements:
- Add image preprocessing for better OCR
- Implement retry logic for failed extractions
- Add user feedback loop to improve AI accuracy
- Support for scanned documents with poor quality

## Testing

### Manual Testing Checklist:
- [ ] Upload clear, well-formatted CV
- [ ] Upload scanned document
- [ ] Upload business document
- [ ] Test with different file formats (PDF, DOCX, JPG)
- [ ] Verify extracted data accuracy
- [ ] Test error handling (invalid file, no text)
- [ ] Verify data validation works
- [ ] Test merge logic (doesn't overwrite existing data)

### Test Documents:
Create test documents with known data to verify extraction accuracy.

## Troubleshooting

### Issue: "Processing document with AI..." never completes
**Solution**: Check Cloud Function logs in Firebase Console

### Issue: Extracted data is incorrect
**Solution**: 
1. Check document quality
2. Review AI prompt in `processDocument.js`
3. Adjust extraction logic if needed

### Issue: Function timeout
**Solution**: 
1. Increase Cloud Function timeout (default 60s)
2. Optimize document size
3. Use faster AI model

## Support

For issues or questions:
1. Check Cloud Function logs
2. Review browser console for errors
3. Verify Google Cloud APIs are enabled
4. Check Firebase project permissions
