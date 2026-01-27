import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FiBriefcase,
  FiClock,
  FiDollarSign,
  FiCalendar,
  FiSearch,
  FiAlertCircle,
  FiCheckCircle
} from 'react-icons/fi';
import { useDashboard } from '../../contexts/DashboardContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { useCalendarState } from '../calendar/hooks/useCalendarState';
import useCalendarStore from '../calendar/hooks/useCalendarStore';
import { useCalendarEvents } from '../calendar/utils/eventDatabase';
import useProfessionalStats from '../../hooks/useProfessionalStats';
import { cn } from '../../../utils/cn';
import { buildDashboardUrl, getWorkspaceIdForUrl } from '../../../config/routeUtils';
import DashboardMainContent from './components/DashboardMainContent';
import CalendarSidebar from '../calendar/components/CalendarSidebar';

const PersonalDashboard = () => {
  const { t } = useTranslation('dashboardPersonal');
  const navigate = useNavigate();
  const { isLoading: isDashboardLoading, user, selectedWorkspace } = useDashboard();
  const { isMainSidebarCollapsed } = useSidebar();

  const accountType = user?.role || 'professional';
  const userId = user?.uid;

  const getWorkspaceContext = () => {
    if (!selectedWorkspace) {
      return { type: 'personal', role: 'professional' };
    }
    let role = selectedWorkspace.role;
    if (role === 'admin') role = 'manager';
    return { type: selectedWorkspace.type, role: role };
  };

  const workspaceContext = getWorkspaceContext();

  // Initialize Store Context
  const workspaceContextString = JSON.stringify(workspaceContext);
  useEffect(() => {
    if (userId) {
      useCalendarStore.getState().setContext(userId, accountType, workspaceContext);
    }
  }, [userId, accountType, workspaceContextString, workspaceContext]);

  const { stats, loading: isStatsLoading, error: statsError } = useProfessionalStats();

  // Connect to Zustand Store for sidebar upcoming events
  const events = useCalendarStore(state => state.events);
  const setEvents = useCalendarStore(state => state.setEvents);
  const { events: calendarEvents, loading: isCalendarLoading } = useCalendarEvents(userId, accountType);

  // Stats from calendar events (mocking the dashboard stats for now or using processed data)
  // In a real app, useProfessionalStats would be used, but here we want to match Sidebar data
  useEffect(() => {
    if (calendarEvents) {
      const eventsWithDbFlag = calendarEvents.map(event => ({
        ...event, fromDatabase: true, isValidated: true
      }));
      setEvents(eventsWithDbFlag);
    }
  }, [calendarEvents, setEvents]);

  const {
    currentDate: calDate, setCurrentDate: setCalDate, view,
    isSidebarCollapsed,
    handleUpcomingEventClick, toggleSidebar
  } = useCalendarState();

  const handleDayClickForOverview = useCallback((date) => {
    const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);
    const calendarPath = buildDashboardUrl('/calendar', workspaceId);
    navigate(calendarPath);
  }, [navigate, selectedWorkspace]);

  // Track visible week for MiniCalendar highlighting
  const [visibleWeekStart] = useState(() => {
    const start = new Date(calDate);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    return start;
  });
  const [visibleWeekEnd] = useState(() => {
    const end = new Date(calDate);
    const day = end.getDay();
    const diff = day === 0 ? 0 : 7 - day;
    end.setDate(end.getDate() + diff);
    end.setHours(23, 59, 59, 999);
    return end;
  });

  const isLoading = isDashboardLoading || isStatsLoading || isCalendarLoading;

  // Mock data for the chart remains
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

  if (statsError) {
    return (
      <div className="p-6 text-center text-red-500 bg-red-50 rounded-xl border border-red-100 m-6">
        <FiAlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p>Error loading dashboard: {statsError}</p>
      </div>
    );
  }

  const currentDateDisplay = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Calculate some simple stats from events for the cards
  const upcomingJobsCount = events?.filter(e => new Date(e.start) > new Date()).length || 0;

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
      <div className="shrink-0 py-4 border-b border-border bg-card/30">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-xl font-semibold text-foreground mb-3">
            {t('dashboard.overview.title', 'Overview')}
          </h1>
        </div>
      </div>
      <div className={cn(
        "flex-1 flex relative min-h-0 mx-4 my-4 gap-6",
      )} style={{ overflow: 'visible' }}>

        {/* Sidebar - Same as Calendar Sidebar */}
        <div className={cn(
          "dashboard-sidebar-container",
          isMainSidebarCollapsed ? "flex" : (isSidebarCollapsed ? "hidden lg:flex w-0" : "flex"),
          "dashboard-sidebar-container-desktop calendar-sidebar pr-0"
        )} style={{ overflow: 'visible' }}>
          <div className={cn(
            "dashboard-sidebar-inner",
            "p-0 !bg-transparent !border-0 !shadow-none"
          )} style={{ overflow: 'visible' }}>
            <CalendarSidebar
              currentDate={calDate}
              setCurrentDate={setCalDate}
              handleUpcomingEventClick={handleUpcomingEventClick}
              events={events}
              isSidebarCollapsed={isSidebarCollapsed}
              handleCreateEventClick={() => navigate('/dashboard/calendar')}
              handleDayClick={handleDayClickForOverview}
              toggleSidebar={toggleSidebar}
              view={view}
              visibleWeekStart={visibleWeekStart}
              visibleWeekEnd={visibleWeekEnd}
              highlightOnlyToday={true}
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className={cn(
          "dashboard-main-content dashboard-main-content-desktop flex-1"
        )}>
          <div className="dashboard-main-inner flex flex-col h-full bg-card border border-border rounded-xl overflow-hidden">

            {/* Header Tool Area with Quick Actions */}
            <div className="shrink-0 w-full bg-card border-b border-border px-6 py-4 min-h-20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-lg font-semibold text-foreground tracking-tight m-0" style={{ fontFamily: 'var(--font-family-headings)' }}>
                  {t('dashboard.overview.welcome')}, {user?.firstName || 'Professional'}!
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
                  <FiCalendar className="w-3.5 h-3.5" />
                  {currentDateDisplay}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => navigate('/dashboard/marketplace')}
                  className="flex items-center gap-2 px-4 text-sm font-medium rounded-xl transition-all bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  style={{ height: 'var(--boxed-inputfield-height)' }}
                >
                  <FiSearch className="w-4 h-4" />
                  <span>Find Work</span>
                </button>
                <button
                  onClick={() => navigate('/dashboard/calendar')}
                  className="flex items-center gap-2 px-4 text-sm font-medium rounded-xl transition-all border-2 bg-background border-input text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                  style={{ height: 'var(--boxed-inputfield-height)' }}
                >
                  <FiCalendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Update Availability</span>
                </button>
                <button
                  onClick={() => navigate('/dashboard/profile/documents')}
                  className="flex items-center gap-2 px-4 text-sm font-medium rounded-xl transition-all border-2 bg-background border-input text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                  style={{ height: 'var(--boxed-inputfield-height)' }}
                >
                  <FiCheckCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Verify Documents</span>
                </button>
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8" style={{ scrollbarGutter: 'stable' }}>
              <div className="max-w-[1600px] mx-auto space-y-8">

                {/* Profile Completion Banner */}
                {false && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-in slide-in-from-top duration-500">
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
                      className="px-6 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors whitespace-nowrap shadow-sm"
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
                    trend="+0%"
                    color="green"
                  />
                  <StatCard
                    title="Active Hours"
                    value={stats?.activeHours || 0}
                    icon={FiClock}
                    trend="+0%"
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
                    value={stats?.upcomingJobs || upcomingJobsCount}
                    icon={FiCalendar}
                    color="orange"
                  />
                </div>

                {/* Activity & Charts */}
                <DashboardMainContent stats={stats} chartData={chartData} />
              </div>
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
    <div className="bg-card p-6 rounded-xl border border-border hover:shadow-md transition-shadow group">
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


export default PersonalDashboard;
