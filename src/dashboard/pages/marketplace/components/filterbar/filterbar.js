import React, { useState } from 'react';
import DropdownFieldAddList from '../../../../../components/boxedInputFields/dropdownFieldAddList';
import dateField from '../../../../../components/boxedInputFields/dateField';
import Button from '../../../../../components/boxedInputFields/button';
import './filterbar.css';
import { useTranslation } from 'react-i18next';

const FilterBar = ({ filters, onFilterChange, clearDateFilter, onApplyFilters }) => {
  const { t } = useTranslation(['marketplace', 'auth']);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const cantons = ["Zurich", "Geneva", "Basel", "Bern", /* ... */];
  const cities = ["Zurich", "Geneva", "Basel", "Bern", /* ... */];
  const areas = ["5km", "10km", "20km", "50km", "100km"];
  const experienceLevels = [
    { value: "beginner", label: "Less than 1 year" },
    { value: "intermediate", label: "1-3 years" },
    { value: "experienced", label: "More than 5 years" }
  ];
  const software = ["Golden Gate", "ABACUS", "Pharmatic", /* ... */];
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
  
  // Explicitly close the filter bar
  const hideFilters = () => {
    setIsExpanded(false);
  };
  
  const handleApplyFilters = () => {
    onApplyFilters();
    setIsExpanded(false);
  };

  const handleClearAllFilters = () => {
    clearDateFilter(); // This likely clears fromDate and toDate
    
    // Clear all other filters
    onFilterChange('canton', []);
    onFilterChange('city', []);
    onFilterChange('area', []);
    onFilterChange('experience', []);
    onFilterChange('software', []);
    onFilterChange('workAmount', []);
    
    // If fromDate and toDate aren't cleared by clearDateFilter, clear them explicitly
    onFilterChange('fromDate', null);
    onFilterChange('toDate', null);
  };
  
  // Generate filter summary for the collapsed view
  const getFilterSummary = () => {
    const activeFilters = [];
    
    if (filters.canton && filters.canton.length > 0) {
      activeFilters.push(`${t('marketplace:filters.canton')}: ${filters.canton.length} selected`);
    }
    
    if (filters.city && filters.city.length > 0) {
      activeFilters.push(`${t('marketplace:filters.city')}: ${filters.city.length} selected`);
    }
    
    if (filters.area && filters.area.length > 0) {
      activeFilters.push(`${t('marketplace:filters.area')}: ${filters.area.length} selected`);
    }
    
    if (filters.experience && filters.experience.length > 0) {
      activeFilters.push(`${t('marketplace:filters.experience')}: ${filters.experience.length} selected`);
    }
    
    if (filters.software && filters.software.length > 0) {
      activeFilters.push(`${t('marketplace:filters.software')}: ${filters.software.length} selected`);
    }
    
    if (filters.workAmount && filters.workAmount.length > 0) {
      activeFilters.push(`${t('marketplace:filters.workAmount')}: ${filters.workAmount.length} selected`);
    }
    
    if (filters.fromDate) {
      activeFilters.push(`From: ${filters.fromDate}`);
    }
    
    if (filters.toDate) {
      activeFilters.push(`To: ${filters.toDate}`);
    }
    
    return activeFilters.length > 0 
      ? activeFilters.join(' | ') 
      : t('marketplace:filter.noFiltersApplied');
  };

  // Check if there are any active filters
  const hasActiveFilters = () => {
    return (
      (filters.canton && filters.canton.length > 0) ||
      (filters.city && filters.city.length > 0) ||
      (filters.area && filters.area.length > 0) ||
      (filters.experience && filters.experience.length > 0) ||
      (filters.software && filters.software.length > 0) ||
      (filters.workAmount && filters.workAmount.length > 0) ||
      filters.fromDate ||
      filters.toDate
    );
  };

  return (
    <div className={`filter-bar ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Filter Content Section - Only rendered when expanded */}
      {isExpanded && (
        <div className="filter-content visible">
          <div className="filter-section">
            <DropdownFieldAddList
              label={t('marketplace:filters.canton')}
              options={cantons}
              value={filters.canton}
              onChange={(value) => onFilterChange('canton', value)}
            />

            <DropdownFieldAddList
              label={t('marketplace:filters.city')}
              options={cities}
              value={filters.city}
              onChange={(value) => onFilterChange('city', value)}
            />

            <DropdownFieldAddList
              label={t('marketplace:filters.area')}
              options={areas}
              value={filters.area}
              onChange={(value) => onFilterChange('area', value)}
            />

            <DropdownFieldAddList
              label={t('marketplace:filters.experience')}
              options={experienceLevels}
              value={filters.experience}
              onChange={(value) => onFilterChange('experience', value)}
            />

            <DropdownFieldAddList
              label={t('marketplace:filters.software')}
              options={software}
              value={filters.software}
              onChange={(value) => onFilterChange('software', value)}
            />

            <DropdownFieldAddList
              label={t('marketplace:filters.workAmount')}
              options={workAmounts}
              value={filters.workAmount}
              onChange={(value) => onFilterChange('workAmount', value)}
            />

            <dateField
              label="From Date"
              value={filters.fromDate}
              onChange={(value) => onFilterChange('fromDate', value)}
            />
            
            <dateField
              label="To Date"
              value={filters.toDate}
              onChange={(value) => onFilterChange('toDate', value)}
            />
          </div>

          <div className="filter-actions">
            <Button 
              variant="secondary"
              onClick={handleClearAllFilters}
            >
              {t('marketplace:filter.clear')}
            </Button>
            <Button 
              variant="primary"
              onClick={handleApplyFilters}
            >
              {t('marketplace:filter.apply')}
            </Button>
          </div>
        </div>
      )}
      
      {/* Always visible footer with summary and toggle button */}
      <div className="filter-bar-footer">
        <div className="filter-actions-row">
          <div className={`filter-summary ${!hasActiveFilters() ? 'no-filters' : ''}`} onClick={toggleFilterBar}>
            {getFilterSummary()}
          </div>
          
          <div className="toggle-button-container">
            <Button 
              variant="secondary"
              onClick={isExpanded ? hideFilters : toggleFilterBar}
            >
              {isExpanded ? t('marketplace:filter.hide') : t('marketplace:filter.show')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
