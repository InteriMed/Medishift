import { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, getDocs, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase/index';

/**
 * Hook for working with Firestore collections
 * @param {string} collectionName - Firestore collection name
 * @param {Array} queryConstraints - Array of query constraints
 * @param {Object} options - Additional options
 * @returns {Object} Collection data, loading state, error state, and utility functions
 */
export const useCollection = (collectionName, queryConstraints = [], options = {}) => {
  const {
    orderByField = null,
    orderByDirection = 'asc',
    limitTo = null,
    realtime = true,
    startAfter = null,
    idField = 'id'
  } = options;

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastVisible, setLastVisible] = useState(null);
  
  // Store the last query for pagination
  const lastQuery = useRef(null);

  // Build the query with constraints
  const buildQuery = (collectionRef, startAfterDoc = null) => {
    let q = collectionRef;
    
    // Add 'where' constraints
    if (queryConstraints.length > 0) {
      queryConstraints.forEach(constraint => {
        if (constraint.field && constraint.operator && constraint.value !== undefined) {
          q = query(q, where(constraint.field, constraint.operator, constraint.value));
        }
      });
    }
    
    // Add orderBy if specified
    if (orderByField) {
      q = query(q, orderBy(orderByField, orderByDirection));
    }
    
    // Add startAfter for pagination if specified
    if (startAfterDoc) {
      q = query(q, startAfter(startAfterDoc));
    }
    
    // Add limit if specified
    if (limitTo) {
      q = query(q, limit(limitTo));
    }
    
    lastQuery.current = q;
    return q;
  };

  // Function to fetch the next batch of documents for pagination
  const fetchNextBatch = async () => {
    if (!lastVisible) {
      console.warn('No more documents to fetch');
      return { documents: [], hasMore: false };
    }
    
    setLoading(true);
    
    try {
      const collectionRef = collection(db, collectionName);
      const q = buildQuery(collectionRef, lastVisible);
      
      const querySnapshot = await getDocs(q);
      const docs = [];
      
      querySnapshot.forEach(doc => {
        docs.push({
          [idField]: doc.id,
          ...doc.data()
        });
      });
      
      const newLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
      setLastVisible(newLastVisible);
      
      const hasMore = querySnapshot.docs.length === limitTo;
      return { documents: docs, hasMore };
    } catch (err) {
      console.error('Error fetching next batch:', err);
      setError(err.message);
      return { documents: [], hasMore: false };
    } finally {
      setLoading(false);
    }
  };

  // Function to add a document to the collection
  const addDocument = async (data) => {
    setLoading(true);
    
    try {
      const collectionRef = collection(db, collectionName);
      const docRef = await addDoc(collectionRef, {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      setError(null);
      return { id: docRef.id, ...data };
    } catch (err) {
      console.error('Error adding document:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Function to delete a document from the collection
  const deleteDocument = async (documentId) => {
    if (!documentId) {
      throw new Error('Document ID is required');
    }
    
    setLoading(true);
    
    try {
      const docRef = doc(db, collectionName, documentId);
      await deleteDoc(docRef);
      
      // Update local state if not using realtime
      if (!realtime) {
        setDocuments(prev => prev.filter(doc => doc[idField] !== documentId));
      }
      
      setError(null);
      return true;
    } catch (err) {
      console.error(`Error deleting document ${documentId}:`, err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time listener or fetch once
  useEffect(() => {
    if (!collectionName) {
      setDocuments([]);
      setLoading(false);
      return () => {};
    }
    
    setLoading(true);
    
    const collectionRef = collection(db, collectionName);
    const q = buildQuery(collectionRef);
    
    if (realtime) {
      // Set up real-time listener
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const docs = [];
          snapshot.forEach(doc => {
            docs.push({
              [idField]: doc.id,
              ...doc.data()
            });
          });
          
          setDocuments(docs);
          setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error in collection snapshot:', err);
          setError(err.message);
          setLoading(false);
        }
      );
      
      return () => unsubscribe();
    } else {
      // Fetch data once
      getDocs(q)
        .then(snapshot => {
          const docs = [];
          snapshot.forEach(doc => {
            docs.push({
              [idField]: doc.id,
              ...doc.data()
            });
          });
          
          setDocuments(docs);
          setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
          setError(null);
        })
        .catch(err => {
          console.error('Error getting collection:', err);
          setError(err.message);
        })
        .finally(() => {
          setLoading(false);
        });
      
      return () => {};
    }
  }, [collectionName, JSON.stringify(queryConstraints), orderByField, orderByDirection, limitTo, realtime, idField]);

  return {
    documents,
    loading,
    error,
    addDocument,
    deleteDocument,
    fetchNextBatch,
    hasMore: !!lastVisible
  };
};

export default useCollection; 