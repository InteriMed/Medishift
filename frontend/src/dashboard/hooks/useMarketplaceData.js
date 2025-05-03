import { useState, useEffect, useCallback } from 'react';
import { getMarketplaceListings, getListingDetails } from '../../services/apiService';
import { useNotification } from '../../contexts/NotificationContext';

export const useMarketplaceData = () => {
  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { showNotification } = useNotification();

  // Fetch all listings
  const fetchListings = useCallback(async (filters = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getMarketplaceListings(filters);
      setListings(data);
      setFilteredListings(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch listings');
      showNotification({
        type: 'error',
        message: 'Failed to load marketplace listings'
      });
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  // Get a specific listing details
  const fetchListingDetails = useCallback(async (id, type) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getListingDetails(id, type);
      setSelectedListing(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to fetch listing details');
      showNotification({
        type: 'error',
        message: 'Failed to load listing details'
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  // Filter listings locally
  const applyFilters = useCallback((filters) => {
    if (!listings.length) return;
    
    // Implement your filtering logic here
    let result = [...listings];
    
    // Example of canton/city filtering
    if (filters.canton?.length) {
      result = result.filter(listing => {
        const location = listing.location || listing.preferred_location || {};
        return filters.canton.includes(location.canton || location.state);
      });
    }
    
    // Add more filters as needed
    
    setFilteredListings(result);
  }, [listings]);

  return {
    listings,
    filteredListings,
    selectedListing,
    isLoading,
    error,
    fetchListings,
    fetchListingDetails,
    applyFilters,
    setSelectedListing
  };
}; 