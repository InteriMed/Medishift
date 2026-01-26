import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { WORKSPACE_TYPES } from '../../../../utils/sessionAuth';
import styles from './workspaceSelector.module.css';

const WorkspaceSelector = ({ workspaces, selectedWorkspace, onSelectWorkspace, onOpenChange, children }) => {
  const getWorkspaceColor = (workspace) => {
    if (!workspace) return 'var(--color-logo-1, #2563eb)';
    
    if (workspace.type === WORKSPACE_TYPES.ADMIN) {
      return '#dc2626';
    }
    if (workspace.type === WORKSPACE_TYPES.FACILITY || workspace.type === 'team') {
      return 'var(--color-logo-2, #0f172a)';
    }
    return 'var(--color-logo-1, #2563eb)';
  };
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
              style={{ backgroundColor: getWorkspaceColor(selectedWorkspace) }}
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
            <button
              key={workspace.id}
              className={`${styles.workspaceOption} ${selectedWorkspace?.id === workspace.id ? styles.active : ''}`}
              onClick={() => handleSelect(workspace)}
            >
              <div 
                className={styles.workspaceAvatar}
                style={{ backgroundColor: getWorkspaceColor(workspace) }}
              >
                {workspace.name.charAt(0)}
              </div>
              <span className={styles.workspaceName}>{workspace.name}</span>
            </button>
          ))}
          {children}
        </div>
      )}
    </div>
  );
};

export default WorkspaceSelector; 