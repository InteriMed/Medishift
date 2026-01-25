import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX, FiSearch, FiUserPlus } from 'react-icons/fi';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../../services/firebase';
import { useNotification } from '../../../../contexts/NotificationContext';
import PropTypes from 'prop-types';

const AddParticipantModal = ({ isOpen, onClose, conversationId, currentParticipants = [] }) => {
    const { t } = useTranslation(['messages']);
    const { showSuccess, showError } = useNotification();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Note: In a real implementation, you might want to search users by name/email first
    // For this V1, we'll assume we're adding by user ID or have a user selection mechanism
    // To keep it simple and aligned with the backend change, we will input a USER ID for now, 
    // or ideally, this would use a user search component. 
    // given the context of "Facility Admins", we might want to list other admins from the facility?
    // For this MVP step, let's assume we are searching by exact email/ID or just list facility employees.
    // Since we don't have a broad "search all users" API ready for this context, 
    // let's implement a simple ID/Email input for now, but acknowledge it should be a search.

    const handleAddParticipant = async (e) => {
        e.preventDefault();
        if (!email.trim()) return;

        setIsLoading(true);
        try {
            // 1. Resolve user by email (functionality to be added to userManagement or similar)
            // For now, we'll call the messagesAPI 'addParticipant' action directly with the input
            // assuming the user might paste an ID. 
            // REAL WORLD FIX: We need a way to look up userID by email. 
            // Since we can't easily do that client-side without a specific index/permission, 
            // we'll rely on a hypothetical 'searchUsers' or just unimplemented UI for now.

            // Let's assume we pass the ID directly for testing, or rely on a known ID.
            // But to make it usable, we should probably fetch the facility staff list instead?

            const addParticipantFn = httpsCallable(functions, 'messagesAPI');
            await addParticipantFn({
                action: 'addParticipant',
                conversationId,
                participantId: email // leveraging the input as ID for MVP specific testing
            });

            showSuccess(t('messages:participantAdded', 'Participant added successfully'));
            onClose();
            setEmail('');
        } catch (error) {
            console.error('Error adding participant:', error);
            showError(error.message || t('messages:errors.addingParticipant', 'Failed to add participant'));
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-background rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FiUserPlus className="w-5 h-5 text-primary" />
                        Add Team Member
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-muted transition-colors"
                    >
                        <FiX className="w-5 h-5 opacity-70" />
                    </button>
                </div>

                <form onSubmit={handleAddParticipant} className="p-6">
                    <p className="text-sm text-muted-foreground mb-4">
                        Enter the User ID of the team member you want to add to this conversation.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">
                                User ID
                            </label>
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter user ID..."
                                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !email.trim()}
                                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                {isLoading ? 'Adding...' : 'Add Member'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

AddParticipantModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    conversationId: PropTypes.string.isRequired,
    currentParticipants: PropTypes.array
};

export default AddParticipantModal;
