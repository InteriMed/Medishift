import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, onSnapshot, getDocs } from 'firebase/firestore';

/**
 * Custom hook for complex Firestore queries
 * @param {Function} queryFn - Function that returns a Firestore query
 * @param {Object} options - Additional options
 * @returns {Object} Query results, loading state, error state
 */
export const useFirestoreQuery = (queryFn, options = {}) => {
  const { idField = 'id', realtime = true } = options;
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!queryFn) {
      setDocuments([]);
      setLoading(false);
      return () => {};
    }

    try {
      const q = queryFn(db);
      setLoading(true);

      if (realtime) {
        // Set up real-time listener
        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const docs = [];
            snapshot.forEach((doc) => {
              docs.push({
                [idField]: doc.id,
                ...doc.data()
              });
            });
            setDocuments(docs);
            setLoading(false);
            setError(null);
          },
          (err) => {
            console.error('Firestore query error:', err);
            setError(err.message);
            setLoading(false);
          }
        );

        return () => unsubscribe();
      } else {
        // One-time query
        getDocs(q)
          .then((snapshot) => {
            const docs = [];
            snapshot.forEach((doc) => {
              docs.push({
                [idField]: doc.id,
                ...doc.data()
              });
            });
            setDocuments(docs);
            setLoading(false);
            setError(null);
          })
          .catch((err) => {
            console.error('Firestore query error:', err);
            setError(err.message);
            setLoading(false);
          });

        return () => {};
      }
    } catch (err) {
      console.error('Error creating query:', err);
      setError(err.message);
      setLoading(false);
      return () => {};
    }
  }, [queryFn, idField, realtime]);

  return { documents, loading, error };
}; 