import { useState, useEffect } from 'react';
import { doc, onSnapshot, getDoc, setDoc as firestoreSetDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Hook for working with a single Firestore document
 * @param {string} collectionName - Firestore collection name
 * @param {string} documentId - Document ID
 * @returns {Object} Document data, loading state, error state, and utility functions
 */
export const useDocument = (collectionName, documentId) => {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get real-time updates from Firestore document
  useEffect(() => {
    if (!collectionName || !documentId) {
      setDocument(null);
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    
    // Reference to the document
    const docRef = doc(db, collectionName, documentId);
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(
      docRef,
      (doc) => {
        if (doc.exists()) {
          setDocument({ id: doc.id, ...doc.data() });
        } else {
          setDocument(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`Error getting document ${documentId}:`, err);
        setError(err.message);
        setLoading(false);
      }
    );

    // Clean up listener on unmount
    return () => unsubscribe();
  }, [collectionName, documentId]);

  // Get document once (non-realtime)
  const getDocument = async () => {
    if (!collectionName || !documentId) {
      return null;
    }

    setLoading(true);
    
    try {
      const docRef = doc(db, collectionName, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const docData = { id: docSnap.id, ...docSnap.data() };
        setDocument(docData);
        setError(null);
        return docData;
      } else {
        setDocument(null);
        return null;
      }
    } catch (err) {
      console.error(`Error getting document ${documentId}:`, err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update document
  const updateDocument = async (data) => {
    if (!collectionName || !documentId) {
      throw new Error('Collection name and document ID are required');
    }

    setLoading(true);
    
    try {
      const docRef = doc(db, collectionName, documentId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date()
      });
      setError(null);
      return true;
    } catch (err) {
      console.error(`Error updating document ${documentId}:`, err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Set document (overwrite)
  const setDocumentData = async (data, options = {}) => {
    if (!collectionName || !documentId) {
      throw new Error('Collection name and document ID are required');
    }

    setLoading(true);
    
    try {
      const docRef = doc(db, collectionName, documentId);
      await firestoreSetDoc(docRef, {
        ...data,
        updatedAt: new Date(),
        ...(options.merge ? {} : { createdAt: new Date() })
      }, options);
      setError(null);
      return true;
    } catch (err) {
      console.error(`Error setting document ${documentId}:`, err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete document
  const deleteDocument = async () => {
    if (!collectionName || !documentId) {
      throw new Error('Collection name and document ID are required');
    }

    setLoading(true);
    
    try {
      const docRef = doc(db, collectionName, documentId);
      await deleteDoc(docRef);
      setDocument(null);
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

  return {
    document,
    loading,
    error,
    getDocument,
    updateDocument,
    setDocument: setDocumentData,
    deleteDocument
  };
};

export default useDocument; 