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
import { useNavigate, useLocation } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { functions, db } from '../../../services/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { useDashboard } from '../../contexts/DashboardContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { buildDashboardUrl, getWorkspaceIdForUrl } from '../../../config/routeUtils';
import { WORKSPACE_TYPES } from '../../../utils/sessionAuth';
import { FIRESTORE_COLLECTIONS } from '../../../config/keysDatabase';
import {
    FiUsers,
    FiX,
    FiHome,
    FiShield,
    FiFileText,
    FiUserPlus,
    FiGitBranch,
    FiCreditCard,
    FiUser,
    FiBriefcase,
    FiEye,
    FiChevronUp,
    FiChevronDown
} from 'react-icons/fi';
import { cn } from '../../../utils/cn';

import OrganigramView from './tabs/OrganigramView';
import PayrollDashboard from '../payroll/PayrollDashboard';
import Profile from '../profile/Profile';
import Contracts from '../contracts/Contracts';
import TeamOrganigramView from './components/TeamOrganigramView';
import TeamEmployees from './components/TeamEmployees';
import TeamHiring from './components/TeamHiring';


const OrganizationDashboard = () => {
    const { t } = useTranslation(['organization', 'common']);
    const { currentUser } = useAuth();
    const { selectedWorkspace, user, workspaces, switchWorkspace } = useDashboard();
    const { showNotification } = useNotification();
    const navigate = useNavigate();
    const location = useLocation();

    const [organization, setOrganization] = useState(null);
    const [memberFacilities, setMemberFacilities] = useState([]);
    const [userFacilities, setUserFacilities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [selectedFacilityId, setSelectedFacilityId] = useState('all');
    const [facilitySearchQuery, setFacilitySearchQuery] = useState('');
    const [viewFacilityDropdownOpen, setViewFacilityDropdownOpen] = useState(false);

    const getBasePath = useCallback(() => {
        const isOrganizationWorkspace = selectedWorkspace?.type === 'organization';
        return isOrganizationWorkspace ? 'organization' : 'facility';
    }, [selectedWorkspace]);

    const basePath = useMemo(() => getBasePath(), [getBasePath]);
    const isOrganizationWorkspace = selectedWorkspace?.type === 'organization';
    const pageTitle = isOrganizationWorkspace 
        ? t('organization:title', 'Organization')
        : t('organization:facilityTitle', 'Facility');

    const tabs = [
        { id: 'directory', path: 'team', label: t('organization:tabs.team', 'Team'), icon: FiUserPlus },
        { id: 'contracts', path: 'contracts', label: t('organization:tabs.contracts', 'Contracts'), icon: FiFileText },
        { id: 'payroll', path: 'payroll', label: t('organization:tabs.consolidatedPayroll', 'Consolidated Payroll'), icon: FiCreditCard },
        { id: 'profile', path: 'profile', label: t('organization:tabs.profile', 'Profile'), icon: FiUser },
    ];

    const tabPathToId = {
        'team': 'directory',
        'contracts': 'contracts',
        'payroll': 'payroll',
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
    }, [location.pathname, tabPathToId]);

    const getActiveSubTabFromPath = useCallback(() => {
        const pathParts = location.pathname.split('/').filter(Boolean);
        const basePathIndex = pathParts.findIndex(part => part === 'organization' || part === 'facility');
        
        if (basePathIndex >= 0 && basePathIndex + 2 < pathParts.length) {
            const subTabPath = pathParts[basePathIndex + 2];
            if (['employees', 'organigram', 'hiring', 'requests'].includes(subTabPath)) {
                return subTabPath;
            }
        }
        
        return 'requests';
    }, [location.pathname]);

    const activeTab = getActiveTabFromPath();
    const activeSubTab = getActiveSubTabFromPath();

    useEffect(() => {
        const pathParts = location.pathname.split('/').filter(Boolean);
        const basePathIndex = pathParts.findIndex(part => part === 'organization' || part === 'facility');
        
        if (basePathIndex < 0) return;
        
        const currentPath = location.pathname;
        const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);
        const targetPath = buildDashboardUrl(`/${basePath}/team/employees`, workspaceId);
        
        if (basePathIndex === pathParts.length - 1) {
            if (currentPath !== targetPath) {
                navigate(targetPath, { replace: true });
            }
            return;
        }
        
        const tabPath = pathParts[basePathIndex + 1];
        if (tabPath === 'spend') {
            if (currentPath !== targetPath) {
                navigate(targetPath, { replace: true });
            }
            return;
        }
        
        if (tabPath === 'team' && basePathIndex + 2 >= pathParts.length) {
            if (currentPath !== targetPath) {
                navigate(targetPath, { replace: true });
            }
            return;
        }
    }, [location.pathname, navigate, selectedWorkspace, basePath]);

    // Fetch organization data
    const fetchOrganization = useCallback(async () => {
        if (!currentUser) {
            return;
        }

        setIsLoading(true);
        try {
            const isOrganizationWorkspace = selectedWorkspace?.type === 'organization';
            const organizationId = selectedWorkspace?.organizationId || selectedWorkspace?.facilityId;
            const currentFacilityId = selectedWorkspace?.facilityId;
            
            let orgData = null;
            let orgId = null;

            if (isOrganizationWorkspace && organizationId) {
                const orgDocRef = doc(db, FIRESTORE_COLLECTIONS.ORGANIZATIONS, organizationId);
                const orgSnap = await getDoc(orgDocRef);

                if (orgSnap.exists()) {
                    const data = orgSnap.data();
                    orgData = {
                        id: orgSnap.id,
                        name: data.organizationName || data.organizationDetails?.name || data.name,
                        type: 'organization',
                        admins: data.internalTeam?.admins || data.admins || [],
                        settings: data.organizationSettings || data.settings || {},
                        memberFacilityIds: Object.keys(data.facilities || {}),
                        ...data
                    };
                    orgId = orgSnap.id;
                }
            }

            if (!orgData && currentFacilityId) {
                const facilityDocRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, currentFacilityId);
                const facilitySnap = await getDoc(facilityDocRef);

                if (facilitySnap.exists()) {
                    const data = facilitySnap.data();
                    orgData = {
                        id: facilitySnap.id,
                        name: data.organizationName || data.facilityName || data.companyName,
                        type: 'group',
                        admins: data.admins || [],
                        settings: data.organizationSettings || {},
                        memberFacilityIds: data.memberFacilityIds || [facilitySnap.id],
                        ...data
                    };
                    orgId = facilitySnap.id;
                }
            }

            if (orgData) {
                setOrganization(orgData);

                if (orgData.memberFacilityIds?.length > 0) {
                    const facilitiesPromises = orgData.memberFacilityIds.map(async (fid) => {
                        const fRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, fid);
                        const fSnap = await getDoc(fRef);
                        return fSnap.exists() ? { id: fSnap.id, ...fSnap.data() } : null;
                    });
                    const facilities = (await Promise.all(facilitiesPromises)).filter(Boolean);
                    setMemberFacilities(facilities);
                } else {
                    setMemberFacilities(orgId ? [{ id: orgId, ...orgData }] : []);
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



    const handleViewAsFacility = (facility) => {
        const facilityWorkspace = workspaces?.find(w => 
            w.type === WORKSPACE_TYPES.TEAM && w.facilityId === facility.id
        );
        
        if (facilityWorkspace) {
            switchWorkspace(facilityWorkspace);
            setViewFacilityDropdownOpen(false);
        } else {
            showNotification(t('organization:errors.facilityWorkspaceNotFound', 'Facility workspace not found'), 'error');
        }
    };

    const viewFacilityDropdownRef = React.useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (viewFacilityDropdownRef.current && !viewFacilityDropdownRef.current.contains(event.target)) {
                setViewFacilityDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
            <div className="shrink-0 pt-4 border-b border-border bg-card/30">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
                    <div className="flex items-center justify-between mb-3">
                        <h1 className="text-xl font-semibold text-foreground">
                            {pageTitle}
                        </h1>
                        {isOrganizationWorkspace && memberFacilities.length > 0 && (
                            <div className="relative" ref={viewFacilityDropdownRef}>
                                <button
                                    onClick={() => setViewFacilityDropdownOpen(!viewFacilityDropdownOpen)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border-2 border-input bg-background text-foreground hover:border-muted-foreground/30 transition-all"
                                    style={{ height: 'var(--boxed-inputfield-height)' }}
                                >
                                    <FiEye className="w-4 h-4" />
                                    <span>{t('organization:viewAsFacility', 'View as facility')}</span>
                                    {viewFacilityDropdownOpen ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                                </button>
                                {viewFacilityDropdownOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-64 bg-card rounded-lg shadow-xl border border-border z-30 animate-in fade-in zoom-in-95 duration-200 max-h-[400px] overflow-y-auto">
                                        <div className="p-2">
                                            {memberFacilities.map((facility) => (
                                                <button
                                                    key={facility.id}
                                                    onClick={() => handleViewAsFacility(facility)}
                                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 text-sm text-foreground transition-colors text-left"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-semibold text-xs">
                                                        {(facility.facilityName || facility.companyName || 'F').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium truncate">
                                                            {facility.facilityName || facility.companyName || t('organization:labels.unnamedFacility', 'Unnamed Facility')}
                                                        </div>
                                                        {facility.address?.city && (
                                                            <div className="text-xs text-muted-foreground truncate">
                                                                {facility.address.city}
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
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
                {isLoading ? (
                    <div className="max-w-[1400px] mx-auto w-full p-6">
                        <div className="flex items-center justify-center py-16">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    </div>
                ) : !organization ? (
                    <div className="max-w-[1400px] mx-auto w-full p-6">
                        <div className="text-center py-16">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <FiUsers className="w-10 h-10 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold text-foreground mb-2">
                                {t('organization:notFound', 'Organization not found')}
                            </h3>
                        </div>
                    </div>
                ) : (
                    <>
                        {activeTab === 'organigram' && (
                            <div className="facility-tab-layout-container">
                                <div className="facility-tab-content-wrapper">
                                    <div className="facility-tab-content">
                                        <OrganigramView 
                                            organization={organization} 
                                            memberFacilities={memberFacilities}
                                            selectedFacilityId={selectedFacilityId}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'directory' && (
                            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                <div className="shrink-0 pt-0">
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
                                                        "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
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

                                <div className="flex-1 overflow-auto">
                                    <div className="facility-tab-layout-container">
                                        <div className="facility-tab-content-wrapper">
                                            <div className="facility-tab-content">
                                                {activeSubTab === 'employees' && (
                                                    <TeamEmployees hideHeader={true} hideStats={true} />
                                                )}

                                                {activeSubTab === 'organigram' && (
                                                    <TeamOrganigramView />
                                                )}

                                                {activeSubTab === 'hiring' && (
                                                    <TeamHiring hideHeader={true} hideStats={true} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'contracts' && (
                            <div className="facility-tab-layout-container">
                                <div className="facility-tab-content-wrapper">
                                    <div className="facility-tab-content">
                                        <Contracts hideHeader={true} hideStats={true} />
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'payroll' && (
                            <div className="facility-tab-layout-container">
                                <div className="facility-tab-content-wrapper">
                                    <div className="facility-tab-content">
                                        <PayrollDashboard hideHeader={true} hideStats={true} />
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'profile' && <Profile />}
                    </>
                )}
            </div>
        </div>
    );
};

export default OrganizationDashboard;
