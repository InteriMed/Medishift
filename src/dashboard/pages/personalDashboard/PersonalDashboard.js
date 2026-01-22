import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../../contexts/DashboardContext';


import styles from './personalDashboard.module.css';

const PersonalDashboard = () => {
  const navigate = useNavigate();
  const { dashboardData, profileComplete, isLoading, loadingDebugInfo, error, user } = useDashboard();

  console.log("PersonalDashboard render state:", {
    isLoading,
    profileComplete,
    hasDashboardData: !!dashboardData,
    loadingDebugInfo,
    error,
    user
  });

  if (isLoading) {
    console.log("PersonalDashboard is in loading state");
    return (
      <div className={styles.dashboardContainer} data-tutorial="dashboard-container">
        <div className={styles.loadingState}>
          <p>Loading your dashboard...</p>
          <p>If this persists, please try refreshing the page.</p>

          {/* Show detailed loading state in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className={styles.loadingDebug}>
              <h4>Loading Debug Info:</h4>
              <ul>
                <li>Auth ready: {loadingDebugInfo?.isAuthReady ? 'Yes' : 'No'}</li>
                <li>User data loaded: {loadingDebugInfo?.isUserDataLoaded ? 'Yes' : 'No'}</li>
                <li>Dashboard data loaded: {loadingDebugInfo?.isDashboardDataLoaded ? 'Yes' : 'No'}</li>
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
              <h2>Complete Your Profile</h2>
              <p>
                Welcome to MediShift! To access all features of the platform, please complete your profile first.
              </p>
              <button
                className={styles.actionButton}
                onClick={() => navigate('/dashboard/profile')}
                data-tutorial="complete-profile-button"
              >
                I understand, create my profile
              </button>
            </div>
          </div>
        )}

        <header className={styles.pageHeader} data-tutorial="dashboard-header">
          <h1 className={styles.pageTitle}>
            {profileComplete
              ? "Welcome to MediShift!"
              : "Welcome to MediShift!"}
          </h1>

          {user && (
            <p className={styles.welcomeMessage}>
              Hello, {user.firstName || user.displayName}!
            </p>
          )}
        </header>

        <div className={styles.metricsGrid} data-tutorial="metrics-grid">
          {/* Placeholder for metrics */}
          <div className={styles.metricCard} data-tutorial="metric-contracts">
            <h3 className={styles.metricTitle}>Total Contracts</h3>
            <p className={styles.metricValue}>{dashboardData?.metrics?.totalContracts || 0}</p>
          </div>

          <div className={styles.metricCard} data-tutorial="metric-hours">
            <h3 className={styles.metricTitle}>Active Hours</h3>
            <p className={styles.metricValue}>{dashboardData?.metrics?.activeHours || 0}</p>
          </div>

          <div className={styles.metricCard} data-tutorial="metric-earnings">
            <h3 className={styles.metricTitle}>Earnings</h3>
            <p className={styles.metricValue}>
              ${dashboardData?.metrics?.earnings?.toLocaleString() || 0}
            </p>
          </div>

          <div className={styles.metricCard} data-tutorial="metric-jobs">
            <h3 className={styles.metricTitle}>Upcoming Jobs</h3>
            <p className={styles.metricValue}>{dashboardData?.metrics?.upcomingJobs || 0}</p>
          </div>
        </div>

        <div className={styles.recentActivity} data-tutorial="recent-activity">
          <h2>Recent Activity</h2>
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
              No recent activity to display
            </p>
          )}
        </div>

        {/* Debug component - only visible in development */}
        <DebugInfo data={dashboardData} />
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

DebugInfo.propTypes = {
  data: PropTypes.object
};

export default PersonalDashboard;