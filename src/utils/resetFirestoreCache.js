export function resetFirestoreCache() {
  if (typeof window === 'undefined') {
    console.warn('resetFirestoreCache can only run in browser');
    return;
  }

  console.log('🧹 Clearing Firestore cache...');

  try {
    const databases = [];
    
    for (let i = 0; i < indexedDB.databases.length; i++) {
      indexedDB.databases().then(dbs => {
        dbs.forEach(db => {
          if (db.name.includes('firestore') || db.name.includes('firebase')) {
            databases.push(db.name);
            console.log(`Found database: ${db.name}`);
          }
        });
      });
    }

    const deleteDatabase = (name) => {
      return new Promise((resolve, reject) => {
        const deleteReq = indexedDB.deleteDatabase(name);
        deleteReq.onsuccess = () => {
          console.log(`✅ Deleted database: ${name}`);
          resolve();
        };
        deleteReq.onerror = () => {
          console.warn(`⚠️ Could not delete database: ${name}`);
          resolve();
        };
        deleteReq.onblocked = () => {
          console.warn(`⚠️ Database blocked: ${name}`);
          resolve();
        };
      });
    };

    const clearAll = async () => {
      const dbNames = ['firestore', 'firebaseLocalStorageDb', 'firebase-heartbeat-database'];
      
      for (const name of dbNames) {
        await deleteDatabase(name);
      }

      localStorage.removeItem('__FIRESTORE_INITIALIZED__');
      sessionStorage.clear();
      
      console.log('✅ Firestore cache cleared!');
      console.log('🔄 Please refresh the page to reinitialize Firestore');
    };

    clearAll();
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
  }
}

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.resetFirestoreCache = resetFirestoreCache;
  console.log('🧹 Cache reset function available: window.resetFirestoreCache()');
}


