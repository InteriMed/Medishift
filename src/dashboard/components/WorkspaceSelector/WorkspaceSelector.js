import React, { useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import styles from './workspaceSelector.module.css';

const WorkspaceSelector = ({ workspaces, selectedWorkspace, onSelectWorkspace }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setDropdownOpen(prev => !prev);
  };

  const handleSelect = (workspace) => {
    onSelectWorkspace(workspace);
    setDropdownOpen(false);
  };

  return (
    <div className={styles.workspaceSelector}>
      <button 
        className={styles.selectorButton} 
        onClick={toggleDropdown}
      >
        {selectedWorkspace ? (
          <div className={styles.selectedWorkspace}>
            <div className={styles.workspaceAvatar}>
              {selectedWorkspace.name.charAt(0)}
            </div>
            <span className={styles.workspaceName}>{selectedWorkspace.name}</span>
          </div>
        ) : (
          <span>Select Workspace</span>
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
              <div className={styles.workspaceAvatar}>
                {workspace.name.charAt(0)}
              </div>
              <span className={styles.workspaceName}>{workspace.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkspaceSelector; 