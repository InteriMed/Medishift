import { useState, useCallback, useEffect } from 'react';
import { useAction } from '../../../services/actions/hook';

export const useMarketplaceData = () => {
  const { execute } = useAction();
  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentFilters, setCurrentFilters] = useState({});

  const fetchListings = useCallback(async (filters = {}, type = 'jobs') => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await execute('marketplace.browse_missions', {
        filters: {
          role: filters.area || undefined,
          cantons: filters.canton ? [filters.canton] : undefined,
          dateRange: (filters.fromDate && filters.toDate) ? {
            start: filters.fromDate,
            end: filters.toDate
          } : undefined,
        },
        sortBy: filters.sortBy || 'date'
      });

      const missionsData = result.missions || [];
      setListings(missionsData);
      setFilteredListings(missionsData);
    } catch (err) {
      console.error('Error fetching marketplace listings:', err);
      setError(err.message || 'Failed to load marketplace listings');
      setListings([]);
      setFilteredListings([]);
    } finally {
      setIsLoading(false);
    }
  }, [execute]);

  const applyFilters = useCallback((filters) => {
    setCurrentFilters(filters);
    
    let result = [...listings];

    if (filters.canton && filters.canton !== 'all') {
      result = result.filter(listing => 
        (listing.location?.canton || '').toLowerCase() === filters.canton.toLowerCase()
      );
    }

    if (filters.city && filters.city !== 'all') {
      result = result.filter(listing => 
        (listing.location?.city || '').toLowerCase() === filters.city.toLowerCase()
      );
    }

    if (filters.area && filters.area !== 'all') {
      result = result.filter(listing => 
        (listing.role || listing.area || '').toLowerCase().includes(filters.area.toLowerCase())
      );
    }

    if (filters.experience && filters.experience !== 'all') {
      result = result.filter(listing => 
        (listing.requirements?.minExperience || 0) <= getExperienceYears(filters.experience)
      );
    }

    if (filters.workAmount && filters.workAmount !== 'all') {
      const [min, max] = filters.workAmount.split('-').map(Number);
      result = result.filter(listing => {
        const workAmount = listing.workAmount || listing.workPercentage || listing.fte || 0;
        return workAmount >= min && workAmount <= max;
      });
    }

    if (filters.contractType && filters.contractType !== 'all') {
      result = result.filter(listing => 
        (listing.contractType || '').toLowerCase() === filters.contractType.toLowerCase()
      );
    }

    if (filters.fromDate) {
      const fromDate = new Date(filters.fromDate);
      result = result.filter(listing => {
        const listingDate = new Date(listing.startDate || listing.createdAt);
        return listingDate >= fromDate;
      });
    }

    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      result = result.filter(listing => {
        const listingDate = new Date(listing.startDate || listing.createdAt);
        return listingDate <= toDate;
      });
    }

    setFilteredListings(result);
  }, [listings]);

  const getExperienceYears = (level) => {
    switch (level) {
      case 'beginner': return 0;
      case 'intermediate': return 2;
      case 'experienced': return 5;
      default: return 0;
    }
  };

  return {
    listings,
    filteredListings,
    selectedListing,
    isLoading,
    error,
    fetchListings,
    applyFilters,
    setSelectedListing,
    currentFilters
  };
};

