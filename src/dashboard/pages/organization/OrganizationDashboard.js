/**
 * Organization Management Dashboard
 * 
 * Phase 2 feature for managing pharmacy chains/groups.
 * Allows chain admins to:
 * - View organization details
 * - Manage member facilities
 * - Sync admin permissions
 * - View cross-facility reports
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { functions, db } from '../../../services/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { useDashboard } from '../../contexts/DashboardContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { buildDashboardUrl, getWorkspaceIdForUrl } from '../../utils/pathUtils';
import {
    FiUsers,
    FiSettings,
    FiPlus,
    FiLink,
    FiX,
    FiHome,
    FiShield,
    FiRefreshCw,
    FiCheck,
    FiGrid,
    FiFileText,
    FiUserPlus,
    FiGitBranch,
    FiSearch,
    FiCreditCard,
    FiUser,
    FiBriefcase
} from 'react-icons/fi';
import { cn } from '../../../utils/cn';

import OrganigramView from './tabs/OrganigramView';
import GlobalDirectory from './components/GlobalDirectory';
import PolicyLibrary from './components/PolicyLibrary';
import PayrollDashboard from '../payroll/PayrollDashboard';
import Profile from '../profile/Profile';
import Contracts from '../contracts/Contracts';
import SimpleDropdown from '../../../components/BoxedInputFields/Dropdown-Field';
import HiringProcesses from './components/HiringProcesses';
import TeamOrganigram from './components/TeamOrganigram';


const OrganizationDashboard = () => {
    const { t } = useTranslation(['organization', 'common']);
    const { currentUser } = useAuth();
    const { selectedWorkspace, user } = useDashboard();
    const { showNotification } = useNotification();
    const navigate = useNavigate();
    const location = useLocation();

    const [organization, setOrganization] = useState(null);
    const [memberFacilities, setMemberFacilities] = useState([]);
    const [userFacilities, setUserFacilities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [selectedFacilityId, setSelectedFacilityId] = useState('all');
    const [facilitySearchQuery, setFacilitySearchQuery] = useState('');

    const getBasePath = useCallback(() => {
        const isOrganizationWorkspace = selectedWorkspace?.type === 'organization';
        return isOrganizationWorkspace ? 'organization' : 'facility';
    }, [selectedWorkspace]);

    const basePath = getBasePath();
    const isOrganizationWorkspace = selectedWorkspace?.type === 'organization';
    const pageTitle = isOrganizationWorkspace 
        ? t('organization:title', 'Organization')
        : t('organization:facilityTitle', 'Facility');

    const tabs = [
        { id: 'directory', path: 'team', label: t('organization:tabs.team', 'Team'), icon: FiUserPlus },
        { id: 'contracts', path: 'contracts', label: t('organization:tabs.contracts', 'Contracts'), icon: FiFileText },
        { id: 'payroll', path: 'payroll', label: t('organization:tabs.consolidatedPayroll', 'Consolidated Payroll'), icon: FiCreditCard },
        { id: 'policy', path: 'policy', label: t('organization:tabs.policyLibrary', 'Policy Library'), icon: FiFileText },
        { id: 'profile', path: 'profile', label: t('organization:tabs.profile', 'Profile'), icon: FiUser },
    ];

    const tabPathToId = {
        'team': 'directory',
        'contracts': 'contracts',
        'payroll': 'payroll',
        'policy': 'policy',
        'profile': 'profile'
    };

    const getActiveTabFromPath = useCallback(() => {
        const pathParts = location.pathname.split('/').filter(Boolean);
        const basePathIndex = pathParts.findIndex(part => part === 'organization' || part === 'facility');
        
        if (basePathIndex >= 0 && basePathIndex < pathParts.length - 1) {
            const tabPath = pathParts[basePathIndex + 1];
            return tabPathToId[tabPath] || 'directory';
        }
        
        return 'directory';
    }, [location.pathname]);

    const getActiveSubTabFromPath = useCallback(() => {
        const pathParts = location.pathname.split('/').filter(Boolean);
        const basePathIndex = pathParts.findIndex(part => part === 'organization' || part === 'facility');
        
        if (basePathIndex >= 0 && basePathIndex + 2 < pathParts.length) {
            const subTabPath = pathParts[basePathIndex + 2];
            if (['employees', 'organigram', 'hiring'].includes(subTabPath)) {
                return subTabPath;
            }
        }
        
        return 'employees';
    }, [location.pathname]);

    const activeTab = getActiveTabFromPath();
    const activeSubTab = getActiveSubTabFromPath();

    useEffect(() => {
        const pathParts = location.pathname.split('/').filter(Boolean);
        const basePathIndex = pathParts.findIndex(part => part === 'organization' || part === 'facility');
        
        if (basePathIndex >= 0) {
            if (basePathIndex === pathParts.length - 1) {
                const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);
                navigate(buildDashboardUrl(`/${basePath}/team/employees`, workspaceId), { replace: true });
                return;
            }
            
            const tabPath = pathParts[basePathIndex + 1];
            if (tabPath === 'spend') {
                const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);
                navigate(buildDashboardUrl(`/${basePath}/team/employees`, workspaceId), { replace: true });
            }
            
            if (tabPath === 'team' && basePathIndex + 2 >= pathParts.length) {
                const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);
                navigate(buildDashboardUrl(`/${basePath}/team/employees`, workspaceId), { replace: true });
            }
        }
    }, [location.pathname, navigate, selectedWorkspace, basePath]);

    // Fetch organization data
    const fetchOrganization = useCallback(async () => {
        if (!currentUser) {
            return;
        }

        setIsLoading(true);
        try {
            // STRATEGY: Always treat the current facility as the Organization (Group Head)
            // If it's part of another group, we could show that, but the request implies 
            // the facility ITSELF is the organization context here.

            const currentFacilityId = selectedWorkspace?.facilityId;
            let groupHeadData = null;
            let groupHeadId = null;

            if (currentFacilityId) {
                const facilityDocRef = doc(db, 'facilityProfiles', currentFacilityId);
                const facilitySnap = await getDoc(facilityDocRef);

                if (facilitySnap.exists()) {
                    const data = facilitySnap.data();
                    groupHeadData = data;
                    groupHeadId = facilitySnap.id;
                }
            }

            if (groupHeadData) {
                // normalize to organization object
                const orgData = {
                    id: groupHeadId,
                    name: groupHeadData.organizationName || groupHeadData.facilityName || groupHeadData.companyName,
                    type: 'group',
                    admins: groupHeadData.admins,
                    settings: groupHeadData.organizationSettings || {},
                    memberFacilityIds: groupHeadData.memberFacilityIds || [groupHeadId],
                    ...groupHeadData
                };
                setOrganization(orgData);

                // Fetch members
                if (orgData.memberFacilityIds?.length > 0) {
                    const facilitiesPromises = orgData.memberFacilityIds.map(async (fid) => {
                        const fRef = doc(db, 'facilityProfiles', fid);
                        const fSnap = await getDoc(fRef);
                        return fSnap.exists() ? { id: fSnap.id, ...fSnap.data() } : null;
                    });
                    const facilities = (await Promise.all(facilitiesPromises)).filter(Boolean);
                    setMemberFacilities(facilities);
                } else {
                    setMemberFacilities([{ id: groupHeadId, ...groupHeadData }]);
                }

                setIsLoading(false);
                return;
            }

            setOrganization(null);
            setMemberFacilities([]);

        } catch (error) {
            console.error('OrganizationDashboard: Error fetching organization:', error);
            showNotification(t('organization:errors.fetchFailed', 'Failed to load organization'), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [currentUser, selectedWorkspace, showNotification, t]);

    useEffect(() => {
        fetchOrganization();
    }, [fetchOrganization]);

    const fetchUserFacilities = useCallback(async () => {
        if (!currentUser || !user) {
            setUserFacilities([]);
            return;
        }

        try {
            const userRoles = user.roles || [];
            const facilityIds = userRoles
                .filter(role => role.facility_uid)
                .map(role => role.facility_uid);

            if (facilityIds.length === 0) {
                setUserFacilities([]);
                return;
            }

            const uniqueFacilityIds = [...new Set(facilityIds)];
            const facilitiesPromises = uniqueFacilityIds.map(async (fid) => {
                const fRef = doc(db, 'facilityProfiles', fid);
                const fSnap = await getDoc(fRef);
                return fSnap.exists() ? { id: fSnap.id, ...fSnap.data() } : null;
            });

            const facilities = (await Promise.all(facilitiesPromises)).filter(Boolean);
            setUserFacilities(facilities);
        } catch (error) {
            console.error('OrganizationDashboard: Error fetching user facilities:', error);
            setUserFacilities([]);
        }
    }, [currentUser, user]);

    useEffect(() => {
        fetchUserFacilities();
    }, [fetchUserFacilities]);

    const allFacilities = useMemo(() => {
        const facilityMap = new Map();
        
        memberFacilities.forEach(facility => {
            facilityMap.set(facility.id, facility);
        });
        
        userFacilities.forEach(facility => {
            if (!facilityMap.has(facility.id)) {
                facilityMap.set(facility.id, facility);
            }
        });
        
        return Array.from(facilityMap.values());
    }, [memberFacilities, userFacilities]);

    useEffect(() => {
        if (memberFacilities.length > 0 && selectedFacilityId === null) {
            setSelectedFacilityId('all');
        }
    }, [memberFacilities, selectedFacilityId]);

    const filteredFacilitiesForDropdown = useMemo(() => {
        if (!facilitySearchQuery.trim()) {
            return memberFacilities;
        }
        const query = facilitySearchQuery.toLowerCase();
        return memberFacilities.filter(facility => {
            const name = (facility.facilityName || facility.companyName || '').toLowerCase();
            return name.includes(query);
        });
    }, [memberFacilities, facilitySearchQuery]);

    const handleFacilitySearch = () => {
        if (facilitySearchQuery.trim() && filteredFacilitiesForDropdown.length > 0) {
            setSelectedFacilityId(filteredFacilitiesForDropdown[0].id);
            setFacilitySearchQuery('');
        }
    };




    // Remove facility from organization
    const handleRemoveFacility = async (facilityId) => {
        if (!window.confirm(t('organization:confirm.removeFacility', 'Remove this facility from the organization?'))) {
            return;
        }

        try {
            const removeFacilityFn = httpsCallable(functions, 'removeFacilityFromOrganization');
            const result = await removeFacilityFn({
                organizationId: organization.id,
                facilityId
            });

            if (result.data.success) {
                showNotification(t('organization:success.facilityRemoved', 'Facility removed successfully!'), 'success');
                fetchOrganization();
            }
        } catch (error) {
            console.error('Error removing facility:', error);
            showNotification(error.message || t('organization:errors.removeFacilityFailed', 'Failed to remove facility'), 'error');
        }
    };

    // Check if current user is org admin
    const isOrgAdmin = organization?.admins?.includes(currentUser?.uid);

    // Facility Card Component
    const FacilityCard = ({ facility, canRemove }) => (
        <div className="dashboard-card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="metric-icon-container bg-primary/10 text-primary">
                        <FiHome className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">
                            {facility.facilityName || facility.companyName || t('organization:labels.unnamedFacility')}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                            {facility.address?.city}, {facility.address?.canton}
                        </p>
                        {facility.glnNumber && (
                            <p className="text-xs text-muted-foreground mt-1">
                                GLN: {facility.glnNumber}
                            </p>
                        )}
                    </div>
                </div>
                {canRemove && (
                    <button
                        onClick={() => handleRemoveFacility(facility.id)}
                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title={t('organization:actions.remove', 'Remove from organization')}
                    >
                        <FiX className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Chain Admin Badge */}
            {facility.chainAdmins?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                        <FiShield className="w-3.5 h-3.5" />
                        <span>{t('organization:labels.chainAdminsSynced', 'Chain admins synced')}</span>
                    </div>
                </div>
            )}
        </div>
    );

    FacilityCard.propTypes = {
        facility: PropTypes.shape({
            id: PropTypes.string,
            facilityName: PropTypes.string,
            companyName: PropTypes.string,
            address: PropTypes.shape({
                city: PropTypes.string,
                canton: PropTypes.string
            }),
            glnNumber: PropTypes.string,
            chainAdmins: PropTypes.array
        }).isRequired,
        canRemove: PropTypes.bool.isRequired
    };



    return (
        <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
            <div className="shrink-0 py-4 border-b border-border bg-card/30">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
                    <h1 className="text-xl font-semibold text-foreground mb-3">
                        {pageTitle}
                    </h1>
                    <div className="flex gap-1 sm:gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => navigate(buildDashboardUrl(`/${basePath}/${tab.path}`, workspaceId))}
                                    className={cn(
                                        "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0",
                                        "touch-manipulation active:scale-95",
                                        activeTab === tab.id
                                            ? "border-primary text-primary bg-primary/5"
                                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                                    )}
                                    title={tab.label}
                                >
                                    <Icon className="w-4 h-4 shrink-0" />
                                    <span className="text-xs sm:text-sm min-w-0">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <div className="max-w-[1400px] mx-auto w-full p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : !organization ? (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <FiUsers className="w-10 h-10 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold text-foreground mb-2">
                                {t('organization:notFound', 'Organization not found')}
                            </h3>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'organigram' && (
                                <OrganigramView 
                                    organization={organization} 
                                    memberFacilities={memberFacilities}
                                    selectedFacilityId={selectedFacilityId}
                                />
                            )}

                            {activeTab === 'directory' && (
                                <div className="space-y-6">
                                    <div className="shrink-0">
                                        <div className="flex gap-2 border-b border-border overflow-x-auto max-w-[1400px] mx-auto px-6">
                                            {[
                                                { id: 'employees', label: t('organization:subTabs.employees', 'Employees'), icon: FiUserPlus, path: 'employees' },
                                                { id: 'organigram', label: t('organization:tabs.organigram', 'Organigram'), icon: FiGitBranch, path: 'organigram' },
                                                { id: 'hiring', label: t('organization:subTabs.hiring', 'Hiring Processes'), icon: FiBriefcase, path: 'hiring' }
                                            ].map((subTab) => {
                                                const SubIcon = subTab.icon;
                                                const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);
                                                return (
                                                    <button
                                                        key={subTab.id}
                                                        onClick={() => navigate(buildDashboardUrl(`/${basePath}/team/${subTab.path}`, workspaceId))}
                                                        className={cn(
                                                            "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                                                            activeSubTab === subTab.id
                                                                ? "border-primary text-primary"
                                                                : "border-transparent text-muted-foreground hover:text-foreground"
                                                        )}
                                                        title={subTab.label}
                                                    >
                                                        <SubIcon className="w-4 h-4 shrink-0" />
                                                        <span>{subTab.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {activeSubTab === 'employees' && (
                                        <GlobalDirectory 
                                            organization={organization}
                                            memberFacilities={allFacilities}
                                        />
                                    )}

                                    {activeSubTab === 'organigram' && (
                                        <TeamOrganigram />
                                    )}

                                    {activeSubTab === 'hiring' && (
                                        <HiringProcesses 
                                            organization={organization}
                                            memberFacilities={memberFacilities}
                                        />
                                    )}
                                </div>
                            )}
                            {activeTab === 'contracts' && <Contracts hideHeader={true} hideStats={true} />}
                            {activeTab === 'payroll' && <PayrollDashboard hideHeader={true} hideStats={true} />}
                            {activeTab === 'policy' && <PolicyLibrary hideHeader={true} hideStats={false} />}
                            {activeTab === 'profile' && <Profile />}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrganizationDashboard;
