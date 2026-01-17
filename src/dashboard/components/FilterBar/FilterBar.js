import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiFilter, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import styles from './filterBar.module.css';

const FilterBar = ({ filters, onFilterChange, onApplyFilters }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Example options - replace with your actual options
  const cantons = ["Zurich", "Geneva", "Basel", "Bern"];
  const cities = ["Zurich", "Geneva", "Basel", "Bern"];
  const areas = ["5km", "10km", "20km", "50km", "100km"];
  const experienceLevels = [
    { value: "beginner", label: t('auth.signup.forms.experience.lessThan1') },
    { value: "intermediate", label: t('auth.signup.forms.experience.1to3') },
    { value: "experienced", label: t('auth.signup.forms.experience.moreThan5') }
  ];
  const software = ["Golden Gate", "ABACUS", "Pharmatic"];
  const workAmounts = [
    { value: "0-20", label: "0-20%" },
    { value: "20-40", label: "20-40%" },
    { value: "40-60", label: "40-60%" },
    { value: "60-80", label: "60-80%" },
    { value: "80-100", label: "80-100%" }
  ];
  
  const toggleFilterBar = () => {
    setIsExpanded(!isExpanded);
  };
  
  // Handle filter changes
  const handleFilterChange = (key, value) => {
    onFilterChange({
      ...filters,
      [key]: value
    });
  };
  
  // Apply filters
  const handleApplyFilters = () => {
    onApplyFilters();
    setIsExpanded(false);
  };
  
  // Clear all filters
  const handleClearAllFilters = () => {
    onFilterChange({
      canton: [],
      city: [],
      area: [],
      experience: [],
      software: [],
      workAmount: [],
      fromDate: '',
      toDate: ''
    });
  };
  
  // Check if there are active filters
  const hasActiveFilters = () => {
    return Object.values(filters).some(value => 
      (Array.isArray(value) && value.length > 0) || 
      (!Array.isArray(value) && value)
    );
  };
  
  // Generate filter summary text
  const getFilterSummary = () => {
    if (!hasActiveFilters()) {
      return t('dashboard.marketplace.filter.noFiltersApplied');
    }
    
    const activeFilterCount = Object.values(filters).filter(value => 
      (Array.isArray(value) && value.length > 0) || 
      (!Array.isArray(value) && value)
    ).length;
    
    return t('dashboard.marketplace.filter.activeFilterCount', { count: activeFilterCount });
  };
  
  return (
    <div className={styles.filterBar}>
      <div className={styles.filterBarHeader} onClick={toggleFilterBar}>
        <div className={styles.filterTitle}>
          <FiFilter />
          <span>{t('dashboard.marketplace.filter.title')}</span>
        </div>
        <div className={styles.filterSummary}>
          {getFilterSummary()}
        </div>
        <button className={styles.expandButton}>
          {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
        </button>
      </div>
      
      {isExpanded && (
        <div className={styles.filterContent}>
          <div className={styles.filterGrid}>
            {/* Canton Filter */}
            <div className={styles.filterGroup}>
              <label>{t('dashboard.marketplace.filter.canton')}</label>
              <select 
                multiple
                value={filters.canton}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  handleFilterChange('canton', values);
                }}
              >
                {cantons.map(canton => (
                  <option key={canton} value={canton}>{canton}</option>
                ))}
              </select>
            </div>
            
            {/* City Filter */}
            <div className={styles.filterGroup}>
              <label>{t('dashboard.marketplace.filter.city')}</label>
              <select 
                multiple
                value={filters.city}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  handleFilterChange('city', values);
                }}
              >
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            
            {/* Other filters would go here */}
            
            <div className={styles.filterActions}>
              <button 
                className={styles.clearButton}
                onClick={handleClearAllFilters}
              >
                {t('dashboard.marketplace.filter.clear')}
              </button>
              <button 
                className={styles.applyButton}
                onClick={handleApplyFilters}
              >
                {t('dashboard.marketplace.filter.apply')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar; 