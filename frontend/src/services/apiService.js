import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  updateDoc as firestoreUpdateDoc, 
  deleteDoc,
  serverTimestamp,
  orderBy,
  limit,
  startAfter
} from 'firebase/firestore';
import { db } from './firebaseService';
import { prepareForFirestore, transformDoc } from '../utils/firebaseUtils';
// Import optimization utilities
import { 
  paginatedQuery, 
  batchOperations, 
  cacheData, 
  getCachedData 
} from '../utils/firebaseOptimizations';
// Import error handling
import { handleFirebaseOperation } from '../utils/errorHandler';
// Import performance monitoring
import { trackFirestoreQuery } from './performanceMonitor';
import axios from 'axios';
import { getToken, clearTokenAndRedirect } from '../utils/auth';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - adds auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handles auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle authentication errors
    if (error.response && error.response.status === 401) {
      clearTokenAndRedirect();
    }
    return Promise.reject(error);
  }
);

// API service methods
const apiService = {
  // GET request
  get: (endpoint, params = {}) => 
    apiClient.get(endpoint, { params }),
  
  // POST request
  post: (endpoint, data = {}) => 
    apiClient.post(endpoint, data),
  
  // PUT request
  put: (endpoint, data = {}) => 
    apiClient.put(endpoint, data),
  
  // PATCH request
  patch: (endpoint, data = {}) => 
    apiClient.patch(endpoint, data),
  
  // DELETE request
  delete: (endpoint, data = {}) => 
    apiClient.delete(endpoint, { data }),
  
  // Upload files
  upload: (endpoint, formData) => 
    apiClient.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
};

// Generic Firestore operations

