/**
 * Account Deletion Component
 * 
 * Swiss nFADP/revDSG and GDPR compliant account deletion UI
 * Shows what will be deleted vs retained, and handles the deletion process
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiTrash2, FiAlertTriangle, FiCheck, FiX, FiLock, FiArchive } from 'react-icons/fi';
import { useAuth } from '../../../../contexts/AuthContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import Button from '../../../../components/BoxedInputFields/Button';
import Dialog from '../../../../components/Dialog/Dialog';
import InputFieldHideUnhide from '../../../../components/BoxedInputFields/InputFieldHideUnhide';
import PersonnalizedInputField from '../../../../components/BoxedInputFields/Personnalized-InputField';
import { getDeletionPreview, deleteAccount } from '../../../../services/accountManagementService';
import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { auth } from '../../../../services/firebase';

const AccountDeletion = () => {
    const { t } = useTranslation(['dashboardProfile', 'common']);
    const { currentUser, logout } = useAuth();
    const { showNotification } = useNotification();

    // State
    const [deletionPreview, setDeletionPreview] = useState(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(true);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isReauthDialogOpen, setIsReauthDialogOpen] = useState(false);
    const [isProcessingDelete, setIsProcessingDelete] = useState(false);
    const [confirmPhrase, setConfirmPhrase] = useState('');
    const [confirmError, setConfirmError] = useState('');
    const [reauthPassword, setReauthPassword] = useState('');
    const [reauthError, setReauthError] = useState('');
    const [authProvider, setAuthProvider] = useState(null);

    // Determine auth provider
    useEffect(() => {
        if (currentUser) {
            const isGoogleUser = currentUser.providerData?.some(
                provider => provider.providerId === 'google.com'
            );
            setAuthProvider(isGoogleUser ? 'google.com' : 'password');
        }
    }, [currentUser]);

    // Load deletion preview on mount
    useEffect(() => {
        const loadPreview = async () => {
            try {
                const preview = await getDeletionPreview();
                setDeletionPreview(preview);
            } catch (error) {
                console.error('Error loading deletion preview:', error);
                // If API fails, show default view
                setDeletionPreview(null);
            } finally {
                setIsLoadingPreview(false);
            }
        };

        loadPreview();
    }, []);

    // Handle delete button click
    const handleDeleteClick = useCallback(() => {
        setConfirmPhrase('');
        setConfirmError('');
        setIsDeleteDialogOpen(true);
    }, []);

    // Validate confirmation phrase and proceed to reauth
    const handleConfirmDelete = useCallback(() => {
        if (confirmPhrase.trim().toLowerCase() !== 'delete my account') {
            setConfirmError(t('settings.accountDeletion.confirmMismatch'));
            return;
        }
        setIsDeleteDialogOpen(false);
        setReauthPassword('');
        setReauthError('');
        setIsReauthDialogOpen(true);
    }, [confirmPhrase, t]);

    // Process the actual deletion
    const processAccountDeletion = useCallback(async () => {
        setIsProcessingDelete(true);
        try {
            // Call the deletion API
            const result = await deleteAccount({
                reason: 'User requested account deletion from profile settings'
            });

            if (result.success) {
                showNotification(t('settings.accountDeletion.success'), 'success');
                // Log out and redirect
                await logout();
                window.location.href = '/';
            } else {
                throw new Error(result.message || 'Deletion failed');
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            showNotification(t('settings.accountDeletion.error') + ': ' + error.message, 'error');
        } finally {
            setIsProcessingDelete(false);
            setIsReauthDialogOpen(false);
        }
    }, [showNotification, logout, t]);

    // Handle reauthentication and deletion
    const handleReauthAndDelete = useCallback(async () => {
        if (!auth.currentUser) {
            showNotification(t('errors.notLoggedIn'), 'error');
            return;
        }

        setIsProcessingDelete(true);
        setReauthError('');

        try {
            if (authProvider === 'google.com') {
                // Re-authenticate with Google
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
            } else {
                // Re-authenticate with password
                if (!reauthPassword) {
                    setReauthError(t('validation.required'));
                    setIsProcessingDelete(false);
                    return;
                }
                const credential = EmailAuthProvider.credential(
                    auth.currentUser.email,
                    reauthPassword
                );
                await reauthenticateWithCredential(auth.currentUser, credential);
            }

            // Now process the deletion
            await processAccountDeletion();

        } catch (error) {
            console.error('Error during reauthentication:', error);
            if (error.code === 'auth/wrong-password') {
                setReauthError(t('accountBasics.errors.wrongPassword'));
            } else if (error.code === 'auth/too-many-requests') {
                showNotification(t('errors.tooManyRequests'), 'error');
            } else if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
                showNotification(t('errors.popupClosed'), 'info');
            } else {
                setReauthError(t('accountBasics.errors.deleteFailed'));
            }
            setIsProcessingDelete(false);
        }
    }, [authProvider, reauthPassword, processAccountDeletion, showNotification, t]);

    const hasLegalRecords = deletionPreview?.hasLegalRecords;

    return (
        <div>
            <div className="p-4 rounded-xl border-2" style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                borderColor: 'rgba(239, 68, 68, 0.2)'
            }}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                        <FiAlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold m-0 mb-1" style={{ color: '#ef4444', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                                {t('settings.dangerZone')}
                            </h4>
                            <p className="text-xs m-0 leading-relaxed" style={{ color: 'var(--text-color)' }}>
                                {t('settings.accountDeletion.description')}
                            </p>
                        </div>
                    </div>
                    <div className="shrink-0">
                        <Button
                            onClick={handleDeleteClick}
                            disabled={isProcessingDelete || isLoadingPreview}
                            variant="danger"
                            style={{
                                minWidth: '160px',
                                height: '42px',
                                fontSize: '14px',
                                fontWeight: '500'
                            }}
                        >
                            <FiTrash2 className="w-4 h-4 mr-2" />
                            {t('settings.accountDeletion.deleteButton')}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <Dialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                title={t('settings.accountDeletion.confirmTitle')}
                size="medium"
                messageType="error"
                actions={
                    <>
                        <Button
                            onClick={() => setIsDeleteDialogOpen(false)}
                            variant="secondary"
                            disabled={isProcessingDelete}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onClick={handleConfirmDelete}
                            variant="danger"
                            disabled={isProcessingDelete || confirmPhrase.trim().toLowerCase() !== 'delete my account'}
                        >
                            {t('accountBasics.confirmDelete')}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    {deletionPreview && (
                        <div className="p-4 rounded-xl border-2 border-border/60" style={{ backgroundColor: 'var(--muted)' }}>
                            <h4 className="text-sm font-semibold m-0 mb-3" style={{ color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                                {t('settings.accountDeletion.previewTitle')}
                            </h4>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#ef4444' }}>
                                        <FiX className="w-4 h-4" />
                                        {t('settings.accountDeletion.immediatelyDeleted')}
                                    </div>
                                    <ul className="space-y-1.5 text-xs pl-5" style={{ color: 'var(--text-light-color)' }}>
                                        {deletionPreview.whatWillBeDeleted?.map((item, index) => (
                                            <li key={index} className="list-disc">{item}</li>
                                        ))}
                                    </ul>
                                </div>

                                {hasLegalRecords && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#f59e0b' }}>
                                            <FiArchive className="w-4 h-4" />
                                            {t('settings.accountDeletion.retainedForLegalReasons')}
                                        </div>
                                        <ul className="space-y-1.5 text-xs pl-5" style={{ color: 'var(--text-light-color)' }}>
                                            {deletionPreview.whatWillBeRetained?.map((item, index) => (
                                                <li key={index} className="list-disc">{item}</li>
                                            ))}
                                        </ul>
                                        {deletionPreview.retentionPeriod && (
                                            <p className="text-xs italic mt-2 pl-5" style={{ color: 'var(--text-light-color)' }}>
                                                {t('settings.accountDeletion.retentionPeriod')}: {deletionPreview.retentionPeriod}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {hasLegalRecords ? (
                                <div className="mt-3 p-3 rounded-xl border-2" style={{ 
                                    backgroundColor: 'rgba(245, 158, 11, 0.05)',
                                    borderColor: 'rgba(245, 158, 11, 0.2)'
                                }}>
                                    <p className="text-xs m-0 leading-relaxed" style={{ color: '#f59e0b' }}>
                                        <FiLock className="inline w-3 h-3 mr-1" />
                                        {t('settings.accountDeletion.swissLawNotice')}
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-3 p-3 rounded-xl border-2" style={{ 
                                    backgroundColor: 'rgba(34, 197, 94, 0.05)',
                                    borderColor: 'rgba(34, 197, 94, 0.2)'
                                }}>
                                    <p className="text-xs m-0 leading-relaxed" style={{ color: '#22c55e' }}>
                                        <FiCheck className="inline w-3 h-3 mr-1" />
                                        {t('settings.accountDeletion.noLegalRecords')}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <p className="font-bold text-red-600">{t('accountBasics.deleteWarningPermanent')}</p>
                    <p>{t('settings.accountDeletion.confirmMessage')}</p>
                    <PersonnalizedInputField
                        name="confirmPhrase"
                        value={confirmPhrase}
                        onChange={(e) => {
                            setConfirmPhrase(e.target.value);
                            if (confirmError) setConfirmError('');
                        }}
                        placeholder={t('settings.accountDeletion.confirmPlaceholder')}
                        error={confirmError}
                    />
                </div>
            </Dialog>

            {/* Reauthentication Dialog */}
            <Dialog
                isOpen={isReauthDialogOpen}
                onClose={() => {
                    setIsReauthDialogOpen(false);
                    setReauthPassword('');
                    setReauthError('');
                }}
                title={t('settings.accountDeletion.reauthTitle')}
                size="small"
                messageType="error"
                actions={
                    <>
                        <Button
                            onClick={() => {
                                setIsReauthDialogOpen(false);
                                setReauthPassword('');
                                setReauthError('');
                            }}
                            variant="secondary"
                            disabled={isProcessingDelete}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onClick={handleReauthAndDelete}
                            variant="danger"
                            disabled={isProcessingDelete || (authProvider !== 'google.com' && !reauthPassword)}
                        >
                            {isProcessingDelete
                                ? t('settings.accountDeletion.processing')
                                : t('accountBasics.confirmDeleteAccount')}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <p>
                        {authProvider === 'google.com'
                            ? t('settings.accountDeletion.reauthMessageGoogle')
                            : t('settings.accountDeletion.reauthMessage')}
                    </p>
                    {authProvider !== 'google.com' && (
                        <InputFieldHideUnhide
                            label={t('accountBasics.password')}
                            name="reauthPassword"
                            value={reauthPassword}
                            onChange={(e) => {
                                setReauthPassword(e.target.value);
                                if (reauthError) setReauthError('');
                            }}
                            error={reauthError}
                            type="password"
                            showErrors={true}
                        />
                    )}
                </div>
            </Dialog>
        </div>
    );
};

export default AccountDeletion;
