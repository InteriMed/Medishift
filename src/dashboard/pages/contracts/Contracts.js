import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useDashboard } from '../../contexts/DashboardContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import useContractsData from '../../hooks/useContractsData';
import ContractDetails from './components/ContractDetails';
import ContractPdfView from './components/ContractPdfView';
import ContractStatusBadge from './components/ContractStatusBadge';
import Dialog from '../../../components/Dialog/Dialog';
import InputField from '../../../components/BoxedInputFields/Personnalized-InputField';
import InputFieldParagraph from '../../../components/BoxedInputFields/TextareaField';
import SimpleDropdown from '../../../components/BoxedInputFields/Dropdown-Field';
import { FiSearch, FiFileText, FiX, FiSliders, FiPlus, FiClock, FiEye, FiArrowDown, FiGrid, FiList, FiCheck, FiRefreshCw, FiCheckCircle, FiAlertCircle, FiSend, FiUsers, FiBriefcase } from 'react-icons/fi';
import DateField from '../../../components/BoxedInputFields/DateField';
import { cn } from '../../../utils/cn';
import { createContract } from '../../../services/cloudFunctions';
import { WORKSPACE_TYPES } from '../../../utils/sessionAuth';
import PageHeader from '../../components/PageHeader/PageHeader';
import PropTypes from 'prop-types';

