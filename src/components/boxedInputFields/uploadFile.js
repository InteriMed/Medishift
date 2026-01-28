import React, { useState, useRef } from 'react';
import { FiUploadCloud, FiEye, FiEdit2, FiTrash2, FiFile } from 'react-icons/fi';
import './styles/boxedInputFields.css';
import './styles/UploadFile.css';

function UploadFile({
  onChange,
  onUploadComplete,
  accept,
  acceptedFileTypes,
  maxFileSize = 5,
  error,
  onErrorReset,
  isLoading = false,
  progress = 0,
  label = "Choose File",
  documentName = "document",
  className = "",
  disabled = false,
  value = null
}) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileObj, setFileObj] = useState(null);
  const [localError, setLocalError] = useState('');
  const [internalProgress, setInternalProgress] = useState(0);
  const [isUploadingInternal, setIsUploadingInternal] = useState(false);
  const internalInputRef = useRef(null);
  const uploadIntervalRef = useRef(null);

  // Sync state with value prop if provided
  React.useEffect(() => {
    if (value) {
      setFileName(value.name);
      setFileObj(value);
    } else {
      setFileName('');
      setFileObj(null);
    }
  }, [value]);

  const inputRef = internalInputRef;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (error && onErrorReset) {
      onErrorReset();
    }
    
    if (localError) {
      setLocalError('');
    }

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      if (!e.currentTarget.contains(e.relatedTarget)) {
        setDragActive(false);
      }
    }
  };

  const validateFile = (file) => {
    if (!file) return false;

    const fileSize = file.size / (1024 * 1024);
    const acceptTypes = accept || acceptedFileTypes || '.pdf,.jpg,.png,.jpeg';

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
      if (onErrorReset) {
        onErrorReset();
      }

      setFileName(file.name);
      setFileObj(file);
      setLocalError('');

      if (onChange) {
        onChange([file]);
      } else if (onUploadComplete) {
        onUploadComplete(file);
      }
    } else {
      setFileName('');
      setFileObj(null);
      setLocalError(validationResult);

      if (inputRef.current) {
        inputRef.current.value = '';
      }

      if (onErrorReset) {
        onErrorReset(validationResult);
      }
    }
  };

  React.useEffect(() => {
    if (isLoading) {
      setIsUploadingInternal(true);
    } else {
      setIsUploadingInternal(false);
      setInternalProgress(0);
    }
  }, [isLoading]);

  React.useEffect(() => {
    if (progress > 0) {
      setInternalProgress(progress);
    }
  }, [progress]);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoading || disabled) return;

    setDragActive(false);
    
    if (error && onErrorReset) {
      onErrorReset();
    }
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    } else {
      setLocalError('No file was dropped. Please try again.');
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (isLoading || disabled) return;

    if (error && onErrorReset) {
      onErrorReset();
    }

    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleView = (e) => {
    e.stopPropagation();
    if (fileObj) {
      const url = URL.createObjectURL(fileObj);
      window.open(url, '_blank');
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();

    // Clear upload simulation if in progress
    if (uploadIntervalRef.current) {
      clearInterval(uploadIntervalRef.current);
    }

    setFileName('');
    setFileObj(null);
    setIsUploadingInternal(false);
    setInternalProgress(0);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
    if (onChange) {
      onChange([]);
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
        onClick={(e) => {
          // Only trigger click if not clicking on actions and no file is selected (or intent is to switch)
          // If file is selected, user should use Edit button, but clicking container is also fine UX typically.
          // But requested UI suggests specific buttons. Let's keep container click for empty state.
          if (!fileName && !isLoading && !disabled) {
            inputRef.current.click();
          }
        }}
        style={{ cursor: !fileName && !isLoading && !disabled ? 'pointer' : 'default' }}
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
          {(isUploadingInternal || isLoading) ? (
            <div className="upload-progress-container">
              <div className="progress-bar">
                <div className="progress-value" style={{ width: `${internalProgress > 0 ? internalProgress : 0}%` }}></div>
              </div>
              <span className="progress-percentage">{Math.round(internalProgress > 0 ? internalProgress : 0)}%</span>
            </div>
          ) : fileName ? (
            <div className="flex items-center justify-between w-full px-4" style={{ gap: '12px' }}>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                  <FiFile className="w-5 h-5" />
                </div>
                <span className="file-name text-sm font-medium text-slate-700 truncate text-left max-w-[200px]">
                  {fileName}
                </span>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <button
                  type="button"
                  onClick={handleView}
                  style={{ background: 'none', border: 'none', padding: 0, color: '#000000', cursor: 'pointer', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'hsl(221, 83%, 53%)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#000000'}
                  title="View"
                >
                  <FiEye style={{ width: '16px', height: '16px', color: 'inherit' }} />
                </button>
                <button
                  type="button"
                  onClick={handleEdit}
                  style={{ background: 'none', border: 'none', padding: 0, color: '#000000', cursor: 'pointer', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'hsl(221, 83%, 53%)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#000000'}
                  title="Replace"
                >
                  <FiEdit2 style={{ width: '16px', height: '16px', color: 'inherit' }} />
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  style={{ background: 'none', border: 'none', padding: 0, color: '#000000', cursor: 'pointer', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'hsl(221, 83%, 53%)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#000000'}
                  title="Remove"
                >
                  <FiTrash2 style={{ width: '16px', height: '16px', color: 'inherit' }} />
                </button>
              </div>
            </div>
          ) : (
            <div className="upload-idle-state">
              <FiUploadCloud className="upload-icon-main" />
              <span className="upload-text-main">Drag & Drop or Click</span>
            </div>
          )}
        </div>
        {!fileName && !isUploadingInternal && !isLoading && (
          <div className="upload-drag-overlay">
            <FiUploadCloud className="upload-drag-icon" />
            <span className="upload-drag-text">Drop File Here</span>
          </div>
        )}
      </form>
    </div>
  );
}

export default UploadFile;