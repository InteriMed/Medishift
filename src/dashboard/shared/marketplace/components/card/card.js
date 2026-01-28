import React from 'react';
import './card.css';
import pharmacyBase from '../../assets/pharmacy_base.jpg';

const ListingCard = ({ listing, onClick }) => {
  const isJob = 'title' in listing;  // Check if it's a job listing

  // Default image if none provided
  const defaultImage = pharmacyBase;

  // Function to format location object into string
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

  // Function to format preferred location for workers
  const formatPreferredLocation = (preferred_location) => {
    if (!preferred_location) return '';
    if (typeof preferred_location === 'string') return preferred_location;
    if (typeof preferred_location === 'object') {
      const parts = [];
      if (preferred_location.city) parts.push(preferred_location.city);
      if (preferred_location.country) parts.push(preferred_location.country);
      return parts.join(', ');
    }
    return '';
  };

  if (isJob) {
    return (
      <div className="listing-card" onClick={() => onClick(listing)}>
        <div className="listing-image">
          <img src={listing.image || defaultImage} alt={listing.title} />
          <button className="share-button">
            <i className="fas fa-share"></i>
          </button>
        </div>
        <div className="listing-info">
          <h3>{listing.title}</h3>
          <p className="location">{formatLocation(listing.location)}</p>
          <p className="type">{listing.type || 'Full-time'}</p>
          {listing.salary && <p className="salary">CHF {listing.salary}/hour</p>}
          <div className="status">
            {listing.status || 'Open'}
          </div>
          <div className="requirements">
            {listing.requirements?.slice(0, 2).map((req, index) => (
              <span key={index} className="requirement-tag">{req}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Worker listing
  return (
    <div className="listing-card" onClick={() => onClick(listing)}>
      <div className="listing-image">
        <img src={listing.image || defaultImage} alt="Pharmacist Profile" />
        <button className="share-button">
          <i className="fas fa-share"></i>
        </button>
      </div>
      <div className="listing-info">
        <h3>{listing.pharmacist_id ? `Pharmacist ${listing.pharmacist_id}` : 'Available Pharmacist'}</h3>
        <p className="location">{formatPreferredLocation(listing.preferred_location)}</p>
        <p className="role">Pharmacist</p>
        <p className="experience">{listing.specialties?.join(', ') || 'General Practice'}</p>
        {listing.hourly_rate && <p className="rate">CHF {listing.hourly_rate}/hour</p>}
        <div className="status">
          {listing.verified ? 'Verified' : 'Pending'}
        </div>
        <div className="specialties">
          {listing.specialties?.slice(0, 2).map((specialty, index) => (
            <span key={index} className="specialty-tag">{specialty}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ListingCard;
