import React from 'react';

const TabHighlight = ({ highlightTab }) => {
    if (!highlightTab) return null;

    return (
        <>
            <style>{`
        @keyframes pulse-tab-highlight {
          0%, 100% {
            box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2), 0 0 0 4px rgba(37, 99, 235, 0.1), 0 0 15px rgba(37, 99, 235, 0.3);
            border-color: rgba(37, 99, 235, 0.4);
            background-color: rgba(37, 99, 235, 0.05);
          }
          50% {
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.3), 0 0 0 6px rgba(37, 99, 235, 0.2), 0 0 25px rgba(37, 99, 235, 0.4);
            border-color: rgba(37, 99, 235, 0.6);
            background-color: rgba(37, 99, 235, 0.1);
          }
        }
        [data-tab="${highlightTab}"] {
          position: relative !important;
          animation: pulse-tab-highlight 2s ease-in-out infinite !important;
          z-index: 5 !important;
          border-width: 1px !important;
        }
      `}</style>
        </>
    );
};

export default TabHighlight;
