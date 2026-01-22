import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiX, FiFilter, FiCheck, FiInbox, FiGrid, FiList, FiAlertCircle } from 'react-icons/fi';
import { useMobileView } from '../../hooks/useMobileView';
import DropdownFieldAddListOriginal from '../../../components/BoxedInputFields/Dropdown-Field-AddList';
import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';
import ListingCard from '../../components/ListingCard/ListingCard';
import DetailedCard from './components/detailed_card/DetailedCard';
import { useMarketplaceData } from '../../hooks/useMarketplaceData';
import { useTutorial } from '../../contexts/TutorialContext';
import { cn } from '../../../utils/cn';

const Marketplace = () => {
  const { t } = useTranslation(['marketplace']);
  const isMobile = useMobileView();
  const { isTutorialActive, activeTutorial } = useTutorial();
  const {
    listings,
    filteredListings,
    selectedListing,
    isLoading,
    error,
    fetchListings,
    applyFilters: applyFiltersHook,
    setSelectedListing
  } = useMarketplaceData();

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
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [processedListings, setProcessedListings] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [showFiltersOverlay, setShowFiltersOverlay] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isTutorialActive && activeTutorial === 'marketplace') {
      fetchListings({}, 'jobs');
    } else if (!isTutorialActive || activeTutorial !== 'marketplace') {
      fetchListings({}, 'jobs');
    }
  }, [fetchListings, isTutorialActive, activeTutorial]);

  useEffect(() => {
    let result = [...filteredListings];

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      result = result.filter(listing => {
        const title = (listing.title || listing.jobTitle || '').toLowerCase();
        const description = (listing.description || listing.notes || '').toLowerCase();
        const city = (listing.location?.city || listing.locationPreference?.city || '').toLowerCase();
        const canton = (listing.location?.canton || listing.locationPreference?.canton || '').toLowerCase();

        return title.includes(searchLower) ||
          description.includes(searchLower) ||
          city.includes(searchLower) ||
          canton.includes(searchLower);
      });
    }

    setProcessedListings(result);
  }, [filteredListings, searchTerm]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearDateFilter = () => {
    setFilters(prev => ({
      ...prev,
      fromDate: '',
      toDate: ''
    }));
  };

  const applyFilters = () => {
    const transformedFilters = {
      ...filters,
      canton: filters.canton?.map(item => typeof item === 'object' ? item.value : item) || [],
      city: filters.city?.map(item => typeof item === 'object' ? item.value : item) || [],
      area: filters.area?.map(item => typeof item === 'object' ? item.value : item) || [],
      experience: filters.experience?.map(item => typeof item === 'object' ? item.value : item) || [],
      software: filters.software?.map(item => typeof item === 'object' ? item.value : item) || [],
      workAmount: filters.workAmount?.map(item => typeof item === 'object' ? item.value : item) || []
    };
    applyFiltersHook(transformedFilters);
  };

  const handleListingClick = (listing) => {
    setSelectedListing(listing);
    setIsModalVisible(true);
  };

  const handleCloseDetail = () => {
    setIsModalVisible(false);
    setTimeout(() => {
      setSelectedListing(null);
    }, 300);
  };

  // ... (existing helper functions)

  // Options for dropdowns (copied from FilterBar.js)
  const cantons = ["Zurich", "Geneva", "Basel", "Bern", "Vaud", "Lucerne", "St. Gallen"];
  const cities = ["Zurich", "Geneva", "Basel", "Bern", "Lausanne"];
  const areas = ["5km", "10km", "20km", "50km", "100km"];
  const experienceLevels = [
    { value: "beginner", label: t('marketplace:experienceLevels.beginner') },
    { value: "intermediate", label: t('marketplace:experienceLevels.intermediate') },
    { value: "experienced", label: t('marketplace:experienceLevels.experienced') }
  ];
  const software = ["Golden Gate", "ABACUS", "Pharmatic", "ProPharma", "Tactil"];
  const workAmounts = [
    { value: "0-20", label: "0-20%" },
    { value: "20-40", label: "20-40%" },
    { value: "40-60", label: "40-60%" },
    { value: "60-80", label: "60-80%" },
    { value: "80-100", label: "80-100%" }
  ];

  const handleClearAllFilters = () => {
    clearDateFilter();
    handleFilterChange('canton', []);
    handleFilterChange('city', []);
    handleFilterChange('area', []);
    handleFilterChange('experience', []);
    handleFilterChange('software', []);
    handleFilterChange('workAmount', []);
  };

  const activeCount = [
    filters.canton?.length,
    filters.city?.length,
    filters.area?.length,
    filters.experience?.length,
    filters.software?.length,
    filters.workAmount?.length,
    filters.fromDate ? 1 : 0,
    filters.toDate ? 1 : 0
  ].reduce((a, b) => a + (b || 0), 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-500 min-h-0 marketplace-page">
      {/* 1. Page Top Bar - 2 Column Layout */}
      <div className={cn(
        "shrink-0 w-full z-20 bg-white px-6 sm:px-8 border-b border-border/60 shadow-sm flex flex-col transition-all",
        isFiltersExpanded ? 'py-4 min-h-[80px]' : 'py-3 min-h-16'
      )}>
        <div className="grid grid-cols-2 items-start gap-3 w-full">
          {/* Left Column: Search + Dates */}
          <div className="flex flex-col gap-3">
            {/* Search Input */}
            <div className="relative w-full min-w-[200px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('marketplace:searchPlaceholder', 'Search positions...')}
                className="w-full pl-9 pr-8 rounded-xl border-2 border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-0 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.1)] transition-all hover:border-muted-foreground/30 hover:bg-muted/30"
                style={{
                  height: 'var(--boxed-inputfield-height)',
                  fontWeight: '500',
                  fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
                  color: 'var(--boxed-inputfield-color-text)'
                }}
              />
            </div>

            {/* Date Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Date From */}
              <div className="relative shrink-0 w-[130px]">
                <input
                  type="date"
                  value={filters.fromDate || ''}
                  onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                  className="w-full px-3 rounded-xl border-2 border-input bg-background text-sm font-medium focus:outline-none focus:border-primary focus:ring-0 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.1)] transition-all hover:border-muted-foreground/30 hover:bg-muted/30"
                  style={{ height: 'var(--boxed-inputfield-height)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}
                  placeholder={t('marketplace:placeholders.from')}
                />
              </div>

              {/* Date To */}
              <div className="relative shrink-0 w-[130px]">
                <input
                  type="date"
                  value={filters.toDate || ''}
                  onChange={(e) => handleFilterChange('toDate', e.target.value)}
                  className="w-full px-3 rounded-xl border-2 border-input bg-background text-sm font-medium focus:outline-none focus:border-primary focus:ring-0 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.1)] transition-all hover:border-muted-foreground/30 hover:bg-muted/30"
                  style={{ height: 'var(--boxed-inputfield-height)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}
                  placeholder={t('marketplace:placeholders.to')}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Actions + View Mode */}
          <div className="flex items-center gap-2 justify-end flex-wrap self-center">
            {/* Filter Toggle */}
            <button
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className={cn(
                "flex items-center justify-center rounded-xl border-2 transition-all relative shrink-0",
                isFiltersExpanded
                  ? "bg-[var(--color-logo-1)] border-[var(--color-logo-1)] text-white"
                  : "bg-background border-input text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              )}
              style={{ height: 'var(--boxed-inputfield-height)', width: 'var(--boxed-inputfield-height)' }}
              title="Filters"
            >
              <FiFilter className={`w-4 h-4 ${isFiltersExpanded ? 'text-white' : ''}`} />
              {activeCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                  {activeCount}
                </span>
              )}
            </button>

            {/* Clear Filters Button */}
            <button
              onClick={handleClearAllFilters}
              className="flex items-center justify-center rounded-xl border-2 border-input hover:bg-muted hover:border-muted-foreground/30 text-muted-foreground transition-all shrink-0"
              style={{ height: 'var(--boxed-inputfield-height)', width: 'var(--boxed-inputfield-height)' }}
              title="Clear filters"
            >
              <FiX className="w-4 h-4" />
            </button>

            {/* Apply Button */}
            <button
              onClick={applyFilters}
              className="px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2 shrink-0"
              style={{ height: 'var(--boxed-inputfield-height)' }}
            >
              <FiCheck className="w-4 h-4" />
              {t('marketplace:filter.apply', 'Apply')}
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 border-2 border-input rounded-xl p-0.5 bg-background shrink-0" style={{ height: 'var(--boxed-inputfield-height)' }}>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "h-full aspect-square flex items-center justify-center rounded-lg transition-all",
                  viewMode === 'grid'
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                title={t('marketplace:view.grid', 'Grid view')}
              >
                <FiGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "h-full aspect-square flex items-center justify-center rounded-lg transition-all",
                  viewMode === 'list'
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                title={t('marketplace:view.list', 'List view')}
              >
                <FiList className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Filters Area */}
        {isFiltersExpanded && (
          <div className="mt-3 pt-3 border-t border-border animate-in slide-in-from-top-1 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-2">
              <DropdownFieldAddListOriginal
                label={t('marketplace:filters.canton', 'Canton')}
                options={cantons}
                value={filters.canton}
                onChange={(value) => handleFilterChange('canton', value)}
              />
              <DropdownFieldAddListOriginal
                label={t('marketplace:filters.city', 'City')}
                options={cities}
                value={filters.city}
                onChange={(value) => handleFilterChange('city', value)}
              />
              <DropdownFieldAddListOriginal
                label={t('marketplace:filters.area', 'Area')}
                options={areas}
                value={filters.area}
                onChange={(value) => handleFilterChange('area', value)}
              />
              <DropdownFieldAddListOriginal
                label={t('marketplace:filters.experience', 'Experience')}
                options={experienceLevels}
                value={filters.experience}
                onChange={(value) => handleFilterChange('experience', value)}
              />
              <DropdownFieldAddListOriginal
                label={t('marketplace:filters.software', 'Software')}
                options={software}
                value={filters.software}
                onChange={(value) => handleFilterChange('software', value)}
              />
              <DropdownFieldAddListOriginal
                label={t('marketplace:filters.workAmount', 'Work Amount')}
                options={workAmounts}
                value={filters.workAmount}
                onChange={(value) => handleFilterChange('workAmount', value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-0 p-4">
        {error && (
          <div className="relative overflow-hidden p-5 bg-white border-2 border-[var(--red-2)] rounded-xl shadow-lg flex gap-4 text-[var(--red-4)] shrink-0 mb-4 animate-in fade-in slide-in-from-bottom-2" style={{ boxShadow: 'var(--shadow-elevated)' }}>
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-[var(--red-2)]/20 flex items-center justify-center border-2 border-[var(--red-2)]">
                <FiAlertCircle className="w-5 h-5 text-[var(--red-4)]" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm mb-1 text-[var(--red-4)]">Error</h4>
              <p className="text-sm leading-relaxed text-[var(--red-4)]/90">{error}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4 min-h-0">
            <LoadingSpinner />
            <p className="text-muted-foreground">{t('marketplace:loading', 'Loading positions...')}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0" style={{ scrollbarGutter: 'stable' }}>
            {listings.length === 0 ? (
              <div className="dashboard-empty-state">
                <div className="dashboard-empty-state-card">
                  <div className="dashboard-empty-state-icon">
                    <FiInbox className="w-8 h-8" />
                  </div>
                  <h2 className="dashboard-empty-state-title">{t('marketplace:noResults.title', 'No positions found')}</h2>
                  <p className="dashboard-empty-state-description">
                    {t('marketplace:noResults.empty', 'Start looking for positions in the marketplace')}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {processedListings.length > 0 ? (
                      processedListings.map((listing) => (
                        <ListingCard
                          key={listing.id}
                          listing={listing}
                          onClick={() => handleListingClick(listing)}
                          viewMode="grid"
                        />
                      ))
                    ) : !error && (
                      <div className="col-span-full flex flex-col items-center justify-center p-8 text-center">
                        <div className="text-4xl mb-4 opacity-60">🔍</div>
                        <h3 className="text-xl font-bold text-foreground mb-2">{t('marketplace:noResults.title', 'No positions found')}</h3>
                        <p className="text-muted-foreground">{t('marketplace:noResults.withFilters', 'Try adjusting your filters to see more results')}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 pb-4">
                    {processedListings.length > 0 ? (
                      processedListings.map((listing) => (
                        <ListingCard
                          key={listing.id}
                          listing={listing}
                          onClick={() => handleListingClick(listing)}
                          viewMode="list"
                        />
                      ))
                    ) : !error && (
                      <div className="flex flex-col items-center justify-center p-8 text-center">
                        <div className="text-4xl mb-4 opacity-60">🔍</div>
                        <h3 className="text-xl font-bold text-foreground mb-2">{t('marketplace:noResults.title', 'No positions found')}</h3>
                        <p className="text-muted-foreground">{t('marketplace:noResults.withFilters', 'Try adjusting your filters to see more results')}</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {selectedListing && isModalVisible && (
        <DetailedCard
          listing={selectedListing}
          onClose={handleCloseDetail}
        />
      )}

      {/* Filters Overlay - Mobile Only */}
      {isMobile && showFiltersOverlay && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowFiltersOverlay(false)}
          />
          <div className={cn(
            "fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl shadow-2xl",
            "animate-in slide-in-from-bottom duration-300"
          )} style={{ height: '75vh' }}>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold m-0">{t('marketplace:overlay.title')}</h3>
              <button
                onClick={() => setShowFiltersOverlay(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4" style={{ height: 'calc(75vh - 73px)', scrollbarGutter: 'stable' }}>
              <div>
                <label className="text-sm font-medium mb-2 block">{t('marketplace:overlay.fromDate')}</label>
                <input
                  type="date"
                  value={filters.fromDate || ''}
                  onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">{t('marketplace:overlay.toDate')}</label>
                <input
                  type="date"
                  value={filters.toDate || ''}
                  onChange={(e) => handleFilterChange('toDate', e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                />
              </div>
              <DropdownFieldAddListOriginal
                label={t('marketplace:filters.canton')}
                options={cantons}
                value={filters.canton}
                onChange={(value) => handleFilterChange('canton', value)}
              />
              <DropdownFieldAddListOriginal
                label={t('marketplace:filters.city')}
                options={cities}
                value={filters.city}
                onChange={(value) => handleFilterChange('city', value)}
              />
              <DropdownFieldAddListOriginal
                label={t('marketplace:filters.area')}
                options={areas}
                value={filters.area}
                onChange={(value) => handleFilterChange('area', value)}
              />
              <DropdownFieldAddListOriginal
                label={t('marketplace:filters.experience')}
                options={experienceLevels}
                value={filters.experience}
                onChange={(value) => handleFilterChange('experience', value)}
              />
              <DropdownFieldAddListOriginal
                label={t('marketplace:filters.software')}
                options={software}
                value={filters.software}
                onChange={(value) => handleFilterChange('software', value)}
              />
              <DropdownFieldAddListOriginal
                label={t('marketplace:filters.workAmount')}
                options={workAmounts}
                value={filters.workAmount}
                onChange={(value) => handleFilterChange('workAmount', value)}
              />
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    handleClearAllFilters();
                    setShowFiltersOverlay(false);
                  }}
                  className="flex-1 h-9 rounded-lg border border-input bg-background text-sm font-medium hover:bg-muted transition-all"
                >
                  {t('marketplace:overlay.clearAll')}
                </button>
                <button
                  onClick={() => {
                    applyFilters();
                    setShowFiltersOverlay(false);
                  }}
                  className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
                >
                  {t('marketplace:overlay.applyFilters')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Marketplace;