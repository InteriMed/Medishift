import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWeekDates, isSameDay } from '../utils/dateHelpers';
import { cn } from '../../../../utils/cn';
import { useTranslation } from 'react-i18next';
import { FiSettings, FiPlus } from 'react-icons/fi';
import { get } from 'lodash';
import AddFacilityRoleModal from './AddFacilityRoleModal';
import { useDashboard } from '../../../contexts/DashboardContext';
import { db } from '../../../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

const ResourceGrid = ({
    currentDate,
    events,
    employees,
    onEventClick,
    onCreateEvent,
    view = 'week',
    onDateClick,
    onEventMove,
    profileData,
    onUpdateProfileData,
    isLoadingProfile = false
}) => {
    const { t } = useTranslation(['calendar', 'dashboard', 'dashboardProfile']);
    const navigate = useNavigate();
    const { selectedWorkspace } = useDashboard();
    const [showAddRoleModal, setShowAddRoleModal] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);

    // Generate dates based on view
    const dates = useMemo(() => {
        if (view === 'day') {
            return [currentDate];
        }
        return getWeekDates(currentDate);
    }, [currentDate, view]);

    // Debug View State
    // console.log('ResourceGrid Render:', { view, currentDate, datesLength: dates.length });

    // Group events by employee and date for efficient rendering
    const eventsByEmployee = useMemo(() => {
        const grouped = {};
        if (!events) return grouped;

        events.forEach(event => {
            // Find which employee this event belongs to
            // Logic: Check if event.workerId or event.employees (array) matches
            // For now assume event.workerId matches employee.id or event.employeeId
            const workerId = event.workerId || event.employeeId || event.userId;

            if (workerId) {
                if (!grouped[workerId]) {
                    grouped[workerId] = [];
                }
                grouped[workerId].push(event);
            } else if (event.employees && Array.isArray(event.employees)) {
                // Handle array of employees if applicable
                event.employees.forEach(empId => {
                    if (!grouped[empId]) grouped[empId] = [];
                    grouped[empId].push(event);
                });
            }
        });
        return grouped;
    }, [events]);

    const handleCellClick = (employee, date) => {
        // Create a new event for this employee on this date
        // Set time to default (e.g., 9 AM - 5 PM) or just the date
        const start = new Date(date);
        start.setHours(9, 0, 0, 0);
        const end = new Date(date);
        end.setHours(17, 0, 0, 0);

        const newEvent = {
            id: `temp-${Date.now()}`,
            start,
            end,
            workerId: employee.id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            title: 'New Assignment',
            // Pre-fill role/color based on employee if needed
        };
        onCreateEvent(newEvent, true);
    };

    const facilityRoles = useMemo(() => {
        if (!profileData) return [];
        return get(profileData, 'operationalSettings.workerRequirements') || [];
    }, [profileData]);

    const expandedFacilityRoles = useMemo(() => {
        const expanded = [];
        facilityRoles.forEach(role => {
            const assignedWorkers = role.assignedWorkers || [];
            if (assignedWorkers.length === 0) {
                const defaultColor = { color: '#cbd5e1', color1: '#e2e8f0' };
                expanded.push({
                    ...role,
                    worker: null,
                    color: defaultColor.color,
                    color1: defaultColor.color1,
                    rowIndex: 0,
                    uniqueKey: `${role.id}-0`
                });
            } else {
                assignedWorkers.forEach((worker, index) => {
                    expanded.push({
                        ...role,
                        worker: worker,
                        color: worker.color || role.color || '#cbd5e1',
                        color1: worker.color1 || role.color1 || '#e2e8f0',
                        rowIndex: index,
                        uniqueKey: `${role.id}-${worker.id || index}`
                    });
                });
            }
        });
        return expanded;
    }, [facilityRoles]);

    // Determine if we should show loading or empty state
    // Only show empty state if profileData has been fully loaded with operationalSettings
    // This prevents flickering when profileData is initially an empty object {}
    const hasOperationalSettings = profileData && typeof profileData === 'object' && 'operationalSettings' in profileData;
    const hasLoadedData = hasOperationalSettings || (profileData !== null && profileData !== undefined && !isLoadingProfile && Object.keys(profileData).length > 0);
    const shouldShowEmptyState = hasLoadedData && !isLoadingProfile && facilityRoles.length === 0;
    const shouldShowLoading = isLoadingProfile || !hasLoadedData || (profileData !== null && !hasOperationalSettings && Object.keys(profileData || {}).length === 0);

    useEffect(() => {
        const fetchTeamMembers = async () => {
            if (!selectedWorkspace?.facilityId) return;
            
            try {
                const facilityRef = doc(db, 'facilityProfiles', selectedWorkspace.facilityId);
                const facilitySnap = await getDoc(facilityRef);
                
                if (facilitySnap.exists()) {
                    const facilityData = facilitySnap.data();
                    const employeesList = facilityData.employees || [];
                    const admins = employeesList.filter(emp => emp.rights === 'admin').map(emp => emp.uid);
                    const employees = employeesList.filter(emp => emp.rights !== 'admin').map(emp => emp.uid);
                    const allMemberIds = [...new Set([...admins, ...employees])];
                    
                    const memberPromises = allMemberIds.map(async (userId) => {
                        try {
                            const professionalProfileRef = doc(db, 'professionalProfiles', userId);
                            const professionalProfileSnap = await getDoc(professionalProfileRef);
                            
                            if (professionalProfileSnap.exists()) {
                                const professionalData = professionalProfileSnap.data();
                                const identity = professionalData.identity || {};
                                const firstName = identity.legalFirstName || identity.firstName || '';
                                const lastName = identity.legalLastName || identity.lastName || '';
                                
                                return {
                                    uid: userId,
                                    id: userId,
                                    firstName: firstName,
                                    lastName: lastName,
                                    email: professionalData.contact?.primaryEmail || ''
                                };
                            } else {
                                const userRef = doc(db, 'users', userId);
                                const userSnap = await getDoc(userRef);
                                
                                if (userSnap.exists()) {
                                    const userData = userSnap.data();
                                    return {
                                        uid: userId,
                                        id: userId,
                                        firstName: userData.firstName || '',
                                        lastName: userData.lastName || '',
                                        email: userData.email || ''
                                    };
                                }
                            }
                        } catch (error) {
                            console.error(`Error fetching profile for user ${userId}:`, error);
                        }
                        return null;
                    });
                    
                    const members = (await Promise.all(memberPromises)).filter(m => m !== null);
                    setTeamMembers(members);
                }
            } catch (error) {
                console.error('Error fetching team members:', error);
            }
        };
        
        fetchTeamMembers();
    }, [selectedWorkspace?.facilityId]);

    const getWorkerTypeLabel = (workerType, workerTypeOther) => {
        if (workerType === 'other' && workerTypeOther) {
            return workerTypeOther;
        }
        const workerTypeMap = {
            'pharmacist': t('dashboardProfile:operations.workerTypes.pharmacist'),
            'cashier': t('dashboardProfile:operations.workerTypes.cashier'),
            'assistant': t('dashboardProfile:operations.workerTypes.assistant'),
            'pharmacy_technician': t('dashboardProfile:operations.workerTypes.pharmacyTechnician'),
            'other': t('dashboardProfile:operations.workerTypes.other')
        };
        return workerTypeMap[workerType] || workerType;
    };

    const getWorkerName = (workerId) => {
        if (!workerId || workerId === 'placeholder') return null;
        
        const teamMember = teamMembers.find(m => m.uid === workerId || m.id === workerId);
        if (teamMember) {
            return `${teamMember.firstName} ${teamMember.lastName}`.trim();
        }
        
        const employee = employees?.find(e => e.id === workerId);
        if (employee) {
            return `${employee.firstName} ${employee.lastName}`.trim();
        }
        
        return null;
    };

    const handleSaveRole = async (updatedRequirements) => {
        if (onUpdateProfileData) {
            const updatedData = {
                ...profileData,
                operationalSettings: {
                    ...get(profileData, 'operationalSettings', {}),
                    workerRequirements: updatedRequirements
                }
            };
            await onUpdateProfileData(updatedData, { forceRefresh: true });
        }
    };

    const handleDeleteRole = async (updatedRequirements) => {
        if (onUpdateProfileData) {
            const updatedData = {
                ...profileData,
                operationalSettings: {
                    ...get(profileData, 'operationalSettings', {}),
                    workerRequirements: updatedRequirements
                }
            };
            await onUpdateProfileData(updatedData, { forceRefresh: true });
        }
    };

    return (
        <div className="flex flex-1 overflow-hidden h-full bg-background border rounded-lg shadow-sm" style={{ minHeight: '600px' }}>
            {/* Sidebar: Facility Roles List */}
            <div className="w-56 flex-shrink-0 border-r border-border bg-card z-10 flex flex-col">
                {/* Header Spacer - Clickable for Organization Settings */}
                <button
                    className="h-20 border-b border-border flex items-center justify-center gap-2 px-4 bg-muted/30 w-full hover:bg-muted/50 transition-colors group"
                    onClick={() => navigate('/dashboard/organization?tab=organigram')}
                    title={t('dashboard:dashboard.sidebar.organization')}
                >
                    <FiSettings className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all duration-300 group-hover:rotate-90 group-hover:scale-110" />
                    <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground uppercase tracking-wider transition-colors">
                        {t('dashboardProfile:operations.facilityRolesTitle')}
                    </span>
                </button>

                {/* Add Team Member Button */}
                <button
                    className="h-12 border-b border-border flex items-center justify-center gap-2 px-4 bg-primary/5 hover:bg-primary/10 w-full transition-colors group"
                    onClick={() => navigate('/dashboard/organization?tab=organigram')}
                    title={t('dashboardProfile:operations.addTeamMember', 'Add Team Member')}
                >
                    <FiPlus className="w-4 h-4 text-primary group-hover:scale-110 transition-all" />
                    <span className="text-xs font-semibold text-primary">
                        {t('dashboardProfile:operations.addTeamMember', 'Add Team Member')}
                    </span>
                </button>

                {/* Facility Roles Rows */}
                <div className="flex-1 overflow-hidden overflow-y-auto custom-scrollbar">
                    {shouldShowLoading ? (
                        <div className="flex items-center justify-center h-full min-h-[200px]">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        expandedFacilityRoles.map(role => (
                            <div
                                key={role.uniqueKey}
                                className="h-16 border-b border-border flex items-center px-4 relative group hover:bg-muted/50 transition-colors cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const originalRole = facilityRoles.find(r => r.id === role.id);
                                    setEditingRole(originalRole);
                                    setShowAddRoleModal(true);
                                }}
                            >
                                {/* Color Strip */}
                                <div
                                    className="absolute left-0 top-0 bottom-0 w-1"
                                    style={{ backgroundColor: role.color || '#cbd5e1' }}
                                />
                                <div className="pl-2 overflow-hidden flex-1">
                                    <div className="font-medium text-sm truncate text-foreground">
                                        {role.worker?.workerId && role.worker.workerId !== 'placeholder'
                                          ? getWorkerName(role.worker.workerId) || 'Unknown Worker'
                                          : role.worker?.placeholderName || getWorkerTypeLabel(role.workerType, role.workerTypeOther)}
                                    </div>
                                    <div
                                        className="text-xs truncate font-medium mt-0.5"
                                        style={{ color: role.color || '#94a3b8' }}
                                    >
                                        {getWorkerTypeLabel(role.workerType, role.workerTypeOther)}
                                    </div>
                                </div>
                                {/* Settings Icon with Hover Animation */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const originalRole = facilityRoles.find(r => r.id === role.id);
                                        setEditingRole(originalRole);
                                        setShowAddRoleModal(true);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-2 hover:bg-muted rounded-lg ml-2 flex-shrink-0"
                                    title={t('dashboardProfile:operations.editWorkerRequirement', 'Edit Facility Role')}
                                >
                                    <FiSettings className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all duration-300 group-hover:rotate-90 group-hover:scale-110" />
                                </button>
                            </div>
                        ))
                    )}

                    {/* Add Role Button */}
                    <button
                        onClick={() => {
                            setEditingRole(null);
                            setShowAddRoleModal(true);
                        }}
                        className="h-16 border-t border-border flex items-center justify-center gap-2 px-4 bg-muted/30 w-full hover:bg-muted/50 transition-colors group"
                    >
                        <FiPlus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all" />
                        <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                            {t('dashboardProfile:operations.addWorkerRequirement')}
                        </span>
                    </button>
                </div>
            </div>

            {/* Main Grid: Days & Events */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                <div className="min-w-max">
                    {/* Header Row: Dates */}
                    <div className="flex h-20 border-b border-border sticky top-0 bg-card z-10 shadow-sm">
                        {dates.map(date => {
                            const isToday = isSameDay(date, new Date());
                            return (
                                <div
                                    key={date.toISOString()}
                                    className={cn(
                                        "flex-1 min-w-[160px] flex flex-col items-center justify-center border-r border-border px-2 cursor-pointer hover:bg-muted/30 transition-colors",
                                        isToday && "bg-primary/5"
                                    )}
                                    onClick={() => onDateClick && onDateClick(date)}
                                >
                                    <span className={cn(
                                        "text-xs font-medium uppercase tracking-wider",
                                        isToday ? "text-primary" : "text-muted-foreground"
                                    )}>
                                        {date.toLocaleDateString(undefined, { weekday: 'short' })}
                                    </span>
                                    <span className={cn(
                                        "text-sm font-semibold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full",
                                        isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                                    )}>
                                        {date.getDate()}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Grid Rows - One row per facility role */}
                    {shouldShowLoading ? (
                        <div className="flex items-center justify-center h-full min-h-[200px]">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : shouldShowEmptyState ? (
                        <div className="flex items-center justify-center h-full min-h-[200px] p-4">
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground mb-4">
                                    {t('dashboardProfile:operations.noWorkerRequirements')}
                                </p>
                                <button
                                    onClick={() => {
                                        setEditingRole(null);
                                        setShowAddRoleModal(true);
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                                >
                                    <FiPlus className="w-4 h-4" />
                                    {t('dashboardProfile:operations.addWorkerRequirement')}
                                </button>
                            </div>
                        </div>
                    ) : (
                        expandedFacilityRoles.map(role => (
                            <div key={role.uniqueKey} className="flex h-16 border-b border-border">
                                {dates.map(date => {
                                    const roleEvents = events.filter(e => {
                                        const eventDate = new Date(e.start);
                                        if (!isSameDay(eventDate, date)) return false;
                                        
                                        if (role.worker) {
                                            if (role.worker.workerId && role.worker.workerId !== 'placeholder') {
                                                return (e.workerId === role.worker.workerId || e.employeeId === role.worker.workerId);
                                            } else if (role.worker.placeholderName) {
                                                return (e.workerName === role.worker.placeholderName || e.employeeName === role.worker.placeholderName);
                                            }
                                        }
                                        
                                        const eventRole = e.workerRole || e.employeeRole;
                                        const eventWorkerType = e.workerType;
                                        return (eventRole === role.workerType ||
                                            eventWorkerType === role.workerType ||
                                            (role.workerType === 'other' && eventRole === role.workerTypeOther));
                                    });
                                    const isToday = isSameDay(date, new Date());

                                    return (
                                        <div
                                            key={date.toISOString()}
                                            className={cn(
                                                "flex-1 min-w-[160px] border-r border-border p-1.5 flex flex-col gap-1 relative group hover:bg-muted/30 transition-colors",
                                                isToday && "bg-primary/5 hover:bg-primary/10"
                                            )}
                                            onClick={() => {
                                                const start = new Date(date);
                                                start.setHours(9, 0, 0, 0);
                                                const end = new Date(date);
                                                end.setHours(17, 0, 0, 0);
                                                const newEvent = {
                                                    id: `temp-${Date.now()}`,
                                                    start,
                                                    end,
                                                    workerType: role.workerType,
                                                    workerRole: role.workerType === 'other' ? role.workerTypeOther : role.workerType,
                                                    workerId: role.worker?.workerId || null,
                                                    workerName: role.worker?.placeholderName || null,
                                                    title: role.worker?.workerId && role.worker.workerId !== 'placeholder'
                                                      ? getWorkerName(role.worker.workerId) || 'Unknown'
                                                      : role.worker?.placeholderName || getWorkerTypeLabel(role.workerType, role.workerTypeOther),
                                                    color: role.color,
                                                    color1: role.color1 || role.color
                                                };
                                                onCreateEvent(newEvent, true);
                                            }}
                                        >
                                            {roleEvents.map(event => (
                                                <div
                                                    key={event.id}
                                                    className="text-xs p-1.5 rounded border shadow-sm cursor-pointer hover:shadow-md transition-all truncate"
                                                    style={{
                                                        backgroundColor: event.color1 || role.color || '#e2e8f0',
                                                        borderColor: event.color || role.color || '#cbd5e1',
                                                        color: '#1e293b'
                                                    }}
                                                    onClick={(e) => { e.stopPropagation(); onEventClick(event, e); }}
                                                >
                                                    <div className="font-medium truncate">{event.title || 'Assignment'}</div>
                                                    {event.start && (
                                                        <div className="text-[10px] opacity-80">
                                                            {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            -
                                                            {new Date(event.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            {/* Add Button Placeholder -> Visible on Hover */}
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="bg-primary/10 text-primary rounded-full p-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Add/Edit Facility Role Modal */}
            <AddFacilityRoleModal
                isOpen={showAddRoleModal}
                onClose={() => {
                    setShowAddRoleModal(false);
                    setEditingRole(null);
                }}
                profileData={profileData}
                onSave={handleSaveRole}
                onDelete={handleDeleteRole}
                editingRole={editingRole}
            />
        </div>
    );
};

export default ResourceGrid;
