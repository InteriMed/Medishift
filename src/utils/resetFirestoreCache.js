import { LOCALSTORAGE_KEYS, INDEXEDDB_DATABASES, WINDOW_FLAGS, getEnvVar } from '../config/keysDatabase';

export function resetFirestoreCache() {
  if (typeof window === 'undefined') {
    return;
  }


  try {
    const databases = [];
    
    for (let i = 0; i < indexedDB.databases.length; i++) {
      indexedDB.databases().then(dbs => {
        dbs.forEach(db => {
          if (db.name.includes('firestore') || db.name.includes('firebase')) {
            databases.push(db.name);
          }
        });
      });
    }

    const deleteDatabase = (name) => {
      return new Promise((resolve, reject) => {
        const deleteReq = indexedDB.deleteDatabase(name);
        deleteReq.onsuccess = () => {
          resolve();
        };
        deleteReq.onerror = () => {
          resolve();
        };
        deleteReq.onblocked = () => {
          resolve();
        };
      });
    };

    const clearAll = async () => {
      const dbNames = [
        INDEXEDDB_DATABASES.FIRESTORE,
        INDEXEDDB_DATABASES.FIREBASE_LOCAL_STORAGE,
        INDEXEDDB_DATABASES.FIREBASE_HEARTBEAT
      ];
      
      for (const name of dbNames) {
        await deleteDatabase(name);
      }

      localStorage.removeItem(LOCALSTORAGE_KEYS.FIRESTORE_INITIALIZED);
      sessionStorage.clear();
      
    };

    clearAll();
  } catch (error) {
  }
}

if (typeof window !== 'undefined' && getEnvVar('NODE_ENV') === 'development') {
  window[WINDOW_FLAGS.RESET_FIRESTORE_CACHE] = resetFirestoreCache;
}


