import Cookies from 'js-cookie';
import { COOKIE_KEYS, COOKIE_CONFIG } from '../config/keysDatabase';

const WORKSPACE_COOKIE = COOKIE_KEYS.WORKSPACE;
const COOKIE_EXPIRY_DAYS = COOKIE_CONFIG.WORKSPACE_EXPIRY_DAYS;

/**
 * Set the selected workspace in cookies
 * @param {Object} workspace - The workspace object to store
 * @param {string|number} workspace.id - Workspace ID
 * @param {string} workspace.name - Workspace name
 */
export const setWorkspaceCookie = (workspace) => {
  if (!workspace || !workspace.id) {
    console.warn('Invalid workspace object provided to setWorkspaceCookie');
    return;
  }
  
  try {
    const workspaceData = {
      id: workspace.id,
      name: workspace.name,
      timestamp: Date.now()
    };
    
    Cookies.set(WORKSPACE_COOKIE, JSON.stringify(workspaceData), { 
      expires: COOKIE_EXPIRY_DAYS,
      sameSite: 'strict'
    });
    
    console.log(`[CookieUtils] Workspace set in cookie:`, workspace.name);
  } catch (error) {
    console.error('Error setting workspace cookie:', error);
  }
};

/**
 * Get the selected workspace from cookies
 * @returns {Object|null} The workspace object or null if not found
 */
export const getWorkspaceCookie = () => {
  try {
    const workspaceCookie = Cookies.get(WORKSPACE_COOKIE);
    
    if (!workspaceCookie) {
      return null;
    }
    
    const workspaceData = JSON.parse(workspaceCookie);
    
    // Validate the data structure
    if (!workspaceData.id || !workspaceData.name) {
      console.warn('Invalid workspace data in cookie, clearing...');
      clearWorkspaceCookie();
      return null;
    }
    
    return {
      id: workspaceData.id,
      name: workspaceData.name
    };
  } catch (error) {
    console.error('Error reading workspace cookie:', error);
    clearWorkspaceCookie(); // Clear corrupted cookie
    return null;
  }
};

/**
 * Clear the workspace cookie
 */
export const clearWorkspaceCookie = () => {
  try {
    Cookies.remove(WORKSPACE_COOKIE);
    console.log('[CookieUtils] Workspace cookie cleared');
  } catch (error) {
    console.error('Error clearing workspace cookie:', error);
  }
};

/**
 * Check if a workspace cookie exists
 * @returns {boolean} True if workspace cookie exists
 */
export const hasWorkspaceCookie = () => {
  return !!Cookies.get(WORKSPACE_COOKIE);
}; 