import React, { useState } from 'react';
import TutorialAwareModal from '../common/TutorialAwareModal';
import { FiUpload, FiFile } from 'react-icons/fi';

/**
 * Example showing how to use TutorialAwareModal
 * The modal automatically pauses/resumes the tutorial
 */
const SimplifiedDocumentUpload = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadedFiles, setUploadedFiles] = useState([]);

    const handleFileSelect = (e) => {
        setSelectedFile(e.target.files[0]);
    };

    const handleSave = async () => {
        if (selectedFile) {
            // Simulate upload
            await new Promise(resolve => setTimeout(resolve, 1000));

            setUploadedFiles([...uploadedFiles, {
                id: Date.now(),
                name: selectedFile.name,
                size: selectedFile.size,
            }]);

            setSelectedFile(null);
        }

        // Modal will close and tutorial will resume automatically
    };

    return (
        <div className="container">
            <h2>My Documents</h2>

            <button onClick={() => setIsModalOpen(true)} className="btn-primary">
                <FiUpload />
                Upload Document
            </button>

            {uploadedFiles.length > 0 && (
                <ul className="files-list">
                    {uploadedFiles.map(file => (
                        <li key={file.id}>
                            <FiFile />
                            {file.name} ({(file.size / 1024).toFixed(2)} KB)
                        </li>
                    ))}
                </ul>
            )}

            {/* The TutorialAwareModal handles pause/resume automatically */}
            <TutorialAwareModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                title="Upload Document"
                saveButtonText="Upload and Continue"
                disableSave={!selectedFile}
                size="medium"
            >
                <div>
                    <p>Select a file to upload:</p>
                    <input
                        type="file"
                        onChange={handleFileSelect}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    {selectedFile && (
                        <div className="file-preview">
                            <p>Selected: <strong>{selectedFile.name}</strong></p>
                        </div>
                    )}
                </div>
            </TutorialAwareModal>

            <style jsx>{`
        .container {
          padding: 20px;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          margin: 20px 0;
        }

        .files-list {
          list-style: none;
          padding: 0;
          margin-top: 20px;
        }

        .files-list li {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          background: var(--background-card);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          margin-bottom: 8px;
        }

        .file-preview {
          margin-top: 15px;
          padding: 15px;
          background: var(--background-card);
          border-radius: 6px;
        }
      `}</style>
        </div>
    );
};

export default SimplifiedDocumentUpload;
