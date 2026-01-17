import { useEffect, useCallback } from 'react';

/**
 * Custom hook for keyboard shortcuts
 * Handles undo/redo, delete, escape, and other keyboard interactions
 * 
 * Extracted from Calendar.js to separate input handling logic
 */
export const useKeyboardShortcuts = (
  undo, 
  redo, 
  selectedEvent, 
  showDeleteConfirmation,
  onDeleteEvent,
  onPanelClose
) => {
  
  // Keyboard shortcut handler
  const handleKeyboardShortcuts = useCallback((e) => {
    // Only handle shortcuts if no input is focused
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Ctrl+Z for undo
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (undo) {
        undo();
      }
    }
    // Ctrl+Shift+Z or Ctrl+Y for redo
    else if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) {
      e.preventDefault();
      if (redo) {
        redo();
      }
    }
    // Delete key for deleting selected event
    else if (e.key === 'Delete' && selectedEvent && !showDeleteConfirmation) {
      e.preventDefault();
      if (onDeleteEvent) {
        onDeleteEvent(selectedEvent);
      }
    }
    // Escape key for closing panels/dialogs
    else if (e.key === 'Escape') {
      e.preventDefault();
      if (selectedEvent && onPanelClose) {
        onPanelClose();
      }
    }
  }, [undo, redo, selectedEvent, showDeleteConfirmation, onDeleteEvent, onPanelClose]);

  // Register keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, [handleKeyboardShortcuts]);

  return {
    handleKeyboardShortcuts
  };
}; 