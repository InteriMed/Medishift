import { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  orderBy as fbOrderBy,
  limit as fbLimit
} from 'firebase/firestore';
import { db } from '../services/firebase/index';

/**
 * Custom hook for Firestore database operations
 * @param {string} collectionName - The name of the collection
 * @returns {Object} Firestore methods and state
 */
const useFirestore = (collectionName) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const collectionRef = collection(db, collectionName);

  // Get all documents
  const getDocuments = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collectionRef);
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDocuments(docs);
      setError(null);
      return docs;
    } catch (err) {
      console.error('Error getting documents:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Get a document by ID
  const getDocument = async (id) => {
    setLoading(true);
    try {
      const docRef = doc(db, collectionName, id);
      const snapshot = await getDoc(docRef);
      
      if (snapshot.exists()) {
        setError(null);
        return { id: snapshot.id, ...snapshot.data() };
      } else {
        const err = new Error(`Document with ID ${id} not found`);
        setError(err.message);
        return null;
      }
    } catch (err) {
      console.error('Error getting document:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Add a document
  const addDocument = async (data) => {
    setLoading(true);
    try {
      const docRef = await addDoc(collectionRef, data);
      setError(null);
      return { id: docRef.id, ...data };
    } catch (err) {
      console.error('Error adding document:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update a document
  const updateDocument = async (id, data) => {
    setLoading(true);
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, data);
      setError(null);
      return { id, ...data };
    } catch (err) {
      console.error('Error updating document:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Delete a document
  const deleteDocument = async (id) => {
    setLoading(true);
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
      setError(null);
      return true;
    } catch (err) {
      console.error('Error deleting document:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Query documents
  const queryDocuments = async (conditions = [], sortBy = null, limitTo = null) => {
    setLoading(true);
    try {
      let queryRef = collectionRef;
      
      // Add conditions (where clauses)
      if (conditions.length > 0) {
        const queryConstraints = conditions.map(cond => 
          where(cond.field, cond.operator, cond.value)
        );
        queryRef = query(queryRef, ...queryConstraints);
      }
      
      // Add orderBy if provided
      if (sortBy) {
        queryRef = query(queryRef, fbOrderBy(sortBy.field, sortBy.direction || 'asc'));
      }
      
      // Add limit if provided
      if (limitTo) {
        queryRef = query(queryRef, fbLimit(limitTo));
      }
      
      const snapshot = await getDocs(queryRef);
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setError(null);
      return docs;
    } catch (err) {
      console.error('Error querying documents:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Listen to real-time updates
  const subscribeToCollection = (callback, conditions = []) => {
    let queryRef = collectionRef;
    
    // Add conditions (where clauses)
    if (conditions.length > 0) {
      const queryConstraints = conditions.map(cond => 
        where(cond.field, cond.operator, cond.value)
      );
      queryRef = query(queryRef, ...queryConstraints);
    }
    
    const unsubscribe = onSnapshot(queryRef, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(docs);
      setDocuments(docs);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error('Error in snapshot listener:', err);
      setError(err.message);
      setLoading(false);
    });
    
    return unsubscribe;
  };

  return {
    documents,
    loading,
    error,
    getDocuments,
    getDocument,
    addDocument,
    updateDocument,
    deleteDocument,
    queryDocuments,
    subscribeToCollection
  };
};

export default useFirestore; 