import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { RxDashboard } from "react-icons/rx";
import { IoCalendarClearOutline } from "react-icons/io5";
import { LuMessageSquare } from "react-icons/lu";
import { AiOutlineTeam } from "react-icons/ai";
import { RiContactsBook2Line } from "react-icons/ri";
import { IoSettingsOutline } from "react-icons/io5";
import { HiMenu } from "react-icons/hi";
import { IoNotificationsOutline } from "react-icons/io5";
import { FaBell } from "react-icons/fa";
import { CgProfile } from "react-icons/cg";
import './Sidebar.css';
import logo from '../../../../assets/global/logo.png';

const Sidebar = ({uid, lang, currentSection = 'dashboard', userData = null }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3); // Mock notification count
  
  // Get user data using userData prop passed from Dashboard
  const getName = () => {
    if (userData && userData.name && userData.surname) {
      return `${userData.name} ${userData.surname}`;
    } else if (userData && userData.name) {
      return userData.name;
    } else if (userData && userData.displayName) {
      return userData.displayName;
    } else {
      return "User";
    }
  };
  
  // Get user email from userData
  const getEmail = () => {
    if (userData && userData.email) {
      return userData.email;
    } else if (userData && userData.emailAddress) {
      return userData.emailAddress;
    } else {
      return "user@example.com";
    }
  };
  
  // Get user profile image
  const getProfileImage = () => {
    if (userData && userData.photoURL) {
      return userData.photoURL;
    } else {
      // Create an avatar based on user name
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(getName())}&size=120&background=0D8ABC&color=fff`;
    }
  };
  
  // Sample notifications - replace with actual data from API in a real implementation
  const [notifications, setNotifications] = useState([
    { id: 1, text: "New task assigned: Q3 Report", time: "10m ago" },
    { id: 2, text: "Calendar: Meeting at 3:00 PM", time: "1h ago" },
    { id: 3, text: "Your vacation request was approved", time: "2h ago" }
  ]);

  // Define menu items with the new URL structure: section first, then UID
  const menuItems = [
    { id: 'dashboard', path: `/${lang}/dashboard/dashboard/${uid}`, icon: <RxDashboard size={20} />, label: 'Dashboard' },
    { id: 'calendar', path: `/${lang}/dashboard/calendar/${uid}`, icon: <IoCalendarClearOutline size={20} />, label: 'Calendar' },
    { id: 'messages', path: `/${lang}/dashboard/messages/${uid}`, icon: <LuMessageSquare size={20} />, label: 'Messages' },
    { id: 'hr-core', path: `/${lang}/dashboard/hr-core/${uid}`, icon: <AiOutlineTeam size={20} />, label: 'HR Core' },
    { id: 'marketplace', path: `/${lang}/dashboard/marketplace/${uid}`, icon: <RiContactsBook2Line size={20} />, label: 'Marketplace' },
    { id: 'settings', path: `/${lang}/dashboard/settings/${uid}`, icon: <IoSettingsOutline size={20} />, label: 'Settings' },
  ];

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  // Add useEffect for click outside handling
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if sidebar is expanded and click is outside
      if (isExpanded && !event.target.closest('.sidebar') && !event.target.closest('.menu-toggle')) {
        setIsExpanded(false);
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]); // Only re-run effect when isExpanded changes

  // Function to check if a menu item is active based on the current section
  const isMenuItemActive = (itemId) => {
    return itemId === currentSection;
  };

  // Navigate to profile page
  const goToProfile = () => {
    navigate(`/${lang}/dashboard/profile/${uid}`);
    setIsExpanded(false);
  };

  // Navigate to notifications page
  const goToNotifications = () => {
    navigate(`/${lang}/dashboard/notifications/${uid}`);
    setIsExpanded(false);
  };

  return (
    <div className={`sidebar ${isExpanded ? 'expanded' : ''}`}>
      <div className="menu-toggle" onClick={toggleSidebar}>
        <HiMenu size={24} />
        {notificationCount > 0 && <div className="notification-indicator"></div>}
      </div>
      
      <div className="sidebar-content">
        {/* Profile Section at Top */}
        <div className="profile-section">
          <div className="profile-image-container" onClick={goToProfile}>
            <div 
              className="profile-image" 
              style={{ backgroundImage: `url(${getProfileImage()})` }}
            ></div>
          </div>
          <div className="profile-info">
            <div className="profile-name">{getName()}</div>
            <div className="profile-email">{getEmail()}</div>
            <div className="profile-status"></div>
          </div>
        </div>
        
        {/* Notifications Section */}
        <div className="notification-section">
          <div className="notification-header">
            <div className="notification-title">
              NOTIFICATIONS
            </div>
          </div>
          
          <div className="notification-list">
            {notifications.slice(0, 2).map(notification => (
              <div key={notification.id} className="notification-preview">
                <div className="notification-content">
                  {notification.text}
                  <div className="notification-time">{notification.time}</div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="view-all" onClick={goToNotifications}>
            View all notifications
          </div>
        </div>
        
        {/* Navigation Menu */}
        <nav className="nav-menu">
          <div className="nav-menu-items">
            {menuItems.map((item) => (
              <li key={item.id} className={`nav-item ${isMenuItemActive(item.id) ? 'active' : ''}`}>
                <Link to={item.path} onClick={() => setIsExpanded(false)}>
                  <span className="icon">{item.icon}</span>
                  <span className="label">{item.label}</span>
                </Link>
              </li>
            ))}
          </div>
        </nav>
        
        {/* Footer */}
        <div className="sidebar-footer">
          © 2025 InteriMed
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
