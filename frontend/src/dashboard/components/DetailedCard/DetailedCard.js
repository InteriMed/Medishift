import React from 'react';
import { FiX, FiShare2, FiMapPin, FiCalendar, FiFileText } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../../contexts/NotificationContext';
import { applyToJob, contactPharmacist } from '../../../services/apiService';
import styles from './detailedCard.module.css';

const DetailedCard = ({ listing, onClose }) => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const isJob = 'title' in listing;
  
  const handleAction = async () => {
    try {
      if (isJob) {
        await applyToJob(listing.id, { message: 'I am interested in this position' });
        showNotification({
          type: 'success',
          message: t('dashboard.marketplace.applicationSent')
        });
      } else {
        await contactPharmacist(listing.id, { message: 'I would like to discuss opportunities' });
        showNotification({
          type: 'success',
          message: t('dashboard.marketplace.messageSent')
        });
      }
    } catch (error) {
      showNotification({
        type: 'error',
        message: t('dashboard.marketplace.actionFailed')
      });
    }
  };
  
  const handleShare = (e) => {
    e.stopPropagation();
    // Use the Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: isJob ? listing.title : 'Pharmacist Profile',
        text: isJob ? `Check out this job: ${listing.title}` : 'Check out this pharmacist profile',
        url: window.location.href
      })
      .catch(err => {
        showNotification({
          type: 'error',
          message: t('dashboard.marketplace.shareFailed')
        });
      });
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          showNotification({
            type: 'success',
            message: t('dashboard.marketplace.copiedToClipboard')
          });
        })
        .catch(() => {
          showNotification({
            type: 'error',
            message: t('dashboard.marketplace.clipboardFailed')
          });
        });
    }
  };

  return (
    <div className={styles.detailedCard}>
      <div className={styles.cardHeader}>
        <h2>{isJob ? listing.title : `Pharmacist Profile`}</h2>
        <button className={styles.closeButton} onClick={onClose}>
          <FiX />
        </button>
      </div>
      
      <div className={styles.cardContent}>
        {isJob ? (
          // Job listing details
          <>
            <div className={styles.mainInfo}>
              <img 
                src={listing.image || '/placeholder-image.jpg'} 
                alt={listing.title}
                className={styles.listingImage}
              />
              <div className={styles.infoSection}>
                <div className={styles.infoRow}>
                  <FiMapPin />
                  <span>{listing.location || 'Location not specified'}</span>
                </div>
                <div className={styles.infoRow}>
                  <FiCalendar />
                  <span>{listing.start_date || 'Start date flexible'}</span>
                </div>
                <div className={styles.infoRow}>
                  <FiFileText />
                  <span>{listing.contract_type || 'Contract type not specified'}</span>
                </div>
                <p className={styles.salary}>
                  {listing.salary_range ? `${listing.salary_range}` : 'Salary negotiable'}
                </p>
              </div>
            </div>
            
            <div className={styles.sectionDivider}></div>
            
            <div className={styles.description}>
              <h3>{t('dashboard.marketplace.jobDescription')}</h3>
              <p>{listing.description || t('dashboard.marketplace.noDescriptionProvided')}</p>
            </div>
            
            <div className={styles.requirements}>
              <h3>{t('dashboard.marketplace.requirements')}</h3>
              {listing.requirements && listing.requirements.length > 0 ? (
                <ul>
                  {listing.requirements.map((req, index) => (
                    <li key={index}>{req}</li>
                  ))}
                </ul>
              ) : (
                <p>{t('dashboard.marketplace.noRequirementsListed')}</p>
              )}
            </div>
          </>
        ) : (
          // Pharmacist profile details
          <>
            <div className={styles.mainInfo}>
              <img 
                src={listing.image || '/placeholder-image.jpg'} 
                alt="Pharmacist Profile"
                className={styles.listingImage}
              />
              <div className={styles.infoSection}>
                <h3>Professional Information</h3>
                <div className={styles.infoRow}>
                  <FiMapPin />
                  <span>{listing.preferred_location || 'No location preference'}</span>
                </div>
                <p className={styles.rate}>
                  {listing.hourly_rate ? `CHF ${listing.hourly_rate}/hour` : 'Rate not specified'}
                </p>
                <div className={styles.specialtiesTags}>
                  {listing.specialties?.map((specialty, index) => (
                    <span key={index} className={styles.specialtyTag}>{specialty}</span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className={styles.sectionDivider}></div>
            
            <div className={styles.experience}>
              <h3>{t('dashboard.marketplace.experience')}</h3>
              <p>{listing.experience || t('dashboard.marketplace.noExperienceProvided')}</p>
            </div>
            
            <div className={styles.availability}>
              <h3>{t('dashboard.marketplace.availability')}</h3>
              <p>{listing.availability || t('dashboard.marketplace.availabilityNotSpecified')}</p>
            </div>
          </>
        )}
      </div>
      
      <div className={styles.cardFooter}>
        <button className={styles.actionButton} onClick={handleAction}>
          {isJob ? t('dashboard.marketplace.applyNow') : t('dashboard.marketplace.contactPharmacist')}
        </button>
        <button className={styles.secondaryButton} onClick={handleShare}>
          <FiShare2 />
          {t('dashboard.marketplace.share')}
        </button>
      </div>
    </div>
  );
};

export default DetailedCard; 