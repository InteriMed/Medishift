import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiChevronLeft, FiChevronRight, FiSidebar, FiFilter } from 'react-icons/fi';
import DateField from '../../../../components/BoxedInputFields/DateField';
import CheckboxField from '../../../../components/BoxedInputFields/CheckboxField';
import { getWeekDates } from '../utils/dateHelpers';
import styles from './calendarHeader.module.css';

const CalendarHeader = ({ 
  currentDate, 
  view, 
  setView,
  navigateDate, 
  setCurrentDate,
  isSidebarCollapsed,
  toggleSidebar,
  categories,
  handleCategoryToggle
}) => {
  const { t } = useTranslation();
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setShowCategoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Format the date display based on view
  const formatDateHeader = () => {
    const options = { month: 'long', year: 'numeric' };
    if (view === 'day') {
      options.day = 'numeric';
    } else if (view === 'week') {
      // Get first and last day of the displayed week
      const weekDates = getWeekDates(currentDate);
      const firstDay = weekDates[0];
      const lastDay = weekDates[6];
      
      // If days are in the same month
      if (firstDay.getMonth() === lastDay.getMonth()) {
        return `${firstDay.getDate()} - ${lastDay.getDate()} ${firstDay.toLocaleString(undefined, { month: 'long' })} ${firstDay.getFullYear()}`;
      } 
      // If days span different months
      else {
        return `${firstDay.getDate()} ${firstDay.toLocaleString(undefined, { month: 'short' })} - ${lastDay.getDate()} ${lastDay.toLocaleString(undefined, { month: 'short' })} ${firstDay.getFullYear()}`;
      }
    }
    
    return currentDate.toLocaleString(undefined, options);
  };
  
  // Handle date change from date picker
  const handleDateChange = (date) => {
    if (date) {
      setCurrentDate(date);
    }
  };

  // Count active categories
  const activeCategoriesCount = categories.filter(cat => cat.checked).length;
  
  return (
    <div className={styles.calendarHeader}>
      <div className={styles.headerLeft}>
        <button 
          className={styles.sidebarToggle}
          onClick={toggleSidebar}
          aria-label={isSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          title={isSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
        >
          <FiSidebar />
        </button>
        
        <div className={styles.datePickerContainer}>
          <DateField
            value={currentDate}
            onChange={handleDateChange}
            marginBottom="0"
          />
        </div>
      </div>
      
      <div className={styles.headerRight}>
        {/* Category Filter Dropdown */}
        <div className={styles.categoryFilter} ref={categoryDropdownRef}>
          <button 
            className={`${styles.filterButton} ${showCategoryDropdown ? styles.active : ''}`}
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            title="Filter categories"
          >
            <FiFilter />
            {activeCategoriesCount < categories.length && (
              <span className={styles.filterBadge}>{activeCategoriesCount}</span>
            )}
          </button>
          
          {showCategoryDropdown && (
            <div className={styles.categoryDropdown}>
              <div className={styles.dropdownHeader}>
                <span>Categories</span>
              </div>
              <div className={styles.categoryList}>
                {categories.map((category, index) => (
                  <div key={index} className={styles.categoryItem}>
                    <CheckboxField
                      label={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={styles.categoryName}>{category.name}</span>
                        </div>
                      }
                      checked={category.checked}
                      onChange={() => handleCategoryToggle(index)}
                      color={category.color}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button 
          className={styles.todayButton}
          onClick={() => setCurrentDate(new Date())}
        >
          {t('dashboard.calendar.today')}
        </button>
        
        <div className={styles.navigationButtons}>
          <button 
            className={styles.navButton}
            onClick={() => navigateDate(-1)}
            aria-label="Previous"
          >
            <FiChevronLeft />
          </button>
          <button 
            className={styles.navButton}
            onClick={() => navigateDate(1)}
            aria-label="Next"
          >
            <FiChevronRight />
          </button>
        </div>
        
        <div className={styles.viewToggle}>
          <button 
            className={`${styles.viewButton} ${view === 'day' ? styles.active : ''}`}
            onClick={() => setView('day')}
          >
            {t('dashboard.calendar.dayView')}
          </button>
          <button 
            className={`${styles.viewButton} ${view === 'week' ? styles.active : ''}`}
            onClick={() => setView('week')}
          >
            {t('dashboard.calendar.weekView')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarHeader; 