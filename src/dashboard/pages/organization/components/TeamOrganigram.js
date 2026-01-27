import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../../../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import { useDashboard } from '../../../contexts/DashboardContext';
import { buildDashboardUrl, getWorkspaceIdForUrl } from '../../../utils/pathUtils';
import { FiUsers, FiShield, FiUser, FiSearch, FiBriefcase } from 'react-icons/fi';
import { cn } from '../../../../utils/cn';
import EmployeeCard from './EmployeeCard';

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
  const [facilityData, setFacilityData] = useState(null);
  const [roles, setRoles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);

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
    fetchFacilityData();
  }, [fetchFacilityData]);

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
    if (!searchQuery.trim()) {
      return roles;
    }

    const query = searchQuery.toLowerCase().trim();
    return roles.map(role => ({
      ...role,
      assignedEmployees: role.assignedEmployees.filter(employee =>
        employee.firstName?.toLowerCase().includes(query) ||
        employee.lastName?.toLowerCase().includes(query) ||
        employee.email?.toLowerCase().includes(query) ||
        `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(query)
      )
    })).filter(role => role.assignedEmployees.length > 0);
  }, [roles, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-logo-1)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FiBriefcase className="w-5 h-5 text-primary" />
            {t('organization:organigram.roles', 'Roles & Team Structure')}
          </h3>
        </div>
        <div className="pt-3 border-t border-border mb-4">
          <p className="text-sm text-muted-foreground">
            {t('organization:organigram.description', 'View your team organized by roles. Click on any employee to see details.')}
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

      {filteredRoles.length === 0 ? (
        <div className="text-center py-16">
          <FiUsers className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            {searchQuery ? t('organization:directory.emptyState', 'No employees found') : t('organization:organigram.empty', 'No roles defined yet')}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredRoles.map((role, roleIndex) => (
            <div key={role.id} className="relative">
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div
                  className="flex items-center gap-4 p-4 rounded-lg mb-6"
                  style={{
                    backgroundColor: role.color1 || 'var(--background-div-color)',
                    borderColor: role.color || 'var(--border)',
                    borderWidth: '2px',
                    borderStyle: 'solid'
                  }}
                >
                  <div
                    className="p-3 rounded-lg shrink-0"
                    style={{ backgroundColor: role.color || 'var(--color-logo-1)' }}
                  >
                    {role.workerType === 'admin' ? (
                      <FiShield className="w-6 h-6 text-white" />
                    ) : (
                      <FiBriefcase className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3
                      className="text-xl font-semibold mb-1"
                      style={{ color: role.color || 'var(--color-logo-1)' }}
                    >
                      {role.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {role.assignedEmployees.length} {role.assignedEmployees.length === 1 ? t('organization:organigram.member', 'member') : t('organization:organigram.members', 'members')}
                      {role.quantity > 1 && ` • ${t('organization:organigram.required', 'Required')}: ${role.quantity}`}
                    </p>
                  </div>
                </div>

                {role.assignedEmployees.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {role.assignedEmployees.map((employee) => {
                      const isSelected = selectedEmployee?.uid === employee.uid;
                      const fullName = `${employee.firstName} ${employee.lastName}`.trim() || 'Unknown';
                      return (
                        <button
                          key={employee.uid}
                          onClick={() => handleEmployeeClick(employee)}
                          className={cn(
                            "bg-card rounded-xl border p-4 shadow-md transition-all text-left",
                            "hover:shadow-lg hover:scale-[1.02]",
                            isSelected && "ring-2 ring-offset-2",
                            "focus:outline-none focus:ring-2 focus:ring-offset-2"
                          )}
                          style={{
                            borderLeftWidth: '4px',
                            borderLeftColor: employee.color || role.color || 'var(--color-logo-1)',
                            ...(isSelected && {
                              ringColor: employee.color || role.color || 'var(--color-logo-1)',
                              borderColor: employee.color || role.color || 'var(--color-logo-1)'
                            })
                          }}
                        >
                          <div className="flex items-center gap-3">
                            {employee.photoURL ? (
                              <img
                                src={employee.photoURL}
                                alt={fullName}
                                className="w-12 h-12 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div
                                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold shrink-0"
                                style={{ backgroundColor: employee.color || role.color || 'var(--color-logo-1)' }}
                              >
                                {employee.firstName?.[0]?.toUpperCase() || employee.lastName?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm truncate">
                                  {fullName}
                                </p>
                                {employee.isAdmin && (
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
                                {employee.email}
                              </p>
                              {employee.experienceYears > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {employee.experienceYears} {employee.experienceYears === 1 ? t('organization:organigram.year', 'year') : t('organization:organigram.years', 'years')} {t('organization:organigram.experience', 'experience')}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {t('organization:organigram.noEmployeesInRole', 'No employees assigned to this role')}
                  </div>
                )}
              </div>

              {roleIndex < filteredRoles.length - 1 && (
                <div className="flex justify-center my-4">
                  <div className="w-0.5 h-8 bg-border" />
                </div>
              )}
            </div>
          ))}
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
  );
};

export default TeamOrganigram;

