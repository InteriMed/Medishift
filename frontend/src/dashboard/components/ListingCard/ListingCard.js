import React from 'react';
import { FiShare2 } from 'react-icons/fi';
import defaultImage from '../../assets/placeholder-image.jpg';
import styles from './listingCard.module.css';

const ListingCard = ({ listing, onClick }) => {
  const isJob = 'title' in listing; // Check if it's a job listing

  // Format location object into string
  const formatLocation = (location) => {
    if (!location) return '';
    if (typeof location === 'string') return location;
    if (typeof location === 'object') {
      const parts = [];
      if (location.city) parts.push(location.city);
      if (location.country) parts.push(location.country);
      return parts.join(', ');
    }
    return '';
  };

  if (isJob) {
    return (
      <div 
        className={styles.listingCard} 
        onClick={() => onClick(listing)}
        role="button"
        tabIndex="0"
        aria-label={`Job: ${listing.title}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onClick(listing);
          }
        }}
      >
        <div className={styles.listingImage}>
          <img src={listing.image || defaultImage} alt={listing.title} />
          <button className={styles.shareButton} onClick={(e) => {
            e.stopPropagation();
            // Share functionality
          }}>
            <FiShare2 />
          </button>
        </div>
        <div className={styles.listingInfo}>
          <h3>{listing.title}</h3>
          <p className={styles.location}>{formatLocation(listing.location)}</p>
          <p className={styles.company}>{listing.employer_name || 'Company'}</p>
          <p className={styles.salary}>
            {listing.salary_range ? `${listing.salary_range}` : 'Salary negotiable'}
          </p>
          <div className={styles.requirements}>
            {listing.requirements?.slice(0, 2).map((req, index) => (
              <span key={index} className={styles.requirementTag}>{req}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Worker listing
  return (
    <div 
      className={styles.listingCard} 
      onClick={() => onClick(listing)}
      role="button"
      tabIndex="0"
      aria-label="Pharmacist Profile"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick(listing);
        }
      }}
    >
      <div className={styles.listingImage}>
        <img src={listing.image || defaultImage} alt="Pharmacist Profile" />
        <button className={styles.shareButton} onClick={(e) => {
          e.stopPropagation();
          // Share functionality
        }}>
          <FiShare2 />
        </button>
      </div>
      <div className={styles.listingInfo}>
        <h3>{listing.pharmacist_id ? `Pharmacist ${listing.pharmacist_id}` : 'Available Pharmacist'}</h3>
        <p className={styles.location}>{formatLocation(listing.preferred_location)}</p>
        <p className={styles.role}>Pharmacist</p>
        <p className={styles.experience}>{listing.specialties?.join(', ') || 'General Practice'}</p>
        {listing.hourly_rate && <p className={styles.rate}>CHF {listing.hourly_rate}/hour</p>}
        <div className={styles.status}>
          {listing.verified ? 'Verified' : 'Pending'}
        </div>
        <div className={styles.specialties}>
          {listing.specialties?.slice(0, 2).map((specialty, index) => (
            <span key={index} className={styles.specialtyTag}>{specialty}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ListingCard; 