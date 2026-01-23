import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../../contexts/DashboardContext';
import useProfessionalStats from '../../hooks/useProfessionalStats';

import styles from './personalDashboard.module.css';

const PersonalDashboard = () => {
  const { t } = useTranslation('dashboardPersonal');
  const navigate = useNavigate();
  const { profileComplete, isLoading: isDashboardLoading, loadingDebugInfo, error: dashboardError, user } = useDashboard();
  const { stats, loading: isStatsLoading, error: statsError } = useProfessionalStats();

  const isLoading = isDashboardLoading || isStatsLoading;
  const error = dashboardError || statsError;

  console.log("PersonalDashboard render state:", {
    isLoading,
    profileComplete,
    hasStats: !!stats,
    loadingDebugInfo,
    error,
    user
  });

  if (isLoading) {
    console.log("PersonalDashboard is in loading state");
    return (
      <div className={styles.dashboardContainer} data-tutorial="dashboard-container">
        <div className={styles.loadingState}>
          <p>{t('dashboard.loading')}</p>
          <p>{t('dashboard.loadingPersists')}</p>

          {/* Show detailed loading state in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className={styles.loadingDebug}>
              <h4>Loading Debug Info:</h4>
              <ul>
                <li>Auth ready: {loadingDebugInfo?.isAuthReady ? 'Yes' : 'No'}</li>
                <li>User data loaded: {loadingDebugInfo?.isUserDataLoaded ? 'Yes' : 'No'}</li>
                <li>Stats loaded: {!isStatsLoading ? 'Yes' : 'No'}</li>
                {loadingDebugInfo?.errorMessage && (
                  <li className={styles.errorMessage}>Error: {loadingDebugInfo.errorMessage}</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    console.log("PersonalDashboard encountered an error:", error);
    return <div className={styles.errorState}>{error}</div>;
  }

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar">
      <div className={styles.dashboardContainer} data-tutorial="dashboard-container">
        {!profileComplete && (
          <div className={styles.profileCompletionBanner} data-tutorial="profile-banner">
            <div className={styles.bannerContent}>
              <h2>{t('dashboard.completeProfile.completeProfileTitle')}</h2>
              <p>
                {t('dashboard.completeProfile.completeProfileDescription')}
              </p>
              <button
                className={styles.actionButton}
                onClick={() => navigate('/dashboard/profile')}
                data-tutorial="complete-profile-button"
              >
                {t('dashboard.completeProfile.completeProfileButton')}
              </button>
            </div>
          </div>
        )}

        <header className={styles.pageHeader} data-tutorial="dashboard-header">
          <h1 className={styles.pageTitle}>
            {t('dashboard.overview.welcomeTitle')}
          </h1>

          {user && (
            <p className={styles.welcomeMessage}>
              {t('dashboard.overview.welcome')}, {user.firstName || user.displayName}!
            </p>
          )}
        </header>

        <div className={styles.metricsGrid} data-tutorial="metrics-grid">
          <div className={styles.metricCard} data-tutorial="metric-contracts">
            <h3 className={styles.metricTitle}>{t('dashboard.overview.totalContracts')}</h3>
            <p className={styles.metricValue}>{stats?.totalContracts || 0}</p>
          </div>

          <div className={styles.metricCard} data-tutorial="metric-hours">
            <h3 className={styles.metricTitle}>{t('dashboard.overview.activeHours')}</h3>
            <p className={styles.metricValue}>{stats?.activeHours || 0}</p>
          </div>

          <div className={styles.metricCard} data-tutorial="metric-earnings">
            <h3 className={styles.metricTitle}>{t('dashboard.overview.earnings')}</h3>
            <p className={styles.metricValue}>
              ${stats?.earnings?.toLocaleString() || 0}
            </p>
          </div>

          <div className={styles.metricCard} data-tutorial="metric-jobs">
            <h3 className={styles.metricTitle}>{t('dashboard.overview.upcomingJobs')}</h3>
            <p className={styles.metricValue}>{stats?.upcomingJobs || 0}</p>
          </div>
        </div>

        <div className={styles.recentActivity} data-tutorial="recent-activity">
          <h2>{t('dashboard.overview.recentActivity')}</h2>
          {stats?.recentActivity?.length > 0 ? (
            <ul className={styles.activityList}>
              {stats.recentActivity.map(activity => (
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

        {/* Debug component - only visible in development */}
        <DebugInfo data={stats} />
      </div>
    </div>
  );
};

// Debug component - only visible in development
const DebugInfo = ({ data }) => {
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div style={{
      padding: '10px',
      margin: '10px 0',
      background: '#f0f0f0',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '12px'
    }}>
      <h4 style={{ margin: '0 0 5px' }}>Debug Information:</h4>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

DebugInfo.propTypes = {
  data: PropTypes.object
};

export default PersonalDashboard;
