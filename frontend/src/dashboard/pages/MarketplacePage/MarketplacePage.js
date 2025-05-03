import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../../context/DashboardContext';
import { useMarketplaceData } from '../../hooks/useMarketplaceData';
import FilterBar from '../../components/FilterBar/FilterBar';
import ListingCard from '../../components/ListingCard/ListingCard';
import DetailedCard from '../../components/DetailedCard/DetailedCard';
import Loading from '../../../components/Loading';
import styles from './marketplacePage.module.css';

const MarketplacePage = () => {
  const { t } = useTranslation();
  const { user } = useDashboard();
  const {
    filteredListings,
    isLoading,
    error,
    fetchListings,
    applyFilters,
    selectedListing,
    setSelectedListing
  } = useMarketplaceData();
  
  // State management
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
  const [viewMode] = useState('jobs');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});

  // Apply filters to listings
  const handleApplyFilters = () => {
    setActiveFilters({...filters});
    applyFilters(filters);
  };

  // Handle listing selection
  const handleListingClick = (listing) => {
    setSelectedListing(listing);
    setIsModalVisible(true);
  };

  // Close detailed view
  const handleCloseDetail = () => {
    setIsModalVisible(false);
    setTimeout(() => {
      setSelectedListing(null);
    }, 300);
  };

  return (
    <div className={styles.marketplacePage}>
      <header className={styles.pageHeader}>
        <h1>{t('dashboard.marketplace.title')}</h1>
        <p className={styles.description}>{t('dashboard.marketplace.description')}</p>
      </header>
      
      <FilterBar 
        filters={filters}
        onFilterChange={setFilters}
        onApplyFilters={handleApplyFilters}
      />
      
      <div className={styles.listingsContainer}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <Loading text={t('dashboard.marketplace.listings.loading')} />
          </div>
        ) : (
          <div className={styles.listingsGrid}>
            {filteredListings.length > 0 ? (
              filteredListings.map((listing) => (
                <ListingCard 
                  key={listing.id} 
                  listing={listing} 
                  onClick={() => handleListingClick(listing)}
                />
              ))
            ) : !error && (
              <div className={styles.noListingsMessage}>
                {filteredListings.length > 0 
                  ? t('dashboard.marketplace.listings.noResults')
                  : t('dashboard.marketplace.listings.empty')
                }
              </div>
            )}
          </div>
        )}
        
        {error && (
          <div className={styles.errorMessage}>
            {t('dashboard.marketplace.error')}: {error}
          </div>
        )}
      </div>

      {selectedListing && (
        <div className={`${styles.listingDetailOverlay} ${isModalVisible ? styles.visible : ''}`}>
          <div className={`${styles.listingDetailModal} ${isModalVisible ? styles.visible : ''}`}>
            <DetailedCard 
              listing={selectedListing} 
              onClose={handleCloseDetail}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplacePage; 