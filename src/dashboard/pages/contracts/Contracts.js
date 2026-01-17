import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../../contexts/DashboardContext';
import { useMobileView } from '../../hooks/useMobileView';
import { usePageMobile } from '../../contexts/PageMobileContext';
import useContractsData from '../../hooks/useContractsData';
import ContractDetails from './components/ContractDetails';
import ContractPdfView from './components/ContractPdfView';
import ContractsList from './components/ContractsList';
import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';
import EmptyState from '../../components/EmptyState/EmptyState';
import SimpleDropdown from '../../../components/BoxedInputFields/Dropdown-Field';
import { FiSearch, FiFileText, FiInbox, FiX, FiSliders } from 'react-icons/fi';
import { cn } from '../../../utils/cn';
import { useTutorial } from '../../contexts/TutorialContext';
import './contracts.module.css';

const Contracts = () => {
    const { t } = useTranslation(['dashboard', 'contracts']);
    const { selectedWorkspace } = useDashboard();
    const isMobile = useMobileView();
    const pageMobileContext = usePageMobile();
    // Default no-op function that remains stable reference
    const noOp = useCallback(() => { }, []);
    const setPageMobileState = pageMobileContext?.setPageMobileState || noOp;
    const { isTutorialActive, activeTutorial } = useTutorial();
    const {
        contracts,
        filteredContracts,
        isLoading,
        error,
        filters,
        updateFilters,
        clearFilters,
        userPermissions
    } = useContractsData();

    const [selectedContract, setSelectedContract] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [isPdfView, setIsPdfView] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const [showFiltersOverlay, setShowFiltersOverlay] = useState(false);

    const getMockContracts = useCallback(() => {
        if (!isTutorialActive || activeTutorial !== 'contracts') return [];
        
        return [
            {
                id: 'tutorial-geneva-hospital',
                title: 'Geneva Hospital - Temporary Contract',
                status: 'active',
                createdAt: new Date('2026-01-15'),
                statusLifecycle: {
                    timestamps: {
                        createdAt: new Date('2026-01-15')
                    }
                },
                terms: {
                    jobTitle: 'Emergency Department Physician',
                    contractType: 'Temporary',
                    startDate: new Date('2026-02-01'),
                    endDate: new Date('2026-03-31'),
                    workPercentage: 100,
                    salary: {
                        grossAmount: 12000,
                        currency: 'CHF',
                        period: 'month'
                    },
                    annualVacationDays: 25,
                    probationPeriod: '3 months',
                    noticePeriod: '1 month',
                    workingHours: '40 hours/week, rotating shifts',
                    benefits: 'Health insurance, meal vouchers, parking space, professional development allowance'
                },
                parties: {
                    employer: {
                        legalCompanyName: 'Geneva Hospital',
                        address: {
                            street: 'Rue Gabrielle-Perret-Gentil',
                            number: '4',
                            postalCode: '1205',
                            city: 'Geneva'
                        },
                        contactEmail: 'hr@geneva-hospital.ch'
                    },
                    professional: {
                        legalFirstName: 'John',
                        legalLastName: 'Doe',
                        address: {
                            street: 'Avenue de la Gare',
                            number: '12',
                            postalCode: '1000',
                            city: 'Lausanne'
                        },
                        email: 'john.doe@example.com'
                    }
                },
                isTutorial: true
            },
            {
                id: 'tutorial-lausanne-clinic',
                title: 'Lausanne Clinic - Part-time',
                status: 'pending',
                createdAt: new Date('2026-01-20'),
                statusLifecycle: {
                    timestamps: {
                        createdAt: new Date('2026-01-20')
                    }
                },
                terms: {
                    jobTitle: 'General Practice Physician',
                    contractType: 'Part-time',
                    startDate: new Date('2026-04-01'),
                    endDate: new Date('2026-06-30'),
                    workPercentage: 50,
                    salary: {
                        grossAmount: 6500,
                        currency: 'CHF',
                        period: 'month'
                    },
                    annualVacationDays: 20,
                    probationPeriod: '2 months',
                    noticePeriod: '2 weeks',
                    workingHours: '20 hours/week, weekends only (Saturday-Sunday)',
                    benefits: 'Health insurance, flexible schedule, continuing education support'
                },
                parties: {
                    employer: {
                        legalCompanyName: 'Lausanne Clinic',
                        address: {
                            street: 'Avenue de la Gare',
                            number: '28',
                            postalCode: '1000',
                            city: 'Lausanne'
                        },
                        contactEmail: 'hr@lausanne-clinic.ch'
                    },
                    professional: {
                        legalFirstName: 'John',
                        legalLastName: 'Doe',
                        address: {
                            street: 'Avenue de la Gare',
                            number: '12',
                            postalCode: '1000',
                            city: 'Lausanne'
                        },
                        email: 'john.doe@example.com'
                    }
                },
                isTutorial: true
            }
        ];
    }, [isTutorialActive, activeTutorial]);

    const mockContracts = useMemo(() => getMockContracts(), [getMockContracts]);

    const allContracts = useMemo(() => {
        const mock = getMockContracts();
        if (mock.length > 0 && contracts.length === 0) {
            return mock;
        }
        return contracts;
    }, [contracts, getMockContracts]);

    const allFilteredContracts = useMemo(() => {
        if (isTutorialActive && activeTutorial === 'contracts' && contracts.length === 0) {
            return mockContracts;
        }
        return filteredContracts;
    }, [filteredContracts, mockContracts, isTutorialActive, activeTutorial, contracts.length]);

    useEffect(() => {
        if (!setPageMobileState || typeof setPageMobileState !== 'function') {
            return;
        }
        if (isMobile) {
            const handleBack = () => {
                setSelectedContract(null);
                setIsPdfView(false);
                setShowSidebar(true);
            };
            setPageMobileState(!!selectedContract, handleBack);
        } else {
            setPageMobileState(false, null);
        }
    }, [isMobile, selectedContract, setPageMobileState]);

    useEffect(() => {
        if (!isTutorialActive || activeTutorial !== 'contracts') {
            if (selectedContract?.isTutorial) {
                setSelectedContract(null);
                setIsPdfView(false);
                if (isMobile) {
                    setShowSidebar(true);
                }
            }
        }
    }, [isTutorialActive, activeTutorial, selectedContract, isMobile]);

    const handleContractSelect = useCallback((contractId) => {
        const contract = allFilteredContracts.find(c => c.id === contractId) || allContracts.find(c => c.id === contractId);
        if (contract) {
            setSelectedContract(contract);
            setIsPdfView(false);
            if (isMobile) {
                setShowSidebar(false);
            }
        }
    }, [allFilteredContracts, allContracts, isMobile]);

    const handleCloseDetails = () => {
        setSelectedContract(null);
        setIsPdfView(false);
        if (isMobile) {
            setShowSidebar(true);
        }
    };

    const handleClosePdfView = () => {
        setIsPdfView(false);
    };

    const handleToggleView = () => {
        setIsPdfView(!isPdfView);
    };


    const hasActiveFilters = filters.status !== 'all' || filters.dateRange || filters.searchTerm;

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

    const dateRangeOptions = [
        { value: '', label: t('contracts:dateRange.all') },
        { value: 'last-week', label: t('contracts:dateRange.lastWeek') },
        { value: 'last-month', label: t('contracts:dateRange.lastMonth') },
        { value: 'last-3-months', label: t('contracts:dateRange.last3Months') },
        { value: 'last-year', label: t('contracts:dateRange.lastYear') }
    ];

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return (
            <EmptyState
                title={t('contracts:errorTitle')}
                description={t('contracts:errorMessage')}
                actionText={t('contracts:retry')}
                onAction={() => window.location.reload()}
            />
        );
    }

    const hasContracts = allFilteredContracts.length > 0;
    const hasAnyContracts = allContracts.length > 0;

    return (
        <div className={cn(
            "h-full flex flex-col overflow-hidden animate-in fade-in duration-500",
            isMobile && "overflow-y-hidden"
        )} style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
            <style>{`
                .contracts-header-dropdown .boxed-inputfield-wrapper {
                    margin: 0;
                }
                .contracts-header-dropdown .boxed-dropdown-container {
                    height: 36px;
                    min-height: 36px;
                    padding: 0 12px;
                    font-size: 12px;
                }
                .contracts-header-dropdown .boxed-dropdown-selected {
                    font-size: 12px;
                    font-weight: 500;
                    line-height: 36px;
                    height: 36px;
                }
                .contracts-header-dropdown .boxed-dropdown-arrow {
                    width: 10px;
                    height: 6px;
                }
            `}</style>
            <div className={cn(
                "shrink-0 w-full z-20 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm h-16 flex items-center",
                isMobile ? "px-4" : "px-6"
            )}>
                {isMobile ? (
                    <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            <input
                                type="text"
                                placeholder={t('contracts:searchPlaceholder')}
                                value={filters.searchTerm || ''}
                                onChange={(e) => updateFilters({ searchTerm: e.target.value })}
                                className="w-full h-9 pl-9 pr-20 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                                style={{ color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                {filters.searchTerm && (
                                    <button
                                        onClick={() => updateFilters({ searchTerm: '' })}
                                        className="p-1.5 hover:bg-muted rounded-full transition-colors"
                                    >
                                        <FiX className="w-4 h-4 text-muted-foreground" />
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowFiltersOverlay(true)}
                                    className={cn(
                                        "p-1.5 rounded-full transition-colors",
                                        hasActiveFilters ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
                                    )}
                                >
                                    <FiSliders className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <div className="flex-1 flex items-center gap-3">
                            <div className="flex-1 relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder={t('contracts:searchPlaceholder')}
                                    value={filters.searchTerm || ''}
                                    onChange={(e) => updateFilters({ searchTerm: e.target.value })}
                                    className="w-full h-9 pl-9 pr-8 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                                    style={{ color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}
                                />
                                {filters.searchTerm && (
                                    <button
                                        onClick={() => updateFilters({ searchTerm: '' })}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
                                    >
                                        <FiX className="w-3.5 h-3.5 text-muted-foreground" />
                                    </button>
                                )}
                            </div>

                            <div className="shrink-0 min-w-[120px] contracts-header-dropdown" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                                <SimpleDropdown
                                    label={null}
                                    options={statusOptions}
                                    value={filters.status || 'all'}
                                    onChange={(value) => updateFilters({ status: value })}
                                    placeholder={t('contracts:status.all')}
                                />
                            </div>

                            <div className="shrink-0 min-w-[120px] contracts-header-dropdown" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                                <SimpleDropdown
                                    label={null}
                                    options={dateRangeOptions}
                                    value={filters.dateRange || ''}
                                    onChange={(value) => updateFilters({ dateRange: value })}
                                    placeholder={t('contracts:dateRange.all')}
                                />
                            </div>
                        </div>

                        {hasActiveFilters && (
                            <button
                                onClick={() => updateFilters({ status: 'all', dateRange: null, searchTerm: '' })}
                                className="shrink-0 h-9 px-4 rounded-lg border border-input bg-background text-xs font-medium hover:bg-muted transition-all"
                                style={{ color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}
                            >
                                {t('contracts:clear')}
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className={cn(
                "flex-1 flex overflow-hidden min-h-0 relative",
                isMobile ? "p-0" : "p-4 gap-4"
            )}>
                <div className={cn(
                    "flex flex-col transition-all duration-300 shrink-0",
                    isMobile
                        ? cn(
                            "absolute inset-0 z-10 bg-background overflow-y-auto",
                            showSidebar ? "translate-x-0" : "-translate-x-full"
                        )
                        : "w-full md:w-[320px] lg:w-[360px] pr-0 overflow-hidden"
                )}>
                    <div className={cn(
                        "flex-1 flex flex-col bg-card/60 backdrop-blur-sm border border-border shadow-sm overflow-hidden",
                        isMobile ? "rounded-none border-0" : "rounded-xl"
                    )}>
                        {!hasAnyContracts && (!isTutorialActive || activeTutorial !== 'contracts') ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                    <FiInbox className="w-8 h-8" style={{ color: 'var(--primary-color)' }} />
                                </div>
                                <p className="text-sm font-medium" style={{ color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)', margin: 0 }}>{t('contracts:noContracts')}</p>
                                <p className="text-xs" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)', margin: 0 }}>{t('contracts:startApplying')}</p>
                            </div>
                        ) : !hasAnyContracts && isTutorialActive && activeTutorial === 'contracts' ? (
                            <div className="flex-1 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
                                <ContractsList
                                    contracts={mockContracts}
                                    selectedContractId={selectedContract?.id}
                                    onSelectContract={handleContractSelect}
                                    workspaceContext={selectedWorkspace}
                                    userPermissions={userPermissions}
                                />
                            </div>
                        ) : !hasContracts ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                                <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
                                    <FiSearch className="w-8 h-8" style={{ color: 'var(--text-light-color)' }} />
                                </div>
                                <p className="text-sm font-medium" style={{ color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)', margin: 0 }}>{t('contracts:noMatches')}</p>
                                <p className="text-xs" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)', margin: 0 }}>{t('contracts:adjustFilters')}</p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
                                <ContractsList
                                    contracts={allFilteredContracts}
                                    selectedContractId={selectedContract?.id}
                                    onSelectContract={handleContractSelect}
                                    workspaceContext={selectedWorkspace}
                                    userPermissions={userPermissions}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className={cn(
                    "flex-1 flex flex-col bg-transparent relative min-w-0 min-h-0 transition-transform duration-300",
                    isMobile && selectedContract ? "translate-x-0 overflow-hidden absolute inset-0 z-20" : "overflow-hidden"
                )}>
                    {selectedContract ? (
                        <div className={cn(
                            "h-full w-full bg-card/60 backdrop-blur-sm border border-border shadow-sm overflow-hidden flex flex-col",
                            isMobile ? "rounded-none border-0" : "rounded-xl"
                        )}>
                            {isPdfView ? (
                                <div className="h-full p-4 bg-gray-100 overflow-y-auto">
                                    <ContractPdfView contract={selectedContract} onClose={handleClosePdfView} />
                                </div>
                            ) : (
                                <div className="h-full overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
                                    <ContractDetails
                                        contract={selectedContract}
                                        onClose={handleCloseDetails}
                                        workspaceContext={selectedWorkspace}
                                        userPermissions={userPermissions}
                                        onToggleView={handleToggleView}
                                        isPdfView={isPdfView}
                                        isMobile={isMobile}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="w-full flex flex-col items-center justify-center p-8 text-center z-0 min-h-[400px]">
                            <div className="max-w-md w-full bg-card p-8 rounded-2xl border border-border/50 shadow-lg backdrop-blur-sm animate-in fade-in zoom-in-95 duration-500 mx-auto">
                                <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-6 ring-4 ring-background">
                                    <FiFileText className="text-muted-foreground w-8 h-8" />
                                </div>
                                <h2 className="text-xl font-bold text-foreground mb-2">{t('contracts:selectContract')}</h2>
                                <p className="text-muted-foreground mb-6">
                                    {t('contracts:selectContractDesc')}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Filters Overlay - Mobile Only */}
            {isMobile && showFiltersOverlay && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={() => setShowFiltersOverlay(false)}
                    />
                    <div className={cn(
                        "fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl shadow-2xl",
                        "animate-in slide-in-from-bottom duration-300"
                    )} style={{ height: '75vh' }}>
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h3 className="text-lg font-semibold m-0" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                                {t('contracts:filters')}
                            </h3>
                            <button
                                onClick={() => setShowFiltersOverlay(false)}
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-4" style={{ height: 'calc(75vh - 73px)', scrollbarGutter: 'stable' }}>
                            <div>
                                <label className="text-sm font-medium mb-2 block" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                                    {t('contracts:statusLabel')}
                                </label>
                                <SimpleDropdown
                                    label={null}
                                    options={statusOptions}
                                    value={filters.status || 'all'}
                                    onChange={(value) => updateFilters({ status: value })}
                                    placeholder={t('contracts:status.all')}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                                    {t('contracts:dateRangeLabel')}
                                </label>
                                <SimpleDropdown
                                    label={null}
                                    options={dateRangeOptions}
                                    value={filters.dateRange || ''}
                                    onChange={(value) => updateFilters({ dateRange: value })}
                                    placeholder={t('contracts:dateRange.all')}
                                />
                            </div>
                            {hasActiveFilters && (
                                <button
                                    onClick={() => {
                                        updateFilters({ status: 'all', dateRange: null, searchTerm: '' });
                                        setShowFiltersOverlay(false);
                                    }}
                                    className="w-full h-10 rounded-lg border border-input bg-background text-sm font-medium hover:bg-muted transition-all"
                                    style={{ color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}
                                >
                                    {t('contracts:clearAllFilters')}
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Contracts;
