import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs, collectionGroup, Timestamp, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../../../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import { useDashboard } from '../../../contexts/DashboardContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import { FiUsers, FiShield, FiUser, FiX, FiBriefcase, FiCalendar, FiMail, FiPhone, FiTrendingUp, FiFileText, FiClock, FiExternalLink, FiAlertCircle, FiCheckCircle, FiUserX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { CALENDAR_COLORS } from '../../calendar/utils/constants';
import { cn } from '../../../../utils/cn';
import EmployeeCard from './EmployeeCard';
import Button from '../../../../components/BoxedInputFields/Button';
import PersonnalizedInputField from '../../../../components/BoxedInputFields/Personnalized-InputField';
import Dialog from '../../../../components/Dialog/Dialog';

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
  const navigate = useNavigate();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [contracts, setContracts] = useState([]);
  const [hrMetrics, setHrMetrics] = useState(null);
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);

  const [showFireEmployeeDialog, setShowFireEmployeeDialog] = useState(false);
  const [fireEmployeeConfirmText, setFireEmployeeConfirmText] = useState('');
  const [isFiringEmployee, setIsFiringEmployee] = useState(false);
  const [employeeToFire, setEmployeeToFire] = useState(null);

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

  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee);
  };

  const handleCloseDetails = () => {
    setSelectedEmployee(null);
    setEmployeeDetails(null);
  };

  if (loadingTeamMembers) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-logo-1)' }} />
      </div>
    );
  }

  return (
    <div className={cn(styles.sectionContainer, "relative")}>
      <div className={styles.headerCard}>
        <h2 className={styles.sectionTitle} style={styles.sectionTitleStyle}>
          {t('organization:organigram.title', 'Organizational Chart')}
        </h2>
        <div className={styles.subtitleRow}>
          <p className={styles.sectionSubtitle} style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
            {t('organization:organigram.description', 'View your team organized by hierarchy. Click on any employee to see details.')}
          </p>
        </div>
      </div>

      {hierarchicalColumns.length === 0 ? (
        <div className="text-center py-16">
          <FiUsers className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            {t('organization:organigram.empty', 'No team members found')}
          </p>
        </div>
      ) : (
        <div className="relative w-full overflow-x-auto pb-8">
          <div className="flex gap-6 min-w-max px-4" style={{ minHeight: '400px' }}>
            {hierarchicalColumns.map((column, columnIndex) => (
              <div
                key={column.role}
                className="flex flex-col gap-4 min-w-[280px]"
              >
                <div
                  className="flex items-center gap-3 p-4 rounded-lg shadow-sm border border-border"
                  style={{
                    backgroundColor: column.color1 || 'var(--background-div-color)',
                    borderColor: column.color || 'var(--border)'
                  }}
                >
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: column.color || 'var(--color-logo-1)' }}
                  >
                    {column.level === 0 ? (
                      <FiShield className="w-5 h-5 text-white" />
                    ) : (
                      <FiUsers className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3
                      className="text-lg font-semibold"
                      style={{ color: column.color || 'var(--color-logo-1)' }}
                    >
                      {column.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {column.members.length} {column.members.length === 1 ? t('organization:organigram.member', 'member') : t('organization:organigram.members', 'members')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 flex-1">
                  {column.members.map((member, memberIndex) => {
                    const isSelected = selectedEmployee?.uid === member.uid;
                    return (
                      <div key={member.uid} className="relative">
                        {columnIndex > 0 && memberIndex === 0 && (
                          <div
                            className="absolute -left-6 top-1/2 w-6 h-0.5 -translate-y-1/2"
                            style={{ backgroundColor: column.color || 'var(--color-logo-1)' }}
                          />
                        )}
                        <button
                          onClick={() => handleEmployeeClick(member)}
                          className={cn(
                            "w-full bg-card rounded-xl border p-4 shadow-md transition-all text-left",
                            "hover:shadow-lg hover:scale-[1.02]",
                            isSelected && "ring-2 ring-offset-2",
                            "focus:outline-none focus:ring-2 focus:ring-offset-2"
                          )}
                          style={{
                            borderLeftWidth: '4px',
                            borderLeftColor: member.color || column.color || 'var(--color-logo-1)',
                            ...(isSelected && {
                              ringColor: member.color || column.color || 'var(--color-logo-1)',
                              borderColor: member.color || column.color || 'var(--color-logo-1)'
                            })
                          }}
                        >
                          <div className="flex items-center gap-3">
                            {member.photoURL ? (
                              <img
                                src={member.photoURL}
                                alt={`${member.firstName} ${member.lastName}`}
                                className="w-12 h-12 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div
                                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold shrink-0"
                                style={{ backgroundColor: member.color || column.color || 'var(--color-logo-1)' }}
                              >
                                {member.firstName?.[0]?.toUpperCase() || member.lastName?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm truncate">
                                  {`${member.firstName} ${member.lastName}`.trim() || 'Unknown'}
                                </p>
                                {member.isAdmin && (
                                  <div
                                    className="p-1 rounded-full shrink-0"
                                    style={{ backgroundColor: 'var(--color-logo-1)' }}
                                    title={t('organization:organigram.adminBadge', 'Administrator')}
                                  >
                                    <FiShield className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {member.email}
                              </p>
                              {member.experienceYears > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {member.experienceYears} {member.experienceYears === 1 ? t('organization:organigram.year', 'year') : t('organization:organigram.years', 'years')} {t('organization:organigram.experience', 'experience')}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                        {columnIndex < hierarchicalColumns.length - 1 && memberIndex === column.members.length - 1 && (
                          <div
                            className="absolute -right-6 top-1/2 w-6 h-0.5 -translate-y-1/2"
                            style={{ backgroundColor: hierarchicalColumns[columnIndex + 1]?.color || 'var(--color-logo-1)' }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
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
    </div>
  );
};

export default Organigram;
