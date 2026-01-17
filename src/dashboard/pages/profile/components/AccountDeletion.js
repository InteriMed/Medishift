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
        if (confirmPhrase !== 'DELETE MY ACCOUNT') {
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

    return (
        <div className="space-y-6">
            {/* Deletion Preview Section */}
            {isLoadingPreview ? (
                <div className="bg-card rounded-xl border border-border/60 p-6 shadow-sm">
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                        <span className="text-sm">{t('settings.accountDeletion.loadingPreview')}</span>
                    </div>
                </div>
            ) : deletionPreview && (
                <div className="bg-card rounded-xl border border-border/60 p-6 shadow-sm">
                    <h3 className="text-sm font-medium m-0 mb-4" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                        {t('settings.accountDeletion.previewTitle')}
                    </h3>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* What will be deleted */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                                <FiX className="w-4 h-4" />
                                {t('settings.accountDeletion.immediatelyDeleted')}
                            </div>
                            <ul className="space-y-2 text-sm text-muted-foreground pl-6">
                                {deletionPreview.whatWillBeDeleted?.map((item, index) => (
                                    <li key={index} className="list-disc">{item}</li>
                                ))}
                            </ul>
                        </div>

                        {/* What will be retained */}
                        {deletionPreview.hasLegalRecords && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium text-sm">
                                    <FiArchive className="w-4 h-4" />
                                    {t('settings.accountDeletion.retainedForLegalReasons')}
                                </div>
                                <ul className="space-y-2 text-sm text-muted-foreground pl-6">
                                    {deletionPreview.whatWillBeRetained?.map((item, index) => (
                                        <li key={index} className="list-disc">{item}</li>
                                    ))}
                                </ul>
                                {deletionPreview.retentionPeriod && (
                                    <p className="text-xs text-muted-foreground italic mt-2 pl-6">
                                        {t('settings.accountDeletion.retentionPeriod')}: {deletionPreview.retentionPeriod}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Legal notice */}
                    {deletionPreview.hasLegalRecords ? (
                        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                            <p className="text-xs text-amber-800 dark:text-amber-200">
                                <FiLock className="inline w-3 h-3 mr-1" />
                                {t('settings.accountDeletion.swissLawNotice')}
                            </p>
                        </div>
                    ) : (
                        <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-xs text-green-800 dark:text-green-200">
                                <FiCheck className="inline w-3 h-3 mr-1" />
                                {t('settings.accountDeletion.noLegalRecords')}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Danger Zone - Delete Account */}
            <div className="bg-red-50/50 dark:bg-red-950/10 rounded-xl border border-red-100 dark:border-red-900/30 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4 flex-1">
                        <div className="p-2 rounded-lg bg-white text-red-600 dark:text-red-400 shrink-0">
                            <FiAlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium m-0 text-red-600 dark:text-red-400" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                                {t('settings.dangerZone')}
                            </h3>
                            <h4 className="font-medium text-foreground mt-2 mb-1">
                                {t('settings.accountDeletion.title')}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                                {t('settings.accountDeletion.description')}
                            </p>
                        </div>
                    </div>
                    <div className="shrink-0 md:ml-4">
                        <Button
                            onClick={handleDeleteClick}
                            disabled={isProcessingDelete}
                            variant="danger"
                            size="sm"
                            icon={<FiTrash2 />}
                        >
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
                size="small"
                messageType="warning"
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
                            disabled={isProcessingDelete || confirmPhrase !== 'DELETE MY ACCOUNT'}
                        >
                            {t('accountBasics.confirmDelete')}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
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
                messageType="warning"
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
