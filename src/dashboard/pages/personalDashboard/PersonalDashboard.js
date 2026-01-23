import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  FiBriefcase, 
  FiClock, 
  FiDollarSign, 
  FiCalendar, 
  FiSearch,
  FiAlertCircle
} from 'react-icons/fi';
import { useDashboard } from '../../contexts/DashboardContext';
import useProfessionalStats from '../../hooks/useProfessionalStats';
import { cn } from '../../../utils/cn';
import styles from './personalDashboard.module.css';
import DashboardSidebar from './components/DashboardSidebar';
import DashboardMainContent from './components/DashboardMainContent';

const PersonalDashboard = () => {
  const { t } = useTranslation('dashboardPersonal');
  const navigate = useNavigate();
  const { profileComplete, isLoading: isDashboardLoading, user } = useDashboard();
  const { stats, loading: isStatsLoading, error } = useProfessionalStats();

  const isLoading = isDashboardLoading || isStatsLoading;

  // Mock data for the chart - in a real app this would come from historical data
  const chartData = [
    { name: 'Mon', hours: 4 },
    { name: 'Tue', hours: 6 },
    { name: 'Wed', hours: 8 },
    { name: 'Thu', hours: 5 },
    { name: 'Fri', hours: 9 },
    { name: 'Sat', hours: 0 },
    { name: 'Sun', hours: 0 },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500 bg-red-50 rounded-xl border border-red-100 m-6">
        <FiAlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p>Error loading dashboard: {error}</p>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-500 min-h-0 bg-background">
      {/* 1. Dashboard Header - Consistent with Marketplace/Calendar */}
      <div className="shrink-0 w-full z-20 bg-white px-6 sm:px-8 border-b border-border/60 shadow-sm flex flex-col py-4 min-h-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight" style={{ fontFamily: 'var(--font-family-headings)' }}>
              {t('dashboard.overview.welcome')}, {user?.firstName || 'Professional'}!
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
              <FiCalendar className="w-4 h-4" />
              {currentDate}
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => navigate('/dashboard/marketplace')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm text-sm"
              style={{ height: 'var(--boxed-inputfield-height)' }}
            >
              <FiSearch className="w-4 h-4" />
              Find Work
            </button>
          </div>
        </div>
      </div>

      {/* 2. Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8" style={{ scrollbarGutter: 'stable' }}>
        <div className="max-w-[1600px] mx-auto space-y-8">
          
          {/* Profile Completion Banner */}
          {!profileComplete && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
              <div className="flex gap-4">
                <div className="p-3 bg-amber-100 rounded-full text-amber-600 shrink-0">
                  <FiAlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-amber-900">Complete Your Profile</h3>
                  <p className="text-amber-700 mt-1">
                    Unlock all features and get verified to start applying for jobs.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/dashboard/profile')}
                className="px-6 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors whitespace-nowrap"
              >
                Complete Profile
              </button>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Total Earnings" 
              value={`$${stats?.earnings?.toLocaleString() || 0}`} 
              icon={FiDollarSign} 
              trend="+12%" 
              color="green"
            />
            <StatCard 
              title="Active Hours" 
              value={stats?.activeHours || 0} 
              icon={FiClock} 
              trend="+5%" 
              color="blue"
            />
            <StatCard 
              title="Active Contracts" 
              value={stats?.totalContracts || 0} 
              icon={FiBriefcase} 
              color="purple"
            />
            <StatCard 
              title="Upcoming Jobs" 
              value={stats?.upcomingJobs || 0} 
              icon={FiCalendar} 
              color="orange"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column - Activity & Charts */}
            <div className="lg:col-span-2">
              <DashboardMainContent stats={stats} chartData={chartData} />
            </div>

            {/* Right Column - Side Widgets */}
            <div className="space-y-8">
              <DashboardSidebar stats={stats} navigate={navigate} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, trend, color }) => {
  const colors = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-all duration-200 group">
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", colors[color] || colors.blue)}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-muted-foreground text-sm font-medium uppercase tracking-wide">{title}</h3>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
    </div>
  );
};

PersonalDashboard.propTypes = {};

export default PersonalDashboard;
