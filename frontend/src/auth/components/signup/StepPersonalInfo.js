import React from 'react';
import styles from './SignupSteps.module.css';

const StepPersonalInfo = ({ formData, updateFields, errors }) => {
  return (
    <div className={styles.step}>
      <h2>Personal Information</h2>
      
      <div className={styles.inputGroup}>
        <label htmlFor="firstName">First Name</label>
        <input
          type="text"
          id="firstName"
          value={formData.firstName}
          onChange={(e) => updateFields({ firstName: e.target.value })}
          placeholder="Enter your first name"
          className={errors.firstName ? styles.inputError : ''}
        />
        {errors.firstName && <div className={styles.error}>{errors.firstName}</div>}
      </div>
      
      <div className={styles.inputGroup}>
        <label htmlFor="lastName">Last Name</label>
        <input
          type="text"
          id="lastName"
          value={formData.lastName}
          onChange={(e) => updateFields({ lastName: e.target.value })}
          placeholder="Enter your last name"
          className={errors.lastName ? styles.inputError : ''}
        />
        {errors.lastName && <div className={styles.error}>{errors.lastName}</div>}
      </div>
      
      <div className={styles.inputGroup}>
        <label htmlFor="email">Email Address</label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => updateFields({ email: e.target.value })}
          placeholder="Enter your email address"
          className={errors.email ? styles.inputError : ''}
        />
        {errors.email && <div className={styles.error}>{errors.email}</div>}
      </div>
      
      <div className={styles.inputGroup}>
        <label htmlFor="phone">Phone Number</label>
        <input
          type="tel"
          id="phone"
          value={formData.phone}
          onChange={(e) => updateFields({ phone: e.target.value })}
          placeholder="Enter your phone number"
          className={errors.phone ? styles.inputError : ''}
        />
        {errors.phone && <div className={styles.error}>{errors.phone}</div>}
      </div>
      
      <div className={styles.inputGroup}>
        <label>I am a:</label>
        <div className={styles.radioGroup}>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="userType"
              value="employee"
              checked={formData.userType === 'employee'}
              onChange={() => updateFields({ userType: 'employee' })}
            />
            <span>Pharmacist looking for work</span>
          </label>
          
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="userType"
              value="manager"
              checked={formData.userType === 'manager'}
              onChange={() => updateFields({ userType: 'manager' })}
            />
            <span>Pharmacy looking to hire</span>
          </label>
        </div>
        {errors.userType && <div className={styles.error}>{errors.userType}</div>}
      </div>
    </div>
  );
};

export default StepPersonalInfo; 