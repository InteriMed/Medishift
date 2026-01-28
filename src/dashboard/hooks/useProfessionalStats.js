import { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/authContext';

export const useProfessionalStats = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    totalShifts: 0,
    upcomingShifts: 0,
    completedShifts: 0,
    totalEarnings: 0,
    averageRating: 0,
    totalHours: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    if (!currentUser?.uid) return;

    try {
      setIsLoading(true);
      setStats({
        totalShifts: 0,
        upcomingShifts: 0,
        completedShifts: 0,
        totalEarnings: 0,
        averageRating: 0,
        totalHours: 0
      });
    } catch (err) {
      console.error('Error fetching professional stats:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.uid]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats
  };
};

export default useProfessionalStats;

