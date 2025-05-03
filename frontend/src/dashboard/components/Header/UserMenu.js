import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { FiUser, FiSettings, FiLogOut } from 'react-icons/fi';
import styles from './userMenu.module.css';

const UserMenu = ({ onClose }) => {
  const { t } = useTranslation();
  const { currentUser, logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleItemClick = (path) => {
    navigate(path);
    onClose();
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className={styles.userMenu}>
      <div className={styles.userInfo}>
        <img 
          src={currentUser?.photoURL || '/default-avatar.png'}
          alt={currentUser?.displayName || t('dashboard.header.user')}
          className={styles.userAvatar}
        />
        <div className={styles.userDetails}>
          <h3 className={styles.userName}>{currentUser?.displayName || t('dashboard.header.user')}</h3>
          <p className={styles.userEmail}>{currentUser?.email}</p>
        </div>
      </div>

      <div className={styles.menuItems}>
        <button 
          className={styles.menuItem}
          onClick={() => handleItemClick('/dashboard/profile')}
        >
          <FiUser className={styles.menuItemIcon} />
          <span>{t('dashboard.header.profile')}</span>
        </button>
        
        <button 
          className={styles.menuItem}
          onClick={() => handleItemClick('/dashboard/settings')}
        >
          <FiSettings className={styles.menuItemIcon} />
          <span>{t('dashboard.header.settings')}</span>
        </button>
        
        <button 
          className={styles.menuItem}
          onClick={handleLogout}
        >
          <FiLogOut className={styles.menuItemIcon} />
          <span>{t('dashboard.header.logout')}</span>
        </button>
      </div>
    </div>
  );
};

export default UserMenu; 