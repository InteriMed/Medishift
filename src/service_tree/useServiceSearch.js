import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  searchActions, 
  getActionsByCategory, 
  getCategories, 
  getSuggestedActions,
  getSearchTranslations
} from './searchService';

export const useServiceSearch = (options = {}) => {
  const { i18n } = useTranslation();
  const lang = i18n.language?.substring(0, 2) || 'en';
  const navigate = useNavigate();
  const workspace = options.workspace || null;
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [recentActions, setRecentActions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('recentServiceActions') || '[]');
    } catch {
      return [];
    }
  });

  const searchT = useMemo(() => getSearchTranslations(lang), [lang]);

  const results = useMemo(() => {
    if (!query || query.length < 2) return [];
    return searchActions(query, lang, { 
      ...options, 
      category: selectedCategory,
      workspace: workspace
    });
  }, [query, lang, selectedCategory, workspace, options]);

  const categories = useMemo(() => getCategories(lang), [lang]);

  const suggestions = useMemo(() => {
    if (query.length >= 2) return [];
    return getSuggestedActions(lang, { 
      route: window.location.pathname,
      recentActions,
      workspace: workspace
    });
  }, [lang, recentActions, query, workspace]);

  const allActions = useMemo(() => {
    return getActionsByCategory(lang, selectedCategory, workspace);
  }, [lang, selectedCategory, workspace]);

  const executeAction = useCallback((action) => {
    const updatedRecent = [
      action.id,
      ...recentActions.filter(id => id !== action.id)
    ].slice(0, 10);
    
    setRecentActions(updatedRecent);
    localStorage.setItem('recentServiceActions', JSON.stringify(updatedRecent));

    if (action.route) {
      const routeWithQuery = action.route.includes('?') 
        ? action.route 
        : action.route;
      
      navigate(routeWithQuery);
      
      if (routeWithQuery.includes('?modal=') || routeWithQuery.includes('?action=')) {
        setTimeout(() => {
          const url = new URL(window.location.href);
          const modalParam = url.searchParams.get('modal');
          const actionParam = url.searchParams.get('action');
          
          if (modalParam === 'upload') {
            const event = new CustomEvent('openModal', { 
              detail: { type: 'policyUpload' } 
            });
            window.dispatchEvent(event);
          }
          
          if (actionParam === 'create') {
            const event = new CustomEvent('openModal', { 
              detail: { type: 'createEvent' } 
            });
            window.dispatchEvent(event);
          }
        }, 100);
      }
    }

    return action;
  }, [navigate, recentActions]);

  const clearQuery = useCallback(() => {
    setQuery('');
  }, []);

  const clearCategory = useCallback(() => {
    setSelectedCategory(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    categories,
    selectedCategory,
    setSelectedCategory,
    suggestions,
    allActions,
    executeAction,
    clearQuery,
    clearCategory,
    recentActions,
    isSearching: query.length >= 2,
    hasResults: results.length > 0,
    searchT
  };
};

export default useServiceSearch;
