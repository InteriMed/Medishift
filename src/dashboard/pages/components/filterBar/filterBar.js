import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiGrid, FiList, FiSearch, FiSliders, FiArrowDown, FiCheck, FiRefreshCw, FiPlus } from 'react-icons/fi';
import SimpleDropdown from '../../../components/BoxedInputFields/Dropdown-Field';
import DateField from '../../../components/BoxedInputFields/DateField';
import { cn } from '../../../utils/cn';
import styles from './filterBar.module.css';

const FilterBar = ({
  filters = {},
  onFilterChange,
  onApplyFilters,
  onClearFilters,
  searchValue = '',
  onSearchChange,
  searchPlaceholder,
  dropdownFields = [],
  dateFields = [],
  showViewToggle = false,
  viewMode = 'list',
  onViewModeChange,
  sortOptions = [],
  sortValue,
  onSortChange,
  translationNamespace = 'common',
  title,
  description,
  onRefresh,
  onAdd,
  showAdd = true,
  addLabel,
  isLoading = false
}) => {
  const { t } = useTranslation([translationNamespace]);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [justExpanded, setJustExpanded] = useState(false);
  const [showActiveFilters, setShowActiveFilters] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const toggleFilters = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const willExpand = !isFiltersExpanded;
    setIsFiltersExpanded(willExpand);
    if (willExpand) {
      setJustExpanded(true);
      setTimeout(() => {
        setJustExpanded(false);
      }, 150);
    }
  };

  const handleApplyFilters = () => {
    if (onApplyFilters) {
      onApplyFilters();
    }
    setShowActiveFilters(true);
  };

  const handleClearAllFilters = () => {
    if (onClearFilters) {
      onClearFilters();
    } else {
      const clearedFilters = {};
      dropdownFields.forEach(field => {
        clearedFilters[field.key] = field.defaultValue || (field.multiple ? [] : '');
      });
      dateFields.forEach(field => {
        clearedFilters[field.key] = null;
      });
      if (onFilterChange) {
        Object.keys(clearedFilters).forEach(key => {
          onFilterChange(key, clearedFilters[key]);
        });
      }
    }
    setShowActiveFilters(false);
  };

  const hasActiveFilters = () => {
    if (dropdownFields.some(field => {
      const value = filters[field.key];
      return field.multiple ? (value && value.length > 0) : (value && value !== field.defaultValue && value !== 'all');
    })) return true;

    if (dateFields.some(field => filters[field.key])) return true;

    return false;
  };

  const getActiveCount = () => {
    let count = 0;
    dropdownFields.forEach(field => {
      const value = filters[field.key];
      if (field.multiple ? (value && value.length > 0) : (value && value !== field.defaultValue && value !== 'all')) {
        count++;
      }
    });
    dateFields.forEach(field => {
      if (filters[field.key]) count++;
    });
    return count;
  };

  const activeCount = getActiveCount();

  const getSortLabel = () => {
    if (!sortValue && sortOptions.length > 0) {
      return t('filter.sortBy', 'Sort by');
    }
    const option = sortOptions.find(opt => opt.value === sortValue);
    return option ? option.label : t('filter.sortBy', 'Sort by');
  };

  return (
    <div
      className={cn(styles.filterBar, isFiltersExpanded ? styles.expanded : '')}
      onMouseDown={(e) => {
        if (e.target.closest('button[title="Parameters"]')) {
          e.stopPropagation();
        }
      }}
    >
      <div className={styles.filterHeader}>
        <h3 className={styles.filterTitle}>
          {title || t('filter.title', 'Filters')}
        </h3>
        <div className={styles.headerActions}>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className={cn(styles.refreshButton, isLoading && styles.loading)}
            >
              <FiRefreshCw className={cn(styles.refreshIcon, isLoading && styles.spinning)} />
              {t('refresh', 'Refresh')}
            </button>
          )}
          {showAdd && onAdd && (
            <button
              onClick={onAdd}
              className={styles.addButton}
              title={addLabel || t('add', 'Add')}
            >
              <FiPlus className={styles.addIcon} />
              {addLabel || t('add', 'Add')}
            </button>
          )}
        </div>
      </div>

      <div className={styles.filterDescription}>
        <p className={styles.descriptionText}>
          {description || t('filter.description', 'Filter and search your data')}
        </p>
      </div>

      <div className={styles.filterRow}>
        {onSearchChange && (
          <div className={styles.searchContainer}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder || t('filter.search', 'Search...')}
              className={styles.searchInput}
              style={{
                height: 'var(--boxed-inputfield-height)',
                fontWeight: '500',
                fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
                color: 'var(--boxed-inputfield-color-text)'
              }}
            />
          </div>
        )}

        {dateFields.map((field) => {
          let label = field.label;
          if (!label) {
            if (field.key === 'fromDate') {
              label = t('filter.fromDate', 'From');
            } else if (field.key === 'toDate') {
              label = t('filter.toDate', 'To');
            } else {
              label = field.key;
            }
          }
          return (
            <div key={field.key} className={styles.dateFieldContainer}>
              <DateField
                label={label}
                value={filters[field.key] ? new Date(filters[field.key]) : null}
                onChange={(date) => onFilterChange && onFilterChange(field.key, date ? date.toISOString().split('T')[0] : null)}
                marginBottom="0"
                showClearButton={field.showClearButton !== false}
              />
            </div>
          );
        })}

        {sortOptions.length > 0 && onSortChange && (
          <div className={styles.sortContainer}>
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className={styles.sortButton}
              style={{ height: 'var(--boxed-inputfield-height)', width: 'var(--boxed-inputfield-height)' }}
              title={getSortLabel()}
            >
              <FiArrowDown className={styles.sortIcon} />
            </button>
            {showSortDropdown && (
              <>
                <div
                  className={styles.sortDropdownOverlay}
                  onClick={() => setShowSortDropdown(false)}
                />
                <div className={styles.sortDropdown}>
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onSortChange(option.value);
                        setShowSortDropdown(false);
                      }}
                      className={cn(
                        styles.sortOption,
                        sortValue === option.value && styles.sortOptionActive
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {(dropdownFields.length > 0 || dateFields.length > 0) && (
          <button
            onClick={toggleFilters}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className={cn(
              styles.parametersButton,
              isFiltersExpanded && styles.parametersButtonActive
            )}
            style={{ height: 'var(--boxed-inputfield-height)', width: 'var(--boxed-inputfield-height)' }}
            title="Parameters"
          >
            <FiSliders className={cn(styles.parametersIcon, isFiltersExpanded && styles.parametersIconActive)} />
            {activeCount > 0 && (
              <span className={styles.activeCountBadge}>
                {activeCount}
              </span>
            )}
          </button>
        )}

        {showViewToggle && onViewModeChange && (
          <div className={styles.viewToggleContainer}>
            <button
              onClick={() => onViewModeChange('grid')}
              className={cn(
                styles.viewToggleButton,
                viewMode === 'grid' && styles.viewToggleButtonActive
              )}
              title={t('filter.view.grid', 'Grid view')}
            >
              <FiGrid className={styles.viewToggleIcon} />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={cn(
                styles.viewToggleButton,
                viewMode === 'list' && styles.viewToggleButtonActive
              )}
              title={t('filter.view.list', 'List view')}
            >
              <FiList className={styles.viewToggleIcon} />
            </button>
          </div>
        )}

        {isFiltersExpanded && (
          <div
            className={styles.expandedFilters}
            style={{ pointerEvents: justExpanded ? 'none' : 'auto' }}
            onMouseDown={(e) => {
              if (justExpanded) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
            }}
          >
            <div className={styles.expandedFiltersGrid}>
              {dropdownFields.map((field) => (
                <SimpleDropdown
                  key={field.key}
                  label={field.label}
                  options={field.options}
                  value={filters[field.key] || field.defaultValue || ''}
                  onChange={(value) => onFilterChange && onFilterChange(field.key, value)}
                  disabled={field.disabled}
                />
              ))}
            </div>
            {activeCount > 0 && (
              <div className={styles.filterActionsSection}>
                <div className={styles.filterActionsRow}>
                  <button
                    onClick={handleApplyFilters}
                    className={styles.applyButton}
                    style={{ height: 'var(--boxed-inputfield-height)' }}
                  >
                    <FiCheck className={styles.applyIcon} />
                    {t('filter.apply', 'Apply Filters')}
                  </button>

                  {showActiveFilters && (
                    <div className={styles.activeFiltersDisplay}>
                      {dropdownFields.map((field) => {
                        const value = filters[field.key];
                        if (field.multiple ? (value && value.length > 0) : (value && value !== field.defaultValue && value !== 'all')) {
                          const option = field.options?.find(opt => opt.value === value);
                          return (
                            <span key={field.key} className={styles.activeFilterTag}>
                              {field.label}: {option ? option.label : value}
                            </span>
                          );
                        }
                        return null;
                      })}
                      {dateFields.map((field) => {
                        if (filters[field.key]) {
                          let label = field.label;
                          if (!label) {
                            if (field.key === 'fromDate') {
                              label = t('filter.fromDate', 'From');
                            } else if (field.key === 'toDate') {
                              label = t('filter.toDate', 'To');
                            } else {
                              label = field.key;
                            }
                          }
                          return (
                            <span key={field.key} className={styles.activeFilterTag}>
                              {label}: {new Date(filters[field.key]).toLocaleDateString()}
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterBar;