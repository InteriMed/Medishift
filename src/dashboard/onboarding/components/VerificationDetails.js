import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FiChevronDown, FiChevronUp, FiCode, FiFileText, FiDatabase } from 'react-icons/fi';
import { cn } from '../../../utils/cn';

const VerificationDetails = ({ verificationDetails, documentName }) => {
  const [expandedSections, setExpandedSections] = useState({
    prompt: false,
    rawResponse: false,
    sortedData: false
  });

  if (!verificationDetails) {
    return null;
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatJSON = (data) => {
    try {
      if (typeof data === 'string') {
        return JSON.stringify(JSON.parse(data), null, 2);
      }
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="text-sm font-semibold text-foreground mb-2">
        Verification Details {documentName && `- ${documentName}`}
      </div>

      <div className="space-y-2">
        {verificationDetails.aiPrompt && (
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('prompt')}
              className="w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <FiFileText className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">AI Prompt</span>
              </div>
              {expandedSections.prompt ? (
                <FiChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <FiChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {expandedSections.prompt && (
              <div className="p-4 bg-muted/10 border-t border-border">
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap overflow-x-auto">
                  {verificationDetails.aiPrompt}
                </pre>
              </div>
            )}
          </div>
        )}

        {verificationDetails.rawAiResponse && (
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('rawResponse')}
              className="w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <FiCode className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Raw AI Response</span>
              </div>
              {expandedSections.rawResponse ? (
                <FiChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <FiChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {expandedSections.rawResponse && (
              <div className="p-4 bg-muted/10 border-t border-border">
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
                  {formatJSON(verificationDetails.rawAiResponse)}
                </pre>
              </div>
            )}
          </div>
        )}

        {verificationDetails.sortedData && (
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('sortedData')}
              className="w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <FiDatabase className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Sorted/Processed Data</span>
              </div>
              {expandedSections.sortedData ? (
                <FiChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <FiChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {expandedSections.sortedData && (
              <div className="p-4 bg-muted/10 border-t border-border">
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
                  {formatJSON(verificationDetails.sortedData)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

VerificationDetails.propTypes = {
  verificationDetails: PropTypes.shape({
    aiPrompt: PropTypes.string,
    rawAiResponse: PropTypes.string,
    sortedData: PropTypes.object
  }),
  documentName: PropTypes.string
};

export default VerificationDetails;



