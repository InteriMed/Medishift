import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../contexts/DashboardContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useNotification } from '../../contexts/NotificationContext';

const useHiringData = () => {
  const { t } = useTranslation();
  const { user, selectedWorkspace } = useDashboard();
  const { showError } = useNotification();

  const [positions, setPositions] = useState([]);
  const [applications, setApplications] = useState([]);
  const [filteredPositions, setFilteredPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    facility: 'all',
    searchTerm: '',
  });

  const memberFacilities = useMemo(() => {
    if (!selectedWorkspace || selectedWorkspace.type !== 'team') return [];
    const facilityId = selectedWorkspace.facilityId;
    if (!facilityId) return [];
    return [{ 
      id: facilityId, 
      facilityName: selectedWorkspace.facilityName || selectedWorkspace.companyName,
      companyName: selectedWorkspace.companyName,
      ...selectedWorkspace 
    }];
  }, [selectedWorkspace]);

  useEffect(() => {
    if (!user || !selectedWorkspace || selectedWorkspace.type !== 'team') {
      setPositions([]);
      setApplications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const loadPositions = async () => {
      try {
        const allPositions = [];
        const allApplications = [];

        for (const facility of memberFacilities) {
          const facilityId = facility.id;
          try {
            const positionsQuery = query(
              collection(db, 'positions'),
              where('facilityProfileId', '==', facilityId),
              orderBy('created', 'desc')
            );
            const positionsSnapshot = await getDocs(positionsQuery);

            for (const positionDoc of positionsSnapshot.docs) {
              const positionData = positionDoc.data();
              allPositions.push({
                id: positionDoc.id,
                ...positionData,
                facilityName: facility.facilityName || facility.companyName || 'Unknown',
                createdAt: positionData.created?.toDate?.() || positionData.created || new Date()
              });

              try {
                const applicationsQuery = query(
                  collection(db, 'positions', positionDoc.id, 'applications'),
                  orderBy('createdAt', 'desc')
                );
                const applicationsSnapshot = await getDocs(applicationsQuery);
                
                applicationsSnapshot.forEach((appDoc) => {
                  allApplications.push({
                    id: appDoc.id,
                    positionId: positionDoc.id,
                    ...appDoc.data()
                  });
                });
              } catch (appError) {
                console.error(`Error loading applications for position ${positionDoc.id}:`, appError);
              }
            }
          } catch (error) {
            console.error(`Error loading positions for facility ${facilityId}:`, error);
          }
        }

        setPositions(allPositions);
        setApplications(allApplications);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading hiring processes:', err);
        setError(err);
        showError(t('dashboard.hiring.errorLoadingHiring', 'Failed to load hiring processes'));
        setIsLoading(false);
      }
    };

    loadPositions();
  }, [user, selectedWorkspace, memberFacilities, t, showError]);

  useEffect(() => {
    if (!positions.length) {
      setFilteredPositions([]);
      return;
    }

    let result = [...positions];

    if (filters.status !== 'all') {
      result = result.filter(pos => pos.status === filters.status);
    }

    if (filters.facility !== 'all') {
      result = result.filter(pos => pos.facilityProfileId === filters.facility);
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      result = result.filter(pos => {
        const title = (pos.title || '').toLowerCase();
        const facilityName = (pos.facilityName || '').toLowerCase();
        return title.includes(searchLower) || facilityName.includes(searchLower);
      });
    }

    setFilteredPositions(result);
  }, [filters, positions]);

  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      status: 'all',
      facility: 'all',
      searchTerm: '',
    });
  }, []);

  const refreshHiring = useCallback(() => {
    if (user && selectedWorkspace) {
      setIsLoading(true);
    }
  }, [user, selectedWorkspace]);

  return {
    positions,
    applications,
    filteredPositions,
    isLoading,
    error,
    filters,
    refreshHiring,
    updateFilters,
    clearFilters,
    memberFacilities
  };
};

export default useHiringData;

