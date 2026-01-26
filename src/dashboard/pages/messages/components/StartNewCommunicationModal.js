import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FiX, FiUser, FiFileText, FiUsers } from 'react-icons/fi';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { useDashboard } from '../../../contexts/DashboardContext';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import { buildDashboardUrl } from '../../../utils/pathUtils';
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

  const handleContractsClick = () => {
    if (selectedWorkspace) {
      const workspaceId = selectedWorkspace.type === 'personal' ? 'personal' : selectedWorkspace.facilityId;
      const contractsPath = buildDashboardUrl('/dashboard/contracts', workspaceId);
      navigate(contractsPath);
    } else {
      navigate('/dashboard/personal/contracts');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
            <FiUsers className="w-5 h-5 text-primary" />
            {t('messages:startNewCommunication.title', 'Start New Communication')}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-muted transition-colors"
          >
            <FiX className="w-5 h-5 opacity-70" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-foreground mb-3" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
              {t('messages:startNewCommunication.messages', 'Messages')}
            </h4>
            {teamMembers.length > 0 ? (
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
              <p className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                {t('messages:startNewCommunication.noMembers', 'No organization members available')}
              </p>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
              {t('messages:startNewCommunication.contracts', 'Contracts')}
            </h4>
            <button
              onClick={handleContractsClick}
              className="w-full flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FiFileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)', margin: 0 }}>
                  {t('messages:startNewCommunication.viewContracts', 'View Contracts')}
                </p>
                <p className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)', margin: 0 }}>
                  {t('messages:startNewCommunication.contractsDescription', 'Browse your contracts')}
                </p>
              </div>
            </button>
          </div>

          {loadingTeamMembers && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                {t('messages:startNewCommunication.loading', 'Loading organization members...')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

StartNewCommunicationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSelectTeamMember: PropTypes.func
};

export default StartNewCommunicationModal;

