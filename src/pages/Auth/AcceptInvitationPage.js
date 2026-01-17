import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { getInvitationDetails, acceptFacilityInvitation } from '../../services/cloudFunctions';
import { useNotification } from '../../contexts/NotificationContext';
import Button from '../../components/BoxedInputFields/Button';
import logoImage from '../../assets/global/logo.png';
import '../../styles/auth.css';

function AcceptInvitationPage() {
  const { t } = useTranslation(['auth', 'common']);
  const { lang, token: urlToken } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [searchParams] = useSearchParams();
  
  const [invitationToken, setInvitationToken] = useState('');
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const queryToken = searchParams.get('token');
    const pathToken = window.location.pathname.split('/invite/')[1]?.split('?')[0];
    const token = urlToken || queryToken || pathToken;
    
    if (token) {
      setInvitationToken(token);
    } else {
      setError(t('auth.invitation.tokenMissing', 'Invitation token is missing'));
      setLoading(false);
    }
  }, [urlToken, searchParams, t]);

  useEffect(() => {
    const loadInvitation = async () => {
      if (!invitationToken) return;

      setLoading(true);
      setError('');

      try {
        const result = await getInvitationDetails(invitationToken);
        
        if (result.success) {
          setInvitation(result.invitation);
          
          if (!currentUser) {
            localStorage.setItem('pendingInvitation', invitationToken);
            navigate(`/${lang}/login?invite=${invitationToken}`);
            return;
          }
        } else {
          setError(result.error || t('auth.invitation.notFound', 'Invitation not found'));
        }
      } catch (err) {
        console.error('Error loading invitation:', err);
        setError(t('auth.invitation.loadError', 'Failed to load invitation details'));
      } finally {
        setLoading(false);
      }
    };

    if (invitationToken) {
      loadInvitation();
    }
  }, [invitationToken, currentUser, lang, navigate, t]);

  const handleAccept = async () => {
    if (!currentUser || !invitationToken) {
      navigate(`/${lang}/login?invite=${invitationToken}`);
      return;
    }

    setAccepting(true);
    setError('');

    try {
      const result = await acceptFacilityInvitation(invitationToken);
      
      if (result.success) {
        showSuccess(t('auth.invitation.accepted', 'Successfully joined the facility!'));
        localStorage.removeItem('pendingInvitation');
        
        setTimeout(() => {
          navigate(`/${lang}/dashboard`);
        }, 1500);
      } else {
        setError(result.error || t('auth.invitation.acceptError', 'Failed to accept invitation'));
      }
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError(t('auth.invitation.acceptError', 'Failed to accept invitation'));
    } finally {
      setAccepting(false);
    }
  };

  const handleLogin = () => {
    if (invitationToken) {
      localStorage.setItem('pendingInvitation', invitationToken);
    }
    navigate(`/${lang}/login?invite=${invitationToken || ''}`);
  };

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t('common.loading', 'Loading...')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="text-center">
            <img src={logoImage} alt="Logo" className="mx-auto mb-6 h-12" />
            <h1 className="text-2xl font-bold mb-4">{t('auth.invitation.error', 'Error')}</h1>
            <p className="text-destructive mb-6">{error}</p>
            <Button onClick={() => navigate(`/${lang}/login`)} variant="confirmation">
              {t('auth.goToLogin', 'Go to Login')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <img src={logoImage} alt="Logo" className="mx-auto mb-6 h-12" />
        
        <h1 className="text-2xl font-bold mb-2 text-center">
          {t('auth.invitation.title', 'Facility Invitation')}
        </h1>
        
        {invitation && (
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-card rounded-lg border border-border">
              <p className="text-sm text-muted-foreground mb-2">
                {t('auth.invitation.facility', 'Facility')}
              </p>
              <p className="text-lg font-semibold">{invitation.facilityName}</p>
            </div>
            
            <div className="p-4 bg-card rounded-lg border border-border">
              <p className="text-sm text-muted-foreground mb-2">
                {t('auth.invitation.role', 'Role')}
              </p>
              <p className="text-lg font-semibold">
                {invitation.workerType === 'other' 
                  ? invitation.workerTypeOther 
                  : t(`operations.workerTypes.${invitation.workerType}`, invitation.workerType)}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {!currentUser ? (
          <div className="space-y-3">
            <p className="text-center text-muted-foreground mb-4">
              {t('auth.invitation.loginRequired', 'Please log in or create an account to accept this invitation')}
            </p>
            <Button 
              onClick={handleLogin} 
              variant="confirmation" 
              className="w-full"
            >
              {t('auth.login', 'Login / Sign Up')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button 
              onClick={handleAccept} 
              variant="confirmation" 
              className="w-full"
              disabled={accepting}
            >
              {accepting 
                ? t('auth.invitation.accepting', 'Accepting...') 
                : t('auth.invitation.accept', 'Accept Invitation')}
            </Button>
            <Button 
              onClick={() => navigate(`/${lang}/dashboard`)} 
              variant="secondary" 
              className="w-full"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AcceptInvitationPage;

