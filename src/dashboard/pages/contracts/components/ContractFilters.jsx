import React from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import Button from '../../../../components/BoxedInputFields/Button';
import SimpleDropdown from '../../../../components/BoxedInputFields/Dropdown-Field';
import './ContractFilters.css';

const ContractFilters = ({ filters, onFilterChange }) => {
  const handleStatusChange = (value) => {
    onFilterChange({ status: value });
  };

  const handleDateRangeChange = (value) => {
    onFilterChange({ dateRange: value });
  };

  const handleSearchChange = (e) => {
    onFilterChange({ searchTerm: e.target.value });
  };

  const handleClearFilters = () => {
    onFilterChange({
      status: 'all',
      dateRange: null,
      searchTerm: '',
    });
  };

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
    { value: 'signed', label: 'Signed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' }
  ];

  const dateRangeOptions = [
    { value: '', label: 'All Time' },
    { value: 'last-week', label: 'Last Week' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'last-3-months', label: 'Last 3 Months' },
    { value: 'last-year', label: 'Last Year' }
  ];

  return (
    <div className="contract-filters">
      <div className="filter-group search-group">
        <label htmlFor="search">Search</label>
        <div className="search-input-container">
          <FiSearch className="search-icon" />
          <input 
            type="text" 
            id="search" 
            placeholder="Search contracts, companies, locations..." 
            value={filters.searchTerm || ''} 
            onChange={handleSearchChange}
            className="search-input"
          />
          {filters.searchTerm && (
            <Button 
              className="clear-search-button"
              onClick={() => onFilterChange({ searchTerm: '' })}
              variant="secondary"
            >
              <FiX />
            </Button>
          )}
        </div>
      </div>
      
      <div className="filter-group">
        <SimpleDropdown 
          label=""
          options={statusOptions}
          value={filters.status || 'all'}
          onChange={handleStatusChange}
          placeholder="Select status..."
        />
      </div>
      
      <div className="filter-group">
        <SimpleDropdown 
          label=""
          options={dateRangeOptions}
          value={filters.dateRange || ''}
          onChange={handleDateRangeChange}
          placeholder="Select date range..."
        />
      </div>
      
      <Button 
        className="clear-filters-button" 
        onClick={handleClearFilters}
        variant="secondary"
      >
        Clear Filters
      </Button>
    </div>
  );
};

export default ContractFilters; 