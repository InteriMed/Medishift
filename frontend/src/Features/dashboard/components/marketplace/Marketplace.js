import React, { useState, useEffect } from 'react';
import FilterBar from './components/filterbar/filterbar';
import ListingCard from './components/card/card';
import WorkerDetailCard from './components/detailed_card/worker';
import ManagerDetailCard from './components/detailed_card/manager';
import './Marketplace.css';
import logo from '../../../../assets/global/logo.png';
import API_CONFIG from '../../../../config/api.config';

const Marketplace = () => {
  const [filters, setFilters] = useState({
    canton: [],
    city: [],
    area: [],
    experience: [],
    software: [],
    workAmount: [],
    fromDate: '',
    toDate: ''
  });
  const [selectedListing, setSelectedListing] = useState(null);
  const [viewMode] = useState('jobs');
  const [allListings, setAllListings] = useState([]); // Store all unfiltered listings
  const [filteredListings, setFilteredListings] = useState([]); // Store filtered listings
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});

  const applyFilters = () => {
    setActiveFilters({...filters});
    if (allListings.length > 0) {
      filterListings(allListings, filters);
    } else {
      fetchListings();
    }
  };

  // Apply filters to the listings
  const filterListings = (listings, filterCriteria) => {
    let filtered = [...listings];
    
    // Filter by canton
    if (filterCriteria.canton && filterCriteria.canton.length > 0) {
      const cantonValues = filterCriteria.canton.map(c => 
        typeof c === 'string' ? c.toLowerCase() : c.label.toLowerCase()
      );
      filtered = filtered.filter(item => 
        item.canton && cantonValues.includes(item.canton.toLowerCase())
      );
    }
    
    // Filter by city
    if (filterCriteria.city && filterCriteria.city.length > 0) {
      const cityValues = filterCriteria.city.map(c => 
        typeof c === 'string' ? c.toLowerCase() : c.label.toLowerCase()
      );
      filtered = filtered.filter(item => 
        item.city && cityValues.includes(item.city.toLowerCase())
      );
    }
    
    // Filter by area
    if (filterCriteria.area && filterCriteria.area.length > 0) {
      const areaValues = filterCriteria.area.map(a => 
        typeof a === 'string' ? a : a.label
      );
      filtered = filtered.filter(item => 
        item.area && areaValues.includes(item.area)
      );
    }
    
    // Filter by experience
    if (filterCriteria.experience && filterCriteria.experience.length > 0) {
      const expValues = filterCriteria.experience.map(e => 
        typeof e === 'string' ? e : e.value
      );
      filtered = filtered.filter(item => 
        item.experience_level && expValues.includes(item.experience_level)
      );
    }
    
    // Filter by software
    if (filterCriteria.software && filterCriteria.software.length > 0) {
      const softwareValues = filterCriteria.software.map(s => 
        typeof s === 'string' ? s.toLowerCase() : s.label.toLowerCase()
      );
      filtered = filtered.filter(item => 
        item.software_skills && item.software_skills.some(skill => 
          softwareValues.includes(skill.toLowerCase())
        )
      );
    }
    
    // Filter by work amount
    if (filterCriteria.workAmount && filterCriteria.workAmount.length > 0) {
      const workAmountValues = filterCriteria.workAmount.map(w => 
        typeof w === 'string' ? w : w.value
      );
      filtered = filtered.filter(item => 
        item.work_amount && workAmountValues.includes(item.work_amount)
      );
    }
    
    // Filter by fromDate
    if (filterCriteria.fromDate) {
      const fromDate = new Date(filterCriteria.fromDate);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.available_from || item.date);
        return itemDate >= fromDate;
      });
    }
    
    // Filter by toDate
    if (filterCriteria.toDate) {
      const toDate = new Date(filterCriteria.toDate);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.available_to || item.date);
        return itemDate <= toDate;
      });
    }
    
    setFilteredListings(filtered);
  };

  const fetchListings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LISTINGS}/${viewMode}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Add some mock filter properties to the data for demonstration
      const enhancedData = data.map((listing, index) => ({
        ...listing,
        canton: ['Zurich', 'Geneva', 'Basel', 'Bern'][index % 4],
        city: ['Zurich', 'Geneva', 'Basel', 'Bern'][index % 4],
        area: ['5km', '10km', '20km', '50km'][index % 4],
        experience_level: ['beginner', 'intermediate', 'experienced'][index % 3],
        software_skills: ['Golden Gate', 'ABACUS', 'Pharmatic'][index % 3],
        work_amount: ['0-20', '20-40', '40-60', '60-80', '80-100'][index % 5],
        available_from: new Date(2024, index % 12, (index % 28) + 1).toISOString().split('T')[0],
        available_to: new Date(2024, (index % 12) + 2, (index % 28) + 1).toISOString().split('T')[0]
      }));
      
      setAllListings(enhancedData);
      
      // Apply active filters if any exist
      if (Object.keys(activeFilters).some(key => 
        Array.isArray(activeFilters[key]) ? activeFilters[key].length > 0 : activeFilters[key]
      )) {
        filterListings(enhancedData, activeFilters);
      } else {
        setFilteredListings(enhancedData);
      }
      
      setError(null);
    } catch (error) {
      console.error('Error fetching listings:', error);
      setError(error.message || 'Failed to load listings. Please try again later.');
      setAllListings([]);
      setFilteredListings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [viewMode]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const modal = document.querySelector('.listing-detail-modal');
      if (modal && !modal.contains(event.target)) {
        handleCloseDetail();
      }
    };

    if (isModalVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModalVisible]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearDateFilter = () => {
    setFilters(prev => ({
      ...prev,
      fromDate: '',
      toDate: ''
    }));
  };

  const handleListingClick = (listing) => {
    setSelectedListing(listing);
    setTimeout(() => {
      setIsModalVisible(true);
    }, 50);
  };

  const handleCloseDetail = () => {
    setIsModalVisible(false);
    setTimeout(() => {
      setSelectedListing(null);
    }, 300);
  };

  return (
    <div className="marketplace-container">
      <div className="marketplace-header">
        <div className="header-left"></div>
        <img 
          src={logo}
          alt="Marketplace Logo" 
          className="marketplace-logo"
        />
      </div>
      <FilterBar 
        filters={filters} 
        onFilterChange={handleFilterChange} 
        viewMode={viewMode}
        clearDateFilter={clearDateFilter}
        onApplyFilters={applyFilters}
      />
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading listings...</p>
        </div>
      ) : (
        <div className="listings-grid">
          {filteredListings.length > 0 ? (
            filteredListings.map((listing) => (
              <ListingCard 
                key={listing.id} 
                listing={listing} 
                onClick={() => handleListingClick(listing)}
              />
            ))
          ) : !error && (
            <div className="no-listings-message">
              {allListings.length > 0 
                ? 'No listings match your filter criteria.'
                : 'No job listings available at the moment.'}
            </div>
          )}
        </div>
      )}

      {selectedListing && (
        <div className={`listing-detail-overlay ${isModalVisible ? 'visible' : ''}`}>
          <div className={`listing-detail-modal ${isModalVisible ? 'visible' : ''}`}>
            <button 
              className="close-button" 
              onClick={handleCloseDetail}
            >
              ×
            </button>
            {selectedListing.employer_id ? (
              <ManagerDetailCard 
                listing={selectedListing} 
                onClose={handleCloseDetail}
              />
            ) : (
              <WorkerDetailCard 
                listing={selectedListing} 
                onClose={handleCloseDetail}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;