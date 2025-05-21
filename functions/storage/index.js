const functions = require('firebase-functions');
const admin = require('firebase-admin');
const path = require('path');

// Process images after upload (resize, optimize, etc.)
const processUploadedImages = functions.storage
  .object()
  .onFinalize(async (object) => {
    const filePath = object.name;
    const fileName = path.basename(filePath);
    const contentType = object.contentType;
    
    // Only process image files
    if (!contentType || !contentType.startsWith('image/')) {
      console.log('Not an image file, skipping processing');
      return null;
    }
    
    // Skip if already processed (look for certain prefix/path)
    if (filePath.startsWith('processed/')) {
      console.log('Already processed, skipping');
      return null;
    }
    
    try {
      // Here you would typically:
      // 1. Download the file using the Firebase Storage SDK
      // 2. Process it (resize, optimize, etc.) using libraries like sharp
      // 3. Upload the processed version to a different path
      // 4. Update any references in Firestore
      
      // For this example, we'll just log a message
      console.log(`Would process image: ${fileName}`);
      
      // Record the processing in Firestore for tracking
      await admin.firestore().collection('imageProcessing').add({
        originalPath: filePath,
        fileName,
        contentType,
        status: 'would_process',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error processing uploaded image:', error);
      return { success: false, error: error.message };
    }
  });

module.exports = {
  processUploadedImages
}; 