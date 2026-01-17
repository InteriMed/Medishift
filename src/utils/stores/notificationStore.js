/**
 * NotificationStore - Simple state management for notifications
 */
class NotificationStore {
  constructor() {
    this.notifications = [];
    this.listeners = [];
    this.currentId = 0;
  }

  showNotification(message, type = 'info', duration = 5000) {
    const id = this.currentId++;
    const notification = {
      id,
      message,
      type,
      timestamp: new Date().getTime()
    };
    
    this.notifications.push(notification);
    this.notifyListeners();
    
    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        this.dismissNotification(id);
      }, duration);
    }
    
    return id;
  }
  
  dismissNotification(id) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }
  
  clearAll() {
    this.notifications = [];
    this.notifyListeners();
  }
  
  getNotifications() {
    return [...this.notifications];
  }
  
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.getNotifications()));
  }
}

// Export a singleton instance
const notificationStore = new NotificationStore();
export default notificationStore; 