import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  listNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  subscribeToNotifications
} from '../services/notificationService';
import useNotificationSound from '../Features/dashboard/components/Notifications/useNotificationSound';

const useNotifications = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const { 
    isEnabled: soundEnabled, 
    toggleSound, 
    playNotificationSound 
  } = useNotificationSound();

  // Initial fetch and setting up real-time listener
  useEffect(() => {
    setLoading(true);
    
    let unsubscribe = null;
    
    const setupNotifications = async () => {
      if (!currentUser) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }
      
      try {
        // Initial fetch using cloud function
        const result = await listNotifications();
        
        if (result.success) {
          setNotifications(result.notifications);
          setUnreadCount(result.notifications.filter(n => !n.read).length);
        }
        
        // Set up real-time listener
        unsubscribe = subscribeToNotifications(
          currentUser.uid,
          (newNotifications) => {
            setNotifications(newNotifications);
            setUnreadCount(newNotifications.filter(n => !n.read).length);
            
            // Check for new notifications
            const now = new Date();
            const recentNotifications = newNotifications.filter(n => {
              if (n.read) return false;
              
              const notificationTime = new Date(n.createdAt);
              const timeDiff = now.getTime() - notificationTime.getTime();
              
              // Consider notifications from the last 5 seconds as "new"
              return timeDiff < 5000;
            });
            
            // Play sound if there are recent notifications
            if (recentNotifications.length > 0) {
              playNotificationSound();
            }
          },
          (error) => {
            console.error('Notification subscription error:', error);
            setError('Failed to subscribe to notifications');
          }
        );
        
        setError(null);
      } catch (err) {
        console.error('Error setting up notifications:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    setupNotifications();
    
    // Clean up listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser, playNotificationSound]);

  // Mark a single notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      const result = await markNotificationAsRead(notificationId);
      
      if (result.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, read: true } 
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      return result;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      return { success: false, error: err.message };
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      const result = await markAllNotificationsAsRead();
      
      if (result.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(n => ({ ...n, read: true }))
        );
        setUnreadCount(0);
      }
      
      return result;
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    notifications,
    loading,
    error,
    unreadCount,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    soundEnabled,
    toggleSound
  };
};

export default useNotifications; 