import React from 'react';
import styles from './SignupSteps.module.css';

const StepManagerDetails = ({ formData, updateFields, errors }) => {
  const sectorOptions = [
    'Independent Pharmacy',
    'Chain Pharmacy',
    'Hospital Pharmacy',
    'Clinic Pharmacy',
    'Long-term Care',
    'Mail Order',
    'Other'
  ];
  
  return (
    <div className={styles.step}>
      <h2>Pharmacy Information</h2>
      
      <div className={styles.inputGroup}>
        <label htmlFor="companyName">Pharmacy/Company Name</label>
        <input
          type="text"
          id="companyName"
          value={formData.companyName}
          onChange={(e) => updateFields({ companyName: e.target.value })}
          placeholder="Enter your pharmacy or company name"
          className={errors.companyName ? styles.inputError : ''}
        />
        {errors.companyName && <div className={styles.error}>{errors.companyName}</div>}
      </div>
      
      <div className={styles.inputGroup}>
        <label htmlFor="position">Your Position</label>
        <input
          type="text"
          id="position"
          value={formData.position}
          onChange={(e) => updateFields({ position: e.target.value })}
          placeholder="E.g., Pharmacy Owner, Manager, HR Director"
          className={errors.position ? styles.inputError : ''}
        />
        {errors.position && <div className={styles.error}>{errors.position}</div>}
      </div>
      
      <div className={styles.inputGroup}>
        <label htmlFor="companySize">Number of Employees</label>
        <select
          id="companySize"
          value={formData.companySize}
          onChange={(e) => updateFields({ companySize: e.target.value })}
          className={errors.companySize ? styles.inputError : ''}
        >
          <option value="">Select company size</option>
          <option value="1-5">1-5 employees</option>
          <option value="6-10">6-10 employees</option>
          <option value="11-25">11-25 employees</option>
          <option value="26-50">26-50 employees</option>
          <option value="51-100">51-100 employees</option>
          <option value="100+">More than 100 employees</option>
        </select>
        {errors.companySize && <div className={styles.error}>{errors.companySize}</div>}
      </div>
      
      <div className={styles.inputGroup}>
        <label>Pharmacy Type</label>
        <div className={styles.radioGroup}>
          {sectorOptions.map(option => (
            <label key={option} className={styles.radioLabel}>
              <input
                type="radio"
                name="sector"
                value={option}
                checked={formData.sector === option}
                onChange={() => updateFields({ sector: option })}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
        {errors.sector && <div className={styles.error}>{errors.sector}</div>}
      </div>
    </div>
  );
};

export default StepManagerDetails; 