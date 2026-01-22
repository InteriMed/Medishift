import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { X, AlertTriangle } from 'lucide-react';
import './GhostModeBanner.css';

const GhostModeBanner = () => {
  const { isImpersonating, impersonatedUser, impersonationSession, stopImpersonation, originalUserProfile } = useAuth();

  if (!isImpersonating || !impersonatedUser || !impersonationSession) {
    return null;
  }

  const handleStopImpersonation = async () => {
    try {
      await stopImpersonation();
    } catch (error) {
      console.error('Error stopping impersonation:', error);
    }
  };

  const targetUserName = impersonatedUser.displayName || 
    `${impersonatedUser.firstName || ''} ${impersonatedUser.lastName || ''}`.trim() || 
    impersonatedUser.email || 
    'Unknown User';

  const adminName = originalUserProfile?.displayName || 
    `${originalUserProfile?.firstName || ''} ${originalUserProfile?.lastName || ''}`.trim() || 
    originalUserProfile?.email || 
    'Admin';

  const remainingMinutes = impersonationSession.remainingMinutes || 0;

  return (
    <div className="ghost-mode-banner" role="alert" aria-live="polite">
      <div className="ghost-mode-banner-content">
        <div className="ghost-mode-banner-icon">
          <AlertTriangle size={20} />
        </div>
        <div className="ghost-mode-banner-text">
          <strong>GHOST MODE ACTIVE</strong>
          <span className="ghost-mode-banner-details">
            You are currently viewing the platform as <strong>{targetUserName}</strong>.
            {remainingMinutes > 0 && (
              <span className="ghost-mode-banner-timer">
                Session expires in {remainingMinutes} minute{remainingMinutes !== 1 ? 's' : ''}.
              </span>
            )}
            All actions will be logged and attributed to admin <strong>{adminName}</strong>.
          </span>
        </div>
        <button
          className="ghost-mode-banner-close"
          onClick={handleStopImpersonation}
          aria-label="Stop impersonation"
          title="Stop impersonation"
        >
          <X size={18} />
          <span className="ghost-mode-banner-close-text">Exit Ghost Mode</span>
        </button>
      </div>
    </div>
  );
};

export default GhostModeBanner;

