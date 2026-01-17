import React from 'react';

const AutoFillHighlight = () => {
  return (
    <>
      <style>{`
        @keyframes pulse-autofill-highlight {
          0%, 100% {
            box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.3), 0 0 0 4px rgba(37, 99, 235, 0.2), 0 0 20px rgba(37, 99, 235, 0.4);
            border-color: rgba(37, 99, 235, 0.5);
            background-color: rgba(37, 99, 235, 0.08);
          }
          50% {
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.4), 0 0 0 6px rgba(37, 99, 235, 0.3), 0 0 30px rgba(37, 99, 235, 0.5);
            border-color: rgba(37, 99, 235, 0.7);
            background-color: rgba(37, 99, 235, 0.12);
          }
        }
        [data-tutorial="profile-upload-button"] {
          position: relative;
        }
        [data-tutorial="profile-upload-button"]::before {
          content: '';
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          border-radius: 12px;
          background-color: rgba(37, 99, 235, 0.08);
          border: 2px solid rgba(37, 99, 235, 0.5);
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.3), 0 0 0 4px rgba(37, 99, 235, 0.2), 0 0 20px rgba(37, 99, 235, 0.4);
          animation: pulse-autofill-highlight 2s ease-in-out infinite;
          pointer-events: none;
          z-index: 1;
        }
      `}</style>
    </>
  );
};

export default AutoFillHighlight;

