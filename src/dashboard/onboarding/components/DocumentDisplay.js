import React from 'react';
import { FiFileText, FiEye, FiDownload, FiEdit, FiTrash2 } from 'react-icons/fi';

const DocumentDisplay = ({ file, onReplace, onRemove, hasError = false, inputRef }) => {
  const handleView = () => {
    if (file) {
      const url = file.url || file._downloadURL || URL.createObjectURL(file);
      window.open(url, '_blank');
    }
  };

  const handleDownload = () => {
    if (file) {
      const url = file.url || file._downloadURL || URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleReplace = () => {
    if (inputRef && inputRef.current) {
      inputRef.current.click();
    } else if (onReplace) {
      onReplace();
    }
  };

  return (
    <div className={`border rounded-lg p-4 bg-card shadow-sm ${hasError ? 'border-destructive' : 'border-border/60'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(var(--color-logo-2-rgb), 0.1)', color: 'var(--color-logo-2)' }}>
            <FiFileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{file.name}</p>
              {file._restored && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-transparent text-green-700 border border-green-700">
                  ✓ Restored
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleView}
            className="flex items-center justify-center w-8 h-8 text-muted-foreground transition-colors"
            style={{ '--hover-color': 'var(--color-logo-2)' }}
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--color-logo-2)'}
            onMouseOut={(e) => e.currentTarget.style.color = ''}
            title="View Document"
            aria-label="View Document"
          >
            <FiEye className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center justify-center w-8 h-8 text-muted-foreground transition-colors"
            style={{ '--hover-color': 'var(--color-logo-2)' }}
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--color-logo-2)'}
            onMouseOut={(e) => e.currentTarget.style.color = ''}
            title="Download Document"
            aria-label="Download Document"
          >
            <FiDownload className="w-4 h-4" />
          </button>
          <button
            onClick={handleReplace}
            className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-primary transition-colors"
            title="Replace Document"
            aria-label="Replace Document"
          >
            <FiEdit className="w-4 h-4" />
          </button>
          <button
            onClick={onRemove}
            className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-destructive transition-colors"
            title="Remove Document"
            aria-label="Remove Document"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentDisplay;


