import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs, Timestamp, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../../../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import { useDashboard } from '../../../contexts/DashboardContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import { useSidebar } from '../../../contexts/SidebarContext';
import { FiUsers, FiShield, FiSearch, FiPlus, FiMaximize2, FiMinimize2, FiZoomIn, FiZoomOut, FiMove } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { CALENDAR_COLORS } from '../../calendar/utils/constants';
import { cn } from '../../../../utils/cn';
import EmployeeCard from './EmployeeCard';
import Button from '../../../../components/BoxedInputFields/Button';
import PersonnalizedInputField from '../../../../components/BoxedInputFields/Personnalized-InputField';
import Dialog from '../../../../components/Dialog/Dialog';
import CreateFacilityRoleModal from './CreateFacilityRoleModal';

const styles = {
  sectionContainer: "flex flex-col gap-6 p-1 w-full",
  headerCard: "bg-card rounded-xl border border-border p-6 pb-4 shadow-md w-full",
  sectionTitle: "text-2xl font-semibold",
  sectionTitleStyle: { fontSize: '18px', color: 'hsl(var(--foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionSubtitle: "text-sm font-medium text-muted-foreground",
  subtitleRow: "flex items-end justify-between gap-4",
  mandatoryFieldLegend: "text-xs text-muted-foreground",
  mandatoryMark: "text-destructive"
};

const ROLE_HIERARCHY = {
  'admin': 0,
  'pharmacist': 1,
  'pharmacy_technician': 2,
  'intern': 3,
  'other': 4,
  'unassigned': 5
};

const Organigram = ({ formData }) => {
  const { t } = useTranslation(['organization', 'dashboardProfile', 'common']);
  const { selectedWorkspace } = useDashboard();
  const { showNotification } = useNotification();
  const { setIsMainSidebarCollapsed } = useSidebar();
  const navigate = useNavigate();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [contracts, setContracts] = useState([]);
  const [hrMetrics, setHrMetrics] = useState(null);
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isReducedView, setIsReducedView] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [showFireEmployeeDialog, setShowFireEmployeeDialog] = useState(false);
  const [fireEmployeeConfirmText, setFireEmployeeConfirmText] = useState('');
  const [isFiringEmployee, setIsFiringEmployee] = useState(false);
  const [employeeToFire, setEmployeeToFire] = useState(null);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);

  const fetchTeamMembers = useCallback(async () => {
    if (!selectedWorkspace?.facilityId) return;

    setLoadingTeamMembers(true);
    try {
      const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, selectedWorkspace.facilityId);
      const facilitySnap = await getDoc(facilityRef);

      if (facilitySnap.exists()) {
        const facilityData = facilitySnap.data();
        const employeesList = facilityData.employees || [];
        const admins = employeesList.filter(emp => emp.rights === 'admin').map(emp => emp.uid);
        const employees = employeesList.filter(emp => emp.rights !== 'admin').map(emp => emp.uid);

        // Fetch invitations
        const invitationsQuery = query(
          collection(db, FIRESTORE_COLLECTIONS.FACILITY_INVITATIONS),
          where('facilityId', '==', selectedWorkspace.facilityId),
          where('status', '==', 'pending')
        );
        const invitationsSnap = await getDocs(invitationsQuery);
        const invitations = invitationsSnap.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          isInvitation: true
        }));

        // Combine all unique user IDs
        const allMemberIds = [...new Set([...admins, ...employees])];

        if (auth.currentUser) {
          setViewerIsAdmin(admins.includes(auth.currentUser.uid));
        }

        const memberPromises = allMemberIds.map(async (userId) => {
          try {
            // First try professionalProfiles
            const professionalProfileRef = doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, userId);
            const professionalProfileSnap = await getDoc(professionalProfileRef);

            if (professionalProfileSnap.exists()) {
              const professionalData = professionalProfileSnap.data();
              const identity = professionalData.identity || {};
              return {
                uid: userId,
                firstName: identity.legalFirstName || identity.firstName || '',
                lastName: identity.legalLastName || identity.lastName || '',
                email: professionalData.contact?.primaryEmail || '',
                phone: professionalData.contact?.primaryPhone || '',
                photoURL: professionalData.profileDisplay?.profilePictureUrl || '',
                isAdmin: admins.includes(userId),
                isEmployee: employees.includes(userId),
                profileType: professionalData.profileType || '',
                experienceYears: professionalData.profileDisplay?.experienceYears || 0
              };
            }

            // Fallback to users collection
            const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
              const userData = userSnap.data();
              return {
                uid: userId,
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                email: userData.email || '',
                phone: '',
                photoURL: userData.photoURL || '',
                isAdmin: admins.includes(userId),
                isEmployee: employees.includes(userId),
                profileType: '',
                experienceYears: 0
              };
            }

            return null;
          } catch (error) {
            console.error(`Error fetching profile for user ${userId}:`, error);
            return null;
          }
        });

        const existingMembers = (await Promise.all(memberPromises)).filter(m => m !== null);

        // Map invitations to minimal member objects
        // Assuming invitations have email or name to display
        const invitedMembers = invitations.map(inv => ({
          uid: inv.id, // Use invitation ID as temporary UID
          firstName: inv.firstName || 'Invited',
          lastName: inv.lastName || 'User',
          email: inv.email || '',
          phone: '',
          photoURL: '',
          isAdmin: inv.role === 'admin',
          isEmployee: inv.role !== 'admin',
          isInvitation: true,
          status: 'pending',
          profileType: inv.role === 'admin' ? 'admin' : 'invited',
          experienceYears: 0,
          color: 'var(--color-logo-1)', // Default color
          color1: 'rgba(37, 99, 235, 0.1)'
        }));

        setTeamMembers([...existingMembers, ...invitedMembers]);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoadingTeamMembers(false);
    }
  }, [selectedWorkspace?.facilityId]);

  const fetchEmployeeDetails = useCallback(async (employeeId) => {
    if (!employeeId || !selectedWorkspace?.facilityId) return;

    setLoadingDetails(true);
    try {
      const professionalProfileRef = doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, employeeId);
      const professionalProfileSnap = await getDoc(professionalProfileRef);

      let details = {
        uid: employeeId,
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        photoURL: '',
        profileType: ''
      };

      if (professionalProfileSnap.exists()) {
        const professionalData = professionalProfileSnap.data();
        const identity = professionalData.identity || {};
        const contact = professionalData.contact || {};
        const profileDisplay = professionalData.profileDisplay || {};

        details = {
          ...details,
          firstName: identity.legalFirstName || identity.firstName || '',
          lastName: identity.legalLastName || identity.lastName || '',
          email: contact.primaryEmail || '',
          phone: contact.primaryPhone || '',
          photoURL: profileDisplay.profilePictureUrl || '',
          profileType: professionalData.profileType || ''
        };
      } else {
        const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, employeeId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          details = {
            ...details,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            email: userData.email || '',
            phone: '',
            photoURL: userData.photoURL || '',
            profileType: ''
          };
        }
      }

      const facilityId = selectedWorkspace.facilityId;
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const contractsQuery = query(
        collection(db, 'contracts'),
        where('parties.professional.profileId', '==', employeeId),
        where('parties.employer.profileId', '==', facilityId)
      );
      const contractsSnapshot = await getDocs(contractsQuery);
      const employeeContracts = [];
      let activeContract = null;

      contractsSnapshot.forEach((docSnap) => {
        const contractData = docSnap.data();
        const terms = contractData.terms || {};
        const contractStatus = contractData.statusLifecycle?.currentStatus || 'unknown';
        const contract = {
          id: docSnap.id,
          jobTitle: terms.jobTitle || '',
          contractType: terms.contractType || '',
          startDate: terms.startDate?.toDate?.() || terms.startDate || null,
          endDate: terms.endDate?.toDate?.() || terms.endDate || null,
          workPercentage: terms.workPercentage || 0,
          salary: terms.salary || {},
          status: contractStatus,
          employer: contractData.parties?.employer || {}
        };
        employeeContracts.push(contract);
        if (contractStatus === 'active' && (!contract.endDate || contract.endDate > now)) {
          activeContract = contract;
        }
      });

      const scheduleId = `${facilityId}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      let totalHoursWorked = 0;
      let scheduledHours = 0;
      let overtimeHours = 0;

      try {
        const shiftsRef = collection(db, 'teamSchedules', scheduleId, 'shifts');
        const shiftsQuery = query(
          shiftsRef,
          where('userId', '==', employeeId),
          where('startTime', '>=', Timestamp.fromDate(monthStart)),
          where('startTime', '<=', Timestamp.fromDate(monthEnd))
        );

        const shiftsSnapshot = await getDocs(shiftsQuery);
        shiftsSnapshot.forEach((shiftDoc) => {
          const shift = shiftDoc.data();
          const startTime = shift.startTime?.toDate?.() || (shift.startTime instanceof Timestamp ? shift.startTime.toDate() : null);
          const endTime = shift.endTime?.toDate?.() || (shift.endTime instanceof Timestamp ? shift.endTime.toDate() : null);

          if (startTime && endTime) {
            const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
            totalHoursWorked += hours;

            const contractHours = activeContract ? (activeContract.workPercentage / 100) * 42 * 4.33 : 0;
            const weeklyHours = contractHours / 4.33;
            const dailyHours = weeklyHours / 5;

            if (hours > dailyHours) {
              overtimeHours += hours - dailyHours;
            }
            scheduledHours += hours;
          }
        });
      } catch (error) {
        console.error('Error fetching shifts:', error);
      }

      let timeOffDays = 0;
      let pendingTimeOff = 0;

      try {
        const timeOffQuery = query(
          collection(db, 'timeOffRequests'),
          where('facilityProfileId', '==', facilityId),
          where('userId', '==', employeeId),
          where('startTime', '>=', Timestamp.fromDate(monthStart)),
          where('startTime', '<=', Timestamp.fromDate(monthEnd))
        );

        const timeOffSnapshot = await getDocs(timeOffQuery);
        timeOffSnapshot.forEach((docSnap) => {
          const timeOff = docSnap.data();
          const status = timeOff.status || 'pending';
          const startTime = timeOff.startTime?.toDate?.() || (timeOff.startTime instanceof Timestamp ? timeOff.startTime.toDate() : null);
          const endTime = timeOff.endTime?.toDate?.() || (timeOff.endTime instanceof Timestamp ? timeOff.endTime.toDate() : null);

          if (startTime && endTime) {
            const days = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24));
            if (status === 'approved') {
              timeOffDays += days;
            } else if (status === 'pending') {
              pendingTimeOff += days;
            }
          }
        });
      } catch (error) {
        console.error('Error fetching time off requests:', error);
      }

      const contractHours = activeContract ? (activeContract.workPercentage / 100) * 42 * 4.33 : 0;
      const contractPercentage = contractHours > 0 ? (totalHoursWorked / contractHours) * 100 : 0;

      setEmployeeDetails(details);
      setContracts(employeeContracts);
      setHrMetrics({
        totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
        scheduledHours: Math.round(scheduledHours * 10) / 10,
        overtimeHours: Math.round(overtimeHours * 10) / 10,
        contractHours: Math.round(contractHours * 10) / 10,
        contractPercentage: Math.round(contractPercentage * 10) / 10,
        timeOffDays,
        pendingTimeOff,
        activeContract
      });
    } catch (error) {
      console.error('Error fetching employee details:', error);
    } finally {
      setLoadingDetails(false);
    }
  }, [selectedWorkspace?.facilityId]);

  useEffect(() => {
    if (selectedWorkspace?.facilityId) {
      fetchTeamMembers();

      const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, selectedWorkspace.facilityId);
      const unsubscribe = onSnapshot(facilityRef, (snapshot) => {
        if (snapshot.exists()) {
          fetchTeamMembers();
        }
      });

      return () => unsubscribe();
    }
  }, [selectedWorkspace?.facilityId, fetchTeamMembers]);

  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeDetails(selectedEmployee.uid);
    } else {
      setEmployeeDetails(null);
      setContracts([]);
      setHrMetrics(null);
    }
  }, [selectedEmployee, fetchEmployeeDetails]);

  const handleViewProfile = () => {
    if (selectedEmployee?.uid) {
      navigate(`/dashboard/profile?userId=${selectedEmployee.uid}`);
      handleCloseDetails();
    }
  };

  const handleFireEmployee = async () => {
    if (fireEmployeeConfirmText !== 'REMOVE EMPLOYEE') return;
    if (!employeeToFire || !selectedWorkspace?.facilityId) return;

    setIsFiringEmployee(true);
    try {
      const facilityId = selectedWorkspace.facilityId;
      const userId = employeeToFire.uid;

      const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const updatedMemberships = (userData.facilityMemberships || []).filter(
          m => m.facilityId !== facilityId && m.facilityProfileId !== facilityId
        );
        await updateDoc(userRef, {
          facilityMemberships: updatedMemberships,
          updatedAt: serverTimestamp()
        });
      }

      const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
      const facilitySnap = await getDoc(facilityRef);
      if (facilitySnap.exists()) {
        const facilityData = facilitySnap.data();
        const updatedEmployees = (facilityData.employees || []).filter(e => e.uid !== userId);
        const updatedAdmins = (facilityData.admins || []).filter(a => a !== userId);
        await updateDoc(facilityRef, {
          employees: updatedEmployees,
          admins: updatedAdmins,
          updatedAt: serverTimestamp()
        });
      }

      showNotification(t('organization:organigram.fireSuccess', 'Employee removed successfully'), 'success');
      setShowFireEmployeeDialog(false);
      setFireEmployeeConfirmText('');
      setEmployeeToFire(null);
      setSelectedEmployee(null);
      fetchTeamMembers();
    } catch (error) {
      console.error('Error firing employee:', error);
      showNotification(t('organization:organigram.fireError', 'Failed to remove employee'), 'error');
    } finally {
      setIsFiringEmployee(false);
    }
  };

  const openFireEmployeeDialog = (employee) => {
    setEmployeeToFire(employee);
    setShowFireEmployeeDialog(true);
  };

  const workerRequirements = useMemo(() => {
    if (!formData || !formData.operationalSettings) return [];
    return formData.operationalSettings.workerRequirements || [];
  }, [formData]);

  const hierarchicalColumns = useMemo(() => {
    const admins = teamMembers.filter(m => m.isAdmin);
    const allMembers = teamMembers;

    const columns = [];

    if (admins.length > 0) {
      columns.push({
        level: 0,
        title: t('organization:organigram.admins', 'Administrators'),
        role: 'admin',
        members: admins.map(admin => ({
          ...admin,
          color: 'var(--color-logo-1)',
          color1: 'rgba(37, 99, 235, 0.1)'
        }))
      });
    }

    const membersByFunction = {};

    workerRequirements.forEach(requirement => {
      const workerType = requirement.workerType === 'other'
        ? requirement.workerTypeOther
        : requirement.workerType;

      if (!membersByFunction[workerType]) {
        membersByFunction[workerType] = {
          workerType,
          color: requirement.assignedWorkers?.[0]?.color || CALENDAR_COLORS[0].color,
          color1: requirement.assignedWorkers?.[0]?.color1 || CALENDAR_COLORS[0].color1,
          members: []
        };
      }

      if (requirement.assignedWorkers) {
        requirement.assignedWorkers.forEach(worker => {
          if (worker.workerId && worker.workerId !== 'placeholder') {
            const member = allMembers.find(m => m.uid === worker.workerId && !m.isAdmin);
            if (member && !membersByFunction[workerType].members.find(m => m.uid === member.uid)) {
              membersByFunction[workerType].members.push({
                ...member,
                color: worker.color || membersByFunction[workerType].color,
                color1: worker.color1 || membersByFunction[workerType].color1
              });
            }
          }
        });
      }
    });

    const unassignedMembers = allMembers.filter(member => {
      return !member.isAdmin && !Object.values(membersByFunction).some(group =>
        group.members.some(m => m.uid === member.uid)
      );
    });

    if (unassignedMembers.length > 0) {
      membersByFunction['unassigned'] = {
        workerType: 'unassigned',
        color: CALENDAR_COLORS[4].color,
        color1: CALENDAR_COLORS[4].color1,
        members: unassignedMembers.map(m => ({
          ...m,
          color: CALENDAR_COLORS[4].color,
          color1: CALENDAR_COLORS[4].color1
        }))
      };
    }

    Object.entries(membersByFunction).forEach(([workerType, group]) => {
      if (group.members.length > 0) {
        const level = ROLE_HIERARCHY[workerType] ?? ROLE_HIERARCHY['other'];
        const workerTypeLabel = workerType === 'unassigned'
          ? t('organization:organigram.unassigned', 'Unassigned')
          : workerType === 'other'
            ? workerType
            : t(`dashboardProfile:operations.workerTypes.${workerType}`, workerType);

        columns.push({
          level,
          title: workerTypeLabel,
          role: workerType,
          members: group.members,
          color: group.color,
          color1: group.color1
        });
      }
    });

    return columns.sort((a, b) => a.level - b.level);
  }, [teamMembers, workerRequirements, t]);

  const filteredHierarchicalColumns = useMemo(() => {
    if (!searchQuery.trim()) {
      return hierarchicalColumns;
    }

    const query = searchQuery.toLowerCase().trim();
    return hierarchicalColumns.map(column => ({
      ...column,
      members: column.members.filter(member =>
        member.firstName?.toLowerCase().includes(query) ||
        member.lastName?.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query) ||
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(query)
      )
    })).filter(column => column.members.length > 0);
  }, [hierarchicalColumns, searchQuery]);

  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee);
  };

  const handleCloseDetails = () => {
    setSelectedEmployee(null);
    setEmployeeDetails(null);
  };

  const handleFullscreenToggle = useCallback(() => {
    const newFullscreen = !isFullscreen;
    setIsFullscreen(newFullscreen);
    if (newFullscreen) {
      setIsMainSidebarCollapsed(true);
      setIsReducedView(false);
    }
  }, [isFullscreen, setIsMainSidebarCollapsed]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (e.button === 0 && !e.target.closest('.node-content') && !e.target.closest('button')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
    }
  }, [pan]);

  const handleMouseMove = useCallback((e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      container.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        container.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp]);

  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const containerCenterX = rect.width / 2;
        const containerCenterY = rect.height / 2;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newZoom = Math.max(0.3, Math.min(3, zoom + delta));
        
        const zoomRatio = newZoom / zoom;
        const offsetX = (mouseX - containerCenterX) * (1 - zoomRatio);
        const offsetY = (mouseY - containerCenterY) * (1 - zoomRatio);
        
        setZoom(newZoom);
        setPan({
          x: pan.x + offsetX,
          y: pan.y + offsetY
        });
      }
    }
  }, [zoom, pan]);

  if (loadingTeamMembers) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-logo-1)' }} />
      </div>
    );
  }

  const isFacilityContext = !!selectedWorkspace?.facilityId;
  const organigramTitle = isFacilityContext 
    ? t('organization:organigram.roles', 'Roles')
    : t('organization:organigram.title', 'Organizational Chart');

  const nodePositions = useMemo(() => {
    const positions = {};
    const horizontalSpacing = isReducedView ? 220 : 280;
    const verticalSpacing = isReducedView ? 100 : 140;
    
    const totalColumns = filteredHierarchicalColumns.length;
    const totalWidth = totalColumns > 0 ? (totalColumns - 1) * horizontalSpacing : 0;
    const startX = 5000 - (totalWidth / 2);
    
    let maxMembersInColumn = 0;
    filteredHierarchicalColumns.forEach(column => {
      if (column.members.length > maxMembersInColumn) {
        maxMembersInColumn = column.members.length;
      }
    });
    
    const totalHeight = maxMembersInColumn > 0 ? (maxMembersInColumn - 1) * verticalSpacing : 0;
    const startY = 5000 - (totalHeight / 2);

    filteredHierarchicalColumns.forEach((column, columnIndex) => {
      const columnX = startX + (columnIndex * horizontalSpacing);
      const columnStartY = startY - ((column.members.length - 1) * verticalSpacing) / 2;
      
      column.members.forEach((member, memberIndex) => {
        positions[member.uid] = {
          x: columnX,
          y: columnStartY + (memberIndex * verticalSpacing),
          columnIndex,
          memberIndex
        };
      });
    });

    return positions;
  }, [filteredHierarchicalColumns, isReducedView]);

  return (
    <div className={cn(styles.sectionContainer, "relative", isFullscreen && "fixed inset-0 z-[100] bg-background")}>
      <div className={cn("bg-card rounded-xl border border-border hover:shadow-md transition-shadow w-full mb-4 px-6 py-3", isFullscreen && "mb-0 rounded-none border-0 border-b")}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">
            {organigramTitle}
          </h3>
          <div className="flex items-center gap-2">
            {isFullscreen && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                  title={t('common:zoomOut', 'Zoom Out')}
                >
                  <FiZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={handleZoomIn}
                  className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                  title={t('common:zoomIn', 'Zoom In')}
                >
                  <FiZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                  title={t('common:reset', 'Reset View')}
                >
                  <FiMove className="w-4 h-4" />
                </button>
                <div className="w-px h-6 bg-border mx-1" />
              </>
            )}
            <button
              onClick={() => setIsReducedView(!isReducedView)}
              className={cn(
                "px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm",
                isReducedView && "bg-primary text-primary-foreground border-primary"
              )}
            >
              {isReducedView ? t('common:expand', 'Expand') : t('common:reduce', 'Reduce')}
            </button>
            <button
              onClick={handleFullscreenToggle}
              className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
              title={isFullscreen ? t('common:exitFullscreen', 'Exit Fullscreen') : t('common:fullscreen', 'Fullscreen')}
            >
              {isFullscreen ? <FiMinimize2 className="w-4 h-4" /> : <FiMaximize2 className="w-4 h-4" />}
            </button>
            {isFacilityContext && (
              <>
                <div className="w-px h-6 bg-border mx-1" />
                <Button
                  onClick={() => setShowCreateRoleModal(true)}
                  variant="primary"
                  className="flex items-center gap-2"
                >
                  <FiPlus className="w-4 h-4" />
                  {t('organization:facilityRoles.createRole', 'Create Role')}
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="pt-3 border-t border-border mb-4">
          <p className="text-sm text-muted-foreground">
            {t('organization:organigram.description', 'View your team organized by hierarchy. Click on any employee to see details.')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full">
          <div className="relative flex-1 min-w-[200px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('organization:directory.searchPlaceholder', 'Search employees...')}
              className="w-full pl-9 pr-8 rounded-xl border-2 border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-0 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.1)] transition-all hover:border-muted-foreground/30 hover:bg-muted/30"
              style={{
                height: 'var(--boxed-inputfield-height)',
                fontWeight: '500',
                fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
                color: 'var(--boxed-inputfield-color-text)'
              }}
            />
          </div>
        </div>
      </div>

      {filteredHierarchicalColumns.length === 0 ? (
        <div className="text-center py-16">
          <FiUsers className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            {searchQuery ? t('organization:directory.emptyState', 'No employees found') : t('organization:organigram.empty', 'No team members found')}
          </p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className={cn(
            "relative w-full overflow-hidden rounded-lg",
            isFullscreen ? "h-[calc(100vh-200px)]" : isReducedView ? "h-[400px]" : "h-[600px]"
          )}
          onWheel={handleWheel}
          style={{ 
            cursor: isPanning ? 'grabbing' : 'grab',
            backgroundColor: 'hsl(var(--background))',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, hsl(var(--border) / 0.2) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(var(--border) / 0.2) 1px, transparent 1px),
                radial-gradient(circle at center, hsl(var(--border) / 0.5) 1.5px, transparent 1.5px)
              `,
              backgroundSize: '20px 20px, 20px 20px, 20px 20px',
              backgroundPosition: `${(pan.x % 20)}px ${(pan.y % 20)}px, ${(pan.x % 20)}px ${(pan.y % 20)}px, ${(pan.x % 20)}px ${(pan.y % 20)}px`,
              width: '100%',
              height: '100%',
              pointerEvents: 'none'
            }}
          />
          <div
            ref={canvasRef}
            className="absolute"
            style={{
              width: '10000px',
              height: '10000px',
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            {filteredHierarchicalColumns.map((column, columnIndex) => (
              <React.Fragment key={column.role}>
                {column.members.map((member, memberIndex) => {
                  const position = nodePositions[member.uid];
                  if (!position) return null;
                  const isSelected = selectedEmployee?.uid === member.uid;
                  const nodeX = position.x;
                  const nodeY = position.y;

                  return (
                    <React.Fragment key={member.uid}>
                      {columnIndex > 0 && memberIndex === 0 && (
                        <svg
                          className="absolute pointer-events-none"
                          style={{
                            left: nodeX - 50,
                            top: nodeY + (isReducedView ? 30 : 50),
                            width: 50,
                            height: 2,
                            zIndex: 1
                          }}
                        >
                          <line
                            x1="0"
                            y1="1"
                            x2="50"
                            y2="1"
                            stroke={column.color || 'var(--color-logo-1)'}
                            strokeWidth="2"
                            strokeDasharray="4,4"
                            opacity="0.6"
                          />
                        </svg>
                      )}
                      <div
                        className={cn(
                          "absolute bg-card rounded-lg border-2 shadow-lg transition-all cursor-pointer select-none",
                          "hover:shadow-xl hover:border-primary/50",
                          isSelected && "ring-2 ring-primary ring-offset-1"
                        )}
                        style={{
                          left: nodeX,
                          top: nodeY,
                          width: isReducedView ? 180 : 240,
                          minHeight: isReducedView ? 60 : 100,
                          borderColor: isSelected 
                            ? (member.color || column.color || 'var(--color-logo-1)')
                            : 'hsl(var(--border))',
                          backgroundColor: 'hsl(var(--card))',
                          zIndex: isSelected ? 10 : 2
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEmployeeClick(member);
                        }}
                      >
                        <div className="p-3 node-content">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 border-2 border-background shadow-sm"
                              style={{ 
                                backgroundColor: member.color || column.color || 'var(--color-logo-1)',
                                borderColor: 'hsl(var(--card))'
                              }}
                            >
                              {member.photoURL ? (
                                <img
                                  src={member.photoURL}
                                  alt={`${member.firstName} ${member.lastName}`}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                member.firstName?.[0]?.toUpperCase() || member.lastName?.[0]?.toUpperCase() || '?'
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-sm truncate text-foreground">
                                  {`${member.firstName} ${member.lastName}`.trim() || 'Unknown'}
                                </p>
                                {member.isAdmin && (
                                  <FiShield className="w-3.5 h-3.5 text-primary shrink-0" />
                                )}
                              </div>
                              {!isReducedView && (
                                <>
                                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                                    {member.email}
                                  </p>
                                  <div className="mt-1.5 pt-1.5 border-t border-border/50">
                                    <p className="text-xs font-medium text-muted-foreground">
                                      {column.title}
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {columnIndex < filteredHierarchicalColumns.length - 1 && memberIndex === column.members.length - 1 && (
                        <svg
                          className="absolute pointer-events-none"
                          style={{
                            left: nodeX + (isReducedView ? 180 : 240),
                            top: nodeY + (isReducedView ? 30 : 50),
                            width: 50,
                            height: 2,
                            zIndex: 1
                          }}
                        >
                          <line
                            x1="0"
                            y1="1"
                            x2="50"
                            y2="1"
                            stroke={filteredHierarchicalColumns[columnIndex + 1]?.color || 'var(--color-logo-1)'}
                            strokeWidth="2"
                            strokeDasharray="4,4"
                            opacity="0.6"
                          />
                        </svg>
                      )}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {selectedEmployee && employeeDetails && !loadingDetails && (
        <EmployeeCard
          employee={{
            ...employeeDetails,
            ...selectedEmployee,
            identity: {
              fullLegalName: `${employeeDetails.firstName || ''} ${employeeDetails.lastName || ''}`.trim(),
              ahvNumber: employeeDetails.identity?.ahvNumber,
              dateOfBirth: employeeDetails.identity?.dateOfBirth,
              nationality: employeeDetails.identity?.nationality,
              permitType: employeeDetails.identity?.permitType,
              permitExpiryDate: employeeDetails.identity?.permitExpiryDate,
              maritalStatus: employeeDetails.identity?.maritalStatus,
              numberOfChildren: employeeDetails.identity?.numberOfChildren,
              address: employeeDetails.identity?.address || employeeDetails.contact?.residentialAddress
            },
            pharmacyLicense: {
              gln: employeeDetails.pharmacyLicense?.gln,
              cantonalAuthorization: employeeDetails.pharmacyLicense?.cantonalAuthorization,
              nareg: employeeDetails.pharmacyLicense?.nareg,
              diploma: employeeDetails.pharmacyLicense?.diploma,
              vaccinationStatus: employeeDetails.pharmacyLicense?.vaccinationStatus
            },
            contract: {
              fte: employeeDetails.contract?.fte || hrMetrics?.activeContract?.workPercentage,
              contractType: employeeDetails.contract?.contractType || hrMetrics?.activeContract?.contractType,
              startDate: employeeDetails.contract?.startDate || hrMetrics?.activeContract?.startDate,
              endDate: employeeDetails.contract?.endDate || hrMetrics?.activeContract?.endDate,
              hourlyWage: employeeDetails.contract?.hourlyWage,
              monthlyWage: employeeDetails.contract?.monthlyWage,
              iban: employeeDetails.contract?.iban,
              lppDeduction: employeeDetails.contract?.lppDeduction,
              vacationBalance: employeeDetails.contract?.vacationBalance,
              vacationRemaining: employeeDetails.contract?.vacationRemaining
            },
            operational: {
              erpSoftware: employeeDetails.operational?.erpSoftware,
              primaryLanguage: employeeDetails.operational?.primaryLanguage,
              additionalLanguages: employeeDetails.operational?.additionalLanguages,
              mobilityZone: employeeDetails.operational?.mobilityZone,
              injectionCert: employeeDetails.operational?.injectionCert,
              cardioTest: employeeDetails.operational?.cardioTest,
              netCare: employeeDetails.operational?.netCare
            }
          }}
          onClose={handleCloseDetails}
          onSave={(updatedData) => {
            // Save employee data
          }}
          isEditable={true}
          viewerIsAdmin={viewerIsAdmin}
          hrMetrics={hrMetrics}
          onFireEmployee={viewerIsAdmin ? () => openFireEmployeeDialog(selectedEmployee) : null}
          employeeId={selectedEmployee?.uid}
        />
      )}

      {selectedEmployee && loadingDetails && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border shadow-2xl p-8">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--color-logo-1)' }} />
          </div>
        </div>
      )}

      <Dialog
        isOpen={showFireEmployeeDialog}
        onClose={() => { setShowFireEmployeeDialog(false); setFireEmployeeConfirmText(''); setEmployeeToFire(null); }}
        title={t('organization:organigram.fireDialogTitle', 'Remove Employee')}
        size="small"
        messageType="warning"
        actions={
          <>
            <Button onClick={() => { setShowFireEmployeeDialog(false); setFireEmployeeConfirmText(''); }} variant="secondary" disabled={isFiringEmployee}>
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button onClick={handleFireEmployee} variant="danger" disabled={isFiringEmployee || fireEmployeeConfirmText !== 'REMOVE EMPLOYEE'}>
              {isFiringEmployee ? t('common:processing', 'Processing...') : t('organization:organigram.fireConfirm', 'Remove Employee')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p>{t('organization:organigram.fireMessage', 'You are about to remove')} <strong>{employeeToFire?.firstName} {employeeToFire?.lastName}</strong> {t('organization:organigram.fromFacility', 'from this facility')}.</p>
          <p className="text-sm text-muted-foreground">{t('organization:organigram.fireWarning', 'This employee will lose access to this facility and its resources.')}</p>
          <p className="text-sm text-muted-foreground">{t('organization:organigram.firePrompt', 'Type')} <strong>REMOVE EMPLOYEE</strong> {t('organization:organigram.toConfirm', 'to confirm')}:</p>
          <PersonnalizedInputField
            value={fireEmployeeConfirmText}
            onChange={e => setFireEmployeeConfirmText(e.target.value)}
            placeholder="REMOVE EMPLOYEE"
          />
        </div>
      </Dialog>

      <CreateFacilityRoleModal
        isOpen={showCreateRoleModal}
        onClose={() => setShowCreateRoleModal(false)}
        onRoleCreated={() => {
          fetchTeamMembers();
        }}
      />
    </div>
  );
};

export default Organigram;
