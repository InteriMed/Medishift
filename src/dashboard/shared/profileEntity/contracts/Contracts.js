import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useDashboard } from '../../../contexts/DashboardContext';
import { useAuth } from '../../../../contexts/authContext';
import { useNotification } from '../../../../contexts/notificationContext';
import useContractsData from '../../../dashboard/hooks/useContractsData';
import ContractDetails from './components/ContractDetails';
import ContractPdfView from './components/ContractPdfView';
import ContractStatusBadge from './components/ContractStatusBadge';
import FilterBar from '../../../components/layout/FilterBar/FilterBar';
import modal from '../../../components/basemodal/modal';
import InputField from '../../../../components/boxedInputFields/personnalizedInputField';
import InputFieldParagraph from '../../../../components/boxedInputFields/textareaField';
import SimpleDropdown from '../../../../components/boxedInputFields/dropdownField';
import { FiFileText, FiClock } from 'react-icons/fi';
import { createContract } from '../../../services/cloudFunctions';
import { WORKSPACE_TYPES } from '../../../utils/sessionAuth';
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
    const [isCreateContractModalOpen, setIsCreateContractModalOpen] = useState(false);
    const [sortBy, setSortBy] = useState('date');
    const [viewMode, setViewMode] = useState('list');
    const [filtersState, setFiltersState] = useState({
        status: filters.status || 'all',
        source: 'all',
        fromDate: '',
        toDate: ''
    });
    const [contractFormData, setContractFormData] = useState({
        title: '',
        description: '',
        status: 'draft'
    });
    const [isCreatingContract, setIsCreatingContract] = useState(false);


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

    const handleFilterChange = (key, value) => {
        setFiltersState(prev => ({
            ...prev,
            [key]: value
        }));
        if (key === 'status') {
            updateFilters({ status: value });
        }
    };

    const handleClearFilters = () => {
        setFiltersState({
            status: 'all',
            source: 'all',
            fromDate: '',
            toDate: ''
        });
        updateFilters({ status: 'all' });
    };

    const getContractTitle = useCallback((contract) => {
        return contract.title || contract.terms?.jobTitle || t('contracts:untitledContract', 'Untitled Contract');
    }, [t]);

    const filteredByTab = useMemo(() => {
        if (filtersState.source === 'all') {
            return filteredContracts;
        }
        return filteredContracts.filter(contract => {
            if (filtersState.source === 'team') {
                return contract.parties?.employer?.profileId === selectedWorkspace?.facilityId;
            }
            if (filtersState.source === 'medishift') {
                return contract.parties?.employer?.profileId !== selectedWorkspace?.facilityId;
            }
            return true;
        });
    }, [filteredContracts, filtersState.source, selectedWorkspace?.facilityId]);

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
    }, [filteredByTab, sortBy, filtersState.fromDate, filtersState.toDate, getContractTitle]);


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

    return (
        <div className="space-y-6">
            <FilterBar
                filters={filtersState}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                searchValue={filters.searchTerm || ''}
                onSearchChange={(value) => updateFilters({ searchTerm: value })}
                searchPlaceholder={t('organization:contracts.searchPlaceholder', 'Search contracts...')}
                dropdownFields={[
                    {
                        key: 'status',
                        label: t('organization:contracts.filterByStatus', 'Filter by Status'),
                        options: [
                            { value: 'all', label: t('common:all', 'All') },
                            ...statusOptions
                        ],
                        defaultValue: 'all'
                    },
                    {
                        key: 'source',
                        label: t('organization:contracts.filterBySource', 'Filter by Source'),
                        options: [
                            { value: 'all', label: t('common:all', 'All') },
                            { value: 'team', label: t('organization:contracts.team', 'Team') },
                            { value: 'medishift', label: t('organization:contracts.medishift', 'Medishift') }
                        ],
                        defaultValue: 'all'
                    }
                ]}
                dateFields={[
                    {
                        key: 'fromDate',
                        label: t('organization:contracts.fromDate', 'From Date'),
                        showClearButton: true
                    },
                    {
                        key: 'toDate',
                        label: t('organization:contracts.toDate', 'To Date'),
                        showClearButton: true
                    }
                ]}
                showViewToggle={true}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                sortOptions={[
                    { value: 'date', label: t('organization:contracts.sort.date', 'Date') },
                    { value: 'name', label: t('organization:contracts.sort.name', 'Name') }
                ]}
                sortValue={sortBy}
                onSortChange={setSortBy}
                translationNamespace="organization"
                title={t('organization:contracts.title', 'Contracts')}
                description={t('organization:contracts.subtitle', 'Manage and track all contracts')}
                onRefresh={refreshContracts}
                onAdd={handleOpenCreateModal}
                addLabel={t('contracts:createContract', 'Create Contract')}
                isLoading={isLoading}
            />

            <div>
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : sortedContracts.length === 0 ? (
                    <div className="bg-card rounded-xl border border-border overflow-hidden">
                        <div className="p-12 text-center">
                            <FiFileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-muted-foreground">{t('organization:contracts.noContracts', 'No contracts found')}</p>
                        </div>
                    </div>
                ) : viewMode === 'list' ? (
                    <div className="bg-card rounded-xl border border-border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted/30">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        {t('organization:contracts.table.title', 'Title')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        {t('organization:contracts.table.company', 'Company')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        {t('organization:contracts.table.status', 'Status')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        {t('organization:contracts.table.created', 'Created')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedContracts.map((contract) => {
                                    const title = getContractTitle(contract);
                                    const subtitle = getContractSubtitle(contract);
                                    const date = formatDate(contract.createdAt || contract.statusLifecycle?.timestamps?.createdAt);
                                    const status = contract.status || 'draft';
                                    return (
                                        <tr
                                            key={contract.id}
                                            className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                                            onClick={() => handleContractSelectWithURL(contract)}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-foreground">{title}</div>
                                                {subtitle && (
                                                    <div className="text-xs text-muted-foreground">{subtitle}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm">{subtitle || 'N/A'}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <ContractStatusBadge status={status} isActive={false} />
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {date}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sortedContracts.map((contract) => {
                            const title = getContractTitle(contract);
                            const subtitle = getContractSubtitle(contract);
                            const date = formatDate(contract.createdAt || contract.statusLifecycle?.timestamps?.createdAt);
                            const status = contract.status || 'draft';

                            return (
                                <div
                                    key={contract.id}
                                    className="bg-card border border-border rounded-lg hover:border-primary/50 transition-colors p-4 cursor-pointer"
                                    onClick={() => handleContractSelectWithURL(contract)}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-foreground mb-1">
                                                {title}
                                            </h4>
                                            {subtitle && (
                                                <p className="text-xs text-muted-foreground">
                                                    {subtitle}
                                                </p>
                                            )}
                                        </div>
                                        <ContractStatusBadge status={status} isActive={false} />
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        {date && (
                                            <div className="flex items-center text-xs text-muted-foreground">
                                                <FiClock className="mr-1" />
                                                {date}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <modal
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
            </modal>

            <modal
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
            </modal>
        </div>
    );
};

Contracts.propTypes = {
    hideHeader: PropTypes.bool,
    hideStats: PropTypes.bool
};

export default Contracts;

