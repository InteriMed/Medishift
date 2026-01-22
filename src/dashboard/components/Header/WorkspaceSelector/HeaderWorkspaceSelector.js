import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiChevronUp, FiUser, FiUsers, FiCheck, FiShield } from 'react-icons/fi';
import { WORKSPACE_TYPES } from '../../../../utils/sessionAuth';


// Logo colors for role-based styling
const LOGO_COLOR_1 = 'var(--color-logo-1, #2563eb)'; // Professional - Blue
const LOGO_COLOR_2 = 'var(--color-logo-2, #0f172a)'; // Facility - Dark Blue
const LOGO_COLOR_ADMIN = '#dc2626'; // Admin - Red

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

  const getWorkspaceIcon = (workspaceType) => {
    if (workspaceType === WORKSPACE_TYPES.PERSONAL) return <FiUser />;
    if (workspaceType === WORKSPACE_TYPES.ADMIN) return <FiShield />;
    return <FiUsers />;
  };

  // Get the appropriate color for the workspace type
  const getWorkspaceColor = (workspaceType) => {
    if (workspaceType === WORKSPACE_TYPES.PERSONAL) return LOGO_COLOR_1;
    if (workspaceType === WORKSPACE_TYPES.ADMIN) return LOGO_COLOR_ADMIN;
    return LOGO_COLOR_2;
  };

  // Get display name with role-specific default names
  const getWorkspaceDisplayName = (workspace) => {
    if (!workspace) return 'Select Workspace';
    if (workspace.type === WORKSPACE_TYPES.PERSONAL) {
      return 'Professional Profile';
    } else if (workspace.type === WORKSPACE_TYPES.ADMIN) {
      return workspace.name || 'Admin Workspace';
    } else {
      // Use facility name if available, otherwise default to "Facility Profile"
      const facilityName = workspace.name?.replace(' - Team Workspace', '');
      return facilityName || 'Facility Profile';
    }
  };

  const displayWorkspace = selectedWorkspace || (workspaces && workspaces.length > 0 ? workspaces[0] : null);
  const hasWorkspaces = workspaces && workspaces.length > 0;
  const defaultColor = LOGO_COLOR_1;

  return (
    <div className="relative" ref={dropdownRef} data-tutorial="workspace-selector">
      <button
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
        onClick={toggleDropdown}
        aria-expanded={dropdownOpen}
        aria-haspopup="listbox"
        aria-label="Select workspace"
        style={{
          backgroundColor: displayWorkspace ? getWorkspaceColor(displayWorkspace?.type) : defaultColor,
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
          <>
            <div
              className="flex items-center justify-center w-6 h-6 rounded-md"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff'
              }}
            >
              <FiUser />
            </div>
            <span className="text-sm font-medium text-white">Select Workspace</span>
            <div style={{ color: '#ffffff' }}>
              {dropdownOpen ? <FiChevronUp /> : <FiChevronDown />}
            </div>
          </>
        )}
      </button>

      {dropdownOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-72 rounded-xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          style={{
            backgroundColor: 'var(--background-div-color, #ffffff)',
            zIndex: 15000
          }}
          role="listbox"
        >
          <div className="p-2">
            {hasWorkspaces ? (
              <div className="text-xs font-semibold text-muted-foreground px-3 py-2 mb-1">
                Current Workspace
              </div>
            ) : (
              <div className="text-xs text-muted-foreground px-3 py-2 mb-1">
                No workspaces available. Complete onboarding to access workspaces.
              </div>
            )}

            {hasWorkspaces && workspaces.map((workspace, index) => {
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
                        {workspace.type === WORKSPACE_TYPES.PERSONAL ? 'Personal Account' : 
                         workspace.type === WORKSPACE_TYPES.ADMIN ? 'Admin Workspace' : 
                         'Team Workspace'}
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

            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export default HeaderWorkspaceSelector; 