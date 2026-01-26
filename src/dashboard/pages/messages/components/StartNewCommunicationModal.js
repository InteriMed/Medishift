import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FiX, FiUser, FiUsers, FiUserPlus, FiBriefcase } from 'react-icons/fi';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { useDashboard } from '../../../contexts/DashboardContext';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import { buildDashboardUrl, getWorkspaceIdForUrl, getOrganizationBasePath } from '../../../utils/pathUtils';
import Dialog from '../../../../components/Dialog/Dialog';
import PropTypes from 'prop-types';

const StartNewCommunicationModal = ({ isOpen, onClose, onSelectTeamMember }) => {
  const { t } = useTranslation(['messages']);
  const navigate = useNavigate();
  const { selectedWorkspace, user } = useDashboard();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);

  useEffect(() => {
    const fetchOrganizationMembers = async () => {
      if (!isOpen) {
        setTeamMembers([]);
        return;
      }

      setLoadingTeamMembers(true);
      try {
        let allMemberIds = [];

        if (selectedWorkspace?.facilityId) {
          const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, selectedWorkspace.facilityId);
          const facilitySnap = await getDoc(facilityRef);

          if (facilitySnap.exists()) {
            const facilityData = facilitySnap.data();
            const employeesList = facilityData.employees || [];
            allMemberIds = [...new Set(employeesList.map(emp => emp.uid).filter(Boolean))];
          }
        } else {
          const usersSnapshot = await getDocs(collection(db, FIRESTORE_COLLECTIONS.USERS));
          allMemberIds = usersSnapshot.docs.map(doc => doc.id);
        }

        const memberPromises = allMemberIds
          .filter(uid => uid !== user?.uid)
          .map(async (userId) => {
            try {
              const professionalProfileRef = doc(db, 'professionalProfiles', userId);
              const professionalProfileSnap = await getDoc(professionalProfileRef);

              if (professionalProfileSnap.exists()) {
                const professionalData = professionalProfileSnap.data();
                const identity = professionalData.identity || {};
                const firstName = identity.legalFirstName || identity.firstName || '';
                const lastName = identity.legalLastName || identity.lastName || '';

                return {
                  uid: userId,
                  firstName: firstName,
                  lastName: lastName,
                  displayName: `${firstName} ${lastName}`.trim() || 'Unknown',
                  email: professionalData.contact?.primaryEmail || '',
                  photoURL: professionalData.photoURL || null
                };
              } else {
                const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                  const userData = userSnap.data();
                  return {
                    uid: userId,
                    firstName: userData.firstName || '',
                    lastName: userData.lastName || '',
                    displayName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown',
                    email: userData.email || '',
                    photoURL: userData.photoURL || null
                  };
                }
              }
            } catch (error) {
              console.error(`Error fetching profile for user ${userId}:`, error);
            }
            return null;
          });

        const members = (await Promise.all(memberPromises)).filter(Boolean);
        setTeamMembers(members);
      } catch (error) {
        console.error('Error fetching organization members:', error);
      } finally {
        setLoadingTeamMembers(false);
      }
    };

    fetchOrganizationMembers();
  }, [isOpen, selectedWorkspace, user]);

  const handleTeamMemberClick = (member) => {
    if (onSelectTeamMember) {
      onSelectTeamMember(member);
    }
    onClose();
  };


  const handleAddTeamMembers = () => {
    if (selectedWorkspace?.facilityId) {
      const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);
      const basePath = getOrganizationBasePath(selectedWorkspace);
      navigate(buildDashboardUrl(`/${basePath}/team`, workspaceId));
    } else {
      navigate('/dashboard/personal/profile');
    }
    onClose();
  };

  const handleCreateJobOffer = () => {
    if (selectedWorkspace?.facilityId) {
      const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);
      const basePath = getOrganizationBasePath(selectedWorkspace);
      navigate(buildDashboardUrl(`/${basePath}/team?subTab=hiring`, workspaceId));
    } else {
      navigate('/dashboard/personal/profile');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('messages:startNewCommunication.title', 'Start New Communication')}
      size="medium"
      closeOnBackdropClick={true}
      actions={
        <button
          onClick={onClose}
          className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
        >
          {t('common:cancel', 'Cancel')}
        </button>
      }
    >
      <div className="space-y-4">
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-foreground mb-3" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
            {t('messages:startNewCommunication.messages', 'Messages')}
          </h4>
          {loadingTeamMembers ? (
            <p className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
              {t('messages:startNewCommunication.loading', 'Loading organization members...')}
            </p>
          ) : teamMembers.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {teamMembers.map((member) => (
                <button
                  key={member.uid}
                  onClick={() => handleTeamMemberClick(member)}
                  className="w-full flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  {member.photoURL ? (
                    <img
                      src={member.photoURL}
                      alt={member.displayName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <FiUser className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)', margin: 0 }}>
                      {member.displayName}
                    </p>
                    {member.email && (
                      <p className="text-xs text-muted-foreground truncate" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)', margin: 0 }}>
                        {member.email}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                {t('messages:startNewCommunication.addTeamMembers', 'Add team members or create a new job offer to continue')}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleAddTeamMembers}
                  className="w-full flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <FiUserPlus className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)', margin: 0 }}>
                      {t('messages:startNewCommunication.addTeamMembersButton', 'Add Team Members')}
                    </p>
                  </div>
                </button>
                <button
                  onClick={handleCreateJobOffer}
                  className="w-full flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <FiBriefcase className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)', margin: 0 }}>
                      {t('messages:startNewCommunication.createJobOfferButton', 'Create Job Offer')}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
};

StartNewCommunicationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSelectTeamMember: PropTypes.func
};

export default StartNewCommunicationModal;

