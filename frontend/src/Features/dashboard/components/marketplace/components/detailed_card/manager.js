import React, { useState, useEffect } from 'react';
import './manager.css';
import pharmacyBase from '../../assets/pharmacy_base.jpg';

const ManagerDetailCard = ({ listing, onClose }) => {
  const [employerData, setEmployerData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEmployerData = async () => {
      const employerId = listing?.employer_id;
      if (!employerId) return;
      
      try {
        const response = await fetch(`http://localhost:8000/api/employers/${employerId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch employer data');
        const data = await response.json();
        setEmployerData(data);
      } catch (error) {
        console.error('Error fetching employer data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployerData();
  }, [listing?.employer_id]);

  if (!listing) return null;
  if (isLoading) return <div className="loading">Loading...</div>;

  const defaultImage = pharmacyBase;

  const formatAddress = (location) => {
    if (!location) return '';
    const parts = [location.address, location.city, location.country].filter(Boolean);
    return parts.join(', ');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="worker-detail-container">
      <div className="worker-header">
        <div className="worker-profile">
          <div className="profile-image-wrapper">
            <img 
              src={employerData?.company_logo || defaultImage} 
              alt={employerData?.company_name || "Company"} 
              className="profile-image"
            />
          </div>
          <div className="profile-info">
            <h2 className="company-name">{employerData?.company_name}</h2>
            {employerData?.verified && (
              <span className="verified-badge">
                <i className="fas fa-check-circle"></i> Verified Company
              </span>
            )}
            <div className="profile-actions">
              <button className="hire-btn">
                <i className="fas fa-paper-plane"></i>
                Apply Now
              </button>
              <button className="favorite-btn">
                <i className="fas fa-heart"></i>
                Save Job
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-content">
        <div className="main-content">
          <section className="title-section">
            <h1 className="job-title">{listing.title}</h1>
            <span className="location">
              <i className="fas fa-map-marker-alt"></i>
              {formatAddress(listing.location)}
            </span>
            <span className="posted-date">
              <i className="fas fa-calendar"></i>
              Posted on {formatDate(listing.posted_at)}
            </span>
          </section>

          <section className="job-details-section">
            <h3>Job Overview</h3>
            <div className="job-meta">
              <div className="meta-item">
                <i className="fas fa-money-bill"></i>
                <span>Salary: CHF {listing.salary}/hour</span>
              </div>
              <div className="meta-item">
                <i className="fas fa-user-clock"></i>
                <span>Status: {listing.status}</span>
              </div>
              <div className="meta-item">
                <i className="fas fa-users"></i>
                <span>Applicants: {listing.applicants?.length || 0}</span>
              </div>
            </div>
          </section>

          <section className="description-section">
            <h3>Job Description</h3>
            <p>{listing.description}</p>
          </section>

          <section className="requirements-section">
            <h3>Requirements</h3>
            <ul className="requirements-list">
              {listing.requirements?.map((req, index) => (
                <li key={index}>{req}</li>
              ))}
            </ul>
          </section>

          <section className="company-section">
            <h3>About {employerData?.company_name}</h3>
            <p>{employerData?.description}</p>
            <div className="company-meta">
              <div className="meta-item">
                <i className="fas fa-globe"></i>
                <span>Website: {employerData?.website}</span>
              </div>
              <div className="meta-item">
                <i className="fas fa-industry"></i>
                <span>Industry: {employerData?.industry}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ManagerDetailCard; 