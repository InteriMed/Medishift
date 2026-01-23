import React, { useState, useRef, useEffect } from 'react';
import { FiSearch, FiX, FiChevronRight, FiClock, FiGrid } from 'react-icons/fi';
import { useServiceSearch } from './useServiceSearch';
import './ServiceSearchBar.css';

const ServiceSearchBar = ({ onActionSelect, placeholder, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const {
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
    isSearching,
    hasResults,
    searchT
  } = useServiceSearch({ limit: 8 });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDisplayItems = () => {
    if (isSearching) return results;
    if (selectedCategory) return allActions;
    return suggestions;
  };

  const displayItems = getDisplayItems();

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, displayItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        if (focusedIndex >= 0 && displayItems[focusedIndex]) {
          handleSelect(displayItems[focusedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
      default:
        break;
    }
  };

  const handleSelect = (action) => {
    const executed = executeAction(action);
    setIsOpen(false);
    clearQuery();
    setSelectedCategory(null);
    setFocusedIndex(-1);
    if (onActionSelect) {
      onActionSelect(executed);
    }
  };

  return (
    <div className={`service-search-container ${className}`} ref={dropdownRef}>
      <div className="service-search-input-wrapper">
        <FiSearch className="service-search-icon" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || searchT.placeholder}
          className="service-search-input"
        />
        {query && (
          <button 
            onClick={() => { clearQuery(); inputRef.current?.focus(); }}
            className="service-search-clear"
          >
            <FiX />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="service-search-dropdown">
          {selectedCategory && (
            <div className="service-search-filter-bar">
              <span>{categories.find(c => c.id === selectedCategory)?.label}</span>
              <button onClick={() => setSelectedCategory(null)}>
                <FiX size={14} />
              </button>
            </div>
          )}

          {!isSearching && !selectedCategory && (
            <div className="service-search-categories">
              <div className="service-search-section-title">
                {searchT.categories}
              </div>
              <div className="service-search-category-grid">
                {categories.slice(0, 6).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className="service-search-category-btn"
                    style={{ '--category-color': cat.color }}
                  >
                    <span className="service-search-category-label">{cat.label}</span>
                    <span className="service-search-category-count">{cat.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {displayItems.length > 0 && (
            <div className="service-search-results">
              {!isSearching && !selectedCategory && (
                <div className="service-search-section-title">
                  <FiClock size={14} />
                  {searchT.suggestions}
                </div>
              )}
              {!isSearching && selectedCategory && (
                <div className="service-search-section-title">
                  <FiGrid size={14} />
                  {searchT.actions || 'Actions'}
                </div>
              )}
              {displayItems.map((action, index) => (
                <button
                  key={action.id}
                  onClick={() => handleSelect(action)}
                  className={`service-search-result-item ${focusedIndex === index ? 'focused' : ''}`}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  <div className="service-search-result-content">
                    <span className="service-search-result-label">{action.label}</span>
                    {action.description && (
                      <span className="service-search-result-description">{action.description}</span>
                    )}
                    {!selectedCategory && (
                      <span className="service-search-result-category">{action.categoryLabel}</span>
                    )}
                  </div>
                  <FiChevronRight className="service-search-result-arrow" />
                </button>
              ))}
            </div>
          )}

          {isSearching && !hasResults && (
            <div className="service-search-no-results">
              {searchT.noResults}
            </div>
          )}

          {selectedCategory && displayItems.length === 0 && !isSearching && (
            <div className="service-search-no-results">
              {searchT.noActionsInCategory || 'No actions in this category'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ServiceSearchBar;
