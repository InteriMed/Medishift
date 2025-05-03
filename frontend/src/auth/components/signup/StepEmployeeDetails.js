import React from 'react';
import styles from './SignupSteps.module.css';

const StepEmployeeDetails = ({ formData, updateFields, errors }) => {
  const specializationOptions = [
    'Hospital Pharmacy', 
    'Community Pharmacy', 
    'Clinical Pharmacy',
    'Pharmaceutical Industry',
    'Academia',
    'Regulatory Affairs',
    'Compounding'
  ];

  const availabilityOptions = [
    'Full-time',
    'Part-time',
    'Weekends only',
    'Evenings only',
    'On-call',
    'Temporary'
  ];

  const softwareOptions = [
    'Apothekenrechner',
    'BESA',
    'Delfigo',
    'eKARUS',
    'PharmaManager',
    'Propharma',
    'Tactimed',
    'Triamun',
    'Other'
  ];

  return (
    <div className={styles.step}>
      <h2>Professional Information</h2>
      
      <div className={styles.inputGroup}>
        <label>Specialization Areas</label>
        <div className={styles.checkboxGroup}>
          {specializationOptions.map(option => (
            <label key={option} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                value={option}
                checked={formData.specializationArea?.includes(option) || false}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  updateFields({
                    specializationArea: isChecked
                      ? [...(formData.specializationArea || []), option]
                      : (formData.specializationArea || []).filter(item => item !== option)
                  });
                }}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
        {errors.specializationArea && <div className={styles.error}>{errors.specializationArea}</div>}
      </div>
      
      <div className={styles.inputGroup}>
        <label htmlFor="yearsOfExperience">Years of Experience</label>
        <select
          id="yearsOfExperience"
          value={formData.yearsOfExperience}
          onChange={(e) => updateFields({ yearsOfExperience: e.target.value })}
          className={errors.yearsOfExperience ? styles.inputError : ''}
        >
          <option value="">Select experience</option>
          <option value="0-1">Less than 1 year</option>
          <option value="1-3">1-3 years</option>
          <option value="3-5">3-5 years</option>
          <option value="5-10">5-10 years</option>
          <option value="10+">More than 10 years</option>
        </select>
        {errors.yearsOfExperience && <div className={styles.error}>{errors.yearsOfExperience}</div>}
      </div>
      
      <div className={styles.inputGroup}>
        <label>Availability</label>
        <div className={styles.checkboxGroup}>
          {availabilityOptions.map(option => (
            <label key={option} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                value={option}
                checked={formData.availability?.includes(option) || false}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  updateFields({
                    availability: isChecked
                      ? [...(formData.availability || []), option]
                      : (formData.availability || []).filter(item => item !== option)
                  });
                }}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </div>
      
      <div className={styles.inputGroup}>
        <label>Software Experience</label>
        <div className={styles.checkboxGroup}>
          {softwareOptions.map(option => (
            <label key={option} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                value={option}
                checked={formData.softwareExperience?.includes(option) || false}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  updateFields({
                    softwareExperience: isChecked
                      ? [...(formData.softwareExperience || []), option]
                      : (formData.softwareExperience || []).filter(item => item !== option)
                  });
                }}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StepEmployeeDetails; 