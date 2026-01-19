import React, { useState, useRef, forwardRef } from 'react';
import { FiUploadCloud } from 'react-icons/fi';
import './styles/UploadFile.css';

const UploadFile = forwardRef(({
  onChange,
  onUploadComplete,
  accept,
  acceptedFileTypes,
  maxFileSize = 5, // Default to 5MB
  error,
  onErrorReset,
  isLoading = false,
  progress = 0,
  label = "Choose File",
  documentName = "document",
  className = "",
  disabled = false
}, ref) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [localError, setLocalError] = useState('');
  const internalInputRef = useRef(null);

  // Use the forwarded ref if provided, otherwise use the internal one
  const inputRef = ref || internalInputRef;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Reset error on drag interaction
    if (error && onErrorReset) {
      onErrorReset();
    }

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (file) => {
    if (!file) return false;

    const fileSize = file.size / (1024 * 1024); // Convert to MB
    const acceptTypes = accept || acceptedFileTypes || '.pdf,.jpg,.png,.jpeg';

    // Handle different ways accept types might be provided
    const validExtensions = acceptTypes.split(',').map(type =>
      type.trim().toLowerCase().replace('*', '')
    );

    const fileExt = '.' + file.name.split('.').pop().toLowerCase();

    if (!validExtensions.some(type => type === fileExt || type === '.*')) {
      return `Invalid file type. Accepted types: ${acceptTypes}`;
    }

    if (maxFileSize && fileSize > maxFileSize) {
      return `File size must be less than ${maxFileSize}MB`;
    }

    return true;
  };

  const handleFile = (file) => {
    if (!file) return;

    const validationResult = validateFile(file);

    if (validationResult === true) {
      setFileName(file.name); // Set filename only for valid files
      setLocalError('');

      if (onChange) {
        // For modern implementation - directly pass the file to parent
        onChange([file]);
      } else if (onUploadComplete) {
        // Legacy implementation
        setTimeout(() => {
          onUploadComplete(file);
        }, 1500);
      }
    } else {
      // Clear filename for invalid files so upload button remains visible
      setFileName('');
      setLocalError(validationResult);

      // Reset the file input so the same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = '';
      }

      if (onErrorReset) {
        onErrorReset(validationResult);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoading || disabled) return;

    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (isLoading || disabled) return;

    // Reset error on file selection
    if (error && onErrorReset) {
      onErrorReset();
    }

    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const hasError = error || localError || className.includes('error') || className.includes('border-destructive') || className.includes('errorUpload');
  
  return (
    <div className={`upload-container ${className} ${hasError ? 'upload-error' : ''}`}>
      <form
        className={`upload-form ${dragActive ? 'drag-active' : ''} ${isLoading ? 'uploading' : ''} ${disabled ? 'disabled' : ''} ${hasError ? 'upload-form-error' : ''} ${fileName ? 'has-file' : ''}`}
        onDragEnter={!isLoading && !disabled ? handleDrag : null}
        onDragLeave={!isLoading && !disabled ? handleDrag : null}
        onDragOver={!isLoading && !disabled ? handleDrag : null}
        onDrop={!isLoading && !disabled ? handleDrop : null}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept || acceptedFileTypes}
          onChange={handleChange}
          style={{ display: 'none' }}
          disabled={isLoading || disabled}
        />

        <div className="upload-content">
          {fileName ? (
            <p className="file-name">{fileName}</p>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors rounded-md ${isLoading || disabled ? 'opacity-50 cursor-not-allowed' : ''} ${hasError ? 'upload-button-error' : ''}`}
                style={{ backgroundColor: hasError ? 'var(--boxed-inputfield-error-color)' : 'var(--color-logo-2)' }}
                onMouseOver={(e) => {
                  if (!isLoading && !disabled) {
                    e.currentTarget.style.backgroundColor = hasError ? 'var(--boxed-inputfield-error-color)' : 'var(--color-logo-1)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isLoading && !disabled) {
                    e.currentTarget.style.backgroundColor = hasError ? 'var(--boxed-inputfield-error-color)' : 'var(--color-logo-2)';
                  }
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation(); // Stop propagation to prevent form/drag events
                  if (!isLoading && !disabled) {
                    inputRef.current.click();
                  }
                }}
                disabled={isLoading || disabled}
              >
                <FiUploadCloud className="w-4 h-4" />
                Drag & Drop or Select File
              </button>
              <span
                className={`upload-link ${isLoading || disabled ? 'disabled' : ''} ${!documentName ? 'hidden' : ''}`} // Hide if documentName empty
                onClick={(e) => {
                  e.preventDefault();
                  if (!isLoading && !disabled) {
                    inputRef.current.click();
                  }
                }}
                style={{ cursor: isLoading || disabled ? 'not-allowed' : 'pointer', color: 'var(--color-logo-2)' }}
              >
                {documentName}
              </span>
            </div>
          )}


          {isLoading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div className="progress-value" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
});

export default UploadFile;
