import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import { useAuth } from '../../../../contexts/AuthContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import {
    FiUsers,
    FiUserPlus,
    FiSearch,
    FiBriefcase,
    FiCalendar,
    FiTrendingUp,
    FiSettings,
    FiPlus,
    FiGrid
} from 'react-icons/fi';
import { cn } from '../../../../utils/cn';
import EmployeePopup from './EmployeePopup';
import FilterBar from '../../../components/FilterBar/FilterBar';

const TeamsManagement = ({ organization, memberFacilities = [] }) => {
    const { t } = useTranslation(['organization', 'common']);
    const { currentUser } = useAuth();
    const { showNotification } = useNotification();
    
    const [teams, setTeams] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeView, setActiveView] = useState('overview');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [filters, setFilters] = useState({
        team: 'all',
        facility: 'all'
    });

    const loadTeamData = useCallback(async () => {
        if (!organization || memberFacilities.length === 0) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const allMembers = [];
            const processedUserIds = new Set();

            for (const facility of memberFacilities) {
                const facilityId = facility.id;
                try {
                    const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
                    const facilitySnap = await getDoc(facilityRef);

                    if (facilitySnap.exists()) {
                        const facilityData = facilitySnap.data();
                        const employeesList = facilityData.employees || [];
                        const adminsList = facilityData.admins || [];

                        for (const emp of employeesList) {
                            const userId = emp.user_uid || emp.uid;
                            if (!userId || processedUserIds.has(userId)) continue;
                            processedUserIds.add(userId);

                            try {
                                const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
                                const userSnap = await getDoc(userRef);
                                const professionalRef = doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, userId);
                                const professionalSnap = await getDoc(professionalRef);

                                let userData = {};
                                if (userSnap.exists()) {
                                    userData = userSnap.data();
                                }
                                if (professionalSnap.exists()) {
                                    userData = { ...userData, ...professionalSnap.data() };
                                }

                                const roles = emp.roles || ['employee'];
                                const isAdmin = adminsList.includes(userId) || roles.includes('admin');

                                allMembers.push({
                                    id: userId,
                                    email: userData.email || '',
                                    firstName: userData.firstName || userData.identity?.firstName || '',
                                    lastName: userData.lastName || userData.identity?.lastName || '',
                                    photoURL: userData.photoURL || userData.profileDisplay?.profilePictureUrl || '',
                                    roles: roles,
                                    isAdmin: isAdmin,
                                    facilityId: facilityId,
                                    facilityName: facility.facilityName || facility.companyName || 'Unknown Facility',
                                    team: emp.team || 'unassigned'
                                });
                            } catch (error) {
                                console.error(`Error loading team member ${userId}:`, error);
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error loading facility ${facilityId}:`, error);
                }
            }

            setTeamMembers(allMembers);

            const teamGroups = {};
            allMembers.forEach(member => {
                const teamName = member.team || 'unassigned';
                if (!teamGroups[teamName]) {
                    teamGroups[teamName] = [];
                }
                teamGroups[teamName].push(member);
            });

            const teamsList = Object.entries(teamGroups).map(([name, members]) => ({
                name,
                members,
                count: members.length
            }));

            setTeams(teamsList);
        } catch (error) {
            console.error('Error loading team data:', error);
            showNotification(t('organization:teams.errors.loadFailed', 'Failed to load team data'), 'error');
        } finally {
            setLoading(false);
        }
    }, [organization, memberFacilities, showNotification, t]);

    useEffect(() => {
        loadTeamData();
    }, [loadTeamData]);

    const filteredTeams = teams.filter(team => {
        if (filters.team !== 'all' && team.name !== filters.team) return false;
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return team.name.toLowerCase().includes(query) ||
            team.members.some(m => 
                `${m.firstName} ${m.lastName}`.toLowerCase().includes(query) ||
                m.email?.toLowerCase().includes(query)
            );
    });

    const filteredMembers = teamMembers.filter(member => {
        if (filters.team !== 'all' && member.team !== filters.team) return false;
        if (filters.facility !== 'all' && member.facilityId !== filters.facility) return false;
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            `${member.firstName} ${member.lastName}`.toLowerCase().includes(query) ||
            member.email?.toLowerCase().includes(query) ||
            member.facilityName?.toLowerCase().includes(query) ||
            member.team?.toLowerCase().includes(query)
        );
    });

    const stats = {
        totalMembers: teamMembers.length,
        totalTeams: teams.length,
        unassigned: teamMembers.filter(m => m.team === 'unassigned' || !m.team).length,
        admins: teamMembers.filter(m => m.isAdmin).length
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
                title={t('organization:teams.title', 'Teams Management')}
                description={t('organization:teams.subtitle', 'Organize employees into teams and manage team structures')}
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder={t('organization:teams.searchPlaceholder', 'Search teams or members...')}
                filters={filters}
                onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
                onClearFilters={() => setFilters({ team: 'all', facility: 'all' })}
                dropdownFields={[
                    {
                        key: 'team',
                        label: t('organization:teams.filters.team', 'Team'),
                        options: [
                            { value: 'all', label: t('organization:teams.filters.allTeams', 'All Teams') },
                            ...teams.map(team => ({
                                value: team.name,
                                label: team.name === 'unassigned' 
                                    ? t('organization:teams.unassigned', 'Unassigned')
                                    : team.name
                            }))
                        ],
                        defaultValue: 'all'
                    },
                    {
                        key: 'facility',
                        label: t('organization:teams.filters.facility', 'Facility'),
                        options: [
                            { value: 'all', label: t('organization:teams.filters.allFacilities', 'All Facilities') },
                            ...memberFacilities.map(facility => ({
                                value: facility.id,
                                label: facility.facilityName || facility.companyName || t('organization:labels.unnamedFacility', 'Unnamed Facility')
                            }))
                        ],
                        defaultValue: 'all'
                    }
                ]}
                translationNamespace="organization"
                onRefresh={loadTeamData}
                isLoading={loading}
            />

            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-end mb-6">
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                        <FiPlus className="w-4 h-4" />
                        {t('organization:teams.createTeam', 'Create Team')}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-muted/30 border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <FiUsers className="w-5 h-5 text-primary" />
                            <span className="text-sm font-medium text-muted-foreground">
                                {t('organization:teams.stats.totalMembers', 'Total Members')}
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-foreground">{stats.totalMembers}</div>
                    </div>
                    <div className="bg-muted/30 border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <FiGrid className="w-5 h-5 text-blue-500" />
                            <span className="text-sm font-medium text-muted-foreground">
                                {t('organization:teams.stats.totalTeams', 'Total Teams')}
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-foreground">{stats.totalTeams}</div>
                    </div>
                    <div className="bg-muted/30 border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <FiUserPlus className="w-5 h-5 text-yellow-500" />
                            <span className="text-sm font-medium text-muted-foreground">
                                {t('organization:teams.stats.unassigned', 'Unassigned')}
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-foreground">{stats.unassigned}</div>
                    </div>
                    <div className="bg-muted/30 border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <FiSettings className="w-5 h-5 text-green-500" />
                            <span className="text-sm font-medium text-muted-foreground">
                                {t('organization:teams.stats.admins', 'Admins')}
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-foreground">{stats.admins}</div>
                    </div>
                </div>

                <div className="flex gap-2 border-b border-border mb-6">
                    {[
                        { id: 'overview', label: t('organization:teams.views.overview', 'Overview') },
                        { id: 'teams', label: t('organization:teams.views.teams', 'Teams') },
                        { id: 'members', label: t('organization:teams.views.members', 'Members') }
                    ].map((view) => (
                        <button
                            key={view.id}
                            onClick={() => setActiveView(view.id)}
                            className={cn(
                                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                                activeView === view.id
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {view.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">

                {activeView === 'overview' && (
                    <div className="space-y-4">
                        {filteredTeams.slice(0, 5).map((team) => (
                            <div key={team.name} className="border border-border rounded-lg p-4 hover:bg-muted/10 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                            <FiUsers className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-foreground">
                                                {team.name === 'unassigned' 
                                                    ? t('organization:teams.unassigned', 'Unassigned')
                                                    : team.name}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                {team.count} {team.count === 1 ? t('organization:teams.member', 'member') : t('organization:teams.members', 'members')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {team.members.slice(0, 5).map((member) => (
                                        <div 
                                            key={member.id} 
                                            className="flex items-center gap-2 px-2 py-1 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                                            onClick={() => {
                                                setSelectedEmployee(member);
                                                setIsPopupOpen(true);
                                            }}
                                        >
                                            {member.photoURL ? (
                                                <img 
                                                    src={member.photoURL} 
                                                    alt={`${member.firstName} ${member.lastName}`}
                                                    className="w-6 h-6 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                                                    {member.firstName?.[0]?.toUpperCase() || '?'}
                                                </div>
                                            )}
                                            <span className="text-xs text-foreground">
                                                {member.firstName} {member.lastName}
                                            </span>
                                        </div>
                                    ))}
                                    {team.members.length > 5 && (
                                        <div className="px-2 py-1 bg-muted/30 rounded-lg text-xs text-muted-foreground">
                                            +{team.members.length - 5} {t('organization:teams.more', 'more')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {filteredTeams.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                <FiUsers className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>{t('organization:teams.empty', 'No teams found')}</p>
                            </div>
                        )}
                    </div>
                )}

                {activeView === 'teams' && (
                    <div className="space-y-4">
                        {filteredTeams.map((team) => (
                            <div key={team.name} className="border border-border rounded-lg p-4 hover:bg-muted/10 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                            <FiUsers className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-foreground">
                                                {team.name === 'unassigned' 
                                                    ? t('organization:teams.unassigned', 'Unassigned')
                                                    : team.name}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                {team.count} {team.count === 1 ? t('organization:teams.member', 'member') : t('organization:teams.members', 'members')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {team.members.map((member) => (
                                        <div 
                                            key={member.id} 
                                            className="flex items-center gap-2 px-2 py-1 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                                            onClick={() => {
                                                setSelectedEmployee(member);
                                                setIsPopupOpen(true);
                                            }}
                                        >
                                            {member.photoURL ? (
                                                <img 
                                                    src={member.photoURL} 
                                                    alt={`${member.firstName} ${member.lastName}`}
                                                    className="w-6 h-6 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                                                    {member.firstName?.[0]?.toUpperCase() || '?'}
                                                </div>
                                            )}
                                            <span className="text-xs text-foreground">
                                                {member.firstName} {member.lastName}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {filteredTeams.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                <FiUsers className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>{t('organization:teams.empty', 'No teams found')}</p>
                            </div>
                        )}
                    </div>
                )}

                {activeView === 'members' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredMembers.map((member) => (
                            <div 
                                key={member.id} 
                                className="border border-border rounded-lg p-4 hover:bg-muted/10 transition-colors cursor-pointer"
                                onClick={() => {
                                    setSelectedEmployee(member);
                                    setIsPopupOpen(true);
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    {member.photoURL ? (
                                        <img 
                                            src={member.photoURL} 
                                            alt={`${member.firstName} ${member.lastName}`}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                                            {member.firstName?.[0]?.toUpperCase() || '?'}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-foreground truncate">
                                            {member.firstName} {member.lastName}
                                        </h3>
                                        <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-muted-foreground">{member.facilityName}</span>
                                            {member.team && member.team !== 'unassigned' && (
                                                <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                                                    {member.team}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredMembers.length === 0 && (
                            <div className="col-span-2 text-center py-12 text-muted-foreground">
                                <FiUsers className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>{t('organization:teams.noMembers', 'No members found')}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <EmployeePopup
                employee={selectedEmployee}
                isOpen={isPopupOpen}
                onClose={() => {
                    setIsPopupOpen(false);
                    setSelectedEmployee(null);
                }}
            />
        </div>
    );
};

export default TeamsManagement;

