import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { FiSearch, FiFileText, FiInbox, FiX, FiSliders } from 'react-icons/fi';
import { cn } from '../../../utils/cn';
import { useTutorial } from '../../contexts/TutorialContext';
import { TUTORIAL_IDS } from '../../../config/tutorialSystem';
import './contracts.module.css';
import '../../../components/BoxedInputFields/styles/boxedInputFields.css';

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
    const filterDropdownRef = useRef(null);

    const getMockContracts = useCallback(() => {
        if (!isTutorialActive || activeTutorial !== TUTORIAL_IDS.CONTRACTS) return [];
        
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
        if (isTutorialActive && activeTutorial === TUTORIAL_IDS.CONTRACTS && contracts.length === 0) {
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
        if (!isTutorialActive || activeTutorial !== TUTORIAL_IDS.CONTRACTS) {
            if (selectedContract?.isTutorial) {
                setSelectedContract(null);
                setIsPdfView(false);
                if (isMobile) {
                    setShowSidebar(true);
                }
            }
        }
    }, [isTutorialActive, activeTutorial, selectedContract, isMobile]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
                setShowFiltersOverlay(false);
            }
        };

        if (showFiltersOverlay && !isMobile) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showFiltersOverlay, isMobile]);

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
            "h-full flex flex-col overflow-hidden animate-in fade-in duration-500 contracts-page",
            isMobile && "overflow-y-hidden"
        )} style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
            <div className={cn(
                "flex-1 flex min-h-0 relative ml-4 my-4",
                isMobile ? "p-0 overflow-hidden" : "gap-6 overflow-visible"
            )}>
                <div className={cn(
                    "dashboard-sidebar-container",
                    isMobile
                        ? cn(
                            "dashboard-sidebar-container-mobile",
                            showSidebar ? "translate-x-0" : "-translate-x-full"
                        )
                        : "dashboard-sidebar-container-desktop pr-0"
                )}>
                    <div className={cn(
                        "dashboard-sidebar-inner",
                        isMobile && "dashboard-sidebar-inner-mobile"
                    )}>
                        <div className={cn(
                            "shrink-0 w-full",
                            isMobile ? "p-4 pb-3" : "p-4 pb-3"
                        )} style={{ position: 'relative', zIndex: 100 }}>
                            <div ref={filterDropdownRef} style={{ position: 'relative' }}>
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                                <input
                                    type="text"
                                    placeholder={t('contracts:searchPlaceholder')}
                                    value={filters.searchTerm || ''}
                                    onChange={(e) => updateFilters({ searchTerm: e.target.value })}
                                    className="w-full pl-9 pr-20 rounded-xl border-2 border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-0 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.1)] transition-all hover:border-muted-foreground/30 hover:bg-muted/30"
                                    style={{ 
                                      color: 'var(--boxed-inputfield-color-text)', 
                                      fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
                                      height: 'var(--boxed-inputfield-height)',
                                      fontWeight: '500'
                                    }}
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
                                        onClick={() => setShowFiltersOverlay(!showFiltersOverlay)}
                                        className={cn(
                                            "p-1.5 rounded-full transition-colors",
                                            hasActiveFilters ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
                                        )}
                                    >
                                        <FiSliders className="w-4 h-4" />
                                    </button>
                                </div>

                                {showFiltersOverlay && !isMobile && (
                                    <div className="boxed-dropdown-options" style={{ overflowX: 'hidden', overflowY: 'auto' }}>
                                        {statusOptions.map(option => (
                                            <button
                                                key={option.value}
                                                onClick={() => { 
                                                    updateFilters({ status: option.value }); 
                                                    if (option.value === 'all') {
                                                        setShowFiltersOverlay(false);
                                                    }
                                                }}
                                                className={cn(
                                                    "boxed-dropdown-option",
                                                    filters.status === option.value && "boxed-dropdown-option--selected"
                                                )}
                                                style={{ width: '100%', textAlign: 'left' }}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {!hasAnyContracts && (!isTutorialActive || activeTutorial !== TUTORIAL_IDS.CONTRACTS) ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 ring-4 ring-background">
                                    <FiInbox className="w-8 h-8" style={{ color: 'var(--primary-color)' }} />
                                </div>
                                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>{t('contracts:noContracts')}</h2>
                                <p className="mb-6" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>{t('contracts:startApplying')}</p>
                            </div>
                        ) : !hasAnyContracts && isTutorialActive && activeTutorial === TUTORIAL_IDS.CONTRACTS ? (
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
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-6 ring-4 ring-background">
                                    <FiSearch className="w-8 h-8" style={{ color: 'var(--text-light-color)' }} />
                                </div>
                                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>{t('contracts:noMatches')}</h2>
                                <p className="mb-6" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>{t('contracts:adjustFilters')}</p>
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
                    "dashboard-main-content",
                    isMobile && selectedContract ? "translate-x-0 dashboard-main-content-mobile" : "dashboard-main-content-desktop"
                )}>
                    <div className={cn(
                        "dashboard-main-inner flex flex-col",
                        isMobile && "dashboard-main-inner-mobile"
                    )}>
                        {selectedContract ? (
                            <>
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
                            </>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 ring-4 ring-background">
                                    <FiFileText className="w-8 h-8" style={{ color: 'var(--primary-color)' }} />
                                </div>
                                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>{t('contracts:selectContract')}</h2>
                                <p className="mb-6" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                                    {t('contracts:selectContractDesc')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isMobile && showFiltersOverlay && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={() => setShowFiltersOverlay(false)}
                    />
                    <div className={cn(
                        "fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl shadow-2xl",
                        "animate-in slide-in-from-bottom duration-300"
                    )} style={{ maxHeight: '75vh' }}>
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
                        <div className="overflow-y-auto p-2" style={{ maxHeight: 'calc(75vh - 73px)', scrollbarGutter: 'stable' }}>
                            {statusOptions.map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => { 
                                        updateFilters({ status: option.value }); 
                                        if (option.value === 'all') {
                                            setShowFiltersOverlay(false);
                                        }
                                    }}
                                    className={cn(
                                        "boxed-dropdown-option",
                                        filters.status === option.value && "boxed-dropdown-option--selected"
                                    )}
                                    style={{ width: '100%', textAlign: 'left' }}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Contracts;
