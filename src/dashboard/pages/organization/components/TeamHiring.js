import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import useHiringData from '../../../hooks/useHiringData';
import FilterBar from '../../../components/FilterBar/FilterBar';
import { FiBriefcase, FiClock, FiUser } from 'react-icons/fi';
import { cn } from '../../../../utils/cn';
import PropTypes from 'prop-types';

const Hiring = ({ hideHeader = false, hideStats = false }) => {
    const { t } = useTranslation(['dashboard', 'hiring', 'common']);
    const {
        positions,
        applications,
        filteredPositions,
        isLoading,
        error,
        filters,
        updateFilters,
        refreshHiring,
        memberFacilities
    } = useHiringData();

    const [sortBy, setSortBy] = useState('date');
    const [viewMode, setViewMode] = useState('list');
    const [filtersState, setFiltersState] = useState({
        status: filters.status || 'all',
        facility: filters.facility || 'all',
        fromDate: filters.fromDate || '',
        toDate: filters.toDate || ''
    });

    const handlePositionSelect = useCallback((position) => {
        // Position selection handler
    }, []);

    const handleFilterChange = (key, value) => {
        setFiltersState(prev => ({
            ...prev,
            [key]: value
        }));
        updateFilters({ [key]: value });
    };

    const handleClearFilters = () => {
        setFiltersState({
            status: 'all',
            facility: 'all',
            fromDate: '',
            toDate: ''
        });
        updateFilters({ status: 'all', facility: 'all', fromDate: '', toDate: '' });
    };

    const getPositionTitle = useCallback((position) => {
        return position.title || position.jobTitle || t('hiring:untitledPosition', 'Untitled Position');
    }, [t]);

    const filteredByTab = useMemo(() => {
        return filteredPositions;
    }, [filteredPositions]);

    const sortedPositions = useMemo(() => {
        let result = [...filteredByTab];

        if (filtersState.fromDate || filtersState.toDate) {
            result = result.filter(position => {
                const positionDate = position.createdAt || position.created;
                if (!positionDate) return false;
                const date = positionDate.toDate ? positionDate.toDate() : new Date(positionDate);
                if (filtersState.fromDate) {
                    const fromDate = new Date(filtersState.fromDate);
                    fromDate.setHours(0, 0, 0, 0);
                    if (date < fromDate) return false;
                }
                if (filtersState.toDate) {
                    const toDate = new Date(filtersState.toDate);
                    toDate.setHours(23, 59, 59, 999);
                    if (date > toDate) return false;
                }
                return true;
            });
        }

        if (sortBy === 'date') {
            result.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.created || 0);
                const dateB = new Date(b.createdAt || b.created || 0);
                return dateB - dateA;
            });
        } else if (sortBy === 'name') {
            result.sort((a, b) => {
                const titleA = getPositionTitle(a).toLowerCase();
                const titleB = getPositionTitle(b).toLowerCase();
                return titleA.localeCompare(titleB);
            });
        } else if (sortBy === 'facility') {
            result.sort((a, b) => {
                const facilityA = (a.facilityName || '').toLowerCase();
                const facilityB = (b.facilityName || '').toLowerCase();
                return facilityA.localeCompare(facilityB);
            });
        } else if (sortBy === 'applications') {
            result.sort((a, b) => {
                const appsA = applications.filter(app => app.positionId === a.id).length;
                const appsB = applications.filter(app => app.positionId === b.id).length;
                return appsB - appsA;
            });
        }

        return result;
    }, [filteredByTab, sortBy, getPositionTitle, applications, filtersState.fromDate, filtersState.toDate]);

    const statusOptions = [
        { value: 'all', label: t('hiring:status.all') },
        { value: 'open', label: t('hiring:status.open') },
        { value: 'interview', label: t('hiring:status.interview') },
        { value: 'accepted', label: t('hiring:status.accepted') },
        { value: 'closed', label: t('hiring:status.closed') }
    ];

    const formatDate = (date) => {
        if (!date) return '';
        try {
            if (date.toDate && typeof date.toDate === 'function') {
                const d = date.toDate();
                const now = new Date();
                const diffMs = now - d;
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                if (diffDays === 0) return 'Today';
                if (diffDays === 1) return 'Yesterday';
                if (diffDays < 7) return `${diffDays} days ago`;
                if (diffDays < 30) {
                    const weeks = Math.floor(diffDays / 7);
                    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
                }
                if (diffDays < 365) {
                    const months = Math.floor(diffDays / 30);
                    return `${months} month${months > 1 ? 's' : ''} ago`;
                }
                return format(d, 'MMM d, yyyy');
            }
            return format(new Date(date), 'MMM d, yyyy');
        } catch (error) {
            return '';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'open':
                return 'bg-blue-100 text-blue-700';
            case 'interview':
                return 'bg-yellow-100 text-yellow-700';
            case 'accepted':
            case 'accepted_for_contract':
                return 'bg-green-100 text-green-700';
            case 'rejected':
            case 'closed':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-16">
                <p className="text-muted-foreground">{t('hiring:errorMessage', 'Failed to load hiring processes')}</p>
            </div>
        );
    }


    return (
        <div className="space-y-6">
            <FilterBar
                filters={filtersState}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                searchValue={filters.searchTerm || ''}
                onSearchChange={(value) => updateFilters({ searchTerm: value })}
                searchPlaceholder={t('organization:hiring.searchPlaceholder', 'Search positions...')}
                dropdownFields={[
                    {
                        key: 'status',
                        label: t('organization:hiring.filterByStatus', 'Filter by Status'),
                        options: [
                            { value: 'all', label: t('common:all', 'All') },
                            ...statusOptions
                        ],
                        defaultValue: 'all'
                    },
                    {
                        key: 'facility',
                        label: t('organization:hiring.filterByFacility', 'Filter by Facility'),
                        options: [
                            { value: 'all', label: t('common:all', 'All') },
                            ...memberFacilities.map(facility => ({
                                value: facility.id,
                                label: facility.facilityName || facility.companyName || t('organization:hiring.unnamedFacility', 'Unnamed Facility')
                            }))
                        ],
                        defaultValue: 'all'
                    }
                ]}
                dateFields={[
                    {
                        key: 'fromDate',
                        label: t('organization:hiring.fromDate', 'From Date'),
                        showClearButton: true
                    },
                    {
                        key: 'toDate',
                        label: t('organization:hiring.toDate', 'To Date'),
                        showClearButton: true
                    }
                ]}
                showViewToggle={true}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                sortOptions={[
                    { value: 'date', label: t('organization:hiring.sort.date', 'Date') },
                    { value: 'name', label: t('organization:hiring.sort.name', 'Name') },
                    { value: 'facility', label: t('organization:hiring.sort.facility', 'Facility') },
                    { value: 'applications', label: t('organization:hiring.sort.applications', 'Applications') }
                ]}
                sortValue={sortBy}
                onSortChange={setSortBy}
                translationNamespace="organization"
                title={t('organization:hiring.title', 'Hiring Processes')}
                description={t('organization:hiring.subtitle', 'Manage and track all hiring processes')}
                onRefresh={refreshHiring}
                isLoading={isLoading}
            />

            <div>
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : sortedPositions.length === 0 ? (
                    <div className="bg-card rounded-xl border border-border overflow-hidden">
                        <div className="p-12 text-center">
                            <FiBriefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-muted-foreground">{t('organization:hiring.noPositions', 'No positions found')}</p>
                        </div>
                    </div>
                ) : viewMode === 'list' ? (
                    <div className="bg-card rounded-xl border border-border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted/30">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        {t('organization:hiring.table.title', 'Title')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        {t('organization:hiring.table.facility', 'Facility')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        {t('organization:hiring.table.status', 'Status')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        {t('organization:hiring.table.applications', 'Applications')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        {t('organization:hiring.table.created', 'Created')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedPositions.map((position) => {
                                    const title = getPositionTitle(position);
                                    const facilityName = position.facilityName || 'N/A';
                                    const status = position.status || 'open';
                                    const applicationCount = applications.filter(app => app.positionId === position.id).length;
                                    const createdDate = formatDate(position.createdAt || position.created);
                                    return (
                                        <tr
                                            key={position.id}
                                            className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                                            onClick={() => handlePositionSelect(position)}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-foreground">{title}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm">{facilityName}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn("px-2 py-0.5 text-xs font-medium rounded-full", getStatusColor(status))}>
                                                    {status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {applicationCount}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {createdDate}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sortedPositions.map((position) => {
                            const title = getPositionTitle(position);
                            const facilityName = position.facilityName || 'N/A';
                            const status = position.status || 'open';
                            const applicationCount = applications.filter(app => app.positionId === position.id).length;
                            const createdDate = formatDate(position.createdAt || position.created);

                            return (
                                <div
                                    key={position.id}
                                    className="group bg-card hover:bg-card/80 border border-border hover:border-primary/20 rounded-xl px-6 pb-6 cursor-pointer transition-all duration-300 hover:shadow-md pt-6"
                                    onClick={() => handlePositionSelect(position)}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-foreground mb-1">
                                                {title}
                                            </h4>
                                            {facilityName && (
                                                <p className="text-xs text-muted-foreground">
                                                    {facilityName}
                                                </p>
                                            )}
                                        </div>
                                        <span className={cn("px-2 py-0.5 text-xs font-medium rounded-full", getStatusColor(status))}>
                                            {status}
                                        </span>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center text-xs text-muted-foreground">
                                            <FiUser className="mr-1" />
                                            {applicationCount} {t('organization:hiring.applications', 'applications')}
                                        </div>
                                        {createdDate && (
                                            <div className="flex items-center text-xs text-muted-foreground">
                                                <FiClock className="mr-1" />
                                                {createdDate}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

Hiring.propTypes = {
    hideHeader: PropTypes.bool,
    hideStats: PropTypes.bool
};

export default Hiring;

