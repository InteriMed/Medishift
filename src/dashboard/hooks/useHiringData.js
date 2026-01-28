import { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/authContext';

export const useHiringData = () => {
  const { currentUser } = useAuth();
  const [hiringData, setHiringData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHiringData = useCallback(async () => {
    if (!currentUser?.uid) return;

    try {
      setIsLoading(true);
      setHiringData([]);
    } catch (err) {
      console.error('Error fetching hiring data:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.uid]);

  return {
    hiringData,
    isLoading,
    error,
    refetch: fetchHiringData
  };
};

export default useHiringData;