const Contracts = ({ hideHeader = false, hideStats = false }) => {
    const { t } = useTranslation(['dashboard', 'contracts', 'common']);
    const { selectedWorkspace } = useDashboard();
    const { currentUser } = useAuth();
    const { showNotification } = useNotification();
    const [searchParams, setSearchParams] = useSearchParams();
    const {
        contracts,
        filteredContracts,
        isLoading,
        error,
        filters,
        updateFilters,
        userPermissions,
        refreshContracts
    } = useContractsData();

    const [selectedContract, setSelectedContract] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isPdfView, setIsPdfView] = useState(false);
    const [showFiltersOverlay, setShowFiltersOverlay] = useState(false);
    const filterDropdownRef = useRef(null);
    const [isCreateContractModalOpen, setIsCreateContractModalOpen] = useState(false);
    const [sortBy, setSortBy] = useState('date');
    const [viewMode, setViewMode] = useState('list');
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [showActiveFilters, setShowActiveFilters] = useState(false);
    const [justExpanded, setJustExpanded] = useState(false);
    const [filtersState, setFiltersState] = useState({
        status: filters.status || 'all',
        fromDate: '',
        toDate: ''
    });
    const [contractFormData, setContractFormData] = useState({
        title: '',
        description: '',
        status: 'draft'
    });
    const [isCreatingContract, setIsCreatingContract] = useState(false);
    const [activeTab, setActiveTab] = useState('team');

    const tabs = [
        { id: 'team', label: t('contracts:tabs.team', 'Team'), icon: FiUsers },
        { id: 'medishift', label: t('contracts:tabs.medishift', 'Medishift'), icon: FiBriefcase },
        { id: 'all', label: t('contracts:tabs.all', 'All'), icon: FiGrid }
    ];

    const allContracts = useMemo(() => {
        return contracts;
    }, [contracts]);

    const allFilteredContracts = useMemo(() => {
        return filteredContracts;
    }, [filteredContracts]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
                setShowFiltersOverlay(false);
            }
        };

        if (showFiltersOverlay) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showFiltersOverlay]);

    const handleCloseDetails = useCallback(() => {
        setIsDetailsModalOpen(false);
        setSelectedContract(null);
        setIsPdfView(false);
    }, []);

    const handleContractSelect = useCallback((contract) => {
        setSelectedContract(contract);
        setIsPdfView(false);
        setIsDetailsModalOpen(true);
    }, []);

    const handleContractSelectWithURL = useCallback((contract) => {
        handleContractSelect(contract);
        if (contract?.id) {
            const newParams = new URLSearchParams(searchParams);
            newParams.set('modal', 'details');
            newParams.set('contractId', contract.id);
            setSearchParams(newParams, { replace: true });
        }
    }, [searchParams, setSearchParams, handleContractSelect]);

    const handleCloseDetailsWithURL = useCallback(() => {
        handleCloseDetails();
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('modal');
        newParams.delete('contractId');
        setSearchParams(newParams, { replace: true });
    }, [searchParams, setSearchParams, handleCloseDetails]);

    const handleCloseCreateModal = useCallback(() => {
        setIsCreateContractModalOpen(false);
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('modal');
        newParams.delete('action');
        setSearchParams(newParams, { replace: true });
    }, [searchParams, setSearchParams]);

    const handleOpenCreateModal = useCallback(() => {
        setIsCreateContractModalOpen(true);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('modal', 'create');
        setSearchParams(newParams, { replace: true });
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        const modalParam = searchParams.get('modal');
        const actionParam = searchParams.get('action');
        const contractId = searchParams.get('contractId');
        
        if ((modalParam === 'create' || actionParam === 'create') && !isCreateContractModalOpen) {
            setIsCreateContractModalOpen(true);
        } else if (modalParam === 'details' && contractId && contracts.length > 0) {
            const contract = contracts.find(c => c.id === contractId);
            if (contract && !isDetailsModalOpen) {
                handleContractSelectWithURL(contract);
            }
        }
    }, [searchParams, contracts, isCreateContractModalOpen, isDetailsModalOpen, handleContractSelectWithURL]);

    const handleToggleView = () => {
        setIsPdfView(!isPdfView);
    };

    const hasActiveFilters = filters.status !== 'all' || filters.dateRange || filters.searchTerm;
    
    const handleFilterChange = (key, value) => {
        setFiltersState(prev => ({
            ...prev,
            [key]: value
        }));
        if (key === 'status') {
            updateFilters({ status: value });
        }
    };

    const activeCount = (filtersState.status !== 'all' ? 1 : 0) + (filtersState.fromDate ? 1 : 0) + (filtersState.toDate ? 1 : 0);

    const getContractTitle = useCallback((contract) => {
        return contract.title || contract.terms?.jobTitle || t('contracts:untitledContract', 'Untitled Contract');
    }, [t]);

    const filteredByTab = useMemo(() => {
        if (activeTab === 'all') {
            return filteredContracts;
        }
        return filteredContracts.filter(contract => {
            if (activeTab === 'team') {
                return contract.parties?.employer?.profileId === selectedWorkspace?.facilityId;
            }
            if (activeTab === 'medishift') {
                return contract.parties?.employer?.profileId !== selectedWorkspace?.facilityId;
            }
            return true;
        });
    }, [filteredContracts, activeTab, selectedWorkspace?.facilityId]);

    const sortedContracts = useMemo(() => {
        let result = [...filteredByTab];
        
        if (sortBy === 'date') {
            result.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.statusLifecycle?.timestamps?.createdAt || 0);
                const dateB = new Date(b.createdAt || b.statusLifecycle?.timestamps?.createdAt || 0);
                return dateB - dateA;
            });
        } else if (sortBy === 'name') {
            result.sort((a, b) => {
                const titleA = getContractTitle(a).toLowerCase();
                const titleB = getContractTitle(b).toLowerCase();
                return titleA.localeCompare(titleB);
            });
        }
        
        if (filtersState.fromDate || filtersState.toDate) {
            result = result.filter(contract => {
                const contractDate = contract.createdAt?.toDate ? contract.createdAt.toDate() : new Date(contract.createdAt || contract.statusLifecycle?.timestamps?.createdAt);
                if (filtersState.fromDate) {
                    const fromDate = new Date(filtersState.fromDate);
                    fromDate.setHours(0, 0, 0, 0);
                    if (contractDate < fromDate) return false;
                }
                if (filtersState.toDate) {
                    const toDate = new Date(filtersState.toDate);
                    toDate.setHours(23, 59, 59, 999);
                    if (contractDate > toDate) return false;
                }
                return true;
            });
        }
        
        return result;
    }, [filteredContracts, sortBy, filtersState.fromDate, filtersState.toDate, getContractTitle]);

    const stats = useMemo(() => {
        const total = allContracts.length;
        const active = allContracts.filter(c => c.status === 'active' || c.status === 'signed').length;
        const pending = allContracts.filter(c => c.status === 'pending' || c.status === 'sent').length;
        const draft = allContracts.filter(c => c.status === 'draft').length;
        return { total, active, pending, draft };
    }, [allContracts]);

    const statusOptions = [
        { value: 'all', label: t('contracts:status.all') },
        { value: 'active', label: t('contracts:status.active') },
        { value: 'pending', label: t('contracts:status.pending') },
        { value: 'signed', label: t('contracts:status.signed') },
        { value: 'completed', label: t('contracts:status.completed') },
        { value: 'cancelled', label: t('contracts:status.cancelled') },
        { value: 'draft', label: t('contracts:status.draft') },
        { value: 'sent', label: t('contracts:status.sent') }
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

    const getContractSubtitle = (contract) => {
        const parts = [];
        if (contract.parties?.employer?.legalCompanyName) {
            parts.push(contract.parties.employer.legalCompanyName);
        } else if (contract.companyName) {
            parts.push(contract.companyName);
        }
        return parts.join(' • ');
    };

    const handleCreateContract = async () => {
        if (!contractFormData.title.trim()) {
            showNotification(t('contracts:errors.missingTitle', 'Please enter a contract title'), 'error');
            return;
        }

        setIsCreatingContract(true);
        try {
            const facilityId = selectedWorkspace?.facilityId;
            if (!facilityId && selectedWorkspace?.type === WORKSPACE_TYPES.TEAM) {
                throw new Error('No facility selected');
            }

            const contractData = {
                title: contractFormData.title.trim(),
                description: contractFormData.description.trim() || '',
                statusLifecycle: {
                    currentStatus: contractFormData.status || 'draft'
                },
                parties: {
                    employer: {
                        profileId: selectedWorkspace?.type === WORKSPACE_TYPES.TEAM ? facilityId : currentUser?.uid,
                        legalCompanyName: selectedWorkspace?.facilityName || selectedWorkspace?.companyName || ''
                    },
                    professional: {
                        profileId: currentUser?.uid
                    }
                },
                terms: {
                    jobTitle: contractFormData.title.trim()
                }
            };

            await createContract(contractData);

            setContractFormData({
                title: '',
                description: '',
                status: 'draft'
            });
            handleCloseCreateModal();
            showNotification(t('contracts:success.created', 'Contract created successfully'), 'success');
            refreshContracts();
        } catch (error) {
            console.error('Error creating contract:', error);
            showNotification(error.message || t('contracts:errors.createFailed', 'Failed to create contract'), 'error');
        } finally {
            setIsCreatingContract(false);
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
                <p className="text-muted-foreground">{t('contracts:errorMessage', 'Failed to load contracts')}</p>
            </div>
        );
    }

    const hasContracts = sortedContracts.length > 0;
    const hasAnyContracts = allContracts.length > 0;

    const StatCard = ({ icon: Icon, label, value, subValue, className }) => (
        <div className={cn(
            "bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow",
            className
        )}>
            <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    {subValue && (
                        <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
                    )}
                </div>
            </div>
        </div>
    );

    StatCard.propTypes = {
        icon: PropTypes.elementType.isRequired,
        label: PropTypes.string.isRequired,
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        subValue: PropTypes.string,
        className: PropTypes.string
    };

    return (
        <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
            {!hideHeader && (
                <PageHeader
                    title={t('contracts:title', 'Contracts')}
                    subtitle={t('contracts:subtitle', 'Manage and track all contracts')}
                    actions={
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleOpenCreateModal}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground",
                                    "hover:bg-primary/90 transition-colors"
                                )}
                            >
                                <FiPlus className="w-4 h-4" />
                                {t('contracts:createContract', 'Create Contract')}
                            </button>
                            <button
                                onClick={refreshContracts}
                                disabled={isLoading}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg border border-border",
                                    "hover:bg-muted transition-colors",
                                    isLoading && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                <FiRefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                                {t('common:refresh', 'Refresh')}
                            </button>
                        </div>
                    }
                />
            )}

            {!hideStats && (
                <div className="shrink-0 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            icon={FiFileText}
                            label={t('contracts:stats.total', 'Total Contracts')}
                            value={stats.total}
                        />
                        <StatCard
                            icon={FiCheckCircle}
                            label={t('contracts:stats.active', 'Active')}
                            value={stats.active || 0}
                        />
                        <StatCard
                            icon={FiClock}
                            label={t('contracts:stats.pending', 'Pending')}
                            value={stats.pending || 0}
                        />
                        <StatCard
                            icon={FiFileText}
                            label={t('contracts:stats.draft', 'Draft')}
                            value={stats.draft || 0}
                        />
                    </div>
                </div>
            )}

            {hideStats && (
                <div className="shrink-0">
                    <div className="flex gap-2 border-b border-border overflow-x-auto max-w-[1400px] mx-auto px-6">
                        {tabs.map((tab) => {
                            const TabIcon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                                        "touch-manipulation active:scale-95",
                                        activeTab === tab.id
                                            ? "border-primary text-primary bg-primary/5"
                                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                                    )}
                                    title={tab.label}
                                >
                                    <TabIcon className="w-4 h-4 shrink-0" />
                                    <span className="text-xs sm:text-sm min-w-0">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-auto">
                <div className="px-6 pb-6">
            <div 
                className={cn(
                    "bg-card rounded-xl border border-border hover:shadow-md transition-shadow w-full mb-4",
                    isFiltersExpanded ? 'px-6 py-3' : 'px-6 py-2'
                )}
                onMouseDown={(e) => {
                    if (e.target.closest('button[title="Parameters"]')) {
                        e.stopPropagation();
                    }
                }}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-foreground">
                        {t('contracts:info.title', 'Contracts')}
                    </h3>
                    <button
                        onClick={refreshContracts}
                        disabled={isLoading}
                        className={cn(
                            "px-4 rounded-xl border-2 border-input bg-background text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 text-sm font-medium transition-all flex items-center gap-2 shrink-0",
                            isLoading && "opacity-50 cursor-not-allowed"
                        )}
                        style={{ height: 'var(--boxed-inputfield-height)' }}
                    >
                        <FiRefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                        {t('common:refresh', 'Refresh')}
                    </button>
                </div>
                <div className="pt-3 border-t border-border mb-4">
                    <p className="text-sm text-muted-foreground">
                        {t('contracts:info.description', 'Browse and search for contracts.')}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full">
                    <div className="relative flex-1 min-w-[200px]">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                        <input
                            type="text"
                            value={filters.searchTerm || ''}
                            onChange={(e) => updateFilters({ searchTerm: e.target.value })}
                            placeholder={t('contracts:searchPlaceholder', 'Search contracts...')}
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
                            value={filtersState.fromDate ? new Date(filtersState.fromDate) : null}
                            onChange={(date) => handleFilterChange('fromDate', date ? date.toISOString().split('T')[0] : '')}
                            marginBottom="0"
                            showClearButton={true}
                        />
                    </div>

                    <div className="relative shrink-0 w-[218px]">
                        <DateField
                            label="To"
                            value={filtersState.toDate ? new Date(filtersState.toDate) : null}
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
                            {t('contracts:sortBy', 'Sort by')}
                        </button>
                        {showSortDropdown && (
                            <>
                                <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={() => setShowSortDropdown(false)}
                                />
                                <div className="absolute top-full mt-2 right-0 z-20 bg-card border border-border rounded-lg shadow-lg min-w-[180px]">
                                    <button
                                        onClick={() => {
                                            setSortBy('date');
                                            setShowSortDropdown(false);
                                        }}
                                        className={cn(
                                            "w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors",
                                            sortBy === 'date' && "bg-muted"
                                        )}
                                    >
                                        {t('contracts:sort.date', 'Date')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSortBy('name');
                                            setShowSortDropdown(false);
                                        }}
                                        className={cn(
                                            "w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors",
                                            sortBy === 'name' && "bg-muted"
                                        )}
                                    >
                                        {t('contracts:sort.name', 'Name')}
                                    </button>
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
                            title={t('contracts:view.grid', 'Grid view')}
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
                            title={t('contracts:view.list', 'List view')}
                        >
                            <FiList className="w-4 h-4" />
                        </button>
                    </div>

                    {isFiltersExpanded && (
                        <div 
                            className="mt-3 pt-3 border-t border-border animate-in slide-in-from-top-1 duration-200 w-full"
                            style={{ pointerEvents: justExpanded ? 'none' : 'auto' }}
                            onClick={(e) => {
                                if (justExpanded) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    return;
                                }
                            }}
                            onMouseDown={(e) => {
                                if (justExpanded) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    return;
                                }
                            }}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-1">
                                <SimpleDropdown
                                    label={t('contracts:filter.status', 'Status')}
                                    options={statusOptions}
                                    value={filtersState.status}
                                    onChange={(value) => handleFilterChange('status', value)}
                                />
                            </div>
                        </div>
                    )}

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
                                    {t('contracts:filter.apply', 'Apply Filters')}
                                </button>
                                
                                {showActiveFilters && (
                                    <div className="flex-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground animate-in fade-in slide-in-from-left-1 duration-200">
                                        {filtersState.status !== 'all' && (
                                            <span className="px-2 py-1 rounded-md bg-muted border border-border">
                                                {t('contracts:filter.status', 'Status')}: {statusOptions.find(o => o.value === filtersState.status)?.label || filtersState.status}
                                            </span>
                                        )}
                                        {filtersState.fromDate && (
                                            <span className="px-2 py-1 rounded-md bg-muted border border-border">
                                                From: {new Date(filtersState.fromDate).toLocaleDateString()}
                                            </span>
                                        )}
                                        {filtersState.toDate && (
                                            <span className="px-2 py-1 rounded-md bg-muted border border-border">
                                                To: {new Date(filtersState.toDate).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : !hasAnyContracts ? (
                <div className="dashboard-empty-state">
                    <div className="dashboard-empty-state-card">
                        <div className="dashboard-empty-state-icon">
                            <FiFileText className="w-8 h-8" />
                        </div>
                        <h2 className="dashboard-empty-state-title">{t('contracts:empty.title', 'No contracts found')}</h2>
                        <p className="dashboard-empty-state-description">
                            {t('contracts:empty.description', 'No contracts available at the moment')}
                        </p>
                    </div>
                </div>
            ) : !hasContracts ? (
                <div className="dashboard-empty-state">
                    <div className="dashboard-empty-state-card">
                        <div className="dashboard-empty-state-icon">
                            <FiSearch className="w-8 h-8" />
                        </div>
                        <h2 className="dashboard-empty-state-title">{t('contracts:noMatches', 'No contracts match your search')}</h2>
                        <p className="dashboard-empty-state-description">
                            {t('contracts:noMatches.description', 'Try adjusting your filters to see more results')}
                        </p>
                    </div>
                </div>
            ) : (
                <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
                    {sortedContracts.map((contract) => {
                            const title = getContractTitle(contract);
                            const subtitle = getContractSubtitle(contract);
                            const date = formatDate(contract.createdAt || contract.statusLifecycle?.timestamps?.createdAt);
                            const status = contract.status || 'draft';

                            return (
                                <div
                                    key={contract.id}
                                    className={cn(
                                        "bg-background border border-border rounded-lg hover:border-primary/50 transition-colors group cursor-pointer",
                                        viewMode === 'grid' ? "p-4 flex flex-col" : "flex items-center p-4"
                                    )}
                                    onClick={() => handleContractSelectWithURL(contract)}
                                >
                                    <div className={cn(
                                        "rounded-lg bg-primary/10 flex items-center justify-center shrink-0",
                                        viewMode === 'grid' ? "w-12 h-12 mb-3" : "w-10 h-10 mr-4"
                                    )}>
                                        <FiFileText className="text-primary w-5 h-5" />
                                    </div>
                                    <div className={cn("flex-1 min-w-0", viewMode === 'grid' && "flex flex-col")}>
                                        <div className={cn(
                                            "flex items-start justify-between gap-2 mb-1",
                                            viewMode === 'grid' && "flex-col"
                                        )}>
                                            <h4 className={cn(
                                                "font-medium text-foreground group-hover:text-primary transition-colors",
                                                viewMode === 'grid' ? "text-base mb-2" : "truncate flex-1"
                                            )}>
                                                {title}
                                            </h4>
                                            <ContractStatusBadge status={status} isActive={false} />
                                        </div>
                                        {subtitle && (
                                            <p className={cn(
                                                "text-xs text-muted-foreground mb-1",
                                                viewMode === 'grid' ? "line-clamp-2 mb-2" : "truncate"
                                            )}>
                                                {subtitle}
                                            </p>
                                        )}
                                        {date && (
                                            <div className={cn(
                                                "flex items-center text-xs text-muted-foreground",
                                                viewMode === 'grid' && "mt-auto pt-2"
                                            )}>
                                                <FiClock className="mr-1" />
                                                {date}
                                            </div>
                                        )}
                                    </div>
                                    <div className={cn(
                                        "flex items-center gap-2 shrink-0",
                                        viewMode === 'grid' ? "mt-3 pt-3 border-t border-border justify-end" : "ml-2"
                                    )}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleContractSelectWithURL(contract);
                                            }}
                                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                            title={t('contracts:viewDetails', 'View Details')}
                                        >
                                            <FiEye className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

            <Dialog
                isOpen={isDetailsModalOpen}
                onClose={handleCloseDetailsWithURL}
                title={selectedContract ? getContractTitle(selectedContract) : t('contracts:title', 'Contract Details')}
                size="large"
                closeOnBackdropClick={true}
            >
                {selectedContract && (
                    <div className="max-h-[70vh] overflow-y-auto">
                        {isPdfView ? (
                            <div className="p-4 bg-gray-100">
                                <ContractPdfView contract={selectedContract} onClose={() => setIsPdfView(false)} />
                            </div>
                        ) : (
                            <ContractDetails
                                contract={selectedContract}
                                onClose={handleCloseDetailsWithURL}
                                workspaceContext={selectedWorkspace}
                                userPermissions={userPermissions}
                                onToggleView={handleToggleView}
                                isPdfView={isPdfView}
                                isMobile={false}
                            />
                        )}
                    </div>
                )}
            </Dialog>

            <Dialog
                isOpen={isCreateContractModalOpen}
                onClose={() => {
                    if (!isCreatingContract) {
                        setContractFormData({
                            title: '',
                            description: '',
                            status: 'draft'
                        });
                        handleCloseCreateModal();
                    }
                }}
                title={t('contracts:createContract', 'Create Contract')}
                size="medium"
                closeOnBackdropClick={!isCreatingContract}
                actions={
                    <>
                        <button
                            onClick={() => {
                                if (!isCreatingContract) {
                                    setContractFormData({
                                        title: '',
                                        description: '',
                                        status: 'draft'
                                    });
                                    handleCloseCreateModal();
                                }
                            }}
                            disabled={isCreatingContract}
                            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t('common:cancel', 'Cancel')}
                        </button>
                        <button
                            onClick={handleCreateContract}
                            disabled={!contractFormData.title.trim() || isCreatingContract}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCreatingContract
                                ? t('common:creating', 'Creating...')
                                : t('contracts:create', 'Create Contract')}
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="mt-4">
                        <InputField
                            label={t('contracts:form.title', 'Contract Title')}
                            value={contractFormData.title}
                            onChange={(e) => setContractFormData({ ...contractFormData, title: e.target.value })}
                            placeholder={t('contracts:form.titlePlaceholder', 'Enter contract title')}
                            required
                            disabled={isCreatingContract}
                            name="title"
                        />
                    </div>

                    <div>
                        <SimpleDropdown
                            label={t('contracts:form.status', 'Status')}
                            options={[
                                { value: 'draft', label: t('contracts:status.draft', 'Draft') },
                                { value: 'pending', label: t('contracts:status.pending', 'Pending') },
                                { value: 'sent', label: t('contracts:status.sent', 'Sent') }
                            ]}
                            value={contractFormData.status}
                            onChange={(value) => setContractFormData({ ...contractFormData, status: value })}
                            disabled={isCreatingContract}
                        />
                    </div>

                    <InputFieldParagraph
                        label={t('contracts:form.description', 'Description')}
                        value={contractFormData.description}
                        onChange={(e) => setContractFormData({ ...contractFormData, description: e.target.value })}
                        placeholder={t('contracts:form.descriptionPlaceholder', 'Enter contract description (optional)')}
                        rows={3}
                        disabled={isCreatingContract}
                        name="description"
                    />
                </div>
            </Dialog>
                </div>
            </div>
        </div>
    );
};

Contracts.propTypes = {
    hideHeader: PropTypes.bool,
    hideStats: PropTypes.bool
};

export default Contracts;

