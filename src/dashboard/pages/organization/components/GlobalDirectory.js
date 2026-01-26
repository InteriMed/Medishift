import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import { FiSearch, FiBriefcase, FiX, FiSliders, FiFilter, FiCheck } from 'react-icons/fi';
import EmployeePopup from './EmployeePopup';
import { cn } from '../../../../utils/cn';
import SimpleDropdown from '../../../../components/BoxedInputFields/Dropdown-Field';
import DateField from '../../../../components/BoxedInputFields/DateField';

const GlobalDirectory = ({ organization, memberFacilities = [] }) => {
    const { t } = useTranslation(['organization', 'common']);
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState('');
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [facilityFilter, setFacilityFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
    const [justExpanded, setJustExpanded] = useState(false);

    const loadEmployees = useCallback(async () => {
        setLoading(true);
        try {
            const allEmployees = [];
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

                                allEmployees.push({
                                    id: userId,
                                    email: userData.email || '',
                                    firstName: userData.firstName || userData.identity?.firstName || '',
                                    lastName: userData.lastName || userData.identity?.lastName || '',
                                    photoURL: userData.photoURL || userData.profileDisplay?.profilePictureUrl || '',
                                    roles: roles,
                                    isAdmin: isAdmin,
                                    rights: emp.rights || [],
                                    facilityId: facilityId,
                                    facilityName: facility.facilityName || facility.companyName || 'Unknown Facility',
                                    hireDate: emp.hireDate?.toDate?.() || emp.hireDate || null,
                                    contractId: emp.contractId || null,
                                    status: emp.status || 'active'
                                });
                            } catch (error) {
                                console.error(`Error loading employee ${userId}:`, error);
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error loading facility ${facilityId}:`, error);
                }
            }

            setEmployees(allEmployees);
        } catch (error) {
            console.error('Error loading employees:', error);
        } finally {
            setLoading(false);
        }
    }, [memberFacilities]);

    useEffect(() => {
        if (memberFacilities.length > 0) {
            loadEmployees();
        } else {
            setLoading(false);
        }
    }, [memberFacilities, loadEmployees]);

    useEffect(() => {
        const modalParam = searchParams.get('modal');
        const employeeId = searchParams.get('employeeId');
        
        if (modalParam === 'employee' && employeeId && employees.length > 0) {
            const foundEmployee = employees.find(emp => emp.id === employeeId);
            if (foundEmployee && !isPopupOpen) {
                setSelectedEmployee(foundEmployee);
                setIsPopupOpen(true);
            }
        }
    }, [searchParams, employees, isPopupOpen]);

    const handleOpenEmployeePopup = useCallback((employee) => {
        setSelectedEmployee(employee);
        setIsPopupOpen(true);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('modal', 'employee');
        if (employee?.id) {
            newParams.set('employeeId', employee.id);
        }
        setSearchParams(newParams, { replace: true });
    }, [searchParams, setSearchParams]);

    const handleCloseEmployeePopup = useCallback(() => {
        setIsPopupOpen(false);
        setSelectedEmployee(null);
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('modal');
        newParams.delete('employeeId');
        setSearchParams(newParams, { replace: true });
    }, [searchParams, setSearchParams]);

    const availableRoles = useMemo(() => {
        const rolesSet = new Set();
        employees.forEach(emp => {
            emp.roles?.forEach(role => rolesSet.add(role));
        });
        return Array.from(rolesSet).sort();
    }, [employees]);

    const filteredAndSortedEmployees = useMemo(() => {
        let filtered = employees;

        if (searchTerm.trim()) {
            const query = searchTerm.toLowerCase();
            filtered = filtered.filter(emp => {
                const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
                const email = (emp.email || '').toLowerCase();
                const facilityName = (emp.facilityName || '').toLowerCase();
                const roles = (emp.roles || []).join(' ').toLowerCase();
                return fullName.includes(query) || email.includes(query) || facilityName.includes(query) || roles.includes(query);
            });
        }

        if (facilityFilter !== 'all') {
            filtered = filtered.filter(emp => emp.facilityId === facilityFilter);
        }

        if (roleFilter !== 'all') {
            filtered = filtered.filter(emp => emp.roles?.includes(roleFilter));
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(emp => emp.status === statusFilter);
        }

        if (fromDate) {
            const fromDateObj = new Date(fromDate);
            filtered = filtered.filter(emp => {
                if (!emp.hireDate) return false;
                const hireDate = emp.hireDate instanceof Date ? emp.hireDate : new Date(emp.hireDate);
                return hireDate >= fromDateObj;
            });
        }

        if (toDate) {
            const toDateObj = new Date(toDate);
            filtered = filtered.filter(emp => {
                if (!emp.hireDate) return false;
                const hireDate = emp.hireDate instanceof Date ? emp.hireDate : new Date(emp.hireDate);
                return hireDate <= toDateObj;
            });
        }

        const sorted = [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
                    const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
                    return nameA.localeCompare(nameB);
                case 'facility':
                    return (a.facilityName || '').localeCompare(b.facilityName || '');
                case 'role':
                    const roleA = a.roles?.[0] || '';
                    const roleB = b.roles?.[0] || '';
                    return roleA.localeCompare(roleB);
                case 'status':
                    return (a.status || '').localeCompare(b.status || '');
                default:
                    return 0;
            }
        });

        return sorted;
    }, [employees, searchTerm, facilityFilter, roleFilter, statusFilter, fromDate, toDate, sortBy]);

    const hasActiveFilters = facilityFilter !== 'all' || roleFilter !== 'all' || statusFilter !== 'all' || fromDate || toDate;
    const activeFilterCount = (facilityFilter !== 'all' ? 1 : 0) + (roleFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0) + (fromDate ? 1 : 0) + (toDate ? 1 : 0);

    const clearFilters = () => {
        setFacilityFilter('all');
        setRoleFilter('all');
        setStatusFilter('all');
        setFromDate('');
        setToDate('');
    };

    const sortOptions = [
        { value: 'name', label: t('organization:directory.filters.name', 'Name') },
        { value: 'facility', label: t('organization:directory.filters.facility', 'Facility') },
        { value: 'role', label: t('organization:directory.filters.role', 'Role') },
        { value: 'status', label: t('organization:directory.filters.status', 'Status') }
    ];

    return (
        <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">
                            {t('organization:directory.title', 'Global Enterprise Directory')}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('organization:directory.subtitle', 'Search and manage employees across all facilities')}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full mb-4">
                    <div className="relative flex-1 min-w-[200px]">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t('organization:directory.searchPlaceholder', "Find a nurse, doctor, or staff member across all locations...")}
                            className="w-full pl-9 pr-8 rounded-xl border-2 border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-0 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.1)] transition-all hover:border-muted-foreground/30 hover:bg-muted/30"
                            style={{
                                height: 'var(--boxed-inputfield-height)',
                                fontWeight: '500',
                                fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
                                color: 'var(--boxed-inputfield-color-text)'
                            }}
                        />
                    </div>

                    {/* Date From */}
                    <div className="relative shrink-0 w-[218px]">
                        <DateField
                            label="From"
                            value={fromDate ? new Date(fromDate) : null}
                            onChange={(date) => setFromDate(date ? date.toISOString().split('T')[0] : '')}
                            marginBottom="0"
                            showClearButton={true}
                        />
                    </div>

                    {/* Date To */}
                    <div className="relative shrink-0 w-[218px]">
                        <DateField
                            label="To"
                            value={toDate ? new Date(toDate) : null}
                            onChange={(date) => setToDate(date ? date.toISOString().split('T')[0] : '')}
                            marginBottom="0"
                            showClearButton={true}
                        />
                    </div>

                    {/* Filter Toggle */}
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const willExpand = !isFiltersExpanded;
                            setIsFiltersExpanded(willExpand);
                            if (willExpand) {
                                setJustExpanded(true);
                                setTimeout(() => {
                                    setJustExpanded(false);
                                }, 150);
                            }
                        }}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        className={cn(
                            "flex items-center justify-center rounded-xl border-2 transition-all relative shrink-0",
                            isFiltersExpanded
                                ? "bg-[var(--color-logo-1)] border-[var(--color-logo-1)] text-white"
                                : "bg-background border-input text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                        )}
                        style={{ height: 'var(--boxed-inputfield-height)', width: 'var(--boxed-inputfield-height)' }}
                        title="Filters"
                    >
                        <FiFilter className={`w-4 h-4 ${isFiltersExpanded ? 'text-white' : ''}`} />
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    {/* Sort Button */}
                    <div className="relative shrink-0">
                        <button
                            onClick={() => setShowSortMenu(!showSortMenu)}
                            className="flex items-center justify-center rounded-xl border-2 border-input bg-background text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 transition-all relative shrink-0"
                            style={{ height: 'var(--boxed-inputfield-height)', width: 'var(--boxed-inputfield-height)' }}
                            title={t('organization:directory.sort', 'Sort')}
                        >
                            <FiSliders className="w-4 h-4" />
                        </button>
                        {showSortMenu && (
                            <>
                                <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={() => setShowSortMenu(false)}
                                />
                                <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-lg shadow-lg z-20 min-w-[160px]">
                                    {sortOptions.map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => {
                                                setSortBy(option.value);
                                                setShowSortMenu(false);
                                            }}
                                            className={cn(
                                                "w-full text-left px-4 py-2 text-sm hover:bg-muted/50 transition-colors",
                                                sortBy === option.value ? "bg-primary/10 text-primary font-medium" : "text-foreground"
                                            )}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Expanded Filters Area */}
                    {isFiltersExpanded && (
                        <div 
                            className="mt-3 pt-3 border-t border-border animate-in slide-in-from-top-1 duration-200 w-full"
                            style={{ pointerEvents: justExpanded ? 'none' : 'auto' }}
                            onClick={(e) => {
                                if (justExpanded) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    return;
                                }
                            }}
                            onMouseDown={(e) => {
                                if (justExpanded) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    return;
                                }
                            }}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-1">
                                <SimpleDropdown
                                    label={t('organization:directory.filters.facility', 'Facility')}
                                    options={[
                                        { value: 'all', label: t('organization:directory.filters.allFacilities', 'All Facilities') },
                                        ...memberFacilities.map(facility => ({
                                            value: facility.id,
                                            label: facility.facilityName || facility.companyName || t('organization:labels.unnamedFacility', 'Unnamed Facility')
                                        }))
                                    ]}
                                    value={facilityFilter}
                                    onChange={setFacilityFilter}
                                    placeholder={t('organization:directory.filters.facility', 'Facility')}
                                />
                                <SimpleDropdown
                                    label={t('organization:directory.filters.role', 'Role')}
                                    options={[
                                        { value: 'all', label: t('organization:directory.filters.allRoles', 'All Roles') },
                                        ...availableRoles.map(role => ({
                                            value: role,
                                            label: role
                                        }))
                                    ]}
                                    value={roleFilter}
                                    onChange={setRoleFilter}
                                    placeholder={t('organization:directory.filters.role', 'Role')}
                                />
                                <SimpleDropdown
                                    label={t('organization:directory.filters.status', 'Status')}
                                    options={[
                                        { value: 'all', label: t('organization:directory.filters.allStatuses', 'All Statuses') },
                                        { value: 'active', label: t('organization:directory.filters.active', 'Active') },
                                        { value: 'inactive', label: t('organization:directory.filters.inactive', 'Inactive') },
                                        { value: 'pending', label: t('organization:directory.filters.pending', 'Pending') }
                                    ]}
                                    value={statusFilter}
                                    onChange={setStatusFilter}
                                    placeholder={t('organization:directory.filters.status', 'Status')}
                                />
                            </div>
                            {hasActiveFilters && (
                                <div className="mt-3 pt-3 border-t border-border">
                                    <button
                                        onClick={clearFilters}
                                        className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
                                    >
                                        {t('organization:directory.filters.clearAll', 'Clear all filters')}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {employees.length > 0 && (
                    <p className="text-sm text-muted-foreground text-center mt-2">
                        {filteredAndSortedEmployees.length} {filteredAndSortedEmployees.length === 1 ? 'employee' : 'employees'} found
                        {searchTerm && ` matching "${searchTerm}"`}
                        {hasActiveFilters && ` (filtered)`}
                    </p>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filteredAndSortedEmployees.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                    <FiUsersIllustration className="w-24 h-24 mx-auto mb-4 opacity-20" />
                    <p>
                        {searchTerm || hasActiveFilters
                            ? t('organization:directory.noResults', 'No employees found matching your search.')
                            : t('organization:directory.emptyState', 'Enter a name or role to search across the entire organization.')
                        }
                    </p>
                    {memberFacilities.length > 0 && (
                        <p className="text-xs mt-2 opacity-60">Connected to {memberFacilities.length} {memberFacilities.length === 1 ? 'location' : 'locations'}.</p>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredAndSortedEmployees.map((employee) => (
                        <EmployeeCard 
                            key={employee.id} 
                            employee={employee}
                            viewMode="list"
                            onClick={() => handleOpenEmployeePopup(employee)}
                        />
                    ))}
                </div>
            )}

            <EmployeePopup
                employee={selectedEmployee}
                isOpen={isPopupOpen}
                onClose={handleCloseEmployeePopup}
            />
        </div>
    );
};

const EmployeeCard = ({ employee, onClick, viewMode = 'list' }) => {
    const fullName = `${employee.firstName} ${employee.lastName}`.trim() || 'Unknown';
    const initials = `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase() || '?';
    const isAdmin = employee.isAdmin;

    return (
        <div 
            className="bg-card border border-border rounded-lg p-4 hover:bg-muted/10 transition-colors cursor-pointer"
            onClick={onClick}
        >
            <div className="flex items-center gap-4">
                <div className="shrink-0">
                    {employee.photoURL ? (
                        <img 
                            src={employee.photoURL} 
                            alt={fullName}
                            className="w-12 h-12 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                            {initials}
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-foreground truncate">{fullName}</h3>
                        {isAdmin && (
                            <span className="shrink-0 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                                Admin
                            </span>
                        )}
                        <span className={cn(
                            "shrink-0 px-2 py-0.5 text-xs font-medium rounded-full",
                            employee.status === 'active' 
                                ? "bg-green-100 text-green-700"
                                : employee.status === 'inactive'
                                ? "bg-gray-100 text-gray-700"
                                : "bg-yellow-100 text-yellow-700"
                        )}>
                            {employee.status || 'active'}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mb-2">{employee.email}</p>
                    {employee.roles && employee.roles.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {employee.roles.slice(0, 3).map((role, idx) => (
                                <span 
                                    key={idx}
                                    className="px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded"
                                >
                                    {role}
                                </span>
                            ))}
                            {employee.roles.length > 3 && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded">
                                    +{employee.roles.length - 3}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const FiUsersIllustration = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

export default GlobalDirectory;
