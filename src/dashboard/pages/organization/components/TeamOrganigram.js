import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../../../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import { useDashboard } from '../../../contexts/DashboardContext';
import { buildDashboardUrl, getWorkspaceIdForUrl } from '../../../utils/pathUtils';
import { FiUsers, FiShield, FiUser, FiSearch, FiBriefcase, FiGrid, FiLayers } from 'react-icons/fi';
import { cn } from '../../../../utils/cn';
import EmployeeCard from './EmployeeCard';
import FilterBar from '../../../components/FilterBar/FilterBar';
import TeamOrganigramFlow from './TeamOrganigramFlow';

const ROLE_HIERARCHY = {
  'admin': 0,
  'pharmacist': 1,
  'pharmacy_technician': 2,
  'intern': 3,
  'other': 4,
  'unassigned': 5
};

const TeamOrganigram = () => {
  const { t } = useTranslation(['organization', 'dashboardProfile', 'common']);
  const { selectedWorkspace } = useDashboard();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isOrganizationWorkspace = selectedWorkspace?.type === 'organization';
  
  console.log('TeamOrganigram - Workspace Info:', {
    selectedWorkspace,
    type: selectedWorkspace?.type,
    isOrganizationWorkspace,
    facilityId: selectedWorkspace?.facilityId,
    organizationId: selectedWorkspace?.organizationId
  });
  const [facilityData, setFacilityData] = useState(null);
  const [roles, setRoles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);
  const [filters, setFilters] = useState({
    role: 'all',
    fromDate: '',
    toDate: ''
  });
  const [sortBy, setSortBy] = useState('level');
  const [viewMode, setViewMode] = useState('both');
  const [organizationData, setOrganizationData] = useState(null);
  const [floatPoolEmployees, setFloatPoolEmployees] = useState([]);
  const [facilityManagers, setFacilityManagers] = useState([]);
  const [organizationAdmins, setOrganizationAdmins] = useState([]);

  const fetchOrganizationData = useCallback(async () => {
    if (!isOrganizationWorkspace || !selectedWorkspace?.organizationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const orgRef = doc(db, FIRESTORE_COLLECTIONS.ORGANIZATIONS, selectedWorkspace.organizationId);
      const orgSnap = await getDoc(orgRef);

      if (orgSnap.exists()) {
        const orgData = orgSnap.data();
        setOrganizationData(orgData);

        const sharedTeam = orgData.sharedTeam || {};
        const internalTeam = orgData.internalTeam || {};
        const orgAdmins = internalTeam.admins || [];

        const allOrgMemberIds = new Set();
        (sharedTeam.employees || []).forEach(emp => {
          if (emp.user_uid || emp.uid) {
            allOrgMemberIds.add(emp.user_uid || emp.uid);
          }
        });
        (internalTeam.employees || []).forEach(emp => {
          if (emp.user_uid || emp.uid) {
            allOrgMemberIds.add(emp.user_uid || emp.uid);
          }
        });
        orgAdmins.forEach(adminId => allOrgMemberIds.add(adminId));

        const employeePromises = Array.from(allOrgMemberIds).map(async (userId) => {
          try {
            const professionalRef = doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, userId);
            const professionalSnap = await getDoc(professionalRef);

            if (professionalSnap.exists()) {
              const professionalData = professionalSnap.data();
              const identity = professionalData.identity || {};
              return {
                uid: userId,
                firstName: identity.legalFirstName || identity.firstName || '',
                lastName: identity.legalLastName || identity.lastName || '',
                email: professionalData.contact?.primaryEmail || '',
                phone: professionalData.contact?.primaryPhone || '',
                photoURL: professionalData.profileDisplay?.profilePictureUrl || '',
                isOrgAdmin: orgAdmins.includes(userId),
                profileType: professionalData.profileType || ''
              };
            }

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
                isOrgAdmin: orgAdmins.includes(userId),
                profileType: ''
              };
            }

            return null;
          } catch (error) {
            console.error(`Error fetching profile for user ${userId}:`, error);
            return null;
          }
        });

        const fetchedEmployees = (await Promise.all(employeePromises)).filter(Boolean);
        
        const floatPoolEmps = (sharedTeam.employees || []).map(emp => {
          const employee = fetchedEmployees.find(e => e.uid === (emp.user_uid || emp.uid));
          return employee ? {
            ...employee,
            facilities: emp.facilities || [],
            roles: emp.roles || []
          } : null;
        }).filter(Boolean);

        setFloatPoolEmployees(floatPoolEmps);
        setOrganizationAdmins(fetchedEmployees.filter(emp => emp.isOrgAdmin));

        const facilities = orgData.facilities || {};
        const facilityManagerIds = new Set();
        Object.values(facilities).forEach(facility => {
          if (facility.roles?.includes('facility_manager')) {
            const facilityData = facility;
            const managerIds = facilityData.admins || [];
            managerIds.forEach(id => facilityManagerIds.add(id));
          }
        });

        const facilityManagerPromises = Array.from(facilityManagerIds).map(async (userId) => {
          try {
            const professionalRef = doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, userId);
            const professionalSnap = await getDoc(professionalRef);

            if (professionalSnap.exists()) {
              const professionalData = professionalSnap.data();
              const identity = professionalData.identity || {};
              return {
                uid: userId,
                firstName: identity.legalFirstName || identity.firstName || '',
                lastName: identity.legalLastName || identity.lastName || '',
                email: professionalData.contact?.primaryEmail || '',
                photoURL: professionalData.profileDisplay?.profilePictureUrl || ''
              };
            }

            const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
              const userData = userSnap.data();
              return {
                uid: userId,
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                email: userData.email || '',
                photoURL: userData.photoURL || ''
              };
            }

            return null;
          } catch (error) {
            console.error(`Error fetching facility manager ${userId}:`, error);
            return null;
          }
        });

        const managers = (await Promise.all(facilityManagerPromises)).filter(Boolean);
        setFacilityManagers(managers);
      }
    } catch (error) {
      console.error('Error fetching organization data:', error);
    } finally {
      setLoading(false);
    }
  }, [isOrganizationWorkspace, selectedWorkspace?.organizationId]);

  const fetchFacilityData = useCallback(async () => {
    if (!selectedWorkspace?.facilityId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, selectedWorkspace.facilityId);
      const facilitySnap = await getDoc(facilityRef);

      if (facilitySnap.exists()) {
        const data = facilitySnap.data();
        setFacilityData(data);

        const workerRequirements = data.operationalSettings?.workerRequirements || [];
        const employeesList = data.employees || [];
        const admins = data.admins || [];

        const allMemberIds = new Set();
        employeesList.forEach(emp => {
          if (emp.user_uid || emp.uid) {
            allMemberIds.add(emp.user_uid || emp.uid);
          }
        });
        admins.forEach(adminId => allMemberIds.add(adminId));

        const employeePromises = Array.from(allMemberIds).map(async (userId) => {
          try {
            const professionalRef = doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, userId);
            const professionalSnap = await getDoc(professionalRef);

            if (professionalSnap.exists()) {
              const professionalData = professionalSnap.data();
              const identity = professionalData.identity || {};
              return {
                uid: userId,
                firstName: identity.legalFirstName || identity.firstName || '',
                lastName: identity.legalLastName || identity.lastName || '',
                email: professionalData.contact?.primaryEmail || '',
                phone: professionalData.contact?.primaryPhone || '',
                photoURL: professionalData.profileDisplay?.profilePictureUrl || '',
                isAdmin: admins.includes(userId),
                profileType: professionalData.profileType || '',
                experienceYears: professionalData.profileDisplay?.experienceYears || 0
              };
            }

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

        const fetchedEmployees = (await Promise.all(employeePromises)).filter(Boolean);
        setEmployees(fetchedEmployees);

        const assignedEmployeeIds = new Set();
        const processedRoles = workerRequirements.map(requirement => {
          const workerType = requirement.workerType === 'other'
            ? requirement.workerTypeOther
            : requirement.workerType;

          const assignedWorkers = (requirement.assignedWorkers || [])
            .filter(worker => worker.workerId && worker.workerId !== 'placeholder')
            .map(worker => {
              const employee = fetchedEmployees.find(emp => emp.uid === worker.workerId);
              if (employee) {
                assignedEmployeeIds.add(employee.uid);
                return {
                  ...employee,
                  color: worker.color || requirement.color || 'var(--color-logo-1)',
                  color1: worker.color1 || requirement.color1 || 'rgba(37, 99, 235, 0.1)'
                };
              }
              return null;
            })
            .filter(Boolean);

          return {
            id: requirement.id,
            workerType,
            title: workerType === 'unassigned'
              ? t('organization:organigram.unassigned', 'Unassigned')
              : workerType === 'other'
                ? workerType
                : t(`dashboardProfile:operations.workerTypes.${workerType}`, workerType),
            level: ROLE_HIERARCHY[workerType] ?? ROLE_HIERARCHY['other'],
            color: requirement.color || 'var(--color-logo-1)',
            color1: requirement.color1 || 'rgba(37, 99, 235, 0.1)',
            assignedEmployees: assignedWorkers,
            quantity: requirement.quantity || 1
          };
        }).sort((a, b) => a.level - b.level);

        const adminEmployees = fetchedEmployees.filter(emp => emp.isAdmin);
        adminEmployees.forEach(emp => assignedEmployeeIds.add(emp.uid));

        const unassignedEmployees = fetchedEmployees.filter(emp => 
          !emp.isAdmin && !assignedEmployeeIds.has(emp.uid)
        );

        const adminRole = {
          id: 'admin',
          workerType: 'admin',
          title: t('organization:organigram.admins', 'Administrators'),
          level: ROLE_HIERARCHY['admin'],
          color: 'var(--color-logo-1)',
          color1: 'rgba(37, 99, 235, 0.1)',
          assignedEmployees: adminEmployees.map(emp => ({
            ...emp,
            color: 'var(--color-logo-1)',
            color1: 'rgba(37, 99, 235, 0.1)'
          })),
          quantity: adminEmployees.length
        };

        const allRoles = [];
        if (adminRole.assignedEmployees.length > 0) {
          allRoles.push(adminRole);
        }
        allRoles.push(...processedRoles);

        if (unassignedEmployees.length > 0) {
          const unassignedRole = {
            id: 'unassigned',
            workerType: 'unassigned',
            title: t('organization:organigram.unassigned', 'Unassigned'),
            level: ROLE_HIERARCHY['unassigned'],
            color: '#64748b',
            color1: 'rgba(100, 116, 139, 0.1)',
            assignedEmployees: unassignedEmployees.map(emp => ({
              ...emp,
              color: '#64748b',
              color1: 'rgba(100, 116, 139, 0.1)'
            })),
            quantity: unassignedEmployees.length
          };
          allRoles.push(unassignedRole);
        }

        setRoles(allRoles);

        if (auth?.currentUser) {
          setViewerIsAdmin(admins.includes(auth.currentUser.uid));
        }
      }
    } catch (error) {
      console.error('Error fetching facility data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedWorkspace?.facilityId, t]);

  useEffect(() => {
    if (isOrganizationWorkspace) {
      fetchOrganizationData();
    } else {
      fetchFacilityData();
    }
  }, [isOrganizationWorkspace, fetchOrganizationData, fetchFacilityData]);

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
          profileType: professionalData.profileType || '',
          identity: professionalData.identity || {},
          contact: professionalData.contact || {},
          profileDisplay: professionalData.profileDisplay || {},
          pharmacyLicense: professionalData.pharmacyLicense || {},
          contract: professionalData.contract || {},
          operational: professionalData.operational || {}
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
            photoURL: userData.photoURL || ''
          };
        }
      }

      setEmployeeDetails(details);
    } catch (error) {
      console.error('Error fetching employee details:', error);
    } finally {
      setLoadingDetails(false);
    }
  }, [selectedWorkspace?.facilityId]);

  useEffect(() => {
    const employeeId = searchParams.get('employee');
    if (employeeId) {
      const allEmployees = roles.flatMap(role => role.assignedEmployees);
      const employee = allEmployees.find(emp => emp.uid === employeeId);
      if (employee && (!selectedEmployee || selectedEmployee.uid !== employeeId)) {
        setSelectedEmployee(employee);
        fetchEmployeeDetails(employeeId);
      } else if (!employee && selectedEmployee) {
        setSelectedEmployee(null);
        setEmployeeDetails(null);
      }
    } else if (!employeeId && selectedEmployee) {
      setSelectedEmployee(null);
      setEmployeeDetails(null);
    }
  }, [searchParams, roles, selectedEmployee, fetchEmployeeDetails]);

  const handleEmployeeClick = useCallback((employee) => {
    setSelectedEmployee(employee);
    fetchEmployeeDetails(employee.uid);
    
    const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);
    const basePath = location.pathname.includes('/organization/') ? 'organization' : 'facility';
    const newUrl = buildDashboardUrl(`/${basePath}/team?employee=${employee.uid}`, workspaceId);
    navigate(newUrl, { replace: true });
  }, [fetchEmployeeDetails, selectedWorkspace, location.pathname, navigate]);

  const handleCloseDetails = useCallback(() => {
    setSelectedEmployee(null);
    setEmployeeDetails(null);
    
    const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);
    const basePath = location.pathname.includes('/organization/') ? 'organization' : 'facility';
    const newUrl = buildDashboardUrl(`/${basePath}/team`, workspaceId);
    navigate(newUrl, { replace: true });
  }, [selectedWorkspace, location.pathname, navigate]);

  const filteredRoles = useMemo(() => {
    let filtered = roles;

    if (filters.role && filters.role !== 'all') {
      filtered = filtered.filter(role => role.workerType === filters.role);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.map(role => ({
        ...role,
        assignedEmployees: role.assignedEmployees.filter(employee =>
          employee.firstName?.toLowerCase().includes(query) ||
          employee.lastName?.toLowerCase().includes(query) ||
          employee.email?.toLowerCase().includes(query) ||
          `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(query)
        )
      })).filter(role => role.assignedEmployees.length > 0);
    }

    if (sortBy === 'level') {
      filtered = [...filtered].sort((a, b) => a.level - b.level);
    } else if (sortBy === 'name') {
      filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'count') {
      filtered = [...filtered].sort((a, b) => b.assignedEmployees.length - a.assignedEmployees.length);
    }

    return filtered;
  }, [roles, searchQuery, filters, sortBy]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleApplyFilters = useCallback(() => {
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({ role: 'all', fromDate: '', toDate: '' });
    setSearchQuery('');
  }, []);

  const handleRefresh = useCallback(() => {
    if (isOrganizationWorkspace) {
      fetchOrganizationData();
    } else {
      fetchFacilityData();
    }
  }, [isOrganizationWorkspace, fetchOrganizationData, fetchFacilityData]);

  const roleFilterOptions = useMemo(() => {
    return roles.map(role => ({
      value: role.workerType,
      label: role.title
    }));
  }, [roles]);

  if (loading) {
    console.log('TeamOrganigram - LOADING STATE');
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-logo-1)' }} />
      </div>
    );
  }

  console.log('TeamOrganigram - RENDERING MAIN:', {
    loading,
    isOrganizationWorkspace,
    filteredRolesLength: filteredRoles.length,
    rolesLength: roles.length,
    employeesLength: employees.length,
    organizationAdminsLength: organizationAdmins.length,
    facilityManagersLength: facilityManagers.length,
    floatPoolEmployeesLength: floatPoolEmployees.length
  });

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="space-y-6 max-w-full">
        <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('organization:directory.searchPlaceholder', 'Search employees...')}
        dropdownFields={[
          {
            key: 'role',
            label: t('organization:organigram.filterByRole', 'Filter by Role'),
            options: [
              { value: 'all', label: t('common:all', 'All') },
              ...roleFilterOptions
            ],
            defaultValue: 'all'
          }
        ]}
        dateFields={[
          {
            key: 'fromDate',
            label: t('organization:organigram.fromDate', 'From Date'),
            showClearButton: true
          },
          {
            key: 'toDate',
            label: t('organization:organigram.toDate', 'To Date'),
            showClearButton: true
          }
        ]}
        sortOptions={[
          { value: 'level', label: t('organization:organigram.sort.level', 'Hierarchy') },
          { value: 'name', label: t('organization:organigram.sort.name', 'Name') },
          { value: 'count', label: t('organization:organigram.sort.count', 'Employee Count') }
        ]}
        sortValue={sortBy}
        onSortChange={setSortBy}
        title={t('organization:organigram.roles', 'Roles & Team Structure')}
        description={t('organization:organigram.description', 'View your team organized by roles. Click on any employee to see details.')}
        onRefresh={handleRefresh}
        isLoading={loading}
        translationNamespace="organization"
      />

      {!isOrganizationWorkspace && (
        <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-lg">
          <span className="text-sm font-medium text-foreground">{t('organization:organigram.viewMode', 'View Mode')}:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('roles')}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg transition-colors",
                viewMode === 'roles'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <FiUsers className="inline w-4 h-4 mr-1.5" />
              {t('organization:organigram.viewByRole', 'By Role')}
            </button>
            <button
              onClick={() => setViewMode('admin')}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg transition-colors",
                viewMode === 'admin'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <FiShield className="inline w-4 h-4 mr-1.5" />
              {t('organization:organigram.viewByAdmin', 'By Admin Rights')}
            </button>
            <button
              onClick={() => setViewMode('both')}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg transition-colors",
                viewMode === 'both'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <FiGrid className="inline w-4 h-4 mr-1.5" />
              {t('organization:organigram.viewBoth', 'Both')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-logo-1)' }} />
        </div>
      ) : isOrganizationWorkspace ? (
        <div className="space-y-6 w-full max-w-full">
          {console.log('TeamOrganigram - Rendering: ORGANIZATION layout')}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
            <div className="lg:col-span-2">
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FiShield className="w-5 h-5 text-primary" />
                  {t('organization:organigram.orgAdmins', 'Organization Administrators')}
                </h3>
                {organizationAdmins.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {organizationAdmins.map(admin => (
                      <div
                        key={admin.uid}
                        onClick={() => handleEmployeeClick(admin)}
                        className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg cursor-pointer hover:bg-primary/20 transition-colors"
                      >
                        {admin.photoURL ? (
                          <img src={admin.photoURL} alt={`${admin.firstName} ${admin.lastName}`} className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                            {admin.firstName?.[0] || admin.lastName?.[0] || '?'}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-sm">{admin.firstName} {admin.lastName}</div>
                          <div className="text-xs text-muted-foreground">{admin.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">{t('organization:organigram.noOrgAdmins', 'No organization administrators')}</p>
                )}
              </div>

              <div className="bg-card border border-border rounded-xl p-6 mt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FiUsers className="w-5 h-5 text-primary" />
                  {t('organization:organigram.facilityManagers', 'Facility Managers')}
                </h3>
                {facilityManagers.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {facilityManagers.map(manager => (
                      <div
                        key={manager.uid}
                        onClick={() => handleEmployeeClick(manager)}
                        className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                      >
                        {manager.photoURL ? (
                          <img src={manager.photoURL} alt={`${manager.firstName} ${manager.lastName}`} className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground font-semibold">
                            {manager.firstName?.[0] || manager.lastName?.[0] || '?'}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-sm">{manager.firstName} {manager.lastName}</div>
                          <div className="text-xs text-muted-foreground">{manager.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">{t('organization:organigram.noFacilityManagers', 'No facility managers')}</p>
                )}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-xl p-6 sticky top-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FiLayers className="w-5 h-5 text-primary" />
                  {t('organization:organigram.floatPool', 'Float Pool')}
                </h3>
                {floatPoolEmployees.length > 0 ? (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {floatPoolEmployees.map(emp => (
                      <div
                        key={emp.uid}
                        onClick={() => handleEmployeeClick(emp)}
                        className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        {emp.photoURL ? (
                          <img src={emp.photoURL} alt={`${emp.firstName} ${emp.lastName}`} className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold">
                            {emp.firstName?.[0] || emp.lastName?.[0] || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{emp.firstName} {emp.lastName}</div>
                          {emp.facilities && emp.facilities.length > 0 && (
                            <div className="text-xs text-muted-foreground">{emp.facilities.length} {t('organization:organigram.facilities', 'facilities')}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">{t('organization:organigram.noFloatPool', 'No float pool employees')}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : filteredRoles.length === 0 ? (
        <>
          {console.log('TeamOrganigram - Rendering: EMPTY STATE')}
          <div className="text-center py-16">
            <FiUsers className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {searchQuery ? t('organization:directory.emptyState', 'No employees found') : t('organization:organigram.empty', 'No roles defined yet')}
            </p>
          </div>
        </>
      ) : (
        <>
          {console.log('TeamOrganigram - Rendering: DIAGRAM', {
            filteredRolesCount: filteredRoles.length,
            employeesCount: employees.length,
            viewMode,
            roles: filteredRoles.map(r => ({
              id: r.id,
              title: r.title,
              employeesCount: r.assignedEmployees?.length || 0
            }))
          })}
          <TeamOrganigramFlow
            roles={filteredRoles}
            employees={employees}
            viewMode={viewMode}
          />
        </>
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
              fte: employeeDetails.contract?.fte,
              contractType: employeeDetails.contract?.contractType,
              startDate: employeeDetails.contract?.startDate,
              endDate: employeeDetails.contract?.endDate,
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
          }}
          isEditable={true}
          viewerIsAdmin={viewerIsAdmin}
          hrMetrics={null}
          onFireEmployee={null}
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
      </div>
    </div>
  );
};

export default TeamOrganigram;

