import React, { useState, useRef } from 'react';
import './UploadFile.css';

const UploadFile = ({ onUploadComplete, acceptedFileTypes, maxFileSize }) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClickable, setIsClickable] = useState(true);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isClickable) return;
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (file) => {
    if (!file) return false;
    
    const fileSize = file.size / (1024 * 1024); // Convert to MB

    if (!acceptedFileTypes.split(',').some(type => 
      file.name.toLowerCase().endsWith(type.trim().toLowerCase()))) {
      setError('Invalid file type. Please upload a PDF or image file.');
      return false;
    }

    if (fileSize > maxFileSize) {
      setError(`File size must be less than ${maxFileSize}MB`);
      return false;
    }

    return true;
  };

  const handleFile = (file) => {
    if (validateFile(file)) {
      setFileName(file.name);
      setError('');
      setIsLoading(true);
      setIsClickable(false);
      // Simulate file upload
      setTimeout(() => {
        onUploadComplete();
        setIsLoading(false);
      }, 1500);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isClickable) return;
    
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (!isClickable) return;
    
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="upload-container">
      <form
        className={`upload-form ${dragActive ? 'drag-active' : ''} ${!isClickable ? 'uploaded' : ''}`}
        onDragEnter={isClickable ? handleDrag : null}
        onDragLeave={isClickable ? handleDrag : null}
        onDragOver={isClickable ? handleDrag : null}
        onDrop={isClickable ? handleDrop : null}
        onClick={(e) => {
          if (!isClickable) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <input 
          ref={inputRef}
          type="file"
          accept={acceptedFileTypes}
          onChange={handleChange}
          style={{ display: 'none' }}
          disabled={!isClickable}
        />
        
        <div className="upload-content">
          <p>Drag and drop your document here or</p>
          <button
            className="upload-button"
            onClick={(e) => {
              e.preventDefault();
              if (isClickable) {
                inputRef.current.click();
              }
            }}
            disabled={!isClickable}
          >
            Choose File
          </button>
          {fileName && <p className="file-name">{fileName}</p>}
          {error && <p className="error-message">{error}</p>}
        </div>
        <div className={`loading-spinner ${isLoading ? 'visible' : ''}`} />
      </form>
    </div>
  );
};

export default UploadFile;
