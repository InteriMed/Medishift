import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import MetricCard from '../../components/Widgets/MetricCard';
import ActivityFeed from '../../components/Widgets/ActivityFeed';
import BarChart from '../../components/Charts/BarChart';
import LineChart from '../../components/Charts/LineChart';
import styles from './overview.module.css';

const Overview = () => {
  const { dashboardData, loading, error } = useDashboard();
  
  if (loading) return <div className="loading">Loading dashboard data...</div>;
  if (error) return <div className="error">{error}</div>;
  
  return (
    <div className={styles.overviewPage}>
      <h1 className={styles.pageTitle}>Dashboard Overview</h1>
      
      <div className={styles.metricsGrid}>
        <MetricCard 
          title="Total Contracts" 
          value={dashboardData?.metrics?.totalContracts || 0}
          icon="contract"
          trend={dashboardData?.metrics?.contractsTrend}
        />
        <MetricCard 
          title="Active Hours" 
          value={dashboardData?.metrics?.activeHours || 0}
          icon="clock"
          trend={dashboardData?.metrics?.hoursTrend}
        />
        <MetricCard 
          title="Earnings" 
          value={dashboardData?.metrics?.earnings || 0}
          isCurrency={true}
          icon="money"
          trend={dashboardData?.metrics?.earningsTrend}
        />
        <MetricCard 
          title="Upcoming Jobs" 
          value={dashboardData?.metrics?.upcomingJobs || 0}
          icon="calendar"
        />
      </div>
      
      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <h3>Monthly Activity</h3>
          <BarChart data={dashboardData?.charts?.monthlyActivity || []} />
        </div>
        <div className={styles.chartCard}>
          <h3>Earnings Trend</h3>
          <LineChart data={dashboardData?.charts?.earningsTrend || []} />
        </div>
      </div>
      
      <div className={styles.bottomRow}>
        <div className={styles.activitySection}>
          <h3>Recent Activity</h3>
          <ActivityFeed activities={dashboardData?.recentActivity || []} />
        </div>
      </div>
    </div>
  );
};

export default Overview; 