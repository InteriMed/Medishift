import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiHome, FiMapPin, FiUsers, FiMail, FiPhone, FiExternalLink } from 'react-icons/fi';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useDashboard } from '../../../../contexts/DashboardContext';
import { db } from '../../../../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '../../../../../config/keysDatabase';
import { buildDashboardUrl, getWorkspaceIdForUrl } from '../../../../../config/routeUtils';
import { useNavigate } from 'react-router-dom';
import { WORKSPACE_TYPES } from '../../../../../utils/sessionAuth';
import LoadingSpinner from '../../../../../components/LoadingSpinner/LoadingSpinner';

const styles = {
  sectionContainer: "flex flex-col gap-6 p-0 w-full max-w-[1400px] mx-auto",
  headerCard: "bg-card rounded-2xl border border-border/50 px-6 py-4 shadow-lg backdrop-blur-sm w-full max-w-[1400px] mx-auto flex flex-col",
  sectionTitle: "text-2xl font-semibold mb-0",
  sectionTitleStyle: { fontSize: '18px', color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionSubtitle: "text-sm font-medium",
  sectionSubtitleStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionsWrapper: "facility-sections-wrapper w-full max-w-[1400px] mx-auto",
  facilityCard: "bg-card rounded-2xl border border-border/50 p-6 shadow-lg backdrop-blur-sm w-full hover:shadow-xl transition-shadow",
  cardHeader: "flex items-start justify-between mb-4 pb-4 border-b border-border/40",
  cardTitle: "flex-1 min-w-0",
  cardTitleH3: "m-0 text-lg font-semibold truncate",
  cardTitleH3Style: { color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  cardSubtitle: "text-sm text-muted-foreground mt-1",
  cardContent: "space-y-3",
  infoRow: "flex items-center gap-2 text-sm",
  infoIcon: "text-muted-foreground shrink-0",
  infoText: "text-foreground",
  rolesBadge: "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary",
  emptyState: "text-center py-12",
  emptyIcon: "mx-auto w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4",
  emptyText: "text-muted-foreground",
  emptyTitle: "text-lg font-semibold mb-2",
  emptyTitleStyle: { color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }
};

const Facility = ({
  formData,
  config,
  errors,
  isSubmitting,
  onInputChange,
  onSaveAndContinue,
  onSave,
  onCancel,
  getNestedValue,
  validateCurrentTabData
}) => {
  const { t } = useTranslation(['dashboardProfile', 'common']);
  const { currentUser, userProfile } = useAuth();
  const { selectedWorkspace, setSelectedWorkspace, workspaces } = useDashboard();
  const navigate = useNavigate();
  const [facilities, setFacilities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const facilityRoles = useMemo(() => {
    if (!userProfile?.roles) return [];
    return userProfile.roles.filter(r => r.facility_uid);
  }, [userProfile]);

  useEffect(() => {
    const fetchFacilities = async () => {
      if (!facilityRoles.length) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const facilityPromises = facilityRoles.map(async (roleEntry) => {
          try {
            const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, roleEntry.facility_uid);
            const facilitySnap = await getDoc(facilityRef);
            
            if (facilitySnap.exists()) {
              const facilityData = facilitySnap.data();
              return {
                id: facilitySnap.id,
                ...facilityData,
                roles: roleEntry.roles || []
              };
            }
            return null;
          } catch (error) {
            console.error(`Error fetching facility ${roleEntry.facility_uid}:`, error);
            return null;
          }
        });

        const fetchedFacilities = (await Promise.all(facilityPromises)).filter(Boolean);
        setFacilities(fetchedFacilities);
      } catch (error) {
        console.error('Error fetching facilities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFacilities();
  }, [facilityRoles]);

  const handleSwitchToFacility = (facilityId) => {
    const facilityWorkspace = workspaces?.find(w => 
      w.type === WORKSPACE_TYPES.TEAM && w.facilityId === facilityId
    );
    
    if (facilityWorkspace) {
      setSelectedWorkspace(facilityWorkspace);
      const workspaceId = getWorkspaceIdForUrl(facilityWorkspace);
      navigate(buildDashboardUrl('/dashboard', workspaceId));
    }
  };

  const getFacilityName = (facility) => {
    return facility.companyName || 
           facility.facilityName || 
           facility.identityLegal?.legalCompanyName ||
           t('facility.unnamed', 'Unnamed Facility');
  };

  const getFacilityAddress = (facility) => {
    const address = facility.address || facility.contact?.businessAddress || {};
    const parts = [
      address.street,
      address.number,
      address.postalCode,
      address.city,
      address.canton
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  if (isLoading) {
    return (
      <div className={styles.sectionContainer}>
        <div className={styles.headerCard}>
          <h2 className={styles.sectionTitle} style={styles.sectionTitleStyle}>
            {t('facility.title', 'Facilities')}
          </h2>
        </div>
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (facilities.length === 0) {
    return (
      <div className={styles.sectionContainer}>
        <div className={styles.headerCard}>
          <h2 className={styles.sectionTitle} style={styles.sectionTitleStyle}>
            {t('facility.title', 'Facilities')}
          </h2>
          <p className={styles.sectionSubtitle} style={styles.sectionSubtitleStyle}>
            {t('facility.subtitle', 'Manage your facility memberships')}
          </p>
        </div>
        <div className={styles.sectionsWrapper}>
          <div className={styles.facilityCard}>
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <FiHome className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className={styles.emptyTitle} style={styles.emptyTitleStyle}>
                {t('facility.noFacilities', 'No Facility Memberships')}
              </h3>
              <p className={styles.emptyText}>
                {t('facility.noFacilitiesDescription', 'You are not currently a member of any facilities.')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.headerCard}>
        <h2 className={styles.sectionTitle} style={styles.sectionTitleStyle}>
          {t('facility.title', 'Facilities')}
        </h2>
        <p className={styles.sectionSubtitle} style={styles.sectionSubtitleStyle}>
          {t('facility.subtitle', 'Manage your facility memberships')}
        </p>
      </div>

      <div className={styles.sectionsWrapper}>
        {facilities.map((facility) => (
          <div key={facility.id} className={styles.facilityCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>
                  {getFacilityName(facility)}
                </h3>
                {facility.roles && facility.roles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {facility.roles.map((role, idx) => (
                      <span key={idx} className={styles.rolesBadge}>
                        {t(`facility.roles.${role}`, role)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleSwitchToFacility(facility.id)}
                className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                title={t('facility.switchToFacility', 'Switch to Facility Workspace')}
              >
                <FiExternalLink className="w-5 h-5" />
              </button>
            </div>

            <div className={styles.cardContent}>
              {getFacilityAddress(facility) && (
                <div className={styles.infoRow}>
                  <FiMapPin className={styles.infoIcon} />
                  <span className={styles.infoText}>{getFacilityAddress(facility)}</span>
                </div>
              )}

              {facility.contact?.businessEmail && (
                <div className={styles.infoRow}>
                  <FiMail className={styles.infoIcon} />
                  <span className={styles.infoText}>{facility.contact.businessEmail}</span>
                </div>
              )}

              {facility.contact?.businessPhone && (
                <div className={styles.infoRow}>
                  <FiPhone className={styles.infoIcon} />
                  <span className={styles.infoText}>{facility.contact.businessPhone}</span>
                </div>
              )}

              {facility.glnNumber && (
                <div className={styles.infoRow}>
                  <span className={styles.infoText}>
                    <strong>GLN:</strong> {facility.glnNumber}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

Facility.propTypes = {
  formData: PropTypes.object.isRequired,
  config: PropTypes.shape({
    fields: PropTypes.object
  }).isRequired,
  errors: PropTypes.object.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onSaveAndContinue: PropTypes.func,
  onSave: PropTypes.func,
  onCancel: PropTypes.func.isRequired,
  getNestedValue: PropTypes.func.isRequired,
  validateCurrentTabData: PropTypes.func
};

export default Facility;

