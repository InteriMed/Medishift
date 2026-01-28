import React, { useMemo, useState, useEffect } from 'react';
import { getWeekDates, isSameDay } from '../utils/dateHelpers';
import { cn } from '../../../../utils/cn';
import { useTranslation } from 'react-i18next';
import { FiSettings } from 'react-icons/fi';
import { get } from 'lodash';
import AddFacilityRoleModal from './AddFacilityRoleModal';
import { useDashboard } from '../../../contexts/dashboardContext';
import { useAction } from '../../../../services/actions/hook';

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
    isLoadingProfile = false,
    scrollContainerRef,
    headerScrollRef,
    nightView = false,
    openAddRoleModal = false,
    onAddRoleModalClose = null
}) => {
    const { t } = useTranslation(['calendar', 'dashboard', 'dashboardProfile']);
    const { selectedWorkspace } = useDashboard();
    const { execute } = useAction();
    const [showAddRoleModal, setShowAddRoleModal] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);

    useEffect(() => {
        if (openAddRoleModal) {
            setEditingRole(null);
            setShowAddRoleModal(true);
        }
    }, [openAddRoleModal]);

    const handleModalClose = () => {
        setShowAddRoleModal(false);
        setEditingRole(null);
        if (onAddRoleModalClose) {
            onAddRoleModalClose();
        }
    };

    // Generate dates based on view and night view mode
    const dates = useMemo(() => {
        if (nightView) {
            // Night view: show 1 column per date (starting at 12 PM)
            const baseDates = view === 'day' ? [currentDate] : getWeekDates(currentDate);
            return baseDates.map(date => ({ date, isHalf: false }));
        }
        if (view === 'day') {
            return [{ date: currentDate, isHalf: false }];
        }
        return getWeekDates(currentDate).map(date => ({ date, isHalf: false }));
    }, [currentDate, view, nightView]);


    const safeEvents = useMemo(() => {
        return Array.isArray(events) ? events : [];
    }, [events]);

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
                const result = await execute('profile.facility.get_team_members', {
                    facilityId: selectedWorkspace.facilityId
                });

                if (result && result.members) {
                    setTeamMembers(result.members);
                }
            } catch (error) {
                console.error('Error fetching team members:', error);
            }
        };

        fetchTeamMembers();
    }, [selectedWorkspace?.facilityId, execute]);

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
        <>
            {/* Facility Roles Sidebar - Sticky */}
            <div className="sticky left-0 z-20 bg-background/95 backdrop-blur-sm border-r border-b border-border" style={{ width: '14rem', top: 0 }}>
                <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto">
                        {shouldShowLoading ? (
                            <div className="flex items-center justify-center h-full min-h-[200px]">
                                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : shouldShowEmptyState ? (
                            <div className="p-4 text-center">
                            </div>
                        ) : (
                            <>
                                {expandedFacilityRoles.map(role => (
                                    <div
                                        key={role.uniqueKey}
                                        className="h-[60px] border-b border-border flex items-center px-3 relative group hover:bg-muted/50 transition-colors cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const originalRole = facilityRoles.find(r => r.id === role.id);
                                            setEditingRole(originalRole);
                                            setShowAddRoleModal(true);
                                        }}
                                    >
                                        <div
                                            className="absolute left-0 top-0 bottom-0 w-1"
                                            style={{ backgroundColor: role.color || '#cbd5e1' }}
                                        />
                                        <div className="pl-2 overflow-hidden flex-1 min-w-0">
                                            <div className="font-medium text-xs truncate text-foreground">
                                                {role.worker?.workerId && role.worker.workerId !== 'placeholder'
                                                    ? getWorkerName(role.worker.workerId) || 'Unknown Worker'
                                                    : role.worker?.placeholderName || getWorkerTypeLabel(role.workerType, role.workerTypeOther)}
                                            </div>
                                            <div
                                                className="text-[10px] truncate font-medium mt-0.5"
                                                style={{ color: role.color || '#94a3b8' }}
                                            >
                                                {getWorkerTypeLabel(role.workerType, role.workerTypeOther)}
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const originalRole = facilityRoles.find(r => r.id === role.id);
                                                setEditingRole(originalRole);
                                                setShowAddRoleModal(true);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-muted rounded flex-shrink-0"
                                            title={t('dashboardProfile:operations.editWorkerRequirement', 'Edit Facility Role')}
                                        >
                                            <FiSettings className="w-3 h-3 text-muted-foreground" />
                                        </button>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Grid Content - Scrollable */}
            <div className="flex-1 calendar-scroll-container overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ scrollSnapType: 'x mandatory', scrollBehavior: 'smooth' }} ref={scrollContainerRef} onScroll={(e) => { if (headerScrollRef?.current) { headerScrollRef.current.scrollLeft = e.target.scrollLeft; } }}>
                <div className="relative" style={{ 
                    minHeight: '400px',
                    width: view === 'day' ? `${dates.length * 100}%` : `${dates.length * (100 / 7)}%`,
                    minWidth: view === 'day' ? `${dates.length * 100}%` : `${dates.length * (100 / 7)}%`
                }}>
                    {shouldShowLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : shouldShowEmptyState ? (
                        <div className="flex items-center justify-center h-full p-4">
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground mb-4">
                                    {t('dashboardProfile:operations.noWorkerRequirements')}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Grid Rows */}
                            <div className="relative w-full">
                                {expandedFacilityRoles.map((role, roleIndex) => (
                                    <div key={role.uniqueKey} className="flex border-b border-border" style={{ height: '60px' }}>
                                        {dates.map((dateInfo, dateIndex) => {
                                        const date = dateInfo.date || dateInfo;
                                        const isHalf = dateInfo.isHalf || false;
                                        const side = dateInfo.side;
                                        const roleEvents = safeEvents.filter(e => {
                                            if (!e || !e.start || !e.end) return false;
                                            
                                            try {
                                                const eventStart = new Date(e.start);
                                                const eventEnd = new Date(e.end);

                                                if (isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) return false;

                                                if (nightView) {
                                                    const shiftStart = new Date(date);
                                                    shiftStart.setHours(18, 0, 0, 0);
                                                    const shiftEnd = new Date(date);
                                                    shiftEnd.setDate(shiftEnd.getDate() + 1);
                                                    shiftEnd.setHours(18, 0, 0, 0);

                                                    if (!(eventStart < shiftEnd && eventEnd > shiftStart)) return false;
                                                } else {
                                                    if (!isSameDay(eventStart, date)) return false;
                                                }

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
                                            } catch (error) {
                                                console.error('Error filtering event:', error, e);
                                                return false;
                                            }
                                        });

                                        const periodEvents = roleEvents.filter(event => {
                                            if (nightView) {
                                                return true;
                                            }
                                            if (isHalf) {
                                                const eventHour = new Date(event.start).getHours();
                                                if (side === 'first') {
                                                    return eventHour < 12;
                                                } else {
                                                    return eventHour >= 12;
                                                }
                                            }
                                            return true;
                                        });

                                        return (
                                            <div
                                                key={`${date.toISOString()}-${dateIndex}`}
                                                className={cn(
                                                    "flex-1 flex relative group hover:bg-muted/20 transition-colors overflow-hidden",
                                                    dateIndex < dates.length - 1 && "border-r border-border"
                                                )}
                                                style={{ 
                                                    width: view === 'day' ? `${100 / dates.length}%` : `${100 / dates.length}%`,
                                                    flexShrink: 0,
                                                    minWidth: view === 'day' ? `${100 / dates.length}%` : `${100 / dates.length}%`,
                                                    padding: 0
                                                }}
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    e.dataTransfer.dropEffect = 'move';
                                                }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    try {
                                                        const eventData = e.dataTransfer.getData('text/plain');
                                                        if (eventData) {
                                                            const draggedEvent = JSON.parse(eventData);
                                                            if (draggedEvent.start && typeof draggedEvent.start === 'string') {
                                                                draggedEvent.start = new Date(draggedEvent.start);
                                                            }
                                                            if (draggedEvent.end && typeof draggedEvent.end === 'string') {
                                                                draggedEvent.end = new Date(draggedEvent.end);
                                                            }
                                                            const originalStart = new Date(draggedEvent.start);
                                                            const originalEnd = new Date(draggedEvent.end);
                                                            const duration = originalEnd.getTime() - originalStart.getTime();
                                                            const newStart = new Date(date);
                                                            newStart.setHours(originalStart.getHours(), originalStart.getMinutes(), originalStart.getSeconds(), 0);
                                                            const newEnd = new Date(newStart.getTime() + duration);
                                                            if (onEventMove) {
                                                                onEventMove(draggedEvent.id, newStart, newEnd, false);
                                                            }
                                                        }
                                                    } catch (error) {
                                                        console.error('Error handling drop:', error);
                                                    }
                                                }}
                                                onClick={() => {
                                                    const start = new Date(date);
                                                    if (isHalf && side === 'first') {
                                                        start.setHours(0, 0, 0, 0);
                                                    } else if (isHalf && side === 'second') {
                                                        start.setHours(12, 0, 0, 0);
                                                    } else {
                                                        start.setHours(9, 0, 0, 0);
                                                    }
                                                    const end = new Date(start);
                                                    if (isHalf) {
                                                        end.setHours(start.getHours() + 12, 0, 0, 0);
                                                    } else {
                                                        end.setHours(17, 0, 0, 0);
                                                    }
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
                                                <div className="w-full h-full flex relative">
                                                    {/* Time divider lines */}
                                                    <div className="absolute left-0 top-0 bottom-0 w-px border-l border-dashed border-border/30 pointer-events-none" style={{ left: '25%' }} />
                                                    <div className="absolute left-0 top-0 bottom-0 w-px border-l border-border/50 pointer-events-none" style={{ left: '50%' }} />
                                                    <div className="absolute left-0 top-0 bottom-0 w-px border-l border-dashed border-border/30 pointer-events-none" style={{ left: '75%' }} />
                                                    
                                                    {/* AM Events (or full day events if not splitting) */}
                                                    <div className="flex-1 flex flex-col relative">
                                                        {periodEvents.filter(e => {
                                                            const h = new Date(e.start).getHours();
                                                            return nightView ? (h >= 18 || h < 6) : (h < 12);
                                                        }).map(event => (
                                                            <div
                                                                key={event.id}
                                                                className="h-full border-l-3 cursor-grab hover:brightness-95 active:cursor-grabbing transition-all relative group/event"
                                                                style={{
                                                                    backgroundColor: event.color1 || role.color || '#e2e8f0',
                                                                    borderLeftWidth: '4px',
                                                                    borderLeftColor: event.color || role.color || '#cbd5e1',
                                                                    borderLeftStyle: 'solid'
                                                                }}
                                                                draggable
                                                                onDragStart={(e) => {
                                                                    e.dataTransfer.effectAllowed = 'move';
                                                                    e.dataTransfer.setData('text/plain', JSON.stringify({
                                                                        ...event,
                                                                        start: event.start instanceof Date ? event.start.toISOString() : event.start,
                                                                        end: event.end instanceof Date ? event.end.toISOString() : event.end
                                                                    }));
                                                                }}
                                                                onClick={(e) => { e.stopPropagation(); onEventClick(event, e); }}
                                                            >
                                                                <div className="absolute inset-0 flex flex-col justify-center px-2">
                                                                    <div className="font-semibold text-xs truncate" style={{ color: event.color || role.color || '#1e293b' }}>
                                                                        {event.title || 'Assignment'}
                                                                    </div>
                                                                    <div className="text-[10px] opacity-70 truncate mt-0.5" style={{ color: event.color || role.color || '#1e293b' }}>
                                                                        {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    
                                                    {/* PM Events */}
                                                    <div className="flex-1 flex flex-col relative">
                                                        {periodEvents.filter(e => {
                                                            const h = new Date(e.start).getHours();
                                                            return nightView ? (h >= 6 && h < 18) : (h >= 12);
                                                        }).map(event => (
                                                            <div
                                                                key={event.id}
                                                                className="h-full border-l-3 cursor-grab hover:brightness-95 active:cursor-grabbing transition-all relative group/event"
                                                                style={{
                                                                    backgroundColor: event.color1 || role.color || '#e2e8f0',
                                                                    borderLeftWidth: '4px',
                                                                    borderLeftColor: event.color || role.color || '#cbd5e1',
                                                                    borderLeftStyle: 'solid'
                                                                }}
                                                                draggable
                                                                onDragStart={(e) => {
                                                                    e.dataTransfer.effectAllowed = 'move';
                                                                    e.dataTransfer.setData('text/plain', JSON.stringify({
                                                                        ...event,
                                                                        start: event.start instanceof Date ? event.start.toISOString() : event.start,
                                                                        end: event.end instanceof Date ? event.end.toISOString() : event.end
                                                                    }));
                                                                }}
                                                                onClick={(e) => { e.stopPropagation(); onEventClick(event, e); }}
                                                            >
                                                                <div className="absolute inset-0 flex flex-col justify-center px-2">
                                                                    <div className="font-semibold text-xs truncate" style={{ color: event.color || role.color || '#1e293b' }}>
                                                                        {event.title || 'Assignment'}
                                                                    </div>
                                                                    <div className="text-[10px] opacity-70 truncate mt-0.5" style={{ color: event.color || role.color || '#1e293b' }}>
                                                                        {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Add/Edit Facility Role Modal */}
            <AddFacilityRoleModal
                isOpen={showAddRoleModal}
                onClose={handleModalClose}
                profileData={profileData}
                onSave={handleSaveRole}
                onDelete={handleDeleteRole}
                editingRole={editingRole}
            />
        </>
    );
};

export default ResourceGrid;
