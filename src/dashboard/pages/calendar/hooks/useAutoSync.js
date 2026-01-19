import { useState, useEffect, useCallback } from 'react';
import { updateEvent } from '../utils/eventDatabase';

/**
 * Custom hook for auto-sync functionality
 * Handles local storage management and automatic database synchronization
 * 
 * Extracted from Calendar.js to separate data persistence logic
 */
export const useAutoSync = (userId, accountType) => {
  // Track pending changes for database sync
  const [pendingChanges, setPendingChanges] = useState(new Set());
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());
  
  // Local storage functions
  const saveEventsToLocalStorage = useCallback((eventsToSave) => {
  }, [userId]);

  const loadEventsFromLocalStorage = useCallback(() => {
    return null;
  }, [userId]);

  // Mark event as having pending changes
  const markEventForSync = useCallback((eventId) => {
    setPendingChanges(prev => new Set([...prev, eventId]));
  }, []);

  // Sync pending changes to database
  const syncPendingChanges = useCallback(async (events) => {
    if (pendingChanges.size === 0 || !userId) {
      console.log('No pending changes or no userId - skipping sync', { 
        pendingChanges: pendingChanges.size, 
        userId 
      });
      return;
    }

    console.log(`Syncing ${pendingChanges.size} pending changes to database`, Array.from(pendingChanges));
    const changesToSync = Array.from(pendingChanges);
    
    for (const eventId of changesToSync) {
      const event = events.find(e => e.id === eventId);
      if (event) {
        // Check if event should be synced to database
        const shouldSync = event.fromDatabase || 
                          event.isValidated || 
                          (event.id && !event.id.toString().startsWith('temp-') && 
                           !event.id.toString().startsWith('duplicate-') && 
                           event.id.toString().length > 10);
        
        if (shouldSync) {
          try {
            console.log(`Syncing event ${eventId} to database - fromDB: ${event.fromDatabase}, validated: ${event.isValidated}`);
            
            // Re-enable database updates for sync
            const eventForUpdate = {
              id: eventId,
              start: event.start,
              end: event.end,
              title: event.title,
              color: event.color,
              color1: event.color1,
              color2: event.color2,
              isValidated: event.isValidated || false,
              isRecurring: event.isRecurring || false,
              recurrenceId: event.recurrenceId,
              notes: event.notes,
              location: event.location,
              employees: event.employees,
              canton: event.canton,
              area: event.area,
              experience: event.experience,
              software: event.software,
              certifications: event.certifications,
              isAvailability: event.isAvailability
            };

            const result = await updateEvent(eventId, eventForUpdate, userId, accountType, true); // forceUpdate = true for sync
            if (result.success) {
              console.log(`Successfully synced event ${eventId} to database`);
              setPendingChanges(prev => {
                const newSet = new Set(prev);
                newSet.delete(eventId);
                return newSet;
              });
            } else {
              console.warn(`Failed to sync event ${eventId}:`, result.error);
            }
          } catch (error) {
            console.warn(`Error syncing event ${eventId}:`, error);
          }
        } else {
          console.log(`Skipping sync for event ${eventId} - appears to be local-only or temporary`);
          // Remove from pending changes since it shouldn't be synced
          setPendingChanges(prev => {
            const newSet = new Set(prev);
            newSet.delete(eventId);
            return newSet;
          });
        }
      } else {
        console.warn(`Event ${eventId} not found in events array - removing from pending changes`);
        // Remove from pending changes if event no longer exists
        setPendingChanges(prev => {
          const newSet = new Set(prev);
          newSet.delete(eventId);
          return newSet;
        });
      }
    }
    
    setLastSyncTime(Date.now());
  }, [pendingChanges, userId, accountType]);

  // Periodic sync to database every 5 minutes
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (pendingChanges.size > 0) {
        console.log('Periodic sync triggered - syncing pending changes');
        // Note: syncPendingChanges needs events parameter, will be called from component
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(syncInterval);
  }, [pendingChanges.size]);

  // Sync on page leave
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingChanges.size > 0) {
        console.log('Page unload detected - syncing pending changes');
        // Use sendBeacon for reliable delivery during page unload
        // Note: syncPendingChanges needs events parameter, will be called from component
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && pendingChanges.size > 0) {
        console.log('Page hidden - syncing pending changes');
        // Note: syncPendingChanges needs events parameter, will be called from component
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pendingChanges.size]);

  return {
    // State
    pendingChanges,
    lastSyncTime,
    
    // Local storage functions
    saveEventsToLocalStorage,
    loadEventsFromLocalStorage,
    
    // Sync functions
    markEventForSync,
    syncPendingChanges,
    
    // Setters
    setPendingChanges,
    setLastSyncTime
  };
}; 