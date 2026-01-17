import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSettings } from 'react-icons/fi';
import styles from './header.module.css';

const SettingsButton = () => {
  const navigate = useNavigate();

  const handleSettingsClick = () => {
    navigate('/dashboard/settings');
  };

  return (
    <button 
      className={styles.notificationButton} 
      onClick={handleSettingsClick}
      aria-label="Settings"
    >
      <FiSettings />
    </button>
  );
};

export default SettingsButton; 