import React, { useEffect, useState, useRef } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import './Dashboard Employee.css';
// Import icons
import { FiPieChart, FiSettings, FiCreditCard, FiPlus, FiShoppingBag, FiMessageCircle, FiDollarSign, FiClock, FiChevronDown, FiInfo, FiCalendar } from 'react-icons/fi';
import { BiLineChart } from 'react-icons/bi';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import rewardStar from './assets/reward.png';
import { getFirestore, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { PiBagSimple } from 'react-icons/pi';
import { IoMdTime } from 'react-icons/io';
import { GoGoal } from 'react-icons/go';

// Import the Sidebar component
import Sidebar from '../sidebar/Sidebar';

// Demo data - since we can't query Firestore directly due to permission issues
const DEMO_USER_DATA = {
  experience: '7 years',
  review_average: '4.7',
  missions: '18',
  job_title: 'Senior',
  certifications: 'Developer',
  banking: true
};

const Dashboard = ({ userData, currentUser }) => {
  const { lang, uid } = useParams();
  const [contracts, setContracts] = useState({});
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // Format: YYYY-MM
  const [timeFilter, setTimeFilter] = useState('last30days');
  const [dateRange, setDateRange] = useState('11 May - 11 June 2020');
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [hideLeftPanel, setHideLeftPanel] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);
  
  // Reference for detecting when the chart becomes constrained
  const chartRef = useRef(null);
  
  // Dashboard metrics
  const [totalMissions, setTotalMissions] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthlyProgress, setMonthlyProgress] = useState(0);
  const [monthlyGoal, setMonthlyGoal] = useState(null);
  const [revenueHistory, setRevenueHistory] = useState([]);
  const [maxRevenue, setMaxRevenue] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  
  // Custom styles to override background images
  const overrideStyles = `
    .chart-placeholder {
      background: white !important;
      background-image: none !important;
      background-color: white !important;
    }
    
    .chart-placeholder::before {
      display: none !important;
      content: none !important;
      background: none !important;
      background-image: none !important;
      opacity: 0 !important;
    }
    
    .chart-placeholder svg,
    .chart-placeholder svg * {
      background: white !important;
    }
    
    .revenue-chart {
      background: white !important;
      background-image: none !important;
      background-color: white !important;
    }
    
    .analytics-grid {
      background: white !important;
    }
  `;
  
  // Get current month contracts
  const getCurrentMonthContracts = () => {
    return contracts;
  };
  
  // Calculate metrics from contracts
  const calculateMetrics = (contractsData) => {
    if (!contractsData || Object.keys(contractsData).length === 0) {
      setTotalMissions(0);
      setTotalHours(0);
      setTotalRevenue(0);
      return;
    }
    
    // Count total missions (each contract is a mission)
    const missions = Object.keys(contractsData).length;
    
    // Sum up total hours
    const hours = Object.values(contractsData).reduce((sum, contract) => {
      return sum + (contract.total_hours || 0);
    }, 0);
    
    // Sum up total revenue
    const revenue = Object.values(contractsData).reduce((sum, contract) => {
      return sum + (contract.total_amount || 0);
    }, 0);
    
    // Set the state
    setTotalMissions(missions);
    setTotalHours(hours);
    setTotalRevenue(revenue);
    
    // Calculate monthly progress if goal exists
    if (userData && userData.goal) {
      const progress = Math.round((revenue / userData.goal) * 100);
      setMonthlyProgress(Math.min(progress, 100)); // Cap at 100%
      setMonthlyGoal(userData.goal);
    }
  };
  
  // Fetch revenue history for the last 7 months
  const fetchRevenueHistory = async () => {
    try {
      if (!uid) return;
      
      const db = getFirestore();
      const contractsRef = collection(db, "contracts");
      
      // Calculate date 7 months ago
      const sevenMonthsAgo = new Date();
      sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);
      
      // Create query to get contracts for the last 7 months
      const q = query(
        contractsRef,
        where("user_uid", "==", uid),
        where("start_date", ">=", sevenMonthsAgo),
        orderBy("start_date", "asc")
      );
      
      // Execute query
      const querySnapshot = await getDocs(q);
      const historyData = [];
      let maxRev = 0;
      
      // Group by month and calculate monthly revenue
      const monthlyRevenue = {};
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const date = new Date(data.start_date);
        const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
        
        if (!monthlyRevenue[monthKey]) {
          monthlyRevenue[monthKey] = 0;
        }
        
        monthlyRevenue[monthKey] += data.total_amount || 0;
      });
      
      // Convert to array for the last 7 months
      const lastSevenMonths = [];
      const currentDate = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().slice(0, 7);
        const revenue = monthlyRevenue[monthKey] || 0;
        
        lastSevenMonths.push({
          month: monthKey,
          revenue: revenue
        });
        
        if (revenue > maxRev) maxRev = revenue;
      }
      
      setRevenueHistory(lastSevenMonths);
      setMaxRevenue(maxRev || 1); // Avoid division by zero
      
    } catch (error) {
      console.error("Error fetching revenue history:", error);
    }
  };
  
  // Fetch upcoming events from Firebase (use contracts as events)
  const fetchUpcomingEvents = async () => {
    try {
      if (!uid) return;
      
      const db = getFirestore();
      const contractsRef = collection(db, "contracts");
      
      // Get current date
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of day
      
      // Create query to get upcoming contracts for current user (can be used as events)
      const q = query(
        contractsRef,
        where("user_uid", "==", uid),
        where("start_date", ">=", today),
        orderBy("start_date", "asc"),
        limit(10)
      );
      
      // Execute query
      const querySnapshot = await getDocs(q);
      const contractEvents = [];
      
      // Process query results
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Convert contract to event format
        contractEvents.push({
          id: doc.id,
          title: `Contract: ${data.title || 'Untitled'}`,
          description: `${data.description || ''} - ${formatCurrency(data.total_amount || 0)}`,
          start_date: data.start_date,
          end_date: data.end_date,
          type: data.payment_status === 'completed' ? 'completed' : 'pending',
          all_day: false
        });
      });
      
      console.log("Fetched upcoming contracts as events:", contractEvents);
      setUpcomingEvents(contractEvents);
      
      // If no contracts, set empty array
      if (contractEvents.length === 0) {
        setUpcomingEvents([]);
      }
    } catch (error) {
      console.error("Error fetching upcoming contracts as events:", error);
      setUpcomingEvents([]);
    }
  };
  
  // Fetch contracts from Firebase
  useEffect(() => {
    const fetchContracts = async () => {
      try {
        if (!uid) return;
        
        const db = getFirestore();
        const contractsRef = collection(db, "contracts");
        
        // Get start and end dates for the current month
        const startOfMonth = new Date(`${currentMonth}-01`);
        const endOfMonthDate = new Date(startOfMonth);
        endOfMonthDate.setMonth(endOfMonthDate.getMonth() + 1);
        endOfMonthDate.setDate(0); // Last day of the month
        
        // Create query to get contracts for current user in the current month
        const q = query(
          contractsRef,
          where("user_uid", "==", uid),
          where("start_date", ">=", startOfMonth),
          where("start_date", "<=", endOfMonthDate)
        );
        
        // Execute query
        const querySnapshot = await getDocs(q);
        const contractsData = {};
        
        // Process query results
        querySnapshot.forEach((doc) => {
          contractsData[doc.id] = doc.data();
        });
        
        console.log("Fetched contracts:", contractsData);
        setContracts(contractsData);
        
        // Calculate metrics from the fetched data
        calculateMetrics(contractsData);
        
        // Update displayed date range (only month and year)
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const month = startOfMonth.getMonth();
        const year = startOfMonth.getFullYear();
        setDateRange(`${monthNames[month]} ${year}`);
        
      } catch (error) {
        console.error("Error fetching contracts:", error);
        // If there's an error, set metrics to 0
        setTotalMissions(0);
        setTotalHours(0);
        setTotalRevenue(0);
      }
    };
    
    fetchContracts();
    fetchRevenueHistory();
    fetchUpcomingEvents();
  }, [uid, currentMonth]);
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    // Format YYYYMMDD to MM/DD/YYYY
    if (dateString.length === 8) {
      const year = dateString.slice(0, 4);
      const month = dateString.slice(4, 6);
      const day = dateString.slice(6, 8);
      return `${month}/${day}/${year}`;
    }
    // Format ISO string
    return new Date(dateString).toLocaleDateString();
  };
  
  // Get badge class for payment status
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed': return 'status-badge completed';
      case 'pending': return 'status-badge pending';
      case 'overdue': return 'status-badge overdue';
      default: return 'status-badge';
    }
  };
  
  // Format user's name - if userData available, use firstName and lastName, otherwise use default
  const getUserName = () => {
    if (userData && userData.name && userData.surname) {
      return `${userData.name} ${userData.surname}`;
    } else if (userData && userData.name) {
      return userData.name;
    } else if (userData && userData.displayName) {
      return userData.displayName;
    } else if (userData && userData.name) {
      return userData.name;
    } else {
      return "User";
    }
  };
  
  // Get first initial of lastName if available
  const getInitial = () => {
    if (userData && userData.lastName && userData.lastName.length > 0) {
      return userData.lastName.charAt(0);
    } else if (userData && userData.surname && userData.surname.length > 0) {
      return userData.surname.charAt(0);
    } else if (userData && userData.displayName && userData.displayName.split(' ').length > 1) {
      return userData.displayName.split(' ')[1].charAt(0);
    }
    return "";
  };

  // Format user's job title using job_title and certifications
  const getJobTitle = () => {
    console.log('Category type:', typeof userData?.job_title, 'Value:', userData?.job_title);
    console.log('Certifications type:', typeof userData?.certifications, 'Value:', userData?.certifications);
    
    if (userData && userData.job_title !== undefined && userData.job_title !== null && 
        userData.certifications !== undefined && userData.certifications !== null) {
      return `${userData.job_title} ${userData.certifications}`;
    }
    return "Job Title";
  };

  // Get experience value
  const getExperience = () => {
    console.log('Experience type:', typeof userData?.experience, 'Value:', userData?.experience);
    if (userData && userData.experience !== undefined && userData.experience !== null) {
      return userData.experience;
    }
    return "0";
  };

  // Get review average
  const getReviewAverage = () => {
    console.log('Review Average type:', typeof userData?.review_average, 'Value:', userData?.review_average);
    if (userData && userData.review_average !== undefined && userData.review_average !== null) {
      return userData.review_average;
    }
    return "0";
  };
  
  // Get missions count
  const getMissions = () => {
    console.log('Missions type:', typeof userData?.missions, 'Value:', userData?.missions);
    if (userData && userData.missions !== undefined && userData.missions !== null) {
      return userData.missions;
    }
    return "0";
  };

  // Check if banking information is validated
  const isBankingValidated = () => {
    if (userData && userData.banking !== undefined) {
      return userData.banking;
    }
    return false;
  };
  
  // Check if profile is complete
  const isProfileComplete = () => {
    if (userData && userData.status !== undefined) {
      return userData.status === 'complete';
    }
    return false;
  };
  
  // Get user points
  const getUserPoints = () => {
    if (userData && userData.points !== undefined && userData.points !== null) {
      return userData.points;
    }
    return 0;
  };
  
  // Log the current user data we have
  useEffect(() => {
    if (userData) {
      console.log('Current userData object:', userData);
    }
  }, [userData]);

  // Add debugging to check the specific fields coming from API
  useEffect(() => {
    if (userData) {
      console.log('Experience:', userData.experience);
      console.log('Review Average:', userData.review_average);
      console.log('Missions:', userData.missions);
      console.log('Category:', userData.job_title);
      console.log('Certifications:', userData.certifications);
      console.log('Banking Validated:', userData.banking);
      console.log('Profile Status:', userData.status);
      console.log('Points:', userData.points);
    }
  }, [userData]);

  // Get time filter display text
  const getTimeFilterText = () => {
    switch(timeFilter) {
      case 'last3months': return 'Last 3 Months';
      case 'last6months': return 'Last 6 Months';
      case 'last12months': return 'Last 12 Months';
      case 'yearToDate': return 'Year to Date';
      case 'total': return 'Total';
      default: return 'Last 30 Days';
    }
  };

  // Handle month change
  const handleMonthChange = (e) => {
    setCurrentMonth(e.target.value);
    setShowMonthSelector(false);
  };

  // Format event date
  const formatEventDate = (startDate, endDate, allDay = false) => {
    if (!startDate) return '';
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    
    // Check if the event is today
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = start.toDateString() === today.toDateString();
    const isTomorrow = start.toDateString() === tomorrow.toDateString();
    
    // Date prefix
    let datePrefix = '';
    if (isToday) {
      datePrefix = 'Today';
    } else if (isTomorrow) {
      datePrefix = 'Tomorrow';
    } else {
      // Format as 'Jul 15'
      datePrefix = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    // If all day event
    if (allDay) {
      return `${datePrefix}, All day`;
    }
    
    // Format time
    const startTime = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    // If end date exists
    if (end) {
      const endTime = end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      return `${datePrefix}, ${startTime} - ${endTime}`;
    }
    
    return `${datePrefix}, ${startTime}`;
  };
  
  // Get badge class for event type
  const getEventBadgeClass = (type) => {
    switch (type) {
      case 'meeting': return { background: '#7B68EE', text: 'Meeting' };
      case 'deadline': return { background: '#FF6B6B', text: 'Deadline' };
      case 'review': return { background: '#4CAF50', text: 'Review' };
      default: return { background: '#7B68EE', text: type || 'Event' };
    }
  };

  // Handle window resize to check if left panel should be hidden
  useEffect(() => {
    // Simple window width tracking for components that need it
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };

    // Initial update
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Calculate dynamic heights based on screen size
  const getChartHeight = () => {
    // Adjust these values based on testing with different screen sizes
    if (windowHeight < 600) return 150; 
    if (windowHeight < 800) return 200;
    if (windowHeight < 1000) return 250;
    return 280; // Default height
  };
  
  const getEventsListHeight = () => {
    // Adjust these values based on testing with different screen sizes
    if (windowHeight < 600) return 150;
    if (windowHeight < 800) return 200;
    if (windowHeight < 1000) return 250;
    return 300; // Default height
  };

  return (
    <div className="dashboard-container-employee">
      {/* Pass the userData to Sidebar */}
      <Sidebar lang={lang} uid={uid} userData={userData} currentSection="dashboard" />

      {/* Style override to remove background images */}
      <style>{overrideStyles}</style>

      {/* Main Content */}
      <div className="main-content-dashboard-employee">
        <div className="content-area_dashboard_employee">
          <div className="dashboard-layout">
            {/* Left Column - Profile Summary (hidden on mobile via CSS) */}
            <div className="left-panel">
              <div className="profile-summary-section" style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center',
                height: '100%'
              }}>
                <div className="profile-image-container">
                  <div className="profile-image" style={{
                    backgroundImage: `url(https://ui-avatars.com/api/?name=${encodeURIComponent(getUserName())}&size=120&background=0D8ABC&color=fff)`
                  }}></div>
                </div>
                
                <div className="profile-details">
                  <div className="section-header-dashboard" style={{ 
                    padding: '5px 0', 
                    textAlign: 'center', 
                  }}>
                    <h3>{userData?.name || 'User'} {userData?.surname || ''}</h3>
                  </div>
                  <p className="job-title">{getJobTitle()}</p>
                  <p className="email">
                    {userData?.email || userData?.emailAddress || currentUser?.email || 'No email available'}
                  </p>
                  
                  <div className="profile-stats">
                    <div className="stat-item">
                      <p>{getMissions()}</p>
                      <h3>Missions</h3>
                    </div>
                    <div className="stat-item">
                      <p>{getExperience()}</p>
                      <h3>Experience</h3>
                    </div>
                    <div className="stat-item">
                      <p>{getReviewAverage()}</p>
                      <h3>Rating</h3>
                    </div>
                    {isBankingValidated() && isProfileComplete() && (
                      <div className="stat-item">
                        <p>{getUserPoints()}</p>
                        <h3>Points</h3>
                      </div>
                    )}
                  </div>
                  {isBankingValidated() && isProfileComplete() && (
                    <div className="fidelity-section">
                      <h3 className="fidelity-title">Fidelity</h3>
                      <div className="fidelity-content">
                        <div className="reward-points">
                          <img src={rewardStar} alt="Reward Star" className="reward-star" />
                          <div className="points-value-bold">{getUserPoints()}</div>
                          <div className="points-label">points</div>
                        </div>
                        <div className="fidelity-status">
                          <div className="fidelity-details">
                            <p>Continue, you are on a great streak!</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {(!isBankingValidated() || !isProfileComplete()) && (
                    <div className="missing-info-section">
                      <h3>Account Status</h3>
                      <div className="missing-info-list">
                      {!isBankingValidated() && (
                        <div className="missing-item">
                          <div className="missing-icon"><FiCreditCard size={18} /></div>
                          <div className="missing-details">
                            <h4>No banking information</h4>
                            <p>Add your payment information to receive payments.</p>
                          </div>
                          <button className="update-button">Add</button>
                        </div>
                      )}
                      {!isProfileComplete() && (
                        <div className="missing-item">
                          <div className="missing-icon"><FiSettings size={18} /></div>
                          <div className="missing-details">
                            <h4>Complete your profile</h4>
                            <p>Your profile is not complete yet. Finish the initial setup to access all functionalities.</p>
                          </div>
                          <button className="update-button">Update</button>
                        </div>
                      )}
                      </div>
                    </div>
                  )}
                  
                  {/* Quick Actions Section */}
                  <div className="quick-actions-section" style={{ 
                    marginTop: '20px',
                    padding: '15px',
                    border: '1px solid #eeeeee',
                    borderRadius: '8px'
                  }}>
                    <h3 style={{ marginTop: '0', marginBottom: '12px' }}>Quick Actions</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <button style={{
                        padding: '8px 12px',
                        backgroundColor: '#f5f5f5',
                        border: '1px solid #eeeeee',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}>
                        <FiPlus size={14} style={{ marginRight: '5px' }} /> New Mission
                      </button>
                      <button style={{
                        padding: '8px 12px',
                        backgroundColor: '#f5f5f5',
                        border: '1px solid #eeeeee',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}>
                        <FiCalendar size={14} style={{ marginRight: '5px' }} /> Schedule
                      </button>
                      <button style={{
                        padding: '8px 12px',
                        backgroundColor: '#f5f5f5',
                        border: '1px solid #eeeeee',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}>
                        <FiMessageCircle size={14} style={{ marginRight: '5px' }} /> Messages
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Middle Column - Performance overview */}
            <div className="center-panel">
              <div className="overview-section" style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                height: '100%',
                overflow: 'auto'
              }}>
                <div className="section-header-dashboard" style={{ 
                  padding: '15px 20px', 
                  textAlign: 'left',
                  marginBottom: '0',
                  borderBottom: 'none'
                }}>
                  <h3>Overview</h3>
                </div>
                
                <div className="analytics-grid" style={{ flex: '0 0 auto' }}>
                  {/* Left side metrics */}
                  <div className="metrics-column" style={{ height: 'auto' }}>
                    <div className="metric-card">
                      <div className="metric-card-header">
                        <h3>MISSIONS</h3>
                        <div className="info-icon">
                          <FiInfo size={18} />
                          <div className="info-tooltip">
                            <p>Total number of missions (contracts) for the current month</p>
                          </div>
                        </div>
                      </div>
                      <div className="metric-content">
                        <PiBagSimple className="metric-icon" color="#7B68EE" size={24} />
                        <span className="value-text">{totalMissions || 0}</span>
                      </div>
                    </div>
                    
                    <div className="metric-card">
                      <div className="metric-card-header">
                        <h3>HOURS</h3>
                        <div className="info-icon">
                          <FiInfo size={18} />
                          <div className="info-tooltip">
                            <p>Total hours worked this month across all contracts</p>
                          </div>
                        </div>
                      </div>
                      <div className="metric-content">
                        <IoMdTime className="metric-icon" color="#483D8B" size={24} />
                        <span className="value-text">{totalHours || 0}</span>
                      </div>
                    </div>
                    
                    <div className="metric-card">
                      <div className="metric-card-header">
                        <h3>PROGRESS</h3>
                        <div className="info-icon">
                          <FiInfo size={18} />
                          <div className="info-tooltip">
                            {monthlyGoal ? (
                              <p>Your current monthly goal is {formatCurrency(monthlyGoal)}</p>
                            ) : (
                              <p>You can set up your goal in your account parameters
                                <button className="account-params-link">Go to settings</button>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="metric-content">
                        <GoGoal className="metric-icon" color="#4CAF50" size={24} />
                        <span className="value-text">{monthlyProgress}%</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right side - Revenue chart and history */}
                  <div className="chart-column" ref={chartRef}>
                    <div className="revenue-section" style={{ 
                      height: '100%',
                      backgroundColor: 'white', 
                      borderRadius: '8px', 
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <div className="revenue-header" style={{ padding: '15px 20px', borderBottom: '1px solid #eeeeee' }}>
                        <div className="revenue-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                          <div>
                            <h3 style={{ margin: '0 0 5px 0' }}>MONTHLY REVENUES</h3>
                            <span className="amount green-text" style={{ fontSize: '24px', fontWeight: 'bold', color: '#4cd964' }}>
                              {formatCurrency(totalRevenue || 0)}
                            </span>
                          </div>
                          <div className="date-filter" style={{ marginLeft: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                            <input 
                              type="month" 
                              value={currentMonth}
                              onChange={handleMonthChange}
                              className="month-year-picker"
                              style={{ 
                                padding: '8px 12px', 
                                border: '1px solid #eeeeee', 
                                borderRadius: '4px',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="revenue-chart" style={{ 
                        flex: '1',
                        position: 'relative', 
                        width: '100%', 
                        backgroundColor: 'white', 
                        padding: '10px 10px 0px 10px',
                        maxHeight: `${getChartHeight()}px`
                      }}>
                        {/* Area chart showing daily revenue */}
                        <div className="chart-placeholder" style={{ 
                          height: '100%', 
                          width: '100%', 
                          position: 'relative', 
                          borderRadius: '8px',
                          overflow: 'hidden',
                          backgroundColor: 'white',
                          backgroundImage: 'none !important',
                          background: 'none !important'
                        }}>
                          <svg 
                            width="100%" 
                            height="100%" 
                            viewBox="0 0 800 300" 
                            preserveAspectRatio="none" 
                            style={{ 
                              background: 'white', 
                              borderRadius: '8px',
                              backgroundImage: 'none'
                            }}
                          >
                            {(() => {
                              // Calculate days in current month
                              const year = parseInt(currentMonth.split('-')[0]);
                              const month = parseInt(currentMonth.split('-')[1]) - 1;
                              const daysInMonth = new Date(year, month + 1, 0).getDate();
                              
                              // Generate daily data from contracts
                              let dailyData = Array(daysInMonth).fill(0);
                              
                              // Fill with actual contract data if available
                              if (Object.keys(contracts).length > 0) {
                                Object.values(contracts).forEach(contract => {
                                  if (contract.start_date) {
                                    const contractDate = new Date(contract.start_date);
                                    const day = contractDate.getDate() - 1; // 0-indexed
                                    if (day >= 0 && day < daysInMonth) {
                                      dailyData[day] += contract.total_amount || 0;
                                    }
                                  }
                                });
                              }
                              
                              // Find max value for Y-axis scale
                              const maxValue = Math.max(...dailyData, 1000); // Ensure minimum scale
                              const roundedMax = Math.ceil(maxValue / 5000) * 5000; // Round to nearest 5K
                              
                              // Chart dimensions
                              const width = 800;
                              const height = 250;
                              const padding = { top: 20, right: 30, bottom: 30, left: 60 };
                              const chartWidth = width - padding.left - padding.right;
                              const chartHeight = height - padding.top - padding.bottom;
                              
                              // Create scaled points for the line
                              const points = dailyData.map((value, index) => {
                                const x = padding.left + (index / (daysInMonth - 1)) * chartWidth;
                                const y = padding.top + chartHeight - (value / roundedMax) * chartHeight;
                                return [x, y, value];
                              });
                              
                              // Create smooth curve path
                              const line = points.map((point, i) => {
                                if (i === 0) {
                                  return `M ${point[0]},${point[1]}`;
                                }
                                
                                // Use bezier curves for smoother line
                                const prevPoint = points[i - 1];
                                const cp1x = prevPoint[0] + (point[0] - prevPoint[0]) / 3;
                                const cp1y = prevPoint[1];
                                const cp2x = point[0] - (point[0] - prevPoint[0]) / 3;
                                const cp2y = point[1];
                                
                                return `C ${cp1x},${cp1y} ${cp2x},${cp2y} ${point[0]},${point[1]}`;
                              }).join(' ');
                              
                              // Create area fill path (add line to bottom and back)
                              const area = `${line} L ${padding.left + chartWidth},${padding.top + chartHeight} L ${padding.left},${padding.top + chartHeight} Z`;
                              
                              // Y-axis labels
                              const yLabels = [0, roundedMax * 0.25, roundedMax * 0.5, roundedMax * 0.75, roundedMax];
                              
                              // X-axis labels - days of month (5, 10, 15, 20, 25, 30) depending on days in month
                              const dayLabels = [1, 5, 10, 15, 20, 25, daysInMonth].filter(day => day <= daysInMonth);
                              
                              // Find data points with values (non-zero)
                              const dataPoints = points.filter((point, idx) => dailyData[idx] > 0);
                              
                              // Select points to show tooltips (to avoid overcrowding)
                              const showTooltipIndices = [];
                              if (dataPoints.length > 0) {
                                // Show tooltip for the maximum value and a few others
                                const maxIndex = dailyData.indexOf(Math.max(...dailyData));
                                if (maxIndex >= 0) showTooltipIndices.push(maxIndex);
                                
                                // Add a few more points spaced out if we have enough data
                                if (dataPoints.length > 3) {
                                  const step = Math.floor(dataPoints.length / 3);
                                  for (let i = 0; i < dataPoints.length; i += step) {
                                    const idx = points.indexOf(dataPoints[i]);
                                    if (idx >= 0 && !showTooltipIndices.includes(idx)) {
                                      showTooltipIndices.push(idx);
                                      if (showTooltipIndices.length >= 4) break; // Limit tooltips
                                    }
                                  }
                                } else {
                                  // If we have just a few data points, show them all
                                  dataPoints.forEach(point => {
                                    const idx = points.indexOf(point);
                                    if (idx >= 0 && !showTooltipIndices.includes(idx)) {
                                      showTooltipIndices.push(idx);
                                    }
                                  });
                                }
                              }
                              
                              return (
                                <g>
                                  {/* Grid lines */}
                                  {yLabels.map((label, i) => (
                                    <g key={`grid-${i}`}>
                                      <line
                                        x1={padding.left}
                                        y1={padding.top + chartHeight - (label / roundedMax) * chartHeight}
                                        x2={padding.left + chartWidth}
                                        y2={padding.top + chartHeight - (label / roundedMax) * chartHeight}
                                        stroke="#e5e5e5"
                                        strokeWidth="1"
                                      />
                                      <text
                                        x={padding.left - 10}
                                        y={padding.top + chartHeight - (label / roundedMax) * chartHeight + 4}
                                        textAnchor="end"
                                        fontSize="11"
                                        fill="#888"
                                      >
                                        {label === 0 ? '0' : `${label/1000}K`}
                                      </text>
                                    </g>
                                  ))}
                                  
                                  {/* X-axis with day numbers */}
                                  {dayLabels.map((day) => (
                                    <g key={`x-label-${day}`}>
                                      <line
                                        x1={padding.left + ((day - 1) / (daysInMonth - 1)) * chartWidth}
                                        y1={padding.top + chartHeight}
                                        x2={padding.left + ((day - 1) / (daysInMonth - 1)) * chartWidth}
                                        y2={padding.top + chartHeight + 5}
                                        stroke="#e5e5e5"
                                        strokeWidth="1"
                                      />
                                      <text
                                        x={padding.left + ((day - 1) / (daysInMonth - 1)) * chartWidth}
                                        y={padding.top + chartHeight + 20}
                                        textAnchor="middle"
                                        fontSize="11"
                                        fill="#888"
                                      >
                                        {day}
                                      </text>
                                    </g>
                                  ))}
                                  
                                  {/* Area fill */}
                                  <path
                                    d={area}
                                    fill="#ADD8E6"
                                    opacity="0.5"
                                  />
                                  
                                  {/* Line path */}
                                  <path
                                    d={line}
                                    stroke="#1E90FF"
                                    strokeWidth="2"
                                    fill="none"
                                  />
                                  
                                  {/* Data points */}
                                  {dataPoints.map((point, i) => {
                                    const index = points.indexOf(point);
                                    const showTooltip = showTooltipIndices.includes(index);
                                    return (
                                      <g key={`point-${i}`}>
                                        <circle
                                          cx={point[0]}
                                          cy={point[1]}
                                          r="4"
                                          fill="#1E90FF"
                                          stroke="#fff"
                                          strokeWidth="2"
                                        />
                                        
                                        {/* Show tooltip for selected points */}
                                        {showTooltip && (
                                          <g>
                                            <rect
                                              x={point[0] - 35}
                                              y={point[1] - 35}
                                              width="70"
                                              height="30"
                                              rx="4"
                                              fill="white"
                                              stroke="#ddd"
                                            />
                                            <text
                                              x={point[0]}
                                              y={point[1] - 15}
                                              textAnchor="middle"
                                              fontSize="12"
                                              fontWeight="bold"
                                              fill="#333"
                                            >
                                              {`${(point[2]/1000).toFixed(1)}K`}
                                            </text>
                                            <path
                                              d={`M ${point[0] - 5} ${point[1] - 5} L ${point[0]} ${point[1] - 2} L ${point[0] + 5} ${point[1] - 5}`}
                                              fill="white"
                                            />
                                          </g>
                                        )}
                                      </g>
                                    );
                                  })}
                                </g>
                              );
                            })()}
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Bottom row with Upcoming Events and Contracts */}
                <div className="bottom-row" style={{ marginTop: '20px', flex: '1', minHeight: '0', display: 'flex' }}>
                  <div style={{ display: 'flex', gap: '10px', flex: '1', minHeight: '0' }}>
                    {/* Upcoming Events (replacing Calendar) */}
                    <div className="upcoming-events-section" style={{ 
                      flex: '1',
                      display: 'flex',
                      flexDirection: 'column',
                      border: '1px solid #eeeeee',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      minHeight: '0'
                    }}>
                      <div className="section-header-dashboard" style={{ 
                        padding: '15px 20px', 
                        borderBottom: '1px solid #eeeeee',
                        marginBottom: '0'
                      }}>
                        <h3>Upcoming Events</h3>
                      </div>
                      
                      <div className="events-list" style={{ 
                        flex: '1',
                        padding: '0 10px',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        {upcomingEvents.length > 0 ? (
                          upcomingEvents.map((event) => {
                            const badgeStyle = getEventBadgeClass(event.type);
                            return (
                              <div className="event-item" key={event.id} style={{
                                padding: '15px',
                                borderBottom: '1px solid #f0f0f0',
                                marginBottom: '10px'
                              }}>
                                <div className="event-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div className="event-icon" style={{ marginRight: '10px' }}>
                                    <FiCalendar size={18} />
                                  </div>
                                  <div className="event-dates" style={{ flex: '1' }}>
                                    <span className="event-date-value">{formatEventDate(event.start_date, event.end_date, event.all_day)}</span>
                                  </div>
                                  <div className="event-badge" style={{ 
                                    padding: '4px 10px',
                                    borderRadius: '12px',
                                    backgroundColor: badgeStyle.background,
                                    color: 'white',
                                    fontSize: '12px'
                                  }}>
                                    {badgeStyle.text}
                                  </div>
                                </div>
                                <div className="event-details" style={{ marginTop: '10px' }}>
                                  <h4 className="event-title" style={{ margin: '0 0 5px 0' }}>{event.title}</h4>
                                  <p className="event-description" style={{ margin: '0' }}>{event.description}</p>
                                </div>
                                <div className="event-actions" style={{ marginTop: '10px' }}>
                                  <button className="view-details-button" style={{
                                    padding: '6px 12px',
                                    border: 'none',
                                    backgroundColor: '#f5f5f5',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                  }}>View Details</button>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="no-events-message" style={{ 
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#777'
                          }}>No upcoming contracts</div>
                        )}
                      </div>
                    
                      <div style={{ 
                        padding: '15px', 
                        borderTop: '1px solid #eeeeee',
                        display: 'flex',
                        justifyContent: 'center'
                      }}>
                        <button className="new-event-button" style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%',
                          padding: '8px 16px',
                          backgroundColor: '#7B68EE',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}>
                          <FiPlus size={16} style={{ marginRight: '5px' }} /> New Event
                        </button>
                      </div>
                    </div>
                    
                    {/* Last Contracts section */}
                    <div className="upcoming-events-section" style={{ 
                      flex: '1',
                      display: 'flex',
                      flexDirection: 'column',
                      border: '1px solid #eeeeee',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
                      <div className="section-header-dashboard" style={{ 
                        padding: '15px 20px', 
                        borderBottom: '1px solid #eeeeee',
                        marginBottom: '0'
                      }}>
                        <h3>Last Contracts</h3>
                      </div>
                      
                      <div className="events-list" style={{ 
                        overflow: 'auto',
                        flex: '1',
                        padding: '0 10px',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        {Object.keys(contracts).length > 0 ? (
                          Object.entries(contracts).map(([key, contract]) => (
                            <div className="event-item" key={key} style={{
                              padding: '15px',
                              borderBottom: '1px solid #f0f0f0',
                              marginBottom: '10px'
                            }}>
                              <div className="event-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div className="event-icon" style={{ marginRight: '10px' }}>
                                  <FiCalendar size={18} />
                                </div>
                                <div className="event-dates" style={{ flex: '1' }}>
                                  <span className="event-date-value">Due: {formatDate(contract.facturation_date)}</span>
                                </div>
                                <div className="event-badge" style={{ 
                                  padding: '4px 10px',
                                  borderRadius: '12px',
                                  backgroundColor: contract.payment_status === 'completed' ? '#4CD964' : 
                                                 contract.payment_status === 'pending' ? '#FFCC00' : '#FF3B30',
                                  color: 'white',
                                  fontSize: '12px'
                                }}>
                                  {contract.payment_status}
                                </div>
                              </div>
                              <div className="event-details" style={{ marginTop: '10px' }}>
                                <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ 
                                      width: '28px', 
                                      height: '28px', 
                                      borderRadius: '6px', 
                                      backgroundColor: 'rgba(123, 104, 238, 0.1)', 
                                      display: 'flex', 
                                      justifyContent: 'center', 
                                      alignItems: 'center',
                                      color: '#7B68EE' 
                                    }}>
                                      <FiDollarSign />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>Amount</span>
                                      <span style={{ fontWeight: '600', color: '#333', fontSize: '14px' }}>{formatCurrency(contract.total_amount)}</span>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ 
                                      width: '28px', 
                                      height: '28px', 
                                      borderRadius: '6px', 
                                      backgroundColor: 'rgba(123, 104, 238, 0.1)', 
                                      display: 'flex', 
                                      justifyContent: 'center', 
                                      alignItems: 'center',
                                      color: '#7B68EE' 
                                    }}>
                                      <FiClock />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>Hours</span>
                                      <span style={{ fontWeight: '600', color: '#333', fontSize: '14px' }}>{contract.total_hours}h</span>
                                    </div>
                                  </div>
                                </div>
                                <div style={{ 
                                  fontSize: '12px', 
                                  color: '#666', 
                                  borderTop: '1px solid #eee', 
                                  paddingTop: '10px' 
                                }}>
                                  <span style={{ fontWeight: '500' }}>Period: </span>
                                  <span>{formatDate(contract.start_date)} - {formatDate(contract.end_date)}</span>
                                </div>
                              </div>
                              <div className="event-actions" style={{ marginTop: '10px' }}>
                                <button className="view-details-button" style={{
                                  padding: '6px 12px',
                                  border: 'none',
                                  backgroundColor: '#f5f5f5',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}>View Details</button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="no-events-message" style={{ 
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#777'
                          }}>No contracts for this period</div>
                        )}
                      </div>
                      
                      <div style={{ 
                        padding: '15px', 
                        borderTop: '1px solid #eeeeee',
                        display: 'flex',
                        justifyContent: 'center'
                      }}>
                        <button className="new-event-button" style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%',
                          padding: '8px 16px',
                          backgroundColor: '#7B68EE',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}>
                          All Contracts
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column - Notifications */}
            <div className="right-panel">
              <div className="dashboard-notifications-container">
                <div className="dashboard-notifications-section">
                  <div className="section-header-dashboard" style={{ 
                    padding: '15px 20px', 
                    marginBottom: '0',
                    borderBottom: '1px solid #eeeeee'
                  }}>
                    <h3>Notifications</h3>
                    <div className="notification-indicator active"></div>
                  </div>
                  
                  <div className="notification-items">
                    <div className="notification-item">
                      <div className="notification-icon work">
                        <FiShoppingBag size={18} />
                      </div>
                      <div className="notification-content">
                        <div className="notification-header">
                          <h5>Project Review</h5>
                          <span className="notification-time">Today, 2:00 PM</span>
                        </div>
                        <p>Code review of the E-commerce dashboard</p>
                        <button className="detail-button">View Details</button>
                      </div>
                    </div>
                    
                    <div className="notification-item">
                      <div className="notification-icon deadline">
                        <FiCreditCard size={18} />
                      </div>
                      <div className="notification-content">
                        <div className="notification-header">
                          <h5>Project Deadline</h5>
                          <span className="notification-time">Tomorrow</span>
                        </div>
                        <p>Submit the final version of the Mobile App</p>
                        <div className="action-buttons">
                          <button className="submit-button">Submit Work</button>
                          <button className="extension-button">Request Extension</button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="notification-item">
                      <div className="notification-icon meeting">
                        <FiMessageCircle size={18} />
                      </div>
                      <div className="notification-content">
                        <div className="notification-header">
                          <h5>Team Meeting</h5>
                          <span className="notification-time">Jul 15, 10:00 AM</span>
                        </div>
                        <p>Weekly sprint planning meeting</p>
                        <button className="detail-button">Add to Calendar</button>
                      </div>
                    </div>
                    
                    <div className="notification-item">
                      <div className="notification-avatar"></div>
                      <div className="notification-content">
                        <div className="notification-header">
                          <h5>Josep Akbar</h5>
                          <span className="notification-time">Just now</span>
                        </div>
                        <p>Can you review the latest changes to the API documentation?</p>
                        <button className="reply-button">Reply Now</button>
                      </div>
                    </div>
                    
                    <div className="notification-item">
                      <div className="notification-avatar"></div>
                      <div className="notification-content">
                        <div className="notification-header">
                          <h5>Sarah Johnson</h5>
                          <span className="notification-time">2h ago</span>
                        </div>
                        <p>Need your input on the new design system components.</p>
                        <button className="reply-button">Reply Now</button>
                      </div>
                    </div>
                    
                    <div className="notification-item">
                      <div className="notification-avatar"></div>
                      <div className="notification-content">
                        <div className="notification-header">
                          <h5>Michael Chen</h5>
                          <span className="notification-time">Yesterday</span>
                        </div>
                        <p>Do you have time to discuss the project timeline tomorrow?</p>
                        <button className="reply-button">Reply Now</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
