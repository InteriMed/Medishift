import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FiInbox, 
  FiAlertCircle,
  FiDollarSign,
  FiClock
} from 'react-icons/fi';
import { 
  Calendar,
  MapPin,
  Briefcase,
  Eye
} from 'lucide-react';
import FilterBar from '../../../components/layout/FilterBar/FilterBar';
import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';
import DetailedCard from './components/detailed_card/DetailedCard';
import { useMarketplaceData } from '../../hooks/useMarketplaceData';

const styles = {
  pageContainer: "flex flex-col gap-6 p-0 w-full max-w-[1400px] mx-auto",
  headerCard: "bg-card rounded-xl border border-border px-6 py-4 hover:shadow-md transition-shadow w-full max-w-[1400px] mx-auto",
  sectionTitle: "text-2xl font-semibold mb-0",
  sectionTitleStyle: { fontSize: '18px', color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionSubtitle: "text-sm font-medium mt-1",
  sectionSubtitleStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  contentWrapper: "w-full max-w-[1400px] mx-auto"
};

const Marketplace = () => {
  const { t } = useTranslation(['marketplace']);
  const {
    filteredListings,
    selectedListing,
    isLoading,
    error,
    fetchListings,
    applyFilters: applyFiltersHook,
    setSelectedListing
  } = useMarketplaceData();

  const [filters, setFilters] = useState({
    canton: '',
    city: '',
    area: '',
    experience: '',
    software: '',
    workAmount: '',
    contractType: 'all',
    fromDate: null,
    toDate: null
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [viewMode, setViewMode] = useState('list');

  useEffect(() => {
    fetchListings({}, 'jobs');
  }, [fetchListings]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApplyFilters = () => {
    const transformedFilters = {
      ...filters,
      canton: filters.canton === 'all' ? '' : filters.canton,
      city: filters.city === 'all' ? '' : filters.city,
      area: filters.area === 'all' ? '' : filters.area,
      experience: filters.experience === 'all' ? '' : filters.experience,
      software: filters.software === 'all' ? '' : filters.software,
      workAmount: filters.workAmount === 'all' ? '' : filters.workAmount,
      contractType: filters.contractType === 'all' ? '' : filters.contractType
    };
    applyFiltersHook(transformedFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      canton: 'all',
      city: 'all',
      area: 'all',
      experience: 'all',
      software: 'all',
      workAmount: 'all',
      contractType: 'all',
      fromDate: null,
      toDate: null
    });
    setSearchQuery('');
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

  const handleRefresh = () => {
    fetchListings({}, 'jobs');
  };

  const filteredAndSortedListings = useMemo(() => {
    let result = [...filteredListings];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(listing => {
        const title = (listing.title || listing.jobTitle || '').toLowerCase();
        const description = (listing.description || listing.notes || '').toLowerCase();
        const city = (listing.location?.city || listing.locationPreference?.city || '').toLowerCase();
        const canton = (listing.location?.canton || listing.locationPreference?.canton || '').toLowerCase();

        return title.includes(query) ||
          description.includes(query) ||
          city.includes(query) ||
          canton.includes(query);
      });
    }

    result = [...result].sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'title':
          aValue = (a.title || a.jobTitle || '').toLowerCase();
          bValue = (b.title || b.jobTitle || '').toLowerCase();
          break;
        case 'date':
          aValue = new Date(a.createdAt || a.created || a.startTime || 0).getTime();
          bValue = new Date(b.createdAt || b.created || b.startTime || 0).getTime();
          break;
        case 'location':
          aValue = (a.location?.city || a.locationPreference?.city || '').toLowerCase();
          bValue = (b.location?.city || b.locationPreference?.city || '').toLowerCase();
          break;
        default:
          return 0;
      }

      return aValue > bValue ? 1 : -1;
    });

    return result;
  }, [filteredListings, searchQuery, sortBy]);

  const dropdownFields = [
    {
      key: 'canton',
      label: t('marketplace:filters.canton', 'Canton'),
      options: [
        { value: 'all', label: t('marketplace:filters.all', 'All') },
        { value: 'zurich', label: 'Zurich' },
        { value: 'geneva', label: 'Geneva' },
        { value: 'basel', label: 'Basel' },
        { value: 'bern', label: 'Bern' },
        { value: 'vaud', label: 'Vaud' },
        { value: 'lucerne', label: 'Lucerne' },
        { value: 'stgallen', label: 'St. Gallen' }
      ],
      defaultValue: 'all'
    },
    {
      key: 'city',
      label: t('marketplace:filters.city', 'City'),
      options: [
        { value: 'all', label: t('marketplace:filters.all', 'All') },
        { value: 'zurich', label: 'Zurich' },
        { value: 'geneva', label: 'Geneva' },
        { value: 'basel', label: 'Basel' },
        { value: 'bern', label: 'Bern' },
        { value: 'lausanne', label: 'Lausanne' }
      ],
      defaultValue: 'all'
    },
    {
      key: 'experience',
      label: t('marketplace:filters.experience', 'Experience'),
      options: [
        { value: 'all', label: t('marketplace:filters.all', 'All') },
        { value: 'beginner', label: t('marketplace:experienceLevels.beginner', 'Beginner') },
        { value: 'intermediate', label: t('marketplace:experienceLevels.intermediate', 'Intermediate') },
        { value: 'experienced', label: t('marketplace:experienceLevels.experienced', 'Experienced') }
      ],
      defaultValue: 'all'
    },
    {
      key: 'software',
      label: t('marketplace:filters.software', 'Software'),
      options: [
        { value: 'all', label: t('marketplace:filters.all', 'All') },
        { value: 'goldengate', label: 'Golden Gate' },
        { value: 'abacus', label: 'ABACUS' },
        { value: 'pharmatic', label: 'Pharmatic' },
        { value: 'propharma', label: 'ProPharma' },
        { value: 'tactil', label: 'Tactil' }
      ],
      defaultValue: 'all'
    },
    {
      key: 'workAmount',
      label: t('marketplace:filters.workAmount', 'Work Amount'),
      options: [
        { value: 'all', label: t('marketplace:filters.all', 'All') },
        { value: '0-20', label: '0-20%' },
        { value: '20-40', label: '20-40%' },
        { value: '40-60', label: '40-60%' },
        { value: '60-80', label: '60-80%' },
        { value: '80-100', label: '80-100%' }
      ],
      defaultValue: 'all'
    },
    {
      key: 'contractType',
      label: t('marketplace:filters.contractType', 'Contract Type'),
      options: [
        { value: 'all', label: t('marketplace:filters.all', 'All') },
        { value: 'full-time', label: t('marketplace:contractTypes.fullTime', 'Full-Time') },
        { value: 'part-time', label: t('marketplace:contractTypes.partTime', 'Part-Time') },
        { value: 'temporary', label: t('marketplace:contractTypes.temporary', 'Temporary') },
        { value: 'contract', label: t('marketplace:contractTypes.contract', 'Contract') }
      ],
      defaultValue: 'all'
    }
  ];

  const dateFields = [
    {
      key: 'fromDate',
      label: t('marketplace:filters.fromDate', 'From')
    },
    {
      key: 'toDate',
      label: t('marketplace:filters.toDate', 'To')
    }
  ];

  const sortOptions = [
    { value: 'relevance', label: t('marketplace:sort.relevance', 'Relevance') },
    { value: 'date', label: t('marketplace:sort.date', 'Date') },
    { value: 'title', label: t('marketplace:sort.title', 'Title') },
    { value: 'location', label: t('marketplace:sort.location', 'Location') }
  ];

  if (isLoading) {
    return (
      <div className={styles.pageContainer} style={{ padding: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer} style={{ padding: 'var(--spacing-lg)' }}>
      <div className={styles.headerCard}>
        <h2 className={styles.sectionTitle} style={styles.sectionTitleStyle}>
          {t('marketplace:title', 'Marketplace')}
        </h2>
        <p className={styles.sectionSubtitle} style={styles.sectionSubtitleStyle}>
          {t('marketplace:subtitle', 'Browse and apply for available positions')}
        </p>
      </div>

      <div className={styles.contentWrapper}>
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onApplyFilters={handleApplyFilters}
          onClearFilters={handleClearFilters}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('marketplace:searchPlaceholder', 'Search positions...')}
          dropdownFields={dropdownFields}
          dateFields={dateFields}
          sortOptions={sortOptions}
          sortValue={sortBy}
          onSortChange={setSortBy}
          translationNamespace="marketplace"
          title={t('marketplace:filter.title', 'Filter Listings')}
          description={t('marketplace:filter.description', 'Search and filter marketplace positions')}
          onRefresh={handleRefresh}
          isLoading={isLoading}
          showViewToggle={true}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>

      <div className={styles.contentWrapper}>
        <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-lg)', border: '1px solid var(--grey-2)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {error && (
              <div style={{ backgroundColor: 'var(--red-1)', border: '1px solid var(--red-2)', borderRadius: 'var(--border-radius-sm)', padding: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <FiAlertCircle size={20} style={{ color: 'var(--red-4)' }} />
                <span style={{ color: 'var(--red-4)' }}>{error}</span>
              </div>
            )}
            
            {filteredAndSortedListings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--spacing-xxl)', color: 'var(--text-light-color)' }}>
                <FiInbox size={48} style={{ margin: '0 auto', marginBottom: 'var(--spacing-md)', opacity: 0.3 }} />
                <p>{t('marketplace:noResults.title', 'No listings found')}</p>
              </div>
            ) : (
              filteredAndSortedListings.map((listing) => (
                <ListingRow
                  key={listing.id}
                  listing={listing}
                  onViewDetails={() => handleListingClick(listing)}
                  t={t}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {selectedListing && isModalVisible && (
        <DetailedCard
          listing={selectedListing}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
};

const ListingRow = ({ listing, onViewDetails, t }) => {
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString();
  };

  const getLocation = () => {
    const city = listing.location?.city || listing.locationPreference?.city || '';
    const canton = listing.location?.canton || listing.locationPreference?.canton || '';
    if (city && canton) return `${city}, ${canton}`;
    return city || canton || t('marketplace:location.notSpecified', 'Location not specified');
  };

  const getWorkAmount = () => {
    const amount = listing.workAmount || listing.workPercentage || listing.fte;
    if (amount) return `${amount}%`;
    return 'N/A';
  };

  const getSalary = () => {
    const salary = listing.salary || listing.hourlyRate || listing.compensation;
    if (typeof salary === 'object' && salary !== null) {
      if (salary.amount) return `CHF ${salary.amount}`;
      if (salary.hourlyRate) return `CHF ${salary.hourlyRate}/hr`;
      if (salary.price) return `CHF ${salary.price}`;
      if (salary.title && salary.price) return `CHF ${salary.price}`;
      return t('marketplace:salary.competitive', 'Competitive');
    }
    if (salary && typeof salary !== 'object') return `CHF ${salary}`;
    return t('marketplace:salary.competitive', 'Competitive');
  };

  return (
    <div style={{ backgroundColor: 'var(--white)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--grey-2)', overflow: 'hidden' }}>
      <div style={{ padding: 'var(--spacing-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', flex: 1 }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary-color-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)', fontWeight: 'bold', fontSize: 'var(--font-size-large)' }}>
            <Briefcase size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <strong style={{ fontSize: 'var(--font-size-medium)' }}>
                {listing.title || listing.jobTitle || t('marketplace:listing.untitled', 'Untitled Position')}
              </strong>
              {listing.urgent && (
                <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: 'var(--red-1)', color: 'var(--red-4)', borderRadius: '10px', fontWeight: 'bold' }}>
                  {t('marketplace:listing.urgent', 'URGENT')}
                </span>
              )}
            </div>
            <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-light-color)', marginTop: 'var(--spacing-xs)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                  <MapPin size={14} />
                  {getLocation()}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                  <Calendar size={14} />
                  {formatDate(listing.startDate || listing.createdAt)}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                  <FiClock size={14} />
                  {getWorkAmount()}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                  <FiDollarSign size={14} />
                  {getSalary()}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
              {listing.type && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    backgroundColor: 'var(--blue-1)',
                    color: 'var(--blue-4)',
                    fontWeight: '500'
                  }}
                >
                  {listing.type}
                </span>
              )}
              {listing.contractType && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    backgroundColor: 'var(--green-1)',
                    color: 'var(--green-4)',
                    fontWeight: '500'
                  }}
                >
                  {listing.contractType}
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
          <button
            onClick={onViewDetails}
            style={{ padding: '8px 16px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--primary-color)', backgroundColor: 'var(--primary-color)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', fontWeight: '500' }}
            title={t('marketplace:listing.viewDetails', 'View Details')}
          >
            <Eye size={16} />
            {t('marketplace:listing.viewDetails', 'View Details')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
