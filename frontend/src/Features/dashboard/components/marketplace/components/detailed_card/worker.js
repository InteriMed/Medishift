import React, { useState, useEffect } from 'react';
import './worker.css';
import pharmacyBase from '../../assets/pharmacy_base.jpg';

const WorkerDetailCard = ({ listing, onClose }) => {
  const [activeTab, setActiveTab] = useState('timeline');
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const userId = listing?.availability_id;
      if (!userId) return;
      
      try {
        const response = await fetch(`http://localhost:8000/api/users/${userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch user data');
        const data = await response.json();
        setUserData(data);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [listing?.availability_id]);

  useEffect(() => {
    // Add click outside handler
    const handleClickOutside = (event) => {
      const container = document.querySelector('.worker-detail-container');
      if (container && !container.contains(event.target)) {
        if (typeof onClose === 'function') {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!listing) return null;
  if (isLoading) return <div className="loading">Loading...</div>;

  const defaultImage = pharmacyBase;

  const formatAddress = (location) => {
    if (!location) return '';
    return `${location.city || ''}, ${location.country || ''}`.trim();
  };

  const calculateRating = (reviews) => {
    if (!reviews?.length) return null;
    const sum = reviews.reduce((acc, review) => acc + review.stars, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const calculateTotalExperience = (experiences) => {
    if (!experiences?.length) return null;
    
    const currentDate = new Date();
    let totalMonths = 0;

    experiences.forEach(exp => {
      const startDate = new Date(exp.start_date);
      const endDate = exp.end_date === 'current' ? currentDate : new Date(exp.end_date);
      
      const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                    (endDate.getMonth() - startDate.getMonth());
      totalMonths += months;
    });

    const years = Math.floor(totalMonths / 12);
    const remainingMonths = totalMonths % 12;

    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''} ${remainingMonths > 0 ? `- ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
    }
    return `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
  };

  const getCurrentPosition = (experiences) => {
    if (!experiences?.length) return null;
    return experiences.find(exp => exp.end_date === 'current');
  };

  const calculateAge = (birthdate) => {
    if (!birthdate) return null;
    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatName = (fullName) => {
    if (!fullName) return '';
    const names = fullName.split(' ');
    if (names.length < 2) return fullName;
    return `${names[0]} ${names[names.length - 1].charAt(0)}.`;
  };

  return (
    <div className="worker-detail-container">
      <button 
        className="close-button" 
        onClick={() => typeof onClose === 'function' && onClose()}
      >
        <i className="fas fa-times"></i>
      </button>
      <div className="worker-header">
        <div className="worker-profile">
          <div className="profile-image-wrapper">
            <img 
              src={userData?.picture_url || defaultImage} 
              alt={userData?.name || "Profile"} 
              className="profile-image"
            />
          </div>
          <div className="profile-info">
            <h2 className="pharmacist-name">{formatName(userData?.name)}</h2>
            {userData?.verified && (
              <span className="verified-badge">
                <i className="fas fa-check-circle"></i> Verified Professional
              </span>
            )}
            <div className="profile-actions">
              <button className="hire-btn">
                <i className="fas fa-handshake"></i>
                Hire
              </button>
              <button className="favorite-btn">
                <i className="fas fa-heart"></i>
                Add Favorite
              </button>
              <button className="report-btn">
                Report user
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-tabs">
        <button 
          className={`tab-button ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          <i className="fas fa-stream"></i>
          Overview
        </button>
        <button 
          className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          <i className="fas fa-user"></i>
          Details
        </button>
      </div>

      <div className="profile-content">
        <div className="main-content">
          {activeTab === 'timeline' ? (
            <>
              <section className="title-section">
                <p className="role">Pharmacist</p>
                <span className="location">
                  <i className="fas fa-map-marker-alt"></i>
                  {formatAddress(listing.preferred_location)}
                </span>
              </section>

              <section className="availability-section">
                <h3>Availability</h3>
                <div className="availability-dates">
                  <span>From {new Date(listing.available_from).toLocaleDateString()} to {new Date(listing.available_to).toLocaleDateString()}</span>
                  <span className="work-amount">{listing.workAmount || '100%'}</span>
                </div>
              </section>

              <section className="personal-section">
                <h3>Personal Information</h3>
                <h2 className="profile-name">{formatName(userData?.name)}</h2>
                <div className="profile-age">
                  <span>{calculateAge(userData?.birthday)} years old</span>
                </div>
              </section>

              <section className="experience-section">
                <h3>Experience</h3>
                <div className="experience-value">
                  {calculateTotalExperience(userData?.experiences)}
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="languages-section">
                <h3>Languages</h3>
                <ul className="languages-list">
                  {Object.entries(userData?.languages || {}).map(([language, level], index) => (
                    <li key={index}>
                      <span className="language">{language}</span>
                      <span className="level">{level}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="skills-section">
                <h3>Skills</h3>
                <div className="skills-list">
                  {userData?.skills?.map((skill, index) => (
                    <span key={index} className="skill-tag">{skill}</span>
                  ))}
                </div>
              </section>

              <section className="experience-section">
                <h3>Professional Experience</h3>
                {userData?.experiences?.map((exp, index) => (
                  <div key={index} className="experience-item">
                    <h4 className="company">{exp.company}</h4>
                    <span className="role">{exp.job_title}</span>
                    <span className="period">
                      {new Date(exp.start_date).toLocaleDateString()} - 
                      {exp.end_date === 'current' ? 'Present' : new Date(exp.end_date).toLocaleDateString()}
                    </span>
                    <p className="experience-description">{exp.details}</p>
                  </div>
                ))}
              </section>

              <section className="education-section">
                <h3>Education</h3>
                {userData?.studies?.map((study, index) => (
                  <div key={index} className="education-item">
                    <h4>{study.degree}</h4>
                    <span className="institution">{study.institution}</span>
                    <span className="year">{study.graduation_year}</span>
                    <p className="education-description">{study.details}</p>
                  </div>
                ))}
              </section>

              {userData?.volunteering && (
                <section className="volunteering-section">
                  <h3>Volunteering</h3>
                  {userData.volunteering.map((vol, index) => (
                    <div key={index} className="volunteering-item">
                      <h4>{vol.organization}</h4>
                      <span className="role">{vol.role}</span>
                      <span className="period">
                        {new Date(vol.start_date).toLocaleDateString()} - 
                        {new Date(vol.end_date).toLocaleDateString()}
                      </span>
                      <p className="volunteering-description">{vol.details}</p>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkerDetailCard; 