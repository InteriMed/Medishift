import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './sidebarItem.module.css';

const SidebarItem = ({ item, isActive, collapsed, badgeValue }) => {
  const { t } = useTranslation();
  const Icon = item.icon;

  return (
    <li className={styles.navItem}>
      <Link 
        to={item.path}
        className={`${styles.navLink} ${isActive ? styles.active : ''}`}
        title={collapsed ? t(item.title) : ''}
      >
        <span className={styles.iconContainer}>
          <Icon className={styles.icon} />
          {badgeValue > 0 && (
            <span className={styles.badge}>{badgeValue}</span>
          )}
        </span>
        
        {!collapsed && (
          <span className={styles.linkText}>
            {t(item.title)}
          </span>
        )}
      </Link>
    </li>
  );
};

export default SidebarItem; 