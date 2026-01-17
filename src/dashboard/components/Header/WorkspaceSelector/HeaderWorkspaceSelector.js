import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiChevronUp, FiUser, FiUsers, FiCheck } from 'react-icons/fi';
import { WORKSPACE_TYPES } from '../../../../utils/sessionAuth';


// Logo colors for role-based styling
const LOGO_COLOR_1 = 'var(--color-logo-1, #2563eb)'; // Professional - Blue
const LOGO_COLOR_2 = 'var(--color-logo-2, #0f172a)'; // Facility - Dark Blue

const HeaderWorkspaceSelector = ({ workspaces, selectedWorkspace, onSelectWorkspace, onOpenChange, children }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Notify parent of state change
  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(dropdownOpen);
    }
  }, [dropdownOpen, onOpenChange]);

  const toggleDropdown = () => {
    setDropdownOpen(prev => !prev);
  };

  const handleSelect = (workspace) => {
    onSelectWorkspace(workspace);
    setDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [dropdownOpen]);

  // Hide selector if no workspaces are available
  if (!workspaces || workspaces.length === 0) {
    return null;
  }

  const getWorkspaceIcon = (workspaceType) => {
    return workspaceType === WORKSPACE_TYPES.PERSONAL ? <FiUser /> : <FiUsers />;
  };

  // Get the appropriate color for the workspace type
  const getWorkspaceColor = (workspaceType) => {
    return workspaceType === WORKSPACE_TYPES.PERSONAL ? LOGO_COLOR_1 : LOGO_COLOR_2;
  };

  // Get display name with role-specific default names
  const getWorkspaceDisplayName = (workspace) => {
    if (!workspace) return 'Select Workspace';
    if (workspace.type === WORKSPACE_TYPES.PERSONAL) {
      return 'Professional Profile';
    } else {
      // Use facility name if available, otherwise default to "Facility Profile"
      const facilityName = workspace.name?.replace(' - Team Workspace', '');
      return facilityName || 'Facility Profile';
    }
  };

  const displayWorkspace = selectedWorkspace || (workspaces && workspaces.length > 0 ? workspaces[0] : null);

  return (
    <div className="relative" ref={dropdownRef} data-tutorial="workspace-selector">
      <button
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all shadow-sm hover:shadow hover:opacity-90"
        onClick={toggleDropdown}
        aria-expanded={dropdownOpen}
        aria-haspopup="listbox"
        aria-label="Select workspace"
        style={{
          borderColor: getWorkspaceColor(displayWorkspace?.type),
          backgroundColor: getWorkspaceColor(displayWorkspace?.type),
        }}
      >
        {displayWorkspace ? (
          <>
            <div
              className="flex items-center justify-center w-6 h-6 rounded-md"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff'
              }}
            >
              {getWorkspaceIcon(displayWorkspace.type)}
            </div>
            <span
              className="text-sm font-medium"
              style={{ color: '#ffffff' }}
            >
              {getWorkspaceDisplayName(displayWorkspace)}
            </span>
            <div style={{ color: '#ffffff' }}>
              {dropdownOpen ? <FiChevronUp /> : <FiChevronDown />}
            </div>
          </>
        ) : (
          <span className="text-sm text-white">Select Workspace</span>
        )}
      </button>

      {dropdownOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-72 rounded-xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          style={{
            backgroundColor: 'var(--background-div-color, #ffffff)',
            zIndex: 15000 // Higher than onboarding overlays
          }}
          role="listbox"
        >
          <div className="p-2">
            <div className="text-xs font-semibold text-muted-foreground px-3 py-2 mb-1">
              Current Workspace
            </div>

            {workspaces.map((workspace, index) => {
              const isSelected = selectedWorkspace?.id === workspace.id;
              const workspaceColor = getWorkspaceColor(workspace.type);

              return (
                <React.Fragment key={workspace.id}>
                  {index === 1 && workspaces.length > 1 && (
                    <>
                      <div className="my-1" />
                      <div className="text-xs font-semibold text-muted-foreground px-3 py-2">
                        Other Workspaces
                      </div>
                    </>
                  )}
                  <button
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${isSelected ? 'bg-muted/50' : 'hover:bg-muted/50'}`}
                    onClick={() => handleSelect(workspace)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div
                      className="p-2 rounded-lg border"
                      style={{
                        backgroundColor: workspaceColor,
                        borderColor: workspaceColor,
                        border: '1px solid',
                        color: '#ffffff'
                      }}
                    >
                      {getWorkspaceIcon(workspace.type)}
                    </div>
                    <div className="flex flex-col items-start flex-1 text-left">
                      <span className="text-sm font-medium text-foreground">
                        {getWorkspaceDisplayName(workspace)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {workspace.type === WORKSPACE_TYPES.PERSONAL ? 'Personal Account' : 'Team Workspace'}
                      </span>
                    </div>
                    {isSelected && (
                      <div
                        className="flex items-center justify-center w-5 h-5 rounded-full"
                        style={{ backgroundColor: workspaceColor, color: '#ffffff' }}
                      >
                        <FiCheck className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                </React.Fragment>
              );
            })}

            {/* Footer / Children Content (e.g., Create Business Button) */}
            {children && (
              <div className="mt-2 pt-2 border-t border-border">
                {children}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HeaderWorkspaceSelector; 