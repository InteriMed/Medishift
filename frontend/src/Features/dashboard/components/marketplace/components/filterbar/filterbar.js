import React, { useState } from 'react';
import DropdownFieldAddList from '../../../../../../components/Boxed-InputFields/Dropdown-Field-AddList/Dropdown-Field-AddList';
import DropdownDate from '../../../../../../components/Boxed-InputFields/Dropdown-Date/Dropdown-Date';
import Button from '../../../../../../components/Button/Button';
import './filterbar.css';

const FilterBar = ({ filters, onFilterChange, clearDateFilter, onApplyFilters }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const cantons = ["Zurich", "Geneva", "Basel", "Bern", /* ... */];
  const cities = ["Zurich", "Geneva", "Basel", "Bern", /* ... */];
  const areas = ["5km", "10km", "20km", "50km", "100km"];
  const experienceLevels = [
    { value: "beginner", label: "Beginner (0-3y)" },
    { value: "intermediate", label: "Intermediate (3-10y)" },
    { value: "experienced", label: "Experienced (10+y)" }
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
      activeFilters.push(`Canton: ${filters.canton.length} selected`);
    }
    
    if (filters.city && filters.city.length > 0) {
      activeFilters.push(`City: ${filters.city.length} selected`);
    }
    
    if (filters.area && filters.area.length > 0) {
      activeFilters.push(`Area: ${filters.area.length} selected`);
    }
    
    if (filters.experience && filters.experience.length > 0) {
      activeFilters.push(`Experience: ${filters.experience.length} selected`);
    }
    
    if (filters.software && filters.software.length > 0) {
      activeFilters.push(`Software: ${filters.software.length} selected`);
    }
    
    if (filters.workAmount && filters.workAmount.length > 0) {
      activeFilters.push(`Work %: ${filters.workAmount.length} selected`);
    }
    
    if (filters.fromDate) {
      activeFilters.push(`From: ${filters.fromDate}`);
    }
    
    if (filters.toDate) {
      activeFilters.push(`To: ${filters.toDate}`);
    }
    
    return activeFilters.length > 0 
      ? activeFilters.join(' | ') 
      : 'No filters applied';
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
              label="Canton"
              placeholder="Select canton"
              options={cantons}
              value={filters.canton}
              onChange={(value) => onFilterChange('canton', value)}
            />

            <DropdownFieldAddList
              label="City"
              placeholder="Select city"
              options={cities}
              value={filters.city}
              onChange={(value) => onFilterChange('city', value)}
            />

            <DropdownFieldAddList
              label="Area"
              placeholder="Select area radius"
              options={areas}
              value={filters.area}
              onChange={(value) => onFilterChange('area', value)}
            />

            <DropdownFieldAddList
              label="Experience"
              placeholder="Select experience level"
              options={experienceLevels}
              value={filters.experience}
              onChange={(value) => onFilterChange('experience', value)}
            />

            <DropdownFieldAddList
              label="Software"
              placeholder="Select software"
              options={software}
              value={filters.software}
              onChange={(value) => onFilterChange('software', value)}
            />

            <DropdownFieldAddList
              label="Work Amount"
              placeholder="Select work amount"
              options={workAmounts}
              value={filters.workAmount}
              onChange={(value) => onFilterChange('workAmount', value)}
            />

            <DropdownDate
              label="From Date"
              placeholder="Select start date"
              value={filters.fromDate}
              onChange={(value) => onFilterChange('fromDate', value)}
            />
            
            <DropdownDate
              label="To Date"
              placeholder="Select end date"
              value={filters.toDate}
              onChange={(value) => onFilterChange('toDate', value)}
            />
          </div>

          <div className="filter-actions">
            <Button 
              text="Clear Filters" 
              color="#f5f5f5" 
              textColor="#666" 
              borderColor="#eee" 
              onClick={handleClearAllFilters}
            />
            <Button 
              text="Apply Filters" 
              color="#383838" 
              textColor="white" 
              focusColor="#2196f3" 
              onClick={handleApplyFilters}
            />
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
              text={isExpanded ? "Hide Filters" : "Show Filters"} 
              color="transparent" 
              textColor="#2196f3" 
              onClick={isExpanded ? hideFilters : toggleFilterBar}
              width="auto"
              height="auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
