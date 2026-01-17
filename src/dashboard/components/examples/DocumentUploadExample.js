import React, { useState } from 'react';
import { useTutorial } from '../../contexts/TutorialContext';
import { FiUpload, FiX, FiCheck } from 'react-icons/fi';

/**
 * Example Component: Document Upload with Tutorial Pause/Resume
 * 
 * This component demonstrates how to:
 * 1. Pause the onboarding tutorial when a document upload popup is opened
 * 2. Keep the popup active while the tutorial is paused
 * 3. Resume the tutorial when "Save and Continue" is clicked
 */
const DocumentUploadExample = () => {
    const { pauseTutorial, resumeTutorial, isPaused } = useTutorial();
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);

    /**
     * Opens the upload popup and pauses the tutorial
     */
    const handleOpenUpload = () => {
        console.log('[DocumentUpload] Opening upload popup');

        // Pause the tutorial so it doesn't interfere with the popup
        pauseTutorial();

        // Open the popup
        setIsPopupOpen(true);
    };

    /**
     * Handles file selection
     */
    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
            console.log('[DocumentUpload] File selected:', file.name);
        }
    };

    /**
     * Simulates file upload
     */
    const handleUpload = async () => {
        if (!selectedFile) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            // Simulate upload progress
            for (let i = 0; i <= 100; i += 10) {
                await new Promise(resolve => setTimeout(resolve, 200));
                setUploadProgress(i);
            }

            // Add to uploaded files list
            setUploadedFiles([...uploadedFiles, {
                id: Date.now(),
                name: selectedFile.name,
                size: selectedFile.size,
                uploadedAt: new Date()
            }]);

            console.log('[DocumentUpload] File uploaded successfully:', selectedFile.name);

            // Reset file selection
            setSelectedFile(null);
            setUploadProgress(0);

        } catch (error) {
            console.error('[DocumentUpload] Upload failed:', error);
        } finally {
            setIsUploading(false);
        }
    };

    /**
     * Closes the popup and resumes the tutorial
     * This is called when the user clicks "Save and Continue"
     */
    const handleSaveAndContinue = () => {
        console.log('[DocumentUpload] Save and Continue clicked');

        // Close the popup
        setIsPopupOpen(false);

        // Resume the tutorial from where it was paused
        resumeTutorial();
    };

    /**
     * Closes the popup without resuming tutorial
     * User can manually resume later
     */
    const handleCancel = () => {
        console.log('[DocumentUpload] Cancel clicked');

        // Close the popup
        setIsPopupOpen(false);

        // Optionally resume here if desired:
        // resumeTutorial();
    };

    /**
     * Removes an uploaded file
     */
    const handleRemoveFile = (fileId) => {
        setUploadedFiles(uploadedFiles.filter(f => f.id !== fileId));
    };

    return (
        <div className="document-upload-container">
            <div className="header">
                <h3>Document Management</h3>
                <button
                    onClick={handleOpenUpload}
                    className="btn-primary"
                    data-tutorial="upload-document-btn"
                >
                    <FiUpload />
                    Upload Document
                </button>
            </div>

            {/* Display uploaded files */}
            <div className="uploaded-files">
                {uploadedFiles.length === 0 ? (
                    <p className="no-files-message">No documents uploaded yet</p>
                ) : (
                    <ul className="files-list">
                        {uploadedFiles.map(file => (
                            <li key={file.id} className="file-item">
                                <div className="file-info">
                                    <FiCheck className="check-icon" />
                                    <span className="file-name">{file.name}</span>
                                    <span className="file-size">
                                        ({(file.size / 1024).toFixed(2)} KB)
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleRemoveFile(file.id)}
                                    className="btn-remove"
                                    aria-label="Remove file"
                                >
                                    <FiX />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Upload Popup */}
            {isPopupOpen && (
                <div className="popup-overlay" onClick={(e) => e.stopPropagation()}>
                    <div className="popup-content">
                        <div className="popup-header">
                            <h4>Upload Document</h4>
                            <button
                                onClick={handleCancel}
                                className="btn-close"
                                aria-label="Close"
                            >
                                <FiX />
                            </button>
                        </div>

                        <div className="popup-body">
                            <div className="upload-area">
                                <input
                                    type="file"
                                    onChange={handleFileSelect}
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    id="file-input"
                                    className="file-input"
                                />
                                <label htmlFor="file-input" className="file-input-label">
                                    <FiUpload className="upload-icon" />
                                    <span>
                                        {selectedFile
                                            ? selectedFile.name
                                            : 'Click to select a file or drag and drop'}
                                    </span>
                                </label>
                            </div>

                            {selectedFile && (
                                <div className="file-preview">
                                    <p>Selected: <strong>{selectedFile.name}</strong></p>
                                    <button
                                        onClick={handleUpload}
                                        disabled={isUploading}
                                        className="btn-upload"
                                    >
                                        {isUploading ? 'Uploading...' : 'Upload'}
                                    </button>
                                </div>
                            )}

                            {isUploading && (
                                <div className="upload-progress">
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                    <span className="progress-text">{uploadProgress}%</span>
                                </div>
                            )}

                            {uploadedFiles.length > 0 && (
                                <div className="info-message">
                                    <FiCheck className="info-icon" />
                                    <p>{uploadedFiles.length} file(s) uploaded successfully</p>
                                </div>
                            )}
                        </div>

                        <div className="popup-footer">
                            <button onClick={handleCancel} className="btn-secondary">
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveAndContinue}
                                className="btn-primary"
                                disabled={uploadedFiles.length === 0}
                            >
                                Save and Continue
                            </button>
                        </div>

                        {/* Debug info - remove in production */}
                        {process.env.NODE_ENV === 'development' && (
                            <div className="debug-info">
                                <small>Tutorial paused: {isPaused ? 'Yes' : 'No'}</small>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style jsx>{`
        .document-upload-container {
          padding: 20px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background-color: var(--primary-color);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }

        .btn-primary:hover {
          opacity: 0.9;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .uploaded-files {
          margin-top: 20px;
        }

        .no-files-message {
          color: var(--text-muted);
          font-style: italic;
        }

        .files-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .file-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          margin-bottom: 8px;
          background: var(--background-card);
          border: 1px solid var(--border-color);
          border-radius: 6px;
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .check-icon {
          color: var(--success-color);
        }

        .btn-remove {
          background: none;
          border: none;
          color: var(--danger-color);
          cursor: pointer;
          padding: 4px;
        }

        .popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2100;
          padding: 20px;
        }

        .popup-content {
          background: var(--background);
          border-radius: 12px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }

        .popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid var(--border-color);
        }

        .btn-close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 4px;
        }

        .popup-body {
          padding: 20px;
        }

        .upload-area {
          margin-bottom: 20px;
        }

        .file-input {
          display: none;
        }

        .file-input-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 40px 20px;
          border: 2px dashed var(--border-color);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .file-input-label:hover {
          border-color: var(--primary-color);
          background: var(--primary-color-light);
        }

        .upload-icon {
          font-size: 32px;
          color: var(--primary-color);
        }

        .file-preview {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 15px;
          background: var(--background-card);
          border-radius: 6px;
          margin-bottom: 15px;
        }

        .btn-upload {
          padding: 8px 16px;
          background-color: var(--primary-color);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .upload-progress {
          margin-top: 15px;
        }

        .progress-bar {
          height: 8px;
          background: var(--background-card);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: var(--primary-color);
          transition: width 0.3s;
        }

        .progress-text {
          font-size: 12px;
          color: var(--text-muted);
        }

        .info-message {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          background: var(--success-color-light);
          color: var(--success-color);
          border-radius: 6px;
          margin-top: 15px;
        }

        .popup-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 20px;
          border-top: 1px solid var(--border-color);
        }

        .btn-secondary {
          padding: 10px 20px;
          background: var(--background-card);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          cursor: pointer;
        }

        .debug-info {
          padding: 10px;
          background: var(--background-card);
          border-top: 1px solid var(--border-color);
          font-family: monospace;
        }
      `}</style>
        </div>
    );
};

export default DocumentUploadExample;
