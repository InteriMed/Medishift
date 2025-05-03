import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiFileText, FiMessageSquare, FiCalendar } from 'react-icons/fi';
import { useDashboard } from '../../context/DashboardContext';
import StatisticCard from '../../components/StatisticCard/StatisticCard';
import RecentActivityCard from '../../components/RecentActivityCard/RecentActivityCard';
import styles from './homePage.module.css';

const HomePage = () => {
  const { t } = useTranslation();
  const { user, selectedWorkspace } = useDashboard();
  
  // Placeholder data - would come from your API or other hooks
  const stats = [
    { 
      title: t('dashboard.home.activeContracts'), 
      value: 12, 
      icon: <FiFileText />,
      change: '+3',
      period: t('dashboard.home.thisMonth'),
      color: 'blue'
    },
    { 
      title: t('dashboard.home.unreadMessages'), 
      value: 8, 
      icon: <FiMessageSquare />,
      change: '-2',
      period: t('dashboard.home.today'),
      color: 'green'
    },
    { 
      title: t('dashboard.home.upcomingEvents'), 
      value: 5, 
      icon: <FiCalendar />,
      change: '+1',
      period: t('dashboard.home.thisWeek'),
      color: 'orange'
    }
  ];
  
  const recentActivity = [
    {
      type: 'contract',
      title: 'Service Agreement with XYZ Corp',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      action: 'signed',
      user: 'Jane Smith'
    },
    {
      type: 'message',
      title: 'RE: Project Timeline Updates',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      action: 'received',
      user: 'Michael Johnson'
    },
    {
      type: 'event',
      title: 'Quarterly Review Meeting',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      action: 'added',
      user: 'You'
    }
  ];
  
  return (
    <div className={styles.homePage}>
      <header className={styles.pageHeader}>
        <h1>{t('dashboard.home.welcome', { name: user?.firstName || 'User' })}</h1>
        <p className={styles.date}>
          {new Date().toLocaleDateString(undefined, { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </header>
      
      <div className={styles.statsGrid}>
        {stats.map((stat, index) => (
          <StatisticCard key={index} {...stat} />
        ))}
      </div>
      
      <div className={styles.contentGrid}>
        <div className={styles.activitySection}>
          <h2>{t('dashboard.home.recentActivity')}</h2>
          <div className={styles.activityList}>
            {recentActivity.map((activity, index) => (
              <RecentActivityCard key={index} {...activity} />
            ))}
          </div>
        </div>
        
        <div className={styles.quickActionSection}>
          <h2>{t('dashboard.home.quickActions')}</h2>
          <div className={styles.actionButtons}>
            <button className={styles.actionButton}>
              {t('dashboard.home.newContract')}
            </button>
            <button className={styles.actionButton}>
              {t('dashboard.home.scheduleEvent')}
            </button>
            <button className={styles.actionButton}>
              {t('dashboard.home.inviteTeamMember')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 