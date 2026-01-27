import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import { useDashboard } from '../../../contexts/DashboardContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  Users,
  UserPlus,
  Shield,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Calendar,
  User,
  X,
  Check,
  Edit,
  Trash2,
  Clock,
  DollarSign,
  FileText,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Settings
} from 'lucide-react';
import Button from '../../../../components/BoxedInputFields/Button';
import PersonnalizedInputField from '../../../../components/BoxedInputFields/Personnalized-InputField';
import DropdownField from '../../../../components/BoxedInputFields/Dropdown-Field';
import Dialog from '../../../../components/Dialog/Dialog';
import { ROLE_DEFINITIONS } from '../../../../config/roleDefinitions';
import EmployeeCard from './EmployeeCard';

const FacilityEmployeeManagement = () => {
  const { t } = useTranslation(['organization', 'common']);
  const { selectedWorkspace } = useDashboard();
  const { showNotification } = useNotification();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterRole, setFilterRole] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFireModal, setShowFireModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showRoleManagementModal, setShowRoleManagementModal] = useState(false);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [customRoles, setCustomRoles] = useState([]);
  const [showEmployeeCard, setShowEmployeeCard] = useState(false);

  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [newEmployeeRole, setNewEmployeeRole] = useState('employee');
  const [newEmployeeRights, setNewEmployeeRights] = useState([]);
  const [fireConfirmText, setFireConfirmText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const facilityId = selectedWorkspace?.facilityId;

  const loadEmployees = useCallback(async () => {
    if (!facilityId) return;

    setLoading(true);
    try {
      const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
      const facilitySnap = await getDoc(facilityRef);

      if (facilitySnap.exists()) {
        const facilityData = facilitySnap.data();
        const employeesList = facilityData.employees || [];
        const adminsList = facilityData.admins || [];

        const employeePromises = employeesList.map(async (emp) => {
          try {
            const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, emp.user_uid || emp.uid);
            const userSnap = await getDoc(userRef);
            const professionalRef = doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, emp.user_uid || emp.uid);
            const professionalSnap = await getDoc(professionalRef);

            let userData = {};
            if (userSnap.exists()) {
              userData = userSnap.data();
            }
            if (professionalSnap.exists()) {
              userData = { ...userData, ...professionalSnap.data() };
            }

            const roles = emp.roles || ['employee'];
            const isAdmin = adminsList.includes(emp.user_uid || emp.uid) || roles.includes('admin');

            return {
              id: emp.user_uid || emp.uid,
              email: userData.email || '',
              firstName: userData.firstName || userData.identity?.firstName || '',
              lastName: userData.lastName || userData.identity?.lastName || '',
              photoURL: userData.photoURL || userData.profileDisplay?.profilePictureUrl || '',
              roles: roles,
              isAdmin: isAdmin,
              rights: emp.rights || [],
              hireDate: emp.hireDate?.toDate?.() || emp.hireDate || null,
              contractId: emp.contractId || null,
              status: emp.status || 'active'
            };
          } catch (error) {
            console.error(`Error loading employee ${emp.user_uid || emp.uid}:`, error);
            return null;
          }
        });

        const loadedEmployees = (await Promise.all(employeePromises)).filter(Boolean);
        setEmployees(loadedEmployees);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      showNotification('Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  }, [facilityId, showNotification]);

  const loadCustomRoles = useCallback(async () => {
    if (!facilityId) return;

    try {
      const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
      const facilitySnap = await getDoc(facilityRef);

      if (facilitySnap.exists()) {
        const facilityData = facilitySnap.data();
        setCustomRoles(facilityData.customRoles || []);
      }
    } catch (error) {
      console.error('Error loading custom roles:', error);
    }
  }, [facilityId]);

  useEffect(() => {
    if (facilityId) {
      loadEmployees();
      loadCustomRoles();
    }
  }, [facilityId, loadEmployees, loadCustomRoles]);

  const fetchEmployeeDetails = async (employeeId) => {
    if (!employeeId || !facilityId) return;

    setLoadingDetails(true);
    try {
      const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, employeeId);
      const professionalRef = doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, employeeId);
      
      const [userSnap, professionalSnap] = await Promise.all([
        getDoc(userRef),
        getDoc(professionalRef)
      ]);

      let profileData = {};
      if (userSnap.exists()) {
        profileData = { ...profileData, ...userSnap.data() };
      }
      if (professionalSnap.exists()) {
        profileData = { ...profileData, ...professionalSnap.data() };
      }

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const contractsQuery = query(
        collection(db, FIRESTORE_COLLECTIONS.CONTRACTS),
        where('parties.professional.profileId', '==', employeeId),
        where('parties.employer.profileId', '==', facilityId)
      );
      const contractsSnapshot = await getDocs(contractsQuery);
      const contracts = [];
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
          hourlyRate: terms.salary?.hourlyRate || terms.salary?.rate || 0
        };
        contracts.push(contract);
        if (contractStatus === 'active' && (!contract.endDate || contract.endDate > now)) {
          activeContract = contract;
        }
      });

      const scheduleId = `${facilityId}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      let totalHoursWorked = 0;
      let scheduledHours = 0;
      let overtimeHours = 0;
      let totalPay = 0;

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
            scheduledHours += hours;

            const contractHours = activeContract ? (activeContract.workPercentage / 100) * 42 * 4.33 : 0;
            const weeklyHours = contractHours / 4.33;
            const dailyHours = weeklyHours / 5;

            if (hours > dailyHours) {
              overtimeHours += hours - dailyHours;
            }

            const hourlyRate = shift.hourlyRate || activeContract?.hourlyRate || 0;
            totalPay += hours * hourlyRate;
          }
        });
      } catch (error) {
        console.error('Error fetching shifts:', error);
      }

      setEmployeeDetails({
        ...profileData,
        contracts,
        activeContract,
        hours: {
          total: Math.round(totalHoursWorked * 10) / 10,
          scheduled: Math.round(scheduledHours * 10) / 10,
          overtime: Math.round(overtimeHours * 10) / 10
        },
        pay: {
          total: Math.round(totalPay * 100) / 100,
          hourlyRate: activeContract?.hourlyRate || 0
        }
      });
    } catch (error) {
      console.error('Error fetching employee details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmployeeEmail.trim()) {
      showNotification('Please enter an email address', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const userQuery = query(
        collection(db, FIRESTORE_COLLECTIONS.USERS),
        where('email', '==', newEmployeeEmail.trim().toLowerCase())
      );
      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) {
        showNotification('User not found. Please invite them first.', 'warning');
        setIsProcessing(false);
        return;
      }

      const userId = userSnapshot.docs[0].id;
      const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
      const facilitySnap = await getDoc(facilityRef);

      if (facilitySnap.exists()) {
        const facilityData = facilitySnap.data();
        const employeesList = facilityData.employees || [];
        const isAlreadyEmployee = employeesList.some(emp => (emp.user_uid || emp.uid) === userId);

        if (isAlreadyEmployee) {
          showNotification('This user is already an employee', 'warning');
          setIsProcessing(false);
          return;
        }

        const newEmployee = {
          user_uid: userId,
          roles: [newEmployeeRole],
          rights: newEmployeeRights,
          hireDate: serverTimestamp(),
          status: 'active'
        };

        const updatedEmployees = [...employeesList, newEmployee];
        const updatedAdmins = newEmployeeRole === 'admin' || newEmployeeRights.includes('admin')
          ? [...(facilityData.admins || []), userId]
          : facilityData.admins || [];

        await updateDoc(facilityRef, {
          employees: updatedEmployees,
          admins: updatedAdmins,
          updatedAt: serverTimestamp()
        });

        showNotification('Employee added successfully', 'success');
        setShowAddModal(false);
        setNewEmployeeEmail('');
        setNewEmployeeRole('employee');
        setNewEmployeeRights([]);
        loadEmployees();
      }
    } catch (error) {
      console.error('Error adding employee:', error);
      showNotification('Failed to add employee', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFireEmployee = async () => {
    if (fireConfirmText !== 'REMOVE EMPLOYEE') {
      showNotification('Please type "REMOVE EMPLOYEE" to confirm', 'warning');
      return;
    }

    if (!selectedEmployee || !facilityId) return;

    setIsProcessing(true);
    try {
      const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
      const facilitySnap = await getDoc(facilityRef);

      if (facilitySnap.exists()) {
        const facilityData = facilitySnap.data();
        const employeesList = facilityData.employees || [];
        const adminsList = facilityData.admins || [];

        const updatedEmployees = employeesList.filter(emp => (emp.user_uid || emp.uid) !== selectedEmployee.id);
        const updatedAdmins = adminsList.filter(adminId => adminId !== selectedEmployee.id);

        await updateDoc(facilityRef, {
          employees: updatedEmployees,
          admins: updatedAdmins,
          updatedAt: serverTimestamp()
        });

        const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, selectedEmployee.id);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          const roles = userData.roles || [];
          const updatedRoles = roles.filter(r => {
            if (typeof r === 'object' && r.facility_uid) {
              return r.facility_uid !== facilityId;
            }
            return true;
          });

          await updateDoc(userRef, {
            roles: updatedRoles,
            updatedAt: serverTimestamp()
          });
        }

        showNotification('Employee removed successfully', 'success');
        setShowFireModal(false);
        setFireConfirmText('');
        setSelectedEmployee(null);
        loadEmployees();
      }
    } catch (error) {
      console.error('Error firing employee:', error);
      showNotification('Failed to remove employee', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateRole = async (employeeId, newRoles, newRights) => {
    if (!facilityId) return;

    setIsProcessing(true);
    try {
      const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
      const facilitySnap = await getDoc(facilityRef);

      if (facilitySnap.exists()) {
        const facilityData = facilitySnap.data();
        const employeesList = facilityData.employees || [];
        const adminsList = facilityData.admins || [];

        const updatedEmployees = employeesList.map(emp => {
          if ((emp.user_uid || emp.uid) === employeeId) {
            return {
              ...emp,
              roles: newRoles,
              rights: newRights
            };
          }
          return emp;
        });

        const isAdmin = newRoles.includes('admin') || newRights.includes('admin');
        let updatedAdmins = [...adminsList];
        if (isAdmin && !adminsList.includes(employeeId)) {
          updatedAdmins.push(employeeId);
        } else if (!isAdmin && adminsList.includes(employeeId)) {
          updatedAdmins = updatedAdmins.filter(id => id !== employeeId);
        }

        await updateDoc(facilityRef, {
          employees: updatedEmployees,
          admins: updatedAdmins,
          updatedAt: serverTimestamp()
        });

        const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, employeeId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          const roles = userData.roles || [];
          const facilityRoleIndex = roles.findIndex(r => 
            typeof r === 'object' && r.facility_uid === facilityId
          );

          const facilityRole = {
            facility_uid: facilityId,
            roles: newRoles
          };

          let updatedUserRoles;
          if (facilityRoleIndex >= 0) {
            updatedUserRoles = [...roles];
            updatedUserRoles[facilityRoleIndex] = facilityRole;
          } else {
            updatedUserRoles = [...roles, facilityRole];
          }

          await updateDoc(userRef, {
            roles: updatedUserRoles,
            updatedAt: serverTimestamp()
          });
        }

        showNotification('Role updated successfully', 'success');
        setShowRoleModal(false);
        setSelectedEmployee(null);
        loadEmployees();
      }
    } catch (error) {
      console.error('Error updating role:', error);
      showNotification('Failed to update role', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateRole = async (roleName, permissions) => {
    if (!facilityId || !roleName.trim()) return;

    setIsProcessing(true);
    try {
      const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
      const facilitySnap = await getDoc(facilityRef);

      if (facilitySnap.exists()) {
        const facilityData = facilitySnap.data();
        const existingRoles = facilityData.customRoles || [];

        const newRole = {
          id: Date.now().toString(),
          name: roleName.trim(),
          permissions: permissions,
          createdAt: serverTimestamp()
        };

        const updatedRoles = [...existingRoles, newRole];

        await updateDoc(facilityRef, {
          customRoles: updatedRoles,
          updatedAt: serverTimestamp()
        });

        showNotification('Role created successfully', 'success');
        loadCustomRoles();
      }
    } catch (error) {
      console.error('Error creating role:', error);
      showNotification('Failed to create role', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateRoleDefinition = async (roleId, updatedPermissions) => {
    if (!facilityId) return;

    setIsProcessing(true);
    try {
      const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
      const facilitySnap = await getDoc(facilityRef);

      if (facilitySnap.exists()) {
        const facilityData = facilitySnap.data();
        const customRoles = facilityData.customRoles || [];
        const updatedCustomRoles = customRoles.map(role => 
          role.id === roleId ? { ...role, permissions: updatedPermissions } : role
        );

        await updateDoc(facilityRef, {
          customRoles: updatedCustomRoles,
          updatedAt: serverTimestamp()
        });

        const employeesList = facilityData.employees || [];
        const batch = writeBatch(db);

        employeesList.forEach(emp => {
          if (emp.roles && emp.roles.includes(roleId)) {
            const empRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
            batch.update(empRef, {
              [`employees.${employeesList.findIndex(e => (e.user_uid || e.uid) === (emp.user_uid || emp.uid))}.rights`]: updatedPermissions
            });
          }
        });

        await batch.commit();

        showNotification('Role updated. All employees with this role have been updated.', 'success');
        loadCustomRoles();
        loadEmployees();
      }
    } catch (error) {
      console.error('Error updating role definition:', error);
      showNotification('Failed to update role', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const availablePermissions = [
    'manage_employees',
    'manage_schedules',
    'post_positions',
    'manage_contracts',
    'view_analytics',
    'manage_settings',
    'invite_users',
    'manage_organization',
    'view_employees',
    'view_contracts',
    'request_staffing',
    'view_applications',
    'view_professionals',
    'view_schedule',
    'request_timeoff'
  ];

  const filteredAndSortedEmployees = useMemo(() => {
    let filtered = employees;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.firstName?.toLowerCase().includes(query) ||
        emp.lastName?.toLowerCase().includes(query) ||
        emp.email?.toLowerCase().includes(query) ||
        emp.roles?.some(r => r.toLowerCase().includes(query))
      );
    }

    if (filterRole !== 'all') {
      filtered = filtered.filter(emp =>
        emp.roles?.includes(filterRole) || emp.isAdmin
      );
    }

    filtered = [...filtered].sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'email':
          aValue = a.email?.toLowerCase() || '';
          bValue = b.email?.toLowerCase() || '';
          break;
        case 'role':
          aValue = a.roles?.[0] || '';
          bValue = b.roles?.[0] || '';
          break;
        case 'hireDate':
          aValue = a.hireDate?.getTime() || 0;
          bValue = b.hireDate?.getTime() || 0;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [employees, searchQuery, filterRole, sortBy, sortOrder]);

  const allRoles = [
    ...Object.keys(ROLE_DEFINITIONS.FACILITY || {}),
    ...customRoles
      .filter(r => r && typeof r.name === 'string')
      .map(r => r.name.toLowerCase())
  ];

  if (!facilityId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div>No facility selected. Please select a facility workspace.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div>Loading employees...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xxxlarge)', fontWeight: 'var(--font-weight-large)', color: 'var(--text-color)', marginBottom: 'var(--spacing-xs)' }}>
            Employee Management
          </h1>
          <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-light-color)' }}>
            Manage employees, roles, and permissions
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <Button
            onClick={() => setShowRoleManagementModal(true)}
            variant="ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
          >
            <Settings size={18} />
            Manage Roles
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            variant="confirmation"
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
          >
            <UserPlus size={18} />
            Add Employee
          </Button>
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-lg)', border: '1px solid var(--grey-2)' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light-color)' }} />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '36px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--grey-2)', outline: 'none' }}
            />
          </div>
          <DropdownField
            options={[
              { value: 'all', label: 'All Roles' },
              { value: 'admin', label: 'Admin' },
              { value: 'scheduler', label: 'Scheduler' },
              { value: 'recruiter', label: 'Recruiter' },
              { value: 'employee', label: 'Employee' },
              ...customRoles.map(r => ({ value: r.name.toLowerCase(), label: r.name }))
            ]}
            value={filterRole}
            onChange={(value) => setFilterRole(value)}
            style={{ minWidth: '150px' }}
          />
          <DropdownField
            options={[
              { value: 'name', label: 'Sort by Name' },
              { value: 'email', label: 'Sort by Email' },
              { value: 'role', label: 'Sort by Role' },
              { value: 'hireDate', label: 'Sort by Hire Date' }
            ]}
            value={sortBy}
            onChange={(value) => setSortBy(value)}
            style={{ minWidth: '150px' }}
          />
          <Button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            variant="ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
          >
            {sortOrder === 'asc' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          </Button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {filteredAndSortedEmployees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xxl)', color: 'var(--text-light-color)' }}>
              <Users size={48} style={{ margin: '0 auto', marginBottom: 'var(--spacing-md)', opacity: 0.3 }} />
              <p>No employees found</p>
            </div>
          ) : (
            filteredAndSortedEmployees.map((employee) => (
              <EmployeeRow
                key={employee.id}
                employee={employee}
                onViewDetails={() => {
                  setSelectedEmployee(employee);
                  fetchEmployeeDetails(employee.id);
                  setShowEmployeeCard(true);
                }}
                onEditRole={() => {
                  setSelectedEmployee(employee);
                  setShowRoleModal(true);
                }}
                onFire={() => {
                  setSelectedEmployee(employee);
                  setShowFireModal(true);
                }}
                onViewProfile={() => navigate(`/dashboard/${selectedWorkspace?.id || 'personal'}/profile/professionals/${employee.id}`)}
                onMessage={() => navigate(`/dashboard/${selectedWorkspace?.id || 'personal'}/messages?userId=${employee.id}`)}
                onViewCalendar={() => navigate(`/dashboard/${selectedWorkspace?.id || 'personal'}/calendar?userId=${employee.id}`)}
              />
            ))
          )}
        </div>
      </div>

      {showAddModal && (
        <AddEmployeeModal
          email={newEmployeeEmail}
          role={newEmployeeRole}
          rights={newEmployeeRights}
          onEmailChange={setNewEmployeeEmail}
          onRoleChange={setNewEmployeeRole}
          onRightsChange={setNewEmployeeRights}
          onClose={() => {
            setShowAddModal(false);
            setNewEmployeeEmail('');
            setNewEmployeeRole('employee');
            setNewEmployeeRights([]);
          }}
          onSave={handleAddEmployee}
          isProcessing={isProcessing}
          availableRoles={allRoles}
          availablePermissions={availablePermissions}
        />
      )}

      {showFireModal && selectedEmployee && (
        <FireEmployeeModal
          employee={selectedEmployee}
          confirmText={fireConfirmText}
          onConfirmTextChange={setFireConfirmText}
          onClose={() => {
            setShowFireModal(false);
            setFireConfirmText('');
            setSelectedEmployee(null);
          }}
          onConfirm={handleFireEmployee}
          isProcessing={isProcessing}
        />
      )}

      {showRoleModal && selectedEmployee && (
        <RoleManagementModal
          employee={selectedEmployee}
          currentRoles={selectedEmployee.roles || []}
          currentRights={selectedEmployee.rights || []}
          onClose={() => {
            setShowRoleModal(false);
            setSelectedEmployee(null);
          }}
          onSave={(newRoles, newRights) => handleUpdateRole(selectedEmployee.id, newRoles, newRights)}
          isProcessing={isProcessing}
          availableRoles={allRoles}
          availablePermissions={availablePermissions}
          customRoles={customRoles}
        />
      )}

      {showRoleManagementModal && (
        <RoleDefinitionModal
          customRoles={customRoles}
          onClose={() => setShowRoleManagementModal(false)}
          onCreate={handleCreateRole}
          onUpdate={handleUpdateRoleDefinition}
          isProcessing={isProcessing}
          availablePermissions={availablePermissions}
        />
      )}

      {showEmployeeCard && selectedEmployee && employeeDetails && !loadingDetails && (
        <EmployeeCard
          employee={{
            ...selectedEmployee,
            ...employeeDetails,
            identity: employeeDetails.identity || {
              firstName: employeeDetails.firstName || selectedEmployee.firstName,
              lastName: employeeDetails.lastName || selectedEmployee.lastName,
              permitType: employeeDetails.identity?.permitType,
              permitExpiryDate: employeeDetails.identity?.permitExpiryDate
            },
            pharmacyLicense: employeeDetails.pharmacyLicense || {},
            operational: employeeDetails.operational || {},
            contract: {
              jobTitle: employeeDetails.activeContract?.jobTitle || '',
              contractType: employeeDetails.activeContract?.contractType || '',
              startDate: employeeDetails.activeContract?.startDate,
              endDate: employeeDetails.activeContract?.endDate,
              fte: employeeDetails.activeContract?.workPercentage || 0,
              hourlyRate: employeeDetails.activeContract?.hourlyRate || 0,
              hourlyWage: employeeDetails.activeContract?.hourlyRate || 0
            }
          }}
          hrMetrics={{
            overtimeHours: employeeDetails.hours?.overtime || 0,
            activeContract: {
              ...employeeDetails.activeContract,
              workPercentage: employeeDetails.activeContract?.workPercentage,
              vacationRemaining: employeeDetails.contract?.vacationRemaining || 0
            }
          }}
          onClose={() => {
            setShowEmployeeCard(false);
            setSelectedEmployee(null);
            setEmployeeDetails(null);
          }}
          viewerIsAdmin={currentUser && selectedWorkspace?.admins?.includes(currentUser.uid)}
          onFireEmployee={() => {
            setShowEmployeeCard(false);
            setShowFireModal(true);
          }}
          employeeId={selectedEmployee.id}
        />
      )}

      {showEmployeeCard && loadingDetails && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-lg)', padding: 'var(--spacing-xl)' }}>
            <div>Loading employee details...</div>
          </div>
        </div>
      )}
    </div>
  );
};

const EmployeeRow = ({
  employee,
  onViewDetails,
  onEditRole,
  onFire,
  onViewProfile,
  onMessage,
  onViewCalendar
}) => {
  const [showMenu, setShowMenu] = React.useState(false);

  return (
    <div style={{ backgroundColor: 'var(--white)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--grey-2)', overflow: 'hidden' }}>
      <div style={{ padding: 'var(--spacing-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', flex: 1 }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary-color-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)', fontWeight: 'bold', fontSize: 'var(--font-size-large)' }}>
            {employee.photoURL ? (
              <img src={employee.photoURL} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              (employee.firstName?.[0] || employee.email[0] || 'U').toUpperCase()
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <strong style={{ fontSize: 'var(--font-size-medium)' }}>
                {employee.firstName} {employee.lastName}
              </strong>
              {employee.isAdmin && (
                <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: 'var(--purple-1)', color: 'var(--purple-4)', borderRadius: '10px', fontWeight: 'bold' }}>
                  ADMIN
                </span>
              )}
            </div>
            <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-light-color)' }}>
              {employee.email}
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
              {employee.roles?.map((role) => (
                <span
                  key={role}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    backgroundColor: 'var(--blue-1)',
                    color: 'var(--blue-4)',
                    fontWeight: '500'
                  }}
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
          <button
            onClick={onViewProfile}
            style={{ padding: '8px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--grey-2)', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="View Profile"
          >
            <User size={16} />
          </button>
          <button
            onClick={onMessage}
            style={{ padding: '8px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--grey-2)', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Message"
          >
            <MessageSquare size={16} />
          </button>
          <button
            onClick={onViewCalendar}
            style={{ padding: '8px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--grey-2)', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="View Calendar"
          >
            <Calendar size={16} />
          </button>
          <button
            onClick={onViewDetails}
            style={{ padding: '8px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--grey-2)', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="View Details"
          >
            <User size={16} />
          </button>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              style={{ padding: '8px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--grey-2)', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <MoreVertical size={16} />
            </button>
            {showMenu && (
              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', backgroundColor: 'var(--white)', border: '1px solid var(--grey-2)', borderRadius: 'var(--border-radius-sm)', boxShadow: 'var(--shadow-md)', zIndex: 10, minWidth: '150px' }}>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEditRole();
                  }}
                  style={{ width: '100%', padding: '8px 12px', textAlign: 'left', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                >
                  <Edit size={14} />
                  Edit Role
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onFire();
                  }}
                  style={{ width: '100%', padding: '8px 12px', textAlign: 'left', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', color: 'var(--red-4)' }}
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AddEmployeeModal = ({ email, role, rights, onEmailChange, onRoleChange, onRightsChange, onClose, onSave, isProcessing, availableRoles, availablePermissions }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-lg)' }}>
      <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-lg)', padding: 'var(--spacing-xl)', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
          <h2 style={{ fontSize: 'var(--font-size-xlarge)', fontWeight: 'bold' }}>Add Employee</h2>
          <button onClick={onClose} style={{ padding: '4px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <PersonnalizedInputField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="employee@example.com"
          />
          <DropdownField
            label="Role"
            options={availableRoles.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))}
            value={role}
            onChange={onRoleChange}
          />
          <div>
            <label style={{ fontSize: 'var(--font-size-small)', fontWeight: 'medium', marginBottom: 'var(--spacing-xs)', display: 'block' }}>
              Permissions
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', maxHeight: '200px', overflow: 'auto', border: '1px solid var(--grey-2)', borderRadius: 'var(--border-radius-sm)', padding: 'var(--spacing-sm)' }}>
              {availablePermissions.map(permission => (
                <label key={permission} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rights.includes(permission)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onRightsChange([...rights, permission]);
                      } else {
                        onRightsChange(rights.filter(r => r !== permission));
                      }
                    }}
                  />
                  <span style={{ fontSize: 'var(--font-size-small)' }}>{permission.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end', marginTop: 'var(--spacing-xl)' }}>
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button onClick={onSave} variant="confirmation" disabled={isProcessing}>
            {isProcessing ? 'Adding...' : 'Add Employee'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const FireEmployeeModal = ({ employee, confirmText, onConfirmTextChange, onClose, onConfirm, isProcessing }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-lg)' }}>
      <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-lg)', padding: 'var(--spacing-xl)', width: '100%', maxWidth: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
          <h2 style={{ fontSize: 'var(--font-size-xlarge)', fontWeight: 'bold' }}>Remove Employee</h2>
          <button onClick={onClose} style={{ padding: '4px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        <p style={{ marginBottom: 'var(--spacing-md)' }}>
          Are you sure you want to remove <strong>{employee.firstName} {employee.lastName}</strong> from the facility?
        </p>
        <PersonnalizedInputField
          label="Type 'REMOVE EMPLOYEE' to confirm"
          value={confirmText}
          onChange={(e) => onConfirmTextChange(e.target.value)}
          placeholder="REMOVE EMPLOYEE"
        />
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end', marginTop: 'var(--spacing-xl)' }}>
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button
            onClick={onConfirm}
            variant="destructive"
            disabled={isProcessing || confirmText !== 'REMOVE EMPLOYEE'}
          >
            {isProcessing ? 'Removing...' : 'Remove Employee'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const RoleManagementModal = ({ employee, currentRoles, currentRights, onClose, onSave, isProcessing, availableRoles, availablePermissions, customRoles }) => {
  const [selectedRoles, setSelectedRoles] = useState(currentRoles);
  const [selectedRights, setSelectedRights] = useState(currentRights);

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-lg)' }}>
      <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-lg)', padding: 'var(--spacing-xl)', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
          <h2 style={{ fontSize: 'var(--font-size-xlarge)', fontWeight: 'bold' }}>
            Manage Role: {employee.firstName} {employee.lastName}
          </h2>
          <button onClick={onClose} style={{ padding: '4px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div>
            <label style={{ fontSize: 'var(--font-size-small)', fontWeight: 'medium', marginBottom: 'var(--spacing-xs)', display: 'block' }}>
              Roles
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              {availableRoles.map(role => (
                <label key={role} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRoles([...selectedRoles, role]);
                      } else {
                        setSelectedRoles(selectedRoles.filter(r => r !== role));
                      }
                    }}
                  />
                  <span style={{ fontSize: 'var(--font-size-small)' }}>{role.charAt(0).toUpperCase() + role.slice(1)}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 'var(--font-size-small)', fontWeight: 'medium', marginBottom: 'var(--spacing-xs)', display: 'block' }}>
              Permissions
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', maxHeight: '200px', overflow: 'auto', border: '1px solid var(--grey-2)', borderRadius: 'var(--border-radius-sm)', padding: 'var(--spacing-sm)' }}>
              {availablePermissions.map(permission => (
                <label key={permission} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedRights.includes(permission)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRights([...selectedRights, permission]);
                      } else {
                        setSelectedRights(selectedRights.filter(r => r !== permission));
                      }
                    }}
                  />
                  <span style={{ fontSize: 'var(--font-size-small)' }}>{permission.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end', marginTop: 'var(--spacing-xl)' }}>
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button onClick={() => onSave(selectedRoles, selectedRights)} variant="confirmation" disabled={isProcessing}>
            {isProcessing ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const RoleDefinitionModal = ({ customRoles, onClose, onCreate, onUpdate, isProcessing, availablePermissions }) => {
  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [editingRole, setEditingRole] = useState(null);

  const handleSave = () => {
    if (editingRole) {
      onUpdate(editingRole.id, selectedPermissions);
    } else {
      onCreate(roleName, selectedPermissions);
    }
    setRoleName('');
    setSelectedPermissions([]);
    setEditingRole(null);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-lg)' }}>
      <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-lg)', padding: 'var(--spacing-xl)', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
          <h2 style={{ fontSize: 'var(--font-size-xlarge)', fontWeight: 'bold' }}>Manage Roles</h2>
          <button onClick={onClose} style={{ padding: '4px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          <div>
            <h3 style={{ fontSize: 'var(--font-size-large)', marginBottom: 'var(--spacing-md)' }}>Custom Roles</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {customRoles.map(role => (
                <div key={role.id} style={{ padding: 'var(--spacing-md)', border: '1px solid var(--grey-2)', borderRadius: 'var(--border-radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{role.name}</div>
                    <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-light-color)' }}>
                      {role.permissions?.length || 0} permissions
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingRole(role);
                      setRoleName(role.name);
                      setSelectedPermissions(role.permissions || []);
                    }}
                    variant="ghost"
                    style={{ fontSize: 'var(--font-size-small)' }}
                  >
                    Edit
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: 'var(--font-size-large)', marginBottom: 'var(--spacing-md)' }}>
              {editingRole ? 'Edit Role' : 'Create New Role'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <PersonnalizedInputField
                label="Role Name"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="e.g., Manager"
                disabled={!!editingRole}
              />
              <div>
                <label style={{ fontSize: 'var(--font-size-small)', fontWeight: 'medium', marginBottom: 'var(--spacing-xs)', display: 'block' }}>
                  Permissions
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', maxHeight: '300px', overflow: 'auto', border: '1px solid var(--grey-2)', borderRadius: 'var(--border-radius-sm)', padding: 'var(--spacing-sm)' }}>
                  {availablePermissions.map(permission => (
                    <label key={permission} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(permission)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPermissions([...selectedPermissions, permission]);
                          } else {
                            setSelectedPermissions(selectedPermissions.filter(p => p !== permission));
                          }
                        }}
                      />
                      <span style={{ fontSize: 'var(--font-size-small)' }}>{permission.replace(/_/g, ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end' }}>
                {editingRole && (
                  <Button
                    onClick={() => {
                      setEditingRole(null);
                      setRoleName('');
                      setSelectedPermissions([]);
                    }}
                    variant="ghost"
                  >
                    Cancel Edit
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  variant="confirmation"
                  disabled={isProcessing || !roleName.trim()}
                >
                  {isProcessing ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacilityEmployeeManagement;

