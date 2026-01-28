import { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/authContext';

export const useContractsData = () => {
  const { currentUser } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchContracts = useCallback(async () => {
    if (!currentUser?.uid) return;

    try {
      setIsLoading(true);
      setContracts([]);
    } catch (err) {
      console.error('Error fetching contracts:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.uid]);

  return {
    contracts,
    isLoading,
    error,
    refetch: fetchContracts
  };
};

export default useContractsData;

