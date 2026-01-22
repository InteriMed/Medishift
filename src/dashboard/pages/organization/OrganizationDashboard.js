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

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { functions, db } from '../../../services/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
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
    FiBriefcase
} from 'react-icons/fi';
import { cn } from '../../../utils/cn';

import PageHeader from '../../components/PageHeader/PageHeader';
import ChainHeadquarters from './tabs/ChainHeadquarters';
import OrganigramView from './tabs/OrganigramView';

const OrganizationDashboard = () => {
    const { t } = useTranslation(['organization', 'common']);
    const { currentUser } = useAuth();
    const { showNotification } = useNotification();

    const [organization, setOrganization] = useState(null);
    const [memberFacilities, setMemberFacilities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');

    // Tab State
    const [activeTab, setActiveTab] = useState('overview');

    // Fetch organization data
    const fetchOrganization = useCallback(async () => {
        if (!currentUser) return;

        setIsLoading(true);
        try {
            // Check if user is admin of any organization
            const orgsQuery = query(
                collection(db, 'organizations'),
                where('admins', 'array-contains', currentUser.uid)
            );
            const orgsSnapshot = await getDocs(orgsQuery);

            if (!orgsSnapshot.empty) {
                const orgDoc = orgsSnapshot.docs[0];
                const orgData = { id: orgDoc.id, ...orgDoc.data() };
                setOrganization(orgData);

                // Fetch member facilities
                if (orgData.memberFacilityIds?.length > 0) {
                    const facilitiesPromises = orgData.memberFacilityIds.map(async (facilityId) => {
                        const facilityQuery = query(
                            collection(db, 'facilityProfiles'),
                            where('__name__', '==', facilityId)
                        );
                        const facilitySnapshot = await getDocs(facilityQuery);
                        if (!facilitySnapshot.empty) {
                            return { id: facilitySnapshot.docs[0].id, ...facilitySnapshot.docs[0].data() };
                        }
                        return null;
                    });

                    const facilities = (await Promise.all(facilitiesPromises)).filter(Boolean);
                    setMemberFacilities(facilities);
                }
            } else {
                // Check if user's facility is part of an organization
                const facilityQuery = query(
                    collection(db, 'facilityProfiles'),
                    where('__name__', '==', currentUser.uid)
                );
                const facilitySnapshot = await getDocs(facilityQuery);

                if (!facilitySnapshot.empty) {
                    const facilityData = facilitySnapshot.docs[0].data();
                    if (facilityData.organizationId) {
                        // Fetch the organization
                        const orgQuery = query(
                            collection(db, 'organizations'),
                            where('__name__', '==', facilityData.organizationId)
                        );
                        const orgSnapshot = await getDocs(orgQuery);
                        if (!orgSnapshot.empty) {
                            setOrganization({ id: orgSnapshot.docs[0].id, ...orgSnapshot.docs[0].data() });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching organization:', error);
            showNotification(t('organization:errors.fetchFailed', 'Failed to load organization'), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [currentUser, showNotification, t]);

    useEffect(() => {
        fetchOrganization();
    }, [fetchOrganization]);

    // Create new organization
    const handleCreateOrganization = async () => {
        if (!newOrgName.trim()) {
            showNotification(t('organization:errors.nameRequired', 'Organization name is required'), 'warning');
            return;
        }

        setIsCreating(true);
        try {
            const createOrgFn = httpsCallable(functions, 'createOrganization');
            const result = await createOrgFn({
                name: newOrgName,
                type: 'group',
                initialFacilityIds: [currentUser.uid],
                settings: {
                    sharedStaffPool: true,
                    crossFacilityScheduling: true
                }
            });

            if (result.data.success) {
                showNotification(t('organization:success.created', 'Organization created successfully!'), 'success');
                setShowCreateModal(false);
                setNewOrgName('');
                fetchOrganization();
            }
        } catch (error) {
            console.error('Error creating organization:', error);
            showNotification(error.message || t('organization:errors.createFailed', 'Failed to create organization'), 'error');
        } finally {
            setIsCreating(false);
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
                <div className="mt-3 pt-3 border-t border-border/50">
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

    // Create Organization Modal
    const CreateOrgModal = () => (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-xl max-w-md w-full">
                <div className="p-6 border-b border-border">
                    <h3 className="text-xl font-semibold text-foreground">
                        {t('organization:create.title', 'Create Organization')}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('organization:create.subtitle', 'Create a new pharmacy chain or group')}
                    </p>
                </div>

                <div className="p-6">
                    <label className="block text-sm font-medium text-foreground mb-2">
                        {t('organization:create.nameLabel', 'Organization Name')}
                    </label>
                    <input
                        type="text"
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                        placeholder={t('organization:create.namePlaceholder', 'e.g., Amavita Geneva Group')}
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                </div>

                <div className="p-6 border-t border-border flex gap-3 justify-end">
                    <button
                        onClick={() => setShowCreateModal(false)}
                        className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {t('common:cancel', 'Cancel')}
                    </button>
                    <button
                        onClick={handleCreateOrganization}
                        disabled={isCreating || !newOrgName.trim()}
                        className={cn(
                            "px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium",
                            "hover:bg-primary/90 transition-colors",
                            (isCreating || !newOrgName.trim()) && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {isCreating ? (
                            <span className="flex items-center gap-2">
                                <FiRefreshCw className="w-4 h-4 animate-spin" />
                                {t('common:creating', 'Creating...')}
                            </span>
                        ) : (
                            t('common:create', 'Create')
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    // Empty State
    const EmptyState = () => (
        <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <FiUsers className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
                {t('organization:empty.title', 'No Organization Yet')}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
                {t('organization:empty.description', 'Create an organization to manage multiple pharmacy locations, share staff, and consolidate billing.')}
            </p>
            <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
                <FiPlus className="w-4 h-4" />
                {t('organization:actions.create', 'Create Organization')}
            </button>
        </div>
    );

    return (
        <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
            <PageHeader
                title={organization?.name || t('organization:title', 'Organization')}
                subtitle={organization
                    ? t('organization:subtitle', 'Manage your pharmacy chain')
                    : t('organization:noOrg', 'Create or join an organization')
                }
                actions={organization && (
                    <button
                        onClick={fetchOrganization}
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
                )}
                variant="default"
            />

            {/* Tabs */}
            {organization && (
                <div className="shrink-0 px-6 sm:px-8 py-4 border-b border-border bg-card/30">
                    <div className="flex gap-4">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                                activeTab === 'overview'
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <FiGrid className="w-4 h-4" />
                            {t('organization:tabs.overview', 'Overview')}
                        </button>
                        <button
                            onClick={() => setActiveTab('headquarters')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                                activeTab === 'headquarters'
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <FiBriefcase className="w-4 h-4" />
                            {t('organization:tabs.headquarters', 'Headquarters')}
                        </button>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : !organization ? (
                    <EmptyState />
                ) : (
                    <>
                        {/* OVERVIEW TAB */}
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                {/* Organization Info Card */}
                                <div className="bg-card border border-border rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-foreground">
                                            {t('organization:sections.info', 'Organization Info')}
                                        </h3>
                                        {isOrgAdmin && (
                                            <button className="text-sm text-primary hover:text-primary/80 flex items-center gap-1">
                                                <FiSettings className="w-4 h-4" />
                                                {t('common:settings', 'Settings')}
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-4 bg-muted/30 rounded-lg">
                                            <p className="text-sm text-muted-foreground">{t('organization:labels.type', 'Type')}</p>
                                            <p className="font-medium capitalize">{organization.type || t('organization:labels.group')}</p>
                                        </div>
                                        <div className="p-4 bg-muted/30 rounded-lg">
                                            <p className="text-sm text-muted-foreground">{t('organization:labels.facilities', 'Facilities')}</p>
                                            <p className="font-medium">{memberFacilities.length}</p>
                                        </div>
                                        <div className="p-4 bg-muted/30 rounded-lg">
                                            <p className="text-sm text-muted-foreground">{t('organization:labels.admins', 'Admins')}</p>
                                            <p className="font-medium">{organization.admins?.length || 0}</p>
                                        </div>
                                    </div>

                                    {/* Settings */}
                                    <div className="mt-4 pt-4 border-t border-border">
                                        <div className="flex flex-wrap gap-3">
                                            {organization.settings?.sharedStaffPool && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-transparent text-green-700 border border-green-700">
                                                    <FiCheck className="w-3 h-3" />
                                                    {t('organization:settings.sharedStaff', 'Shared Staff Pool')}
                                                </span>
                                            )}
                                            {organization.settings?.crossFacilityScheduling && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-transparent text-blue-700 border border-blue-700">
                                                    <FiCheck className="w-3 h-3" />
                                                    {t('organization:settings.crossScheduling', 'Cross-Facility Scheduling')}
                                                </span>
                                            )}
                                            {organization.settings?.consolidatedBilling && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-transparent text-purple-700 border border-purple-700">
                                                    <FiCheck className="w-3 h-3" />
                                                    {t('organization:settings.consolidatedBilling', 'Consolidated Billing')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Organigram View */}
                                <OrganigramView organization={organization} memberFacilities={memberFacilities} />

                                {/* Member Facilities List */}
                                <div className="bg-card border border-border rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-foreground">
                                            {t('organization:sections.facilities', 'Member Facilities')}
                                            {memberFacilities.length > 0 && (
                                                <span className="ml-2 text-sm font-normal text-muted-foreground">
                                                    ({memberFacilities.length})
                                                </span>
                                            )}
                                        </h3>
                                        {isOrgAdmin && (
                                            <button
                                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
                                            >
                                                <FiLink className="w-4 h-4" />
                                                {t('organization:actions.addFacility', 'Add Facility')}
                                            </button>
                                        )}
                                    </div>

                                    {memberFacilities.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            {t('organization:facilities.empty', 'No facilities in this organization yet.')}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {memberFacilities.map((facility) => (
                                                <FacilityCard
                                                    key={facility.id}
                                                    facility={facility}
                                                    canRemove={isOrgAdmin && memberFacilities.length > 1}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* HEADQUARTERS TAB */}
                        {activeTab === 'headquarters' && (
                            <ChainHeadquarters />
                        )}
                    </>
                )}
            </div>

            {/* Modals */}
            {showCreateModal && <CreateOrgModal />}
        </div>
    );
};

export default OrganizationDashboard;
