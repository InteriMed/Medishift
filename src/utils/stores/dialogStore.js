/**
 * DialogStore - Simple state management for dialog boxes
 */
class DialogStore {
  constructor() {
    this.dialogConfig = null;
    this.listeners = [];
    this.isOpen = false;
  }

  openDialogbox(config) {
    this.dialogConfig = config;
    this.isOpen = true;
    this.notifyListeners();
  }

  closeDialogbox() {
    this.isOpen = false;
    this.notifyListeners();
  }

  getDialogConfig() {
    return {
      isOpen: this.isOpen,
      config: this.dialogConfig
    };
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.getDialogConfig()));
  }
}

// Export a singleton instance
export default new DialogStore(); 