// Get a single document
export const getDocument = async (collectionName, id, useCache = true) => {
  // Check cache first if enabled
  if (useCache) {
    const cacheKey = `${collectionName}_${id}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log('Using cached data for', cacheKey);
      return cachedData;
    }
  }
  
  return handleFirebaseOperation(
    async () => {
      return trackFirestoreQuery(collectionName, 'get', async () => {
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = {
            id: docSnap.id,
            ...docSnap.data()
          };
          
          // Cache the result for future use
          if (useCache) {
            cacheData(`${collectionName}_${id}`, data);
          }
          
          return data;
        } else {
          return null;
        }
      });
    }
  );
};

// Get multiple documents with optional filtering
export const getDocuments = async (
  collectionName, 
  filters = [], 
  sortOptions = null,
  pagination = null
) => {
  try {
    let collectionRef = collection(db, collectionName);
    let constraints = [];
    
    // Add filters
    if (filters && filters.length > 0) {
      filters.forEach(([field, operator, value]) => {
        constraints.push(where(field, operator, value));
      });
    }
    
    // Add sorting
    if (sortOptions) {
      if (Array.isArray(sortOptions)) {
        sortOptions.forEach(option => {
          constraints.push(orderBy(option.field, option.direction || 'asc'));
        });
      } else {
        constraints.push(orderBy(sortOptions.field, sortOptions.direction || 'asc'));
      }
    }
    
    // Add pagination
    if (pagination) {
      if (pagination.limit) {
        constraints.push(limit(pagination.limit));
      }
      
      if (pagination.startAfter) {
        constraints.push(startAfter(pagination.startAfter));
      }
    }
    
    // Create and execute query
    const q = constraints.length > 0 
      ? query(collectionRef, ...constraints) 
      : collectionRef;
    
    const querySnapshot = await getDocs(q);
    
    const documents = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    
    return { data: documents, error: null };
  } catch (error) {
    console.error(`Error getting documents from ${collectionName}:`, error);
    return { data: [], error: error.message };
  }
};

// Create a document
export const createDocument = async (collectionName, data, id = null) => {
  return handleFirebaseOperation(
    async () => {
      return trackFirestoreQuery(collectionName, 'create', async () => {
        // Prepare data for Firestore
        const preparedData = prepareForFirestore(data);
        
        // Add server timestamp for createdAt if not provided
        if (!preparedData.createdAt) {
          preparedData.createdAt = serverTimestamp();
        }
        
        let docRef;
        
        if (id) {
          // Create with specific ID
          docRef = doc(db, collectionName, id);
          await firestoreUpdateDoc(docRef, preparedData);
        } else {
          // Create with auto-generated ID
          docRef = await addDoc(collection(db, collectionName), preparedData);
        }
        
        return { success: true, id: docRef.id, error: null };
      });
    }
  );
};

// Update a document
export const updateDocument = async (collectionName, id, data) => {
  return handleFirebaseOperation(
    async () => {
      return trackFirestoreQuery(collectionName, 'update', async () => {
        const docRef = doc(db, collectionName, id);
        
        // Prepare data for Firestore
        const preparedData = prepareForFirestore(data);
        
        // Add server timestamp for updatedAt if not provided
        if (!preparedData.updatedAt) {
          preparedData.updatedAt = serverTimestamp();
        }
        
        await firestoreUpdateDoc(docRef, preparedData);
        
        // Remove from cache if it was cached
        const cacheKey = `${collectionName}_${id}`;
        localStorage.removeItem(`firebase_cache_${cacheKey}`);
        
        return { success: true, error: null };
      });
    }
  );
};

// Delete a document
export const deleteDocument = async (collectionName, id) => {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return { success: true, error: null };
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    return { success: false, error: error.message };
  }
};

// Domain-specific operations

// Get availability slots
export const getAvailability = async (filters = [], pagination = null) => {
  return await getDocuments('availability', filters, { field: 'from', direction: 'asc' }, pagination);
};

// Create a new availability slot
export const createAvailability = async (availabilityData) => {
  return await createDocument('availability', availabilityData);
};

// Get contracts for a user
export const getUserContracts = async (userId, userType) => {
  const field = userType === 'worker' ? 'workerID' : 'companyID';
  return await getDocuments('contracts', [{ field, operator: '==', value: userId }]);
};

// Create a contract
export const createContract = async (contractData) => {
  return await createDocument('contracts', contractData);
};

// Update contract status
export const updateContractStatus = async (contractId, status) => {
  return await updateDocument('contracts', contractId, { validation: status });
};

/**
 * Get documents from a collection with pagination and caching
 * @param {string} collectionPath - Firestore collection path
 * @param {array} conditions - Query conditions [{field, operator, value}]
 * @param {string} orderByField - Field to order by
 * @param {string} orderDirection - Order direction ('asc' or 'desc')
 * @param {number} pageSize - Number of documents per page
 * @param {object} startAfterDoc - Document to start after (for pagination)
 * @param {boolean} useCache - Whether to use cache if available
 * @returns {Promise} Collection documents
 */
export const getCollection = async (
  collectionPath, 
  conditions = [], 
  orderByField = 'createdAt', 
  orderDirection = 'desc',
  pageSize = 20,
  startAfterDoc = null,
  useCache = true
) => {
  // Check cache first if enabled and not paginating
  if (useCache && !startAfterDoc) {
    const cacheKey = `${collectionPath}_${JSON.stringify(conditions)}_${orderByField}_${orderDirection}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log('Using cached data for', cacheKey);
      return cachedData;
    }
  }
  
  return handleFirebaseOperation(
    async () => {
      return trackFirestoreQuery(collectionPath, 'list', async () => {
        // Use the optimized paginated query function
        const result = await paginatedQuery(
          collectionPath,
          conditions,
          orderByField,
          orderDirection,
          pageSize,
          startAfterDoc
        );
        
        // Cache the result if not paginating
        if (useCache && !startAfterDoc) {
          const cacheKey = `${collectionPath}_${JSON.stringify(conditions)}_${orderByField}_${orderDirection}`;
          cacheData(cacheKey, result);
        }
        
        return result;
      });
    }
  );
};

/**
 * Batch update multiple documents
 * @param {array} operations - Array of operations to perform
 * @returns {Promise} Batch result
 */
export const batchUpdate = async (operations) => {
  return handleFirebaseOperation(
    async () => {
      return batchOperations(operations);
    }
  );
};

// Add these marketplace-specific methods to your apiService

// Get marketplace listings
export const getMarketplaceListings = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    // Add filters to query params
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        value.forEach(val => queryParams.append(`${key}[]`, val));
      } else if (value && !Array.isArray(value)) {
        queryParams.append(key, value);
      }
    });
    
    const response = await apiClient.get(`/marketplace/listings?${queryParams}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

// Get listing details
export const getListingDetails = async (listingId, type = 'job') => {
  try {
    const response = await apiClient.get(`/marketplace/${type}s/${listingId}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

// Apply to job listing
export const applyToJob = async (jobId, application) => {
  try {
    const response = await apiClient.post(`/marketplace/jobs/${jobId}/apply`, application);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

// Contact a pharmacist
export const contactPharmacist = async (pharmacistId, message) => {
  try {
    const response = await apiClient.post(`/marketplace/pharmacists/${pharmacistId}/contact`, message);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export default apiService; 