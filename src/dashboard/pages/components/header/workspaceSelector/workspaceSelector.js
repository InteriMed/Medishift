import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { WORKSPACE_TYPES } from '../../../../../utils/sessionAuth';
import { LOCALSTORAGE_KEYS } from '../../../../../config/keysDatabase';
import styles from './workspaceSelector.module.css';

const WorkspaceSelector = ({ workspaces, selectedWorkspace, onSelectWorkspace, onOpenChange, children, headerColor }) => {
  const [workspaceColors, setWorkspaceColors] = useState(() => {
    try {
      const stored = localStorage.getItem(LOCALSTORAGE_KEYS.WORKSPACE_COLORS);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const getDefaultWorkspaceColor = (workspace) => {
    if (!workspace) return '#2563eb';
    
    if (workspace.type === WORKSPACE_TYPES.ADMIN) {
      return '#dc2626';
    }
    if (workspace.type === WORKSPACE_TYPES.FACILITY || workspace.type === 'team') {
      return '#0f172a';
    }
    if (workspace.type === 'organization') {
      return '#22c55e';
    }
    return '#2563eb';
  };

  const getWorkspaceColor = useCallback((workspace) => {
    if (!workspace) return getDefaultWorkspaceColor(null);
    return workspaceColors[workspace.id] || getDefaultWorkspaceColor(workspace);
  }, [workspaceColors]);

  const getAvatarColor = useCallback((workspace) => {
    if (headerColor) {
      return headerColor;
    }
    return getWorkspaceColor(workspace);
  }, [headerColor, getWorkspaceColor]);

  const handleColorChange = useCallback((workspace, color) => {
    const newColors = {
      ...workspaceColors,
      [workspace.id]: color
    };
    setWorkspaceColors(newColors);
    try {
      localStorage.setItem(LOCALSTORAGE_KEYS.WORKSPACE_COLORS, JSON.stringify(newColors));
    } catch (error) {
      console.error('Failed to save workspace color:', error);
    }
  }, [workspaceColors]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const selectorRef = useRef(null);

  useEffect(() => {
    const checkWidth = () => {
      setIsCompact(window.innerWidth < 768);
    };

    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target)) {
        if (dropdownOpen) {
          setDropdownOpen(false);
          if (onOpenChange) onOpenChange(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen, onOpenChange]);

  const toggleDropdown = () => {
    const newState = !dropdownOpen;
    setDropdownOpen(newState);
    if (onOpenChange) onOpenChange(newState);
  };

  const handleSelect = (workspace) => {
    onSelectWorkspace(workspace);
    setDropdownOpen(false);
    if (onOpenChange) onOpenChange(false);
  };

  return (
    <div className={styles.workspaceSelector} ref={selectorRef}>
      <button
        className={`${styles.selectorButton} ${isCompact ? styles.compact : ''}`}
        onClick={toggleDropdown}
      >
        {selectedWorkspace ? (
          <div className={styles.selectedWorkspace}>
            <div 
              className={styles.workspaceAvatar}
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                color: getAvatarColor(selectedWorkspace)
              }}
            >
              {selectedWorkspace.name.charAt(0)}
            </div>
            {!isCompact && <span className={styles.workspaceName}>{selectedWorkspace.name}</span>}
          </div>
        ) : (
          <span>{isCompact ? 'W' : 'Select Workspace'}</span>
        )}
        {dropdownOpen ? <FiChevronUp /> : <FiChevronDown />}
      </button>

      {dropdownOpen && (
        <div className={styles.dropdown}>
          {workspaces.map(workspace => (
            <div
              key={workspace.id}
              className={`${styles.workspaceOptionWrapper} ${selectedWorkspace?.id === workspace.id ? styles.active : ''}`}
            >
              <button
                className={`${styles.workspaceOption} ${selectedWorkspace?.id === workspace.id ? styles.active : ''}`}
                onClick={() => handleSelect(workspace)}
              >
                <div 
                  className={styles.workspaceAvatar}
                  style={{ 
                    backgroundColor: '#f8f9fa',
                    color: getWorkspaceColor(workspace)
                  }}
                >
                  {workspace.name.charAt(0)}
                </div>
                <span className={styles.workspaceName}>{workspace.name}</span>
              </button>
            </div>
          ))}
          {children}
        </div>
      )}
    </div>
  );
};

export default WorkspaceSelector; 