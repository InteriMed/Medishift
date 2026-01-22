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
    <div className={`border-[1.5rem] p-6 bg-white shadow-xl transition-all duration-300 ${hasError ? 'border-destructive/20 ring-1 ring-destructive/20' : 'border-slate-50 border-b-4 border-b-slate-100'}`} style={{ borderRadius: '2rem' }}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-slate-900 text-white shadow-lg">
            <FiFileText className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-base font-black text-slate-900 truncate">{file.name}</p>
              {file._restored && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-50 text-green-700 border border-green-200">
                  ✓ Restored
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleView}
            style={{ background: 'none', border: 'none', padding: 0, color: '#000000', cursor: 'pointer', transition: 'color 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'hsl(221, 83%, 53%)'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#000000'}
            title="View Document"
            aria-label="View Document"
          >
            <FiEye style={{ width: '16px', height: '16px', color: 'inherit' }} />
          </button>
          <button
            onClick={handleDownload}
            style={{ background: 'none', border: 'none', padding: 0, color: '#000000', cursor: 'pointer', transition: 'color 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'hsl(221, 83%, 53%)'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#000000'}
            title="Download Document"
            aria-label="Download Document"
          >
            <FiDownload style={{ width: '16px', height: '16px', color: 'inherit' }} />
          </button>
          <button
            onClick={handleReplace}
            style={{ background: 'none', border: 'none', padding: 0, color: '#000000', cursor: 'pointer', transition: 'color 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'hsl(221, 83%, 53%)'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#000000'}
            title="Replace Document"
            aria-label="Replace Document"
          >
            <FiEdit style={{ width: '16px', height: '16px', color: 'inherit' }} />
          </button>
          <button
            onClick={onRemove}
            style={{ background: 'none', border: 'none', padding: 0, color: '#000000', cursor: 'pointer', transition: 'color 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'hsl(221, 83%, 53%)'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#000000'}
            title="Remove Document"
            aria-label="Remove Document"
          >
            <FiTrash2 style={{ width: '16px', height: '16px', color: 'inherit' }} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentDisplay;


