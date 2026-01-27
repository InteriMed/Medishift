import React, { useState } from 'react';
import {
    FiSearch,
    FiPlus,
    FiBell,
    FiSliders,
    FiArrowDown,
    FiGrid,
    FiList,
    FiCheck,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useMobileView } from '../../../hooks/useMobileView';
import { cn } from '../../../../utils/cn';
import DateField from '../../../../components/BoxedInputFields/DateField';
import SimpleDropdown from '../../../../components/BoxedInputFields/Dropdown-Field';
import '../../../../components/BoxedInputFields/styles/boxedInputFields.css';

export const AnnouncementsToolbar = ({
    searchQuery,
    setSearchQuery,
    selectedFilter,
    setSelectedFilter,
    onCreateAnnouncement,
}) => {
    const { t } = useTranslation(['messages', 'common']);
    const isMobile = useMobileView();
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
    const [justExpanded, setJustExpanded] = useState(false);
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [showActiveFilters, setShowActiveFilters] = useState(false);
    const [sortBy, setSortBy] = useState('date');
    const [viewMode, setViewMode] = useState('list');
    const [filters, setFilters] = useState({
        status: selectedFilter,
        fromDate: '',
        toDate: ''
    });

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
        if (key === 'status') {
            setSelectedFilter(value);
        }
    };

    const activeCount = (filters.status !== 'all' ? 1 : 0) + (filters.fromDate ? 1 : 0) + (filters.toDate ? 1 : 0);

    const statusOptions = [
        { value: 'all', label: t('messages:filters.all', 'All Announcements') },
        { value: 'unread', label: t('messages:filters.unread', 'Unread') },
        { value: 'unresponded', label: t('messages:filters.unresponded', 'Unresponded') }
    ];

    const sortOptions = [
        { value: 'date', label: t('messages:sort.date', 'Date') },
        { value: 'title', label: t('messages:sort.title', 'Title') },
        { value: 'urgency', label: t('messages:sort.urgency', 'Urgency') }
    ];

    return (
        <div className="max-w-[1400px] mx-auto w-full px-6">
            <div 
                className={cn(
                    "bg-card rounded-xl border border-border hover:shadow-md transition-shadow w-full",
                    isFiltersExpanded ? 'px-6 py-3' : 'px-6 py-2'
                )}
                onMouseDown={(e) => {
                    if (e.target.closest('button[title="Parameters"]')) {
                        e.stopPropagation();
                    }
                }}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-foreground mb-0">
                        {t('messages:announcements.title', 'Announcements')}
                    </h3>
                    <button
                        onClick={onCreateAnnouncement}
                        className="px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2 shrink-0"
                        style={{ height: 'var(--boxed-inputfield-height)' }}
                    >
                        <FiPlus className="w-4 h-4" />
                        {t('messages:newAnnouncement', 'New Announcement')}
                    </button>
                </div>
                <div className="pt-3 border-t border-border mb-4">
                    <p className="text-sm text-muted-foreground">
                        {t('messages:announcements.description', 'Browse and search for announcements in your workspace.')}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full">
                    <div className="relative flex-1 min-w-[200px]">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('messages:searchPlaceholder', 'Search announcements...')}
                            className="w-full pl-9 pr-8 rounded-xl border-2 border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-0 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.1)] transition-all hover:border-muted-foreground/30 hover:bg-muted/30"
                            style={{
                                height: 'var(--boxed-inputfield-height)',
                                fontWeight: '500',
                                fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
                                color: 'var(--boxed-inputfield-color-text)'
                            }}
                        />
                    </div>

                    <div className="relative shrink-0 w-[218px]">
                        <DateField
                            label="From"
                            value={filters.fromDate ? new Date(filters.fromDate) : null}
                            onChange={(date) => handleFilterChange('fromDate', date ? date.toISOString().split('T')[0] : '')}
                            marginBottom="0"
                            showClearButton={true}
                        />
                    </div>

                    <div className="relative shrink-0 w-[218px]">
                        <DateField
                            label="To"
                            value={filters.toDate ? new Date(filters.toDate) : null}
                            onChange={(date) => handleFilterChange('toDate', date ? date.toISOString().split('T')[0] : '')}
                            marginBottom="0"
                            showClearButton={true}
                        />
                    </div>

                    <div className="relative shrink-0">
                        <button
                            onClick={() => setShowSortDropdown(!showSortDropdown)}
                            className="px-4 rounded-xl border-2 border-input bg-background text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 text-sm font-medium transition-all flex items-center gap-2 shrink-0"
                            style={{ height: 'var(--boxed-inputfield-height)' }}
                        >
                            <FiArrowDown className="w-4 h-4" />
                            {t('messages:sortBy', 'Sort by')}
                        </button>
                        {showSortDropdown && (
                            <>
                                <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={() => setShowSortDropdown(false)}
                                />
                                <div className="absolute top-full mt-2 right-0 z-20 bg-card border border-border rounded-lg shadow-lg min-w-[180px]">
                                    {sortOptions.map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => {
                                                setSortBy(option.value);
                                                setShowSortDropdown(false);
                                            }}
                                            className={cn(
                                                "w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors",
                                                sortBy === option.value && "bg-muted"
                                            )}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const willExpand = !isFiltersExpanded;
                            setIsFiltersExpanded(willExpand);
                            if (willExpand) {
                                setJustExpanded(true);
                                setTimeout(() => {
                                    setJustExpanded(false);
                                }, 150);
                            }
                        }}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        className={cn(
                            "flex items-center justify-center rounded-xl border-2 transition-all relative shrink-0",
                            isFiltersExpanded
                                ? "bg-[var(--color-logo-1)] border-[var(--color-logo-1)] text-white"
                                : "bg-background border-input text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                        )}
                        style={{ height: 'var(--boxed-inputfield-height)', width: 'var(--boxed-inputfield-height)' }}
                        title="Parameters"
                    >
                        <FiSliders className={`w-4 h-4 ${isFiltersExpanded ? 'text-white' : ''}`} />
                        {activeCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                                {activeCount}
                            </span>
                        )}
                    </button>

                    <div className="flex items-center gap-1 border-2 border-input rounded-xl p-0.5 bg-background shrink-0" style={{ height: 'var(--boxed-inputfield-height)' }}>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "h-full aspect-square flex items-center justify-center rounded-lg transition-all",
                                viewMode === 'grid'
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                            title={t('messages:view.grid', 'Grid view')}
                        >
                            <FiGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "h-full aspect-square flex items-center justify-center rounded-lg transition-all",
                                viewMode === 'list'
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                            title={t('messages:view.list', 'List view')}
                        >
                            <FiList className="w-4 h-4" />
                        </button>
                    </div>

                    {isFiltersExpanded && (
                        <div 
                            className="mt-3 pt-3 border-t border-border animate-in slide-in-from-top-1 duration-200 w-full"
                            style={{ pointerEvents: justExpanded ? 'none' : 'auto' }}
                            onMouseDown={(e) => {
                                if (justExpanded) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    return;
                                }
                            }}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pb-1">
                                <SimpleDropdown
                                    label={t('messages:filters.status', 'Status')}
                                    options={statusOptions}
                                    value={filters.status}
                                    onChange={(value) => handleFilterChange('status', value)}
                                />
                            </div>
                            {activeCount > 0 && (
                                <div className="mt-3 pt-3 border-t border-border w-full">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => {
                                                setShowActiveFilters(!showActiveFilters);
                                            }}
                                            className="px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2 shrink-0"
                                            style={{ height: 'var(--boxed-inputfield-height)' }}
                                        >
                                            <FiCheck className="w-4 h-4" />
                                            {t('messages:filters.apply', 'Apply Filters')}
                                        </button>

                                        {showActiveFilters && (
                                            <div className="flex-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground animate-in fade-in slide-in-from-left-1 duration-200">
                                                {filters.status !== 'all' && (
                                                    <span className="px-2 py-1 rounded-md bg-muted border border-border">
                                                        {t('messages:filters.status', 'Status')}: {statusOptions.find(o => o.value === filters.status)?.label}
                                                    </span>
                                                )}
                                                {filters.fromDate && (
                                                    <span className="px-2 py-1 rounded-md bg-muted border border-border">
                                                        From: {new Date(filters.fromDate).toLocaleDateString()}
                                                    </span>
                                                )}
                                                {filters.toDate && (
                                                    <span className="px-2 py-1 rounded-md bg-muted border border-border">
                                                        To: {new Date(filters.toDate).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
