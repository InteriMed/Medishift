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
      category: selectedCategory 
    });
  }, [query, lang, selectedCategory, options]);

  const categories = useMemo(() => getCategories(lang), [lang]);

  const suggestions = useMemo(() => {
    if (query.length >= 2) return [];
    return getSuggestedActions(lang, { 
      route: window.location.pathname,
      recentActions 
    });
  }, [lang, recentActions, query]);

  const allActions = useMemo(() => {
    return getActionsByCategory(lang, selectedCategory);
  }, [lang, selectedCategory]);

  const executeAction = useCallback((action) => {
    const updatedRecent = [
      action.id,
      ...recentActions.filter(id => id !== action.id)
    ].slice(0, 10);
    
    setRecentActions(updatedRecent);
    localStorage.setItem('recentServiceActions', JSON.stringify(updatedRecent));

    if (action.route) {
      navigate(action.route);
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
