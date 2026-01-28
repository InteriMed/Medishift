import { db, functions } from '../../../services/firebase';
import { 
  doc, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  serverTimestamp, 
  arrayUnion, 
  increment,
  runTransaction, 
  deleteField,
  writeBatch,
  query,
  where,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { AuditEntry } from '../../types'; // Ensure this type exists

// --- 1. AUDIT HELPER (Internal) ---
/**
 * Appends an audit entry to the document's 'auditHistory' array.
 * Note: For critical actions, this is best done within a transaction.
 */
export const appendAudit = async (
  collectionName: string,
  documentId: string,
  auditEntry: Omit<AuditEntry, 'timestamp'>
): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await updateDoc(docRef, {
      auditHistory: arrayUnion({
        ...auditEntry,
        timestamp: Date.now(), // Use client time or serverTimestamp() if preferred
      }),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Failed to append audit for ${collectionName}/${documentId}:`, error);
    // Don't throw here to avoid blocking the main UI if audit fails, unless strict compliance required
    throw error; 
  }
};

// --- 2. MOVE TO ARCHIVE (Transactional) ---
/**
 * Atomically moves a document to an archive collection and deletes the original.
 * Uses a Transaction to prevent data loss or duplication.
 */
export const moveToArchive = async (
  sourceCollection: string,
  documentId: string,
  userId: string
): Promise<string> => {
  const sourceRef = doc(db, sourceCollection, documentId);
  const archiveCollection = `${sourceCollection}_archive`; // Standardized naming (snake_case preferred for system cols)
  const archiveRef = doc(collection(db, archiveCollection)); // Auto-ID for archive, or use documentId if unique

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Read Source
      const sourceSnap = await transaction.get(sourceRef);
      if (!sourceSnap.exists()) {
        throw new Error(`Document ${documentId} not found in ${sourceCollection}`);
      }

      const data = sourceSnap.data();

      // 2. Prepare Archive Data
      const archiveData = {
        ...data,
        _archivedAt: serverTimestamp(),
        _archivedBy: userId,
        _originalId: documentId,
        _originalCollection: sourceCollection
      };

      // 3. Write to Archive
      transaction.set(archiveRef, archiveData);

      // 4. Delete Original
      transaction.delete(sourceRef);
      
      // Note: We cannot easily use 'appendAudit' here because it targets the *source* which is being deleted.
      // Instead, the audit trail effectively moves to the archive document itself.
    });

    console.log(`Successfully archived ${documentId} to ${archiveRef.id}`);
    return archiveRef.id;

  } catch (error) {
    console.error('Transaction failed: moveToArchive', error);
    throw error;
  }
};

// --- 3. GENERATE SIGNED URL (Security) ---
/**
 * Calls a Cloud Function to generate a temporary access URL.
 * NEVER generates this client-side directly.
 */
export const generateSignedURL = async (
  storagePath: string,
  expiresInMinutes: number = 60
): Promise<string> => {
  try {
    const generateFn = httpsCallable(functions, 'generateSignedURL');
    const result = await generateFn({ storagePath, expiresInMinutes });
    return (result.data as any).url;
  } catch (error) {
    console.error('Failed to generate signed URL:', error);
    throw new Error('Could not generate secure link.');
  }
};

// --- 4. DATA MANIPULATION (Read Primitives) ---

/**
 * Client-side Sorter. 
 * Use this for small lists (e.g. < 100 items) already loaded in memory.
 * For large datasets, use Firestore 'orderBy()'.
 */
export const sortElements = <T extends Record<string, any>>(
  elements: T[],
  key: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...elements].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return order === 'asc' 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    }
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return order === 'asc' ? aVal - bVal : bVal - aVal;
    }
    // Handle timestamps/Dates if needed
    return 0;
  });
};

/**
 * In-Memory Search.
 * For large datasets, use Algolia/Typesense or Firestore 'where' clauses.
 */
export const searchElements = <T extends Record<string, any>>(
  elements: T[],
  attribute: keyof T,
  searchTerm: string
): T[] => {
  if (!searchTerm) return elements;
  const lowerSearch = searchTerm.toLowerCase();
  
  return elements.filter(el => {
    const value = el[attribute];
    if (typeof value === 'string') {
      return value.toLowerCase().includes(lowerSearch);
    }
    return false;
  });
};

export const findElement = <T extends Record<string, any>>(
  elements: T[],
  key: keyof T,
  value: any
): T | undefined => {
  return elements.find(el => el[key] === value);
};

// --- 5. ATTRIBUTE MUTATIONS (Write Primitives) ---

/**
 * Adds or Updates a single field.
 */
export const addAttribute = async (
  collectionName: string,
  documentId: string,
  attribute: string,
  value: any,
  userId: string
): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, documentId);
    
    await updateDoc(docRef, {
      [attribute]: value,
      updatedAt: serverTimestamp(),
      auditHistory: arrayUnion({
        uid: userId,
        action: 'ADD_ATTRIBUTE', // Or 'EDIT_ATTRIBUTE' - technically same in NoSQL
        metadata: { attribute, value: JSON.stringify(value) }, // Stringify complex objs
        timestamp: Date.now()
      })
    });
  } catch (error) {
    console.error('Failed to add attribute:', error);
    throw error;
  }
};

/**
 * Removes a field permanently from the document.
 */
export const removeAttribute = async (
  collectionName: string,
  documentId: string,
  attribute: string,
  userId: string
): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, documentId);
    
    await updateDoc(docRef, {
      [attribute]: deleteField(),
      updatedAt: serverTimestamp(),
      auditHistory: arrayUnion({
        uid: userId,
        action: 'REMOVE_ATTRIBUTE',
        metadata: { attribute },
        timestamp: Date.now()
      })
    });
  } catch (error) {
    console.error('Failed to remove attribute:', error);
    throw error;
  }
};