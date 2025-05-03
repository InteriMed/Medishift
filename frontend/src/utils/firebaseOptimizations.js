import { 
  query, 
  where, 
  limit, 
  startAfter, 
  orderBy, 
  getDocs, 
  getCountFromServer, 
  writeBatch, 
  connectFirestoreEmulator 
} from 'firebase/firestore';
import { db } from '../services/firebaseService';

/**
 * Optimize Firestore query with cursor-based pagination
 * @param {string} collectionPath - Firestore collection path
 * @param {array} conditions - Array of where conditions [{field, operator, value}]
 * @param {string} orderByField - Field to order results by
 * @param {string} orderDirection - 'asc' or 'desc'
 * @param {number} pageSize - Number of documents per page
 * @param {object} startAfterDoc - Document to start after (for pagination)
 * @returns {Promise} Query results and pagination info
 */
export const paginatedQuery = async (
  collectionPath,
  conditions = [],
  orderByField = 'createdAt',
  orderDirection = 'desc',
  pageSize = 20,
  startAfterDoc = null
) => {
  try {
    // Build the query with conditions
    let q = query(
      db.collection(collectionPath),
      orderBy(orderByField, orderDirection),
      limit(pageSize)
    );
    
    // Add where conditions
    conditions.forEach(condition => {
      q = query(q, where(condition.field, condition.operator, condition.value));
    });
    
    // Add pagination if we have a starting document
    if (startAfterDoc) {
      q = query(q, startAfter(startAfterDoc));
    }
    
    // Get the results
    const snapshot = await getDocs(q);
    
    // Get total count (for pagination info)
    const countQuery = query(
      db.collection(collectionPath),
      ...conditions.map(c => where(c.field, c.operator, c.value))
    );
    const countSnapshot = await getCountFromServer(countQuery);
    
    // Format the results
    const results = [];
    snapshot.forEach(doc => {
      results.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return {
      results,
      pagination: {
        totalCount: countSnapshot.data().count,
        hasMore: results.length === pageSize,
        lastDoc: results.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null
      }
    };
  } catch (error) {
    console.error('Error in paginated query:', error);
    throw error;
  }
};

/**
 * Perform a batch operation on multiple documents
 * @param {array} operations - Array of operations [{type, ref, data}]
 * @returns {Promise} Result of batch operation
 */
export const batchOperations = async (operations) => {
  try {
    const batch = writeBatch(db);
    const MAX_BATCH_SIZE = 500; // Firestore limit
    
    // Split operations into chunks if needed
    for (let i = 0; i < operations.length; i += MAX_BATCH_SIZE) {
      const chunk = operations.slice(i, i + MAX_BATCH_SIZE);
      
      // Process each operation in the chunk
      chunk.forEach(op => {
        switch (op.type) {
          case 'set':
            batch.set(op.ref, op.data, op.options || {});
            break;
          case 'update':
            batch.update(op.ref, op.data);
            break;
          case 'delete':
            batch.delete(op.ref);
            break;
          default:
            console.warn(`Unknown batch operation type: ${op.type}`);
        }
      });
      
      // Commit the batch
      await batch.commit();
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in batch operations:', error);
    throw error;
  }
};

/**
 * Cache data in localStorage for faster access
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} expiryMinutes - Minutes until cache expires
 */
export const cacheData = (key, data, expiryMinutes = 10) => {
  try {
    const cacheItem = {
      data,
      expiry: Date.now() + (expiryMinutes * 60 * 1000)
    };
    localStorage.setItem(`firebase_cache_${key}`, JSON.stringify(cacheItem));
  } catch (error) {
    console.warn('Error caching data:', error);
  }
};

/**
 * Get cached data if available and not expired
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null if not found/expired
 */
export const getCachedData = (key) => {
  try {
    const cachedItem = localStorage.getItem(`firebase_cache_${key}`);
    if (!cachedItem) return null;
    
    const { data, expiry } = JSON.parse(cachedItem);
    if (Date.now() > expiry) {
      // Cache expired, remove it
      localStorage.removeItem(`firebase_cache_${key}`);
      return null;
    }
    
    return data;
  } catch (error) {
    console.warn('Error retrieving cached data:', error);
    return null;
  }
}; 