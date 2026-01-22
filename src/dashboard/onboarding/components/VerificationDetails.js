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
  const [showDebug, setShowDebug] = useState(false);

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
    <div className="space-y-4 mt-8 mb-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xl font-black text-slate-900">
          {documentName || 'Verification Results'}
        </h3>
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="text-[10px] uppercase tracking-widest font-bold text-slate-400 hover:text-slate-600 transition-colors"
        >
          {showDebug ? 'Hide Debug' : 'Show Debug'}
        </button>
      </div>

      {showDebug && (
        <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
          {verificationDetails.aiPrompt && (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <button
                onClick={() => toggleSection('prompt')}
                className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <FiFileText className="w-4 h-4 text-slate-600" />
                  <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">AI Prompt</span>
                </div>
                {expandedSections.prompt ? (
                  <FiChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <FiChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {expandedSections.prompt && (
                <div className="p-4 bg-slate-900 border-t border-slate-800">
                  <pre className="text-[10px] font-mono text-slate-300 whitespace-pre-wrap overflow-x-auto">
                    {verificationDetails.aiPrompt}
                  </pre>
                </div>
              )}
            </div>
          )}

          {verificationDetails.rawAiResponse && (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <button
                onClick={() => toggleSection('rawResponse')}
                className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <FiCode className="w-4 h-4 text-slate-600" />
                  <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Raw AI Response</span>
                </div>
                {expandedSections.rawResponse ? (
                  <FiChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <FiChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {expandedSections.rawResponse && (
                <div className="p-4 bg-slate-900 border-t border-slate-800">
                  <pre className="text-[10px] font-mono text-slate-300 whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
                    {formatJSON(verificationDetails.rawAiResponse)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {verificationDetails.sortedData && (
        <div className="border border-slate-200 rounded-[1.5rem] overflow-hidden bg-white shadow-sm border-b-4 border-b-slate-100">
          <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <FiDatabase className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-slate-900">Extracted Registry Data</span>
          </div>
          <div className="p-6">
            <pre className="text-sm font-medium text-slate-700 whitespace-pre-wrap">
              {formatJSON(verificationDetails.sortedData)}
            </pre>
          </div>
        </div>
      )}
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



