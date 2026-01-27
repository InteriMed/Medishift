import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import { useAuth } from '../../../../contexts/AuthContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import { useDashboard } from '../../../contexts/DashboardContext';
import {
    FiBriefcase,
    FiX,
    FiPlus,
    FiMove,
    FiUser,
    FiCalendar
} from 'react-icons/fi';
import { cn } from '../../../../utils/cn';
import SimpleDropdown from '../../../../components/BoxedInputFields/Dropdown-Field';
import DateField from '../../../../components/BoxedInputFields/DateField';
import Dialog from '../../../../components/Dialog/Dialog';
import InputField from '../../../../components/BoxedInputFields/Personnalized-InputField';
import InputFieldParagraph from '../../../../components/BoxedInputFields/TextareaField';
import { useMarketplaceData } from '../../../hooks/useMarketplaceData';
import FilterBar from '../../../components/FilterBar/FilterBar';

const HiringProcesses = ({ organization, memberFacilities = [] }) => {
    const { t } = useTranslation(['organization', 'common']);
    const { currentUser } = useAuth();
    const { showNotification } = useNotification();

    const [positions, setPositions] = useState([]);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        status: 'all',
        facility: 'all',
        fromDate: null,
        toDate: null
    });
    const [sortBy, setSortBy] = useState('created');
    const [selectedPosition, setSelectedPosition] = useState(null);
    const [showCandidatePopup, setShowCandidatePopup] = useState(false);
    const [positionCandidates, setPositionCandidates] = useState([]);
    const [candidateSortBy, setCandidateSortBy] = useState('experience');
    const [candidateShowSortMenu, setCandidateShowSortMenu] = useState(false);
    const [isCreatePositionModalOpen, setIsCreatePositionModalOpen] = useState(false);
    const [positionFormData, setPositionFormData] = useState({
        jobTitle: '',
        jobType: 'general',
        startTime: '',
        endTime: '',
        location: '',
        description: '',
        compensation: ''
    });
    const [isCreatingPosition, setIsCreatingPosition] = useState(false);

    const { selectedWorkspace } = useDashboard();
    const { createPosition } = useMarketplaceData();

    const loadPositions = useCallback(async () => {
        if (!organization || memberFacilities.length === 0) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const allPositions = [];
            const allApplications = [];

            for (const facility of memberFacilities) {
                const facilityId = facility.id;
                try {
                    const positionsQuery = query(
                        collection(db, 'positions'),
                        where('facilityProfileId', '==', facilityId),
                        orderBy('created', 'desc')
                    );
                    const positionsSnapshot = await getDocs(positionsQuery);

                    for (const positionDoc of positionsSnapshot.docs) {
                        const positionData = positionDoc.data();
                        allPositions.push({
                            id: positionDoc.id,
                            ...positionData,
                            facilityName: facility.facilityName || facility.companyName || 'Unknown'
                        });

                        try {
                            const applicationsQuery = query(
                                collection(db, 'positions', positionDoc.id, 'applications'),
                                orderBy('createdAt', 'desc')
                            );
                            const applicationsSnapshot = await getDocs(applicationsQuery);

                            applicationsSnapshot.forEach((appDoc) => {
                                allApplications.push({
                                    id: appDoc.id,
                                    positionId: positionDoc.id,
                                    ...appDoc.data()
                                });
                            });
                        } catch (appError) {
                            console.error(`Error loading applications for position ${positionDoc.id}:`, appError);
                        }
                    }
                } catch (error) {
                    console.error(`Error loading positions for facility ${facilityId}:`, error);
                }
            }

            setPositions(allPositions);
            setApplications(allApplications);
        } catch (error) {
            console.error('Error loading hiring processes:', error);
            showNotification(t('organization:hiring.errors.loadFailed', 'Failed to load hiring processes'), 'error');
        } finally {
            setLoading(false);
        }
    }, [organization, memberFacilities, showNotification, t]);

    useEffect(() => {
        loadPositions();
    }, [loadPositions]);

    const loadPositionCandidates = useCallback(async (positionId) => {
        try {
            const positionApplications = applications.filter(a => a.positionId === positionId);
            const candidatesWithProfiles = [];

            for (const application of positionApplications) {
                const professionalId = application.professionalProfileId || application.userId;
                if (!professionalId) continue;

                try {
                    const professionalRef = doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, professionalId);
                    const professionalSnap = await getDoc(professionalRef);

                    if (professionalSnap.exists()) {
                        const profileData = professionalSnap.data();
                        const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, professionalId);
                        const userSnap = await getDoc(userRef);
                        const userData = userSnap.exists() ? userSnap.data() : {};

                        candidatesWithProfiles.push({
                            ...application,
                            profile: {
                                ...profileData,
                                firstName: userData.firstName || profileData.firstName || profileData.identity?.firstName || '',
                                lastName: userData.lastName || profileData.lastName || profileData.identity?.lastName || '',
                                email: userData.email || '',
                                photoURL: userData.photoURL || profileData.profileDisplay?.profilePictureUrl || '',
                                experienceYears: profileData.profileDisplay?.experienceYears || 0,
                                jobTitle: profileData.profileDisplay?.jobTitle || '',
                                specializations: profileData.specializations || [],
                                skills: profileData.skills || []
                            }
                        });
                    }
                } catch (error) {
                    console.error(`Error loading candidate profile ${professionalId}:`, error);
                }
            }

            setPositionCandidates(candidatesWithProfiles);
        } catch (error) {
            console.error('Error loading position candidates:', error);
        }
    }, [applications]);

    const handlePositionClick = (position) => {
        setSelectedPosition(position);
        loadPositionCandidates(position.id);
        setShowCandidatePopup(true);
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

    const filteredAndSortedPositions = useMemo(() => {
        let filtered = positions;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(pos =>
                pos.title?.toLowerCase().includes(query) ||
                pos.facilityName?.toLowerCase().includes(query)
            );
        }

        if (filters.facility !== 'all') {
            filtered = filtered.filter(pos => {
                const facility = memberFacilities.find(f => f.id === filters.facility);
                return facility && (pos.facilityProfileId === filters.facility || pos.facilityName === (facility.facilityName || facility.companyName));
            });
        }

        if (filters.status !== 'all') {
            filtered = filtered.filter(pos => pos.status === filters.status);
        }

        if (filters.fromDate) {
            const fromDateObj = new Date(filters.fromDate);
            filtered = filtered.filter(pos => {
                const createdDate = pos.created?.toDate?.() || pos.created || new Date(0);
                return createdDate >= fromDateObj;
            });
        }

        if (filters.toDate) {
            const toDateObj = new Date(filters.toDate);
            filtered = filtered.filter(pos => {
                const createdDate = pos.created?.toDate?.() || pos.created || new Date(0);
                return createdDate <= toDateObj;
            });
        }

        const sorted = [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'created':
                    const dateA = a.created?.toDate?.() || a.created || new Date(0);
                    const dateB = b.created?.toDate?.() || b.created || new Date(0);
                    return dateB - dateA;
                case 'title':
                    return (a.title || '').localeCompare(b.title || '');
                case 'facility':
                    return (a.facilityName || '').localeCompare(b.facilityName || '');
                case 'applications':
                    const appsA = applications.filter(app => app.positionId === a.id).length;
                    const appsB = applications.filter(app => app.positionId === b.id).length;
                    return appsB - appsA;
                default:
                    return 0;
            }
        });

        return sorted;
    }, [positions, searchQuery, filters, sortBy, memberFacilities, applications]);

    const sortedCandidates = useMemo(() => {
        const sorted = [...positionCandidates].sort((a, b) => {
            switch (candidateSortBy) {
                case 'experience':
                    return (b.profile?.experienceYears || 0) - (a.profile?.experienceYears || 0);
                case 'name':
                    const nameA = `${a.profile?.firstName || ''} ${a.profile?.lastName || ''}`.toLowerCase();
                    const nameB = `${b.profile?.firstName || ''} ${b.profile?.lastName || ''}`.toLowerCase();
                    return nameA.localeCompare(nameB);
                case 'applied':
                    const dateA = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
                    const dateB = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
                    return dateB - dateA;
                default:
                    return 0;
            }
        });
        return sorted;
    }, [positionCandidates, candidateSortBy]);

    const hasActiveFilters = filters.facility !== 'all' || filters.status !== 'all' || filters.fromDate || filters.toDate;

    const handleCreatePosition = async () => {
        if (!positionFormData.jobTitle.trim() || !positionFormData.startTime || !positionFormData.endTime) {
            showNotification(t('organization:hiring.errors.missingFields', 'Please fill in all required fields'), 'error');
            return;
        }

        const startDate = new Date(positionFormData.startTime);
        const endDate = new Date(positionFormData.endTime);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            showNotification(t('organization:hiring.errors.invalidDate', 'Invalid date format'), 'error');
            return;
        }

        if (startDate >= endDate) {
            showNotification(t('organization:hiring.errors.endBeforeStart', 'End time must be after start time'), 'error');
            return;
        }

        setIsCreatingPosition(true);
        try {
            const facilityProfileId = selectedWorkspace?.facilityId;
            if (!facilityProfileId) {
                throw new Error('No facility selected');
            }

            await createPosition({
                facilityProfileId,
                jobTitle: positionFormData.jobTitle.trim(),
                jobType: positionFormData.jobType,
                startTime: startDate.toISOString(),
                endTime: endDate.toISOString(),
                location: positionFormData.location ? { address: positionFormData.location } : {},
                description: positionFormData.description.trim(),
                compensation: positionFormData.compensation ? { amount: positionFormData.compensation } : {}
            });

            setIsCreatePositionModalOpen(false);
            setPositionFormData({
                jobTitle: '',
                jobType: 'general',
                startTime: '',
                endTime: '',
                location: '',
                description: '',
                compensation: ''
            });
            loadPositions();
        } catch (error) {
            console.error('Error creating position:', error);
            showNotification(error.message || t('organization:hiring.errors.createFailed', 'Failed to create position'), 'error');
        } finally {
            setIsCreatingPosition(false);
        }
    };

    const sortOptions = [
        { value: 'created', label: t('organization:hiring.sort.created', 'Date Created') },
        { value: 'title', label: t('organization:hiring.sort.title', 'Title') },
        { value: 'facility', label: t('organization:hiring.sort.facility', 'Facility') },
        { value: 'applications', label: t('organization:hiring.sort.applications', 'Applications') }
    ];

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleClearFilters = () => {
        setFilters({
            status: 'all',
            facility: 'all',
            fromDate: null,
            toDate: null
        });
    };

    const candidateSortOptions = [
        { value: 'experience', label: t('organization:hiring.candidates.sort.experience', 'Experience') },
        { value: 'name', label: t('organization:hiring.candidates.sort.name', 'Name') },
        { value: 'applied', label: t('organization:hiring.candidates.sort.applied', 'Date Applied') }
    ];

    const maskContactInfo = (text) => {
        if (!text) return '••••••••';
        if (text.length <= 4) return '••••';
        return text.slice(0, 2) + '•••' + text.slice(-2);
    };

    const getInitials = (firstName, lastName) => {
        const first = firstName?.[0]?.toUpperCase() || '';
        const last = lastName?.[0]?.toUpperCase() || '';
        return first + last || '?';
    };

    const getDisplayName = (firstName, lastName) => {
        const first = firstName || '';
        const last = lastName?.[0]?.toUpperCase() || '';
        return `${first} ${last}.`.trim();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <FilterBar
                title={t('organization:hiring.title', 'Hiring Processes')}
                description={t('organization:hiring.subtitle', 'Manage job postings and review candidates')}
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder={t('organization:hiring.searchPlaceholder', 'Search positions...')}
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                dropdownFields={[
                    {
                        key: 'facility',
                        label: t('organization:hiring.filters.facility', 'Facility'),
                        options: [
                            { value: 'all', label: t('organization:hiring.filters.allFacilities', 'All Facilities') },
                            ...memberFacilities.map(facility => ({
                                value: facility.id,
                                label: facility.facilityName || facility.companyName || t('organization:labels.unnamedFacility', 'Unnamed Facility')
                            }))
                        ],
                        defaultValue: 'all'
                    },
                    {
                        key: 'status',
                        label: t('organization:hiring.filters.status', 'Status'),
                        options: [
                            { value: 'all', label: t('organization:hiring.filters.allStatuses', 'All Statuses') },
                            { value: 'open', label: t('organization:hiring.filters.open', 'Open') },
                            { value: 'interview', label: t('organization:hiring.filters.interview', 'Interview') },
                            { value: 'accepted', label: t('organization:hiring.filters.accepted', 'Accepted') },
                            { value: 'closed', label: t('organization:hiring.filters.closed', 'Closed') }
                        ],
                        defaultValue: 'all'
                    }
                ]}
                dateFields={[
                    {
                        key: 'fromDate',
                        label: t('organization:hiring.filters.fromDate', 'From')
                    },
                    {
                        key: 'toDate',
                        label: t('organization:hiring.filters.toDate', 'To')
                    }
                ]}
                sortOptions={sortOptions}
                sortValue={sortBy}
                onSortChange={setSortBy}
                translationNamespace="organization"
                onRefresh={loadPositions}
                onAdd={() => setIsCreatePositionModalOpen(true)}
                addLabel={t('organization:hiring.createPosition', 'Create Position')}
                isLoading={loading}
            />


            {positions.length > 0 && (
                <p className="text-sm text-muted-foreground text-center mt-2">
                    {filteredAndSortedPositions.length} {filteredAndSortedPositions.length === 1 ? 'position' : 'positions'} found
                    {searchQuery && ` matching "${searchQuery}"`}
                    {hasActiveFilters && ` (filtered)`}
                </p>
            )}

            {
                filteredAndSortedPositions.length === 0 ? (
                    <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                        <FiBriefcase className="w-24 h-24 mx-auto mb-4 opacity-20" />
                        <p>{t('organization:hiring.empty', 'No positions found')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredAndSortedPositions.map((position) => {
                            const positionApplications = applications.filter(a => a.positionId === position.id);
                            return (
                                <div
                                    key={position.id}
                                    className="group bg-card hover:bg-card/80 border border-border hover:border-primary/20 rounded-xl px-6 pb-6 cursor-pointer transition-all duration-300 hover:shadow-md pt-6"
                                    onClick={() => handlePositionClick(position)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="shrink-0">
                                            <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                                <FiBriefcase className="w-6 h-6" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-semibold text-foreground truncate">{position.title || 'Untitled Position'}</h3>
                                                <span className={cn("shrink-0 px-2 py-0.5 text-xs font-medium rounded-full", getStatusColor(position.status))}>
                                                    {position.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate mb-2">{position.facilityName}</p>
                                            <div className="flex items-center gap-4 text-sm">
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <FiUser className="w-4 h-4 shrink-0" />
                                                    <span>{positionApplications.length} {t('organization:hiring.applications', 'applications')}</span>
                                                </div>
                                                {position.created && (
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <FiCalendar className="w-4 h-4 shrink-0" />
                                                        <span>{new Date(position.created.toDate?.() || position.created).toLocaleDateString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            }

            {
                showCandidatePopup && selectedPosition && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-card border border-border rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between p-6 border-b border-border">
                                <div>
                                    <h3 className="text-xl font-semibold text-foreground">
                                        {selectedPosition.title || 'Untitled Position'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {t('organization:hiring.candidates.title', 'Review Candidates')} • {sortedCandidates.length} {sortedCandidates.length === 1 ? 'candidate' : 'candidates'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <button
                                            onClick={() => setCandidateShowSortMenu(!candidateShowSortMenu)}
                                            className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-background hover:bg-muted/30 transition-colors"
                                        >
                                            <FiMove className="w-4 h-4" />
                                            <span className="text-sm">{t('organization:hiring.sortLabel', 'Sort')}</span>
                                        </button>
                                        {candidateShowSortMenu && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-10"
                                                    onClick={() => setCandidateShowSortMenu(false)}
                                                />
                                                <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-lg shadow-lg z-20 min-w-[160px]">
                                                    {candidateSortOptions.map(option => (
                                                        <button
                                                            key={option.value}
                                                            onClick={() => {
                                                                setCandidateSortBy(option.value);
                                                                setCandidateShowSortMenu(false);
                                                            }}
                                                            className={cn(
                                                                "w-full text-left px-4 py-2 text-sm hover:bg-muted/30 transition-colors",
                                                                candidateSortBy === option.value && "bg-primary/10 text-primary font-medium"
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
                                        onClick={() => {
                                            setShowCandidatePopup(false);
                                            setSelectedPosition(null);
                                            setPositionCandidates([]);
                                        }}
                                        className="p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                                    >
                                        <FiX className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {sortedCandidates.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <FiUser className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <p>{t('organization:hiring.candidates.empty', 'No candidates found')}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {sortedCandidates.map((candidate) => {
                                            const profile = candidate.profile || {};
                                            const displayName = getDisplayName(profile.firstName, profile.lastName);
                                            const initials = getInitials(profile.firstName, profile.lastName);

                                            return (
                                                <div key={candidate.id} className="border border-border rounded-lg p-4 hover:bg-muted/10 transition-colors">
                                                    <div className="flex items-start gap-4">
                                                        <div className="shrink-0">
                                                            {profile.photoURL ? (
                                                                <img
                                                                    src={profile.photoURL}
                                                                    alt={displayName}
                                                                    className="w-16 h-16 rounded-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-lg">
                                                                    {initials}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <h4 className="font-semibold text-foreground">{displayName}</h4>
                                                                <span className={cn(
                                                                    "px-2 py-0.5 text-xs font-medium rounded-full",
                                                                    candidate.status === 'submitted' || candidate.status === 'pending'
                                                                        ? "bg-blue-100 text-blue-700"
                                                                        : candidate.status === 'accepted' || candidate.status === 'accepted_for_contract'
                                                                            ? "bg-green-100 text-green-700"
                                                                            : candidate.status === 'rejected'
                                                                                ? "bg-red-100 text-red-700"
                                                                                : "bg-gray-100 text-gray-700"
                                                                )}>
                                                                    {candidate.status}
                                                                </span>
                                                            </div>

                                                            {profile.jobTitle && (
                                                                <p className="text-sm font-medium text-foreground mb-1">{profile.jobTitle}</p>
                                                            )}

                                                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                                                                {profile.experienceYears > 0 && (
                                                                    <span>{profile.experienceYears}+ {t('organization:hiring.candidates.yearsExperience', 'years experience')}</span>
                                                                )}
                                                                {candidate.createdAt && (
                                                                    <span className="flex items-center gap-1">
                                                                        <FiCalendar className="w-3.5 h-3.5" />
                                                                        {new Date(candidate.createdAt.toDate?.() || candidate.createdAt).toLocaleDateString()}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="space-y-2">
                                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                    <span>{t('organization:hiring.candidates.phone', 'Phone')}: {maskContactInfo(profile.phone || '1234567890')}</span>
                                                                    <span>•</span>
                                                                    <span>{t('organization:hiring.candidates.email', 'Email')}: {maskContactInfo(profile.email || 'example@email.com')}</span>
                                                                </div>

                                                                {profile.specializations && profile.specializations.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                                        {profile.specializations.slice(0, 5).map((spec, idx) => (
                                                                            <span
                                                                                key={idx}
                                                                                className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded"
                                                                            >
                                                                                {spec}
                                                                            </span>
                                                                        ))}
                                                                        {profile.specializations.length > 5 && (
                                                                            <span className="px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded">
                                                                                +{profile.specializations.length - 5}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {profile.skills && profile.skills.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                                        {profile.skills.slice(0, 5).map((skill, idx) => (
                                                                            <span
                                                                                key={idx}
                                                                                className="px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded"
                                                                            >
                                                                                {skill}
                                                                            </span>
                                                                        ))}
                                                                        {profile.skills.length > 5 && (
                                                                            <span className="px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded">
                                                                                +{profile.skills.length - 5}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            <Dialog
                isOpen={isCreatePositionModalOpen}
                onClose={() => {
                    if (!isCreatingPosition) {
                        setIsCreatePositionModalOpen(false);
                        setPositionFormData({
                            jobTitle: '',
                            jobType: 'general',
                            startTime: '',
                            endTime: '',
                            location: '',
                            description: '',
                            compensation: ''
                        });
                    }
                }}
                title={t('organization:hiring.createPosition', 'Create Position')}
                size="medium"
                closeOnBackdropClick={!isCreatingPosition}
                actions={
                    <>
                        <button
                            onClick={() => {
                                if (!isCreatingPosition) {
                                    setIsCreatePositionModalOpen(false);
                                    setPositionFormData({
                                        jobTitle: '',
                                        jobType: 'general',
                                        startTime: '',
                                        endTime: '',
                                        location: '',
                                        description: '',
                                        compensation: ''
                                    });
                                }
                            }}
                            disabled={isCreatingPosition}
                            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t('common:cancel', 'Cancel')}
                        </button>
                        <button
                            onClick={handleCreatePosition}
                            disabled={!positionFormData.jobTitle.trim() || !positionFormData.startTime || !positionFormData.endTime || isCreatingPosition}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCreatingPosition
                                ? t('common:creating', 'Creating...')
                                : t('organization:hiring.create', 'Create Position')}
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="mt-4">
                        <InputField
                            label={t('organization:hiring.form.jobTitle', 'Job Title')}
                            value={positionFormData.jobTitle}
                            onChange={(e) => setPositionFormData({ ...positionFormData, jobTitle: e.target.value })}
                            placeholder={t('organization:hiring.form.jobTitlePlaceholder', 'Enter job title')}
                            required
                            disabled={isCreatingPosition}
                            name="jobTitle"
                        />
                    </div>

                    <div>
                        <SimpleDropdown
                            label={t('organization:hiring.form.jobType', 'Job Type')}
                            options={[
                                { value: 'general', label: t('organization:hiring.form.jobTypeGeneral', 'General') },
                                { value: 'pharmacist', label: t('organization:hiring.form.jobTypePharmacist', 'Pharmacist') },
                                { value: 'technician', label: t('organization:hiring.form.jobTypeTechnician', 'Technician') },
                                { value: 'intern', label: t('organization:hiring.form.jobTypeIntern', 'Intern') }
                            ]}
                            value={positionFormData.jobType}
                            onChange={(value) => setPositionFormData({ ...positionFormData, jobType: value })}
                            disabled={isCreatingPosition}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                {t('organization:hiring.form.startTime', 'Start Time')} *
                            </label>
                            <input
                                type="datetime-local"
                                value={positionFormData.startTime}
                                onChange={(e) => setPositionFormData({ ...positionFormData, startTime: e.target.value })}
                                disabled={isCreatingPosition}
                                className="w-full h-10 rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                {t('organization:hiring.form.endTime', 'End Time')} *
                            </label>
                            <input
                                type="datetime-local"
                                value={positionFormData.endTime}
                                onChange={(e) => setPositionFormData({ ...positionFormData, endTime: e.target.value })}
                                disabled={isCreatingPosition}
                                className="w-full h-10 rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <div>
                        <InputField
                            label={t('organization:hiring.form.location', 'Location')}
                            value={positionFormData.location}
                            onChange={(e) => setPositionFormData({ ...positionFormData, location: e.target.value })}
                            placeholder={t('organization:hiring.form.locationPlaceholder', 'Enter location (optional)')}
                            disabled={isCreatingPosition}
                            name="location"
                        />
                    </div>

                    <InputFieldParagraph
                        label={t('organization:hiring.form.description', 'Description')}
                        value={positionFormData.description}
                        onChange={(e) => setPositionFormData({ ...positionFormData, description: e.target.value })}
                        placeholder={t('organization:hiring.form.descriptionPlaceholder', 'Enter job description (optional)')}
                        rows={3}
                        disabled={isCreatingPosition}
                        name="description"
                    />

                    <div>
                        <InputField
                            label={t('organization:hiring.form.compensation', 'Compensation')}
                            value={positionFormData.compensation}
                            onChange={(e) => setPositionFormData({ ...positionFormData, compensation: e.target.value })}
                            placeholder={t('organization:hiring.form.compensationPlaceholder', 'Enter compensation (optional)')}
                            disabled={isCreatingPosition}
                            name="compensation"
                        />
                    </div>
                </div>
            </Dialog>
        </div >
    );
};

export default HiringProcesses;
