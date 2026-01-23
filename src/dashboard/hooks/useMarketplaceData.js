import { useState, useCallback, useMemo, useEffect } from 'react';
import { db, functions } from '../../services/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  limit
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useNotification } from '../../contexts/NotificationContext';
import { useTutorial } from '../contexts/TutorialContext';
import { TUTORIAL_IDS } from '../../config/tutorialSystem';

export const useMarketplaceData = () => {
  const { isTutorialActive, activeTutorial } = useTutorial();
  const { showNotification } = useNotification();

  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getMockListings = useCallback(() => {
    if (!isTutorialActive || activeTutorial !== TUTORIAL_IDS.MARKETPLACE) return [];

    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const twoMonthsLater = new Date(now.getFullYear(), now.getMonth() + 2, 28);

    return [
      {
        id: 'tutorial-position-1',
        title: 'Emergency Department Physician',
        jobTitle: 'Emergency Department Physician',
        description: 'Looking for an experienced emergency department physician for temporary contract. Full-time position with rotating shifts.',
        facilityProfileId: 'tutorial-geneva-hospital',
        status: 'open',
        location: { canton: 'Geneva', city: 'Geneva' },
        locationPreference: { canton: 'Geneva', city: 'Geneva' },
        compensation: { amount: 12000, currency: 'CHF' },
        contractType: 'Temporary',
        workPercentage: 100,
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-03-31'),
        startTime: new Date('2026-02-01'),
        endTime: new Date('2026-03-31'),
        createdAt: new Date('2026-01-15'),
        canton: 'Geneva',
        city: 'Geneva',
        area: '20km',
        experience_level: 'experienced',
        software_skills: ['Electronic Health Records', 'Patient Management System'],
        work_amount: '80-100',
        available_from: '2026-02-01',
        available_to: '2026-03-31',
        isTutorial: true
      },
      {
        id: 'tutorial-position-2',
        title: 'General Practice Physician - Part-time',
        jobTitle: 'General Practice Physician - Part-time',
        description: 'Part-time position for general practice physician. Weekends only, flexible schedule available.',
        facilityProfileId: 'tutorial-lausanne-clinic',
        status: 'open',
        location: { canton: 'Vaud', city: 'Lausanne' },
        locationPreference: { canton: 'Vaud', city: 'Lausanne' },
        compensation: { amount: 6500, currency: 'CHF' },
        contractType: 'Part-time',
        workPercentage: 50,
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-06-30'),
        startTime: new Date('2026-04-01'),
        endTime: new Date('2026-06-30'),
        createdAt: new Date('2026-01-20'),
        canton: 'Vaud',
        city: 'Lausanne',
        area: '10km',
        experience_level: 'intermediate',
        software_skills: ['Practice Management Software'],
        work_amount: '40-60',
        available_from: '2026-04-01',
        available_to: '2026-06-30',
        isTutorial: true
      },
      {
        id: 'tutorial-position-3',
        title: 'Pharmacist - Full-time',
        jobTitle: 'Pharmacist - Full-time',
        description: 'Full-time pharmacist position in a busy pharmacy. Experience with Golden Gate software preferred.',
        facilityProfileId: 'tutorial-pharmacy-1',
        status: 'open',
        location: { canton: 'Zurich', city: 'Zurich' },
        locationPreference: { canton: 'Zurich', city: 'Zurich' },
        compensation: { amount: 8500, currency: 'CHF' },
        contractType: 'Permanent',
        workPercentage: 100,
        startDate: nextMonth,
        endDate: null,
        startTime: nextMonth,
        endTime: null,
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        canton: 'Zurich',
        city: 'Zurich',
        area: '5km',
        experience_level: 'experienced',
        software_skills: ['Golden Gate', 'ABACUS'],
        work_amount: '80-100',
        available_from: nextMonth.toISOString().split('T')[0],
        available_to: null,
        isTutorial: true
      },
      {
        id: 'tutorial-position-4',
        title: 'Clinical Pharmacist - Temporary',
        jobTitle: 'Clinical Pharmacist - Temporary',
        description: 'Temporary clinical pharmacist position for hospital setting. 3-month contract with possibility of extension.',
        facilityProfileId: 'tutorial-hospital-1',
        status: 'open',
        location: { canton: 'Bern', city: 'Bern' },
        locationPreference: { canton: 'Bern', city: 'Bern' },
        compensation: { amount: 9500, currency: 'CHF' },
        contractType: 'Temporary',
        workPercentage: 100,
        startDate: twoMonthsLater,
        endDate: new Date(twoMonthsLater.getFullYear(), twoMonthsLater.getMonth() + 3, 28),
        startTime: twoMonthsLater,
        endTime: new Date(twoMonthsLater.getFullYear(), twoMonthsLater.getMonth() + 3, 28),
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        canton: 'Bern',
        city: 'Bern',
        area: '50km',
        experience_level: 'experienced',
        software_skills: ['Pharmatic', 'Hospital Information System'],
        work_amount: '80-100',
        available_from: twoMonthsLater.toISOString().split('T')[0],
        available_to: new Date(twoMonthsLater.getFullYear(), twoMonthsLater.getMonth() + 3, 28).toISOString().split('T')[0],
        isTutorial: true
      }
    ];
  }, [isTutorialActive, activeTutorial]);



  useEffect(() => {
    if (isTutorialActive && activeTutorial === TUTORIAL_IDS.MARKETPLACE) {
      const mockData = getMockListings();
      if (mockData.length > 0) {
        setListings(mockData);
        setFilteredListings(mockData);
        setIsLoading(false);
        setError(null);
      }
    }
  }, [isTutorialActive, activeTutorial, getMockListings]);

  // Fetch all listings
  const fetchListings = useCallback(async (filters = {}, viewMode = 'jobs') => {
    try {
      setIsLoading(true);
      setError(null);

      if (isTutorialActive && activeTutorial === TUTORIAL_IDS.MARKETPLACE) {
        const mockData = getMockListings();
        setListings(mockData);
        setFilteredListings(mockData);
        setIsLoading(false);
        return;
      }

      // Use the correct collections based on Firebase Database Organization document
      const collectionName = viewMode === 'jobs' ? 'positions' : 'professionalAvailabilities';
      const listingsRef = collection(db, collectionName);

      // Simplified query to avoid index requirements during development
      let q;
      try {
        if (viewMode === 'jobs') {
          // Try simple query first
          q = query(listingsRef, limit(20));
        } else {
          // For professional availabilities
          q = query(listingsRef, limit(20));
        }

        const snapshot = await getDocs(q);
        const fetchedListings = [];

        snapshot.forEach(docSnapshot => {
          const data = docSnapshot.data();

          // Filter by status on client side to avoid index requirements
          const isValidStatus = viewMode === 'jobs'
            ? (data.status === 'open' || !data.status)
            : (data.status === 'available' || !data.status);

          if (isValidStatus) {
            fetchedListings.push({
              id: docSnapshot.id,
              ...data,
              // Convert Firestore timestamps to Date objects
              createdAt: data.createdAt?.toDate() || null,
              startTime: data.startTime?.toDate() || null,
              endTime: data.endTime?.toDate() || null,
              startDate: data.startTime?.toDate() || null, // Alias for compatibility
              endDate: data.endTime?.toDate() || null,     // Alias for compatibility
              // Extract location info for easier filtering
              canton: data.location?.canton || data.locationPreference?.canton,
              city: data.location?.city || data.locationPreference?.city,
              // Map position-specific fields for compatibility
              title: data.jobTitle || data.title,
              description: data.description || data.notes,
              // Map professional availability fields for compatibility
              available_from: data.startTime?.toDate()?.toISOString()?.split('T')[0],
              available_to: data.endTime?.toDate()?.toISOString()?.split('T')[0],
              // Add mock data for demonstration if fields don't exist
              area: data.area || ['5km', '10km', '20km', '50km'][Math.floor(Math.random() * 4)],
              experience_level: data.experienceRequired || data.experience_level ||
                ['beginner', 'intermediate', 'experienced'][Math.floor(Math.random() * 3)],
              software_skills: data.skillsRequired || data.software_skills ||
                ['Golden Gate', 'ABACUS', 'Pharmatic'],
              work_amount: data.workPercentage || data.work_amount ||
                ['0-20', '20-40', '40-60', '60-80', '80-100'][Math.floor(Math.random() * 5)]
            });
          }
        });

        setListings(fetchedListings);
        setFilteredListings(fetchedListings);

        // If no data found, return empty array
        if (fetchedListings.length === 0) {
          setListings([]);
          setFilteredListings([]);
        }

      } catch (queryError) {
        setListings([]);
        setFilteredListings([]);

        if (showNotification) {
          showNotification({
            type: 'info',
            message: 'No marketplace data available'
          });
        }
      }

    } catch (err) {
      setError(err.message || 'Failed to fetch listings');
      setListings([]);
      setFilteredListings([]);

      if (showNotification) {
        showNotification({
          type: 'warning',
          message: 'Failed to load marketplace data'
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [showNotification, isTutorialActive, activeTutorial, getMockListings]);

  // Get a specific listing details
  const fetchListingDetails = useCallback(async (id, type = 'job') => {
    try {
      setIsLoading(true);
      setError(null);

      // Determine the collection based on type according to Firebase Database Organization
      const collectionName = type === 'job' ? 'positions' : 'professionalAvailabilities';
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error(`${type} listing not found`);
      }

      const data = {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate() || null,
        startDate: docSnap.data().startTime?.toDate() || docSnap.data().startDate?.toDate() || null,
        endDate: docSnap.data().endTime?.toDate() || docSnap.data().endDate?.toDate() || null
      };

      setSelectedListing(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to fetch listing details');
      if (showNotification) {
        showNotification({
          type: 'error',
          message: 'Failed to load listing details'
        });
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  // Filter listings locally
  const applyFilters = useCallback((filters) => {
    if (!listings.length) return;

    let result = [...listings];

    // Canton/city filtering
    if (filters.canton?.length) {
      result = result.filter(listing => {
        const location = listing.location || listing.locationPreference || {};
        return filters.canton.includes(location.canton);
      });
    }

    // Salary range filtering
    if (filters.salaryMin !== undefined) {
      result = result.filter(listing => {
        const salaryMin = listing.compensation?.amount || listing.salaryRange?.min || listing.salary_min || 0;
        return salaryMin >= filters.salaryMin;
      });
    }

    if (filters.salaryMax !== undefined) {
      result = result.filter(listing => {
        const salaryMax = listing.compensation?.amount || listing.salaryRange?.max || listing.salary_max || Infinity;
        return salaryMax <= filters.salaryMax;
      });
    }

    // Contract type filtering  
    if (filters.contractType?.length) {
      result = result.filter(listing => {
        return filters.contractType.includes(listing.contractType || listing.contract_type);
      });
    }

    // Date range filtering
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      result = result.filter(listing => {
        const listingStartDate = listing.startTime || listing.startDate || listing.start_date;
        return !listingStartDate || new Date(listingStartDate) >= startDate;
      });
    }

    setFilteredListings(result);
  }, [listings]);

  // Create a new position (facility posting a job) - uses Backend API for validation
  const createPosition = useCallback(async (positionData) => {
    try {
      setIsLoading(true);
      setError(null);

      const marketplaceAPICall = httpsCallable(functions, 'marketplaceAPI');
      const response = await marketplaceAPICall({
        action: 'createPosition',
        positionData
      });

      if (response.data.success) {
        if (showNotification) {
          showNotification({
            type: 'success',
            message: 'Position created successfully'
          });
        }
        // Refresh listings to show new position
        await fetchListings({}, 'jobs');
        return response.data.positionId;
      }
      throw new Error('Failed to create position');
    } catch (err) {
      setError(err.message || 'Failed to create position');
      if (showNotification) {
        showNotification({
          type: 'error',
          message: err.message || 'Failed to create position'
        });
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [showNotification, fetchListings]);

  // Apply to a position - uses Backend API for validation
  const applyToPosition = useCallback(async (positionId, professionalProfileId = null) => {
    try {
      setIsLoading(true);
      setError(null);

      const marketplaceAPICall = httpsCallable(functions, 'marketplaceAPI');
      const response = await marketplaceAPICall({
        action: 'applyToPosition',
        positionId,
        professionalProfileId
      });

      if (response.data.success) {
        if (showNotification) {
          showNotification({
            type: 'success',
            message: 'Application submitted successfully'
          });
        }
        return response.data.applicationId;
      }
      throw new Error('Failed to apply to position');
    } catch (err) {
      setError(err.message || 'Failed to apply to position');
      if (showNotification) {
        showNotification({
          type: 'error',
          message: err.message || 'Failed to submit application'
        });
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  // Create availability (professional posting availability) - uses Backend API for validation
  const createAvailability = useCallback(async (availabilityData) => {
    try {
      setIsLoading(true);
      setError(null);

      const marketplaceAPICall = httpsCallable(functions, 'marketplaceAPI');
      const response = await marketplaceAPICall({
        action: 'createAvailability',
        availabilityData
      });

      if (response.data.success) {
        if (showNotification) {
          showNotification({
            type: 'success',
            message: 'Availability created successfully'
          });
        }
        // Refresh listings to show new availability
        await fetchListings({}, 'professionals');
        return response.data.availabilityId;
      }
      throw new Error('Failed to create availability');
    } catch (err) {
      setError(err.message || 'Failed to create availability');
      if (showNotification) {
        showNotification({
          type: 'error',
          message: err.message || 'Failed to create availability'
        });
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [showNotification, fetchListings]);

  return {
    listings,
    filteredListings,
    selectedListing,
    isLoading,
    error,
    fetchListings,
    fetchListingDetails,
    applyFilters,
    setSelectedListing,
    createPosition,
    applyToPosition,
    createAvailability
  };
}; 