import { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/authContext';

export const useEmployeesData = () => {
  const { currentUser } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEmployees = useCallback(async () => {
    if (!currentUser?.uid) return;

    try {
      setIsLoading(true);
      setEmployees([]);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.uid]);

  return {
    employees,
    isLoading,
    error,
    refetch: fetchEmployees
  };
};

export default useEmployeesData;

