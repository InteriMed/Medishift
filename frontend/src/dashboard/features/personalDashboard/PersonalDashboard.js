import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../../context/DashboardContext';
import styles from './personalDashboard.module.css';

const PersonalDashboard = () => {
  const { t } = useTranslation();
  const { dashboardData, loading, error } = useDashboard();

  if (loading) {
    return <div className={styles.loadingState}>{t('dashboard.loading')}</div>;
  }

  if (error) {
    return <div className={styles.errorState}>{error}</div>;
  }

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('dashboard.overview.title')}</h1>
      </header>
      
      <div className={styles.metricsGrid}>
        {/* Placeholder for metrics */}
        <div className={styles.metricCard}>
          <h3>{t('dashboard.overview.totalContracts')}</h3>
          <p className={styles.metricValue}>{dashboardData?.metrics?.totalContracts || 0}</p>
        </div>
        
        <div className={styles.metricCard}>
          <h3>{t('dashboard.overview.activeHours')}</h3>
          <p className={styles.metricValue}>{dashboardData?.metrics?.activeHours || 0}</p>
        </div>
        
        <div className={styles.metricCard}>
          <h3>{t('dashboard.overview.earnings')}</h3>
          <p className={styles.metricValue}>
            ${dashboardData?.metrics?.earnings?.toLocaleString() || 0}
          </p>
        </div>
        
        <div className={styles.metricCard}>
          <h3>{t('dashboard.overview.upcomingJobs')}</h3>
          <p className={styles.metricValue}>{dashboardData?.metrics?.upcomingJobs || 0}</p>
        </div>
      </div>
      
      <div className={styles.recentActivity}>
        <h2>{t('dashboard.overview.recentActivity')}</h2>
        {dashboardData?.recentActivity?.length > 0 ? (
          <ul className={styles.activityList}>
            {dashboardData.recentActivity.map(activity => (
              <li key={activity.id} className={styles.activityItem}>
                <div className={styles.activityContent}>
                  <h4>{activity.title}</h4>
                  <p className={styles.activityTime}>
                    {new Date(activity.time).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyState}>
            {t('dashboard.overview.noRecentActivity')}
          </p>
        )}
      </div>
    </div>
  );
};

export default PersonalDashboard; 