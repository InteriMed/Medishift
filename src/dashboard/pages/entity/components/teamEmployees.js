import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useNotification } from '../../../../contexts/notificationContext';
import useEmployeesData from '../../../hooks/useEmployeesData';
import FilterBar from '../../marketplace/components/filterbar';
import { FiUser, FiUsers } from 'react-icons/fi';
import { cn } from '../../../../utils/cn';
import PropTypes from 'prop-types';
import Dialog from '../../../../components/Dialog/Dialog';
import InputField from '../../../../components/boxedInputFields/personnalizedInputField';
import SimpleDropdown from '../../../../components/boxedInputFields/dropdownField';
import { useAction } from '../../../../services/actions/hook';

const Employees = ({ hideHeader = false, hideStats = false, organization, memberFacilities: propMemberFacilities = [] }) => {
    const { t } = useTranslation(['dashboard', 'employees', 'common']);
    const { showNotification } = useNotification();
    const { execute } = useAction();
    const {
        employees,
        filteredEmployees,
        isLoading,
        error,
        filters,
        updateFilters,
        refreshEmployees,
        memberFacilities
    } = useEmployeesData({ memberFacilities: propMemberFacilities });

    const [sortBy, setSortBy] = useState('name');
    const [viewMode, setViewMode] = useState('list');
    const [filtersState, setFiltersState] = useState({
        status: filters.status || 'all',
        role: filters.role || 'all',
        facility: filters.facility || 'all',
        fromDate: filters.fromDate || '',
        toDate: filters.toDate || ''
    });

    const [showAddModal, setShowAddModal] = useState(false);
    const [isInviting, setIsInviting] = useState(false);
    const [inviteData, setInviteData] = useState({
        email: '',
        role: 'employee',
        facilityId: ''
    });

    // Set default facility if available
    useMemo(() => {
        if (memberFacilities.length > 0 && !inviteData.facilityId) {
            setInviteData(prev => ({ ...prev, facilityId: memberFacilities[0].id }));
        }
    }, [memberFacilities, inviteData.facilityId]);

    const handleEmployeeSelect = useCallback((employee) => {
        // Employee selection handler
    }, []);

    const handleFilterChange = (key, value) => {
        setFiltersState(prev => ({
            ...prev,
            [key]: value
        }));
        updateFilters({ [key]: value });
    };

    const handleClearFilters = () => {
        setFiltersState({
            status: 'all',
            role: 'all',
            facility: 'all',
            fromDate: '',
            toDate: ''
        });
        updateFilters({ status: 'all', role: 'all', facility: 'all', fromDate: '', toDate: '' });
    };

    const handleInviteEmployee = async () => {
        if (!inviteData.email.trim()) {
            showNotification(t('organization:employees.error.emailRequired', 'Email is required'), 'error');
            return;
        }

        if (!inviteData.facilityId) {
            showNotification(t('organization:employees.error.facilityRequired', 'Facility is required'), 'error');
            return;
        }

        setIsInviting(true);
        try {
            await execute('team.add_employee_to_facility', {
                email: inviteData.email.trim().toLowerCase(),
                facilityId: inviteData.facilityId,
                role: inviteData.role,
                isAdmin: inviteData.role === 'admin'
            });

            showNotification(t('organization:employees.success.invited', 'Employee added successfully'), 'success');
            setShowAddModal(false);
            setInviteData({ email: '', role: 'employee', facilityId: memberFacilities[0]?.id || '' });
            refreshEmployees();
        } catch (error) {
            console.error('Error adding employee:', error);
            showNotification(error.message || t('organization:employees.error.addFailed', 'Failed to add employee'), 'error');
        } finally {
            setIsInviting(false);
        }
    };

    const getEmployeeTitle = useCallback((employee) => {
        return `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || t('employees:unknownEmployee', 'Unknown Employee');
    }, [t]);

    const filteredByTab = useMemo(() => {
        return filteredEmployees;
    }, [filteredEmployees]);

    const sortedEmployees = useMemo(() => {
        let result = [...filteredByTab];

        if (filtersState.fromDate || filtersState.toDate) {
            result = result.filter(employee => {
                const employeeDate = employee.createdAt || employee.hireDate;
                if (!employeeDate) return false;
                const date = employeeDate.toDate ? employeeDate.toDate() : new Date(employeeDate);
                if (filtersState.fromDate) {
                    const fromDate = new Date(filtersState.fromDate);
                    fromDate.setHours(0, 0, 0, 0);
                    if (date < fromDate) return false;
                }
                if (filtersState.toDate) {
                    const toDate = new Date(filtersState.toDate);
                    toDate.setHours(23, 59, 59, 999);
                    if (date > toDate) return false;
                }
                return true;
            });
        }

        if (sortBy === 'name') {
            result.sort((a, b) => {
                const nameA = getEmployeeTitle(a).toLowerCase();
                const nameB = getEmployeeTitle(b).toLowerCase();
                return nameA.localeCompare(nameB);
            });
        } else if (sortBy === 'date') {
            result.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.hireDate || 0);
                const dateB = new Date(b.createdAt || b.hireDate || 0);
                return dateB - dateA;
            });
        } else if (sortBy === 'facility') {
            result.sort((a, b) => {
                const facilityA = (a.facilityName || '').toLowerCase();
                const facilityB = (b.facilityName || '').toLowerCase();
                return facilityA.localeCompare(facilityB);
            });
        }

        return result;
    }, [filteredByTab, sortBy, getEmployeeTitle, filtersState.fromDate, filtersState.toDate]);

    const statusOptions = [
        { value: 'all', label: t('employees:status.all') },
        { value: 'active', label: t('employees:status.active') },
        { value: 'inactive', label: t('employees:status.inactive') },
        { value: 'pending', label: t('employees:status.pending') }
    ];

    const availableRoles = useMemo(() => {
        const rolesSet = new Set();
        employees.forEach(emp => {
            emp.roles?.forEach(role => rolesSet.add(role));
        });
        return Array.from(rolesSet).sort().map(role => ({ value: role, label: role }));
    }, [employees]);

    const formatDate = (date) => {
        if (!date) return '';
        try {
            if (date.toDate && typeof date.toDate === 'function') {
                const d = date.toDate();
                const now = new Date();
                const diffMs = now - d;
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                if (diffDays === 0) return 'Today';
                if (diffDays === 1) return 'Yesterday';
                if (diffDays < 7) return `${diffDays} days ago`;
                if (diffDays < 30) {
                    const weeks = Math.floor(diffDays / 7);
                    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
                }
                if (diffDays < 365) {
                    const months = Math.floor(diffDays / 30);
                    return `${months} month${months > 1 ? 's' : ''} ago`;
                }
                return format(d, 'MMM d, yyyy');
            }
            return format(new Date(date), 'MMM d, yyyy');
        } catch (error) {
            return '';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-16">
                <p className="text-muted-foreground">{t('employees:errorMessage', 'Failed to load employees')}</p>
            </div>
        );
    }


    return (
        <div className="space-y-6">
            <FilterBar
                filters={filtersState}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                searchValue={filters.searchTerm || ''}
                onSearchChange={(value) => updateFilters({ searchTerm: value })}
                searchPlaceholder={t('organization:employees.searchPlaceholder', 'Search employees...')}
                dropdownFields={[
                    {
                        key: 'status',
                        label: t('organization:employees.filterByStatus', 'Filter by Status'),
                        options: [
                            { value: 'all', label: t('common:all', 'All') },
                            ...statusOptions
                        ],
                        defaultValue: 'all'
                    },
                    {
                        key: 'role',
                        label: t('organization:employees.filterByRole', 'Filter by Role'),
                        options: [
                            { value: 'all', label: t('common:all', 'All') },
                            ...availableRoles
                        ],
                        defaultValue: 'all'
                    },
                    {
                        key: 'facility',
                        label: t('organization:employees.filterByFacility', 'Filter by Facility'),
                        options: [
                            { value: 'all', label: t('common:all', 'All') },
                            ...memberFacilities.map(facility => ({
                                value: facility.id,
                                label: facility.facilityName || facility.companyName || t('organization:employees.unnamedFacility', 'Unnamed Facility')
                            }))
                        ],
                        defaultValue: 'all'
                    }
                ]}
                dateFields={[
                    {
                        key: 'fromDate',
                        label: t('organization:employees.fromDate', 'From Date'),
                        showClearButton: true
                    },
                    {
                        key: 'toDate',
                        label: t('organization:employees.toDate', 'To Date'),
                        showClearButton: true
                    }
                ]}
                showViewToggle={true}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                sortOptions={[
                    { value: 'name', label: t('organization:employees.sort.name', 'Name') },
                    { value: 'date', label: t('organization:employees.sort.date', 'Date') },
                    { value: 'facility', label: t('organization:employees.sort.facility', 'Facility') }
                ]}
                sortValue={sortBy}
                onSortChange={setSortBy}
                translationNamespace="organization"
                title={hideHeader ? null : t('organization:employees.title', 'Employees')}
                description={hideHeader ? null : t('organization:employees.subtitle', 'Manage and track all employees')}
                onRefresh={refreshEmployees}
                onAdd={() => setShowAddModal(true)}
                addLabel={t('organization:employees.addEmployee', 'Add Employee')}
                isLoading={isLoading}
            />

            <div>
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : sortedEmployees.length === 0 ? (
                    <div className="bg-card rounded-xl border border-border overflow-hidden">
                        <div className="p-12 text-center">
                            <FiUsers className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-muted-foreground">{t('organization:employees.noEmployees', 'No employees found')}</p>
                        </div>
                    </div>
                ) : viewMode === 'list' ? (
                    <div className="bg-card rounded-xl border border-border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted/30">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        {t('organization:employees.table.name', 'Name')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        {t('organization:employees.table.facility', 'Facility')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        {t('organization:employees.table.role', 'Role')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        {t('organization:employees.table.status', 'Status')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        {t('organization:employees.table.hired', 'Hired')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedEmployees.map((employee) => {
                                    const name = getEmployeeTitle(employee);
                                    const facilityName = employee.facilityName || 'N/A';
                                    const role = employee.roles?.[0] || 'N/A';
                                    const status = employee.status || 'active';
                                    const hireDate = formatDate(employee.hireDate || employee.createdAt);
                                    return (
                                        <tr
                                            key={employee.id}
                                            className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                                            onClick={() => handleEmployeeSelect(employee)}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-foreground">{name}</div>
                                                {employee.email && (
                                                    <div className="text-xs text-muted-foreground">{employee.email}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm">{facilityName}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm">{role}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn(
                                                    "px-2 py-0.5 text-xs font-medium rounded-full",
                                                    status === 'active'
                                                        ? "bg-green-100 text-green-700"
                                                        : status === 'inactive'
                                                            ? "bg-gray-100 text-gray-700"
                                                            : "bg-yellow-100 text-yellow-700"
                                                )}>
                                                    {status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {hireDate}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sortedEmployees.map((employee) => {
                            const name = getEmployeeTitle(employee);
                            const facilityName = employee.facilityName || 'N/A';
                            const role = employee.roles?.[0] || 'N/A';
                            const status = employee.status || 'active';
                            const hireDate = formatDate(employee.hireDate || employee.createdAt);

                            return (
                                <div
                                    key={employee.id}
                                    className="group bg-card hover:bg-card/80 border border-border hover:border-primary/20 rounded-xl px-6 pb-6 cursor-pointer transition-all duration-300 hover:shadow-md pt-6"
                                    onClick={() => handleEmployeeSelect(employee)}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-foreground mb-1">
                                                {name}
                                            </h4>
                                            {employee.email && (
                                                <p className="text-xs text-muted-foreground">
                                                    {employee.email}
                                                </p>
                                            )}
                                        </div>
                                        <span className={cn(
                                            "px-2 py-0.5 text-xs font-medium rounded-full",
                                            status === 'active'
                                                ? "bg-green-100 text-green-700"
                                                : status === 'inactive'
                                                    ? "bg-gray-100 text-gray-700"
                                                    : "bg-yellow-100 text-yellow-700"
                                        )}>
                                            {status}
                                        </span>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center text-xs text-muted-foreground">
                                            <FiUser className="mr-1" />
                                            {facilityName}
                                        </div>
                                        <div className="flex items-center text-xs text-muted-foreground">
                                            <span>{role}</span>
                                        </div>
                                        {hireDate && (
                                            <div className="flex items-center text-xs text-muted-foreground">
                                                {hireDate}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <Dialog
                isOpen={showAddModal}
                onClose={() => !isInviting && setShowAddModal(false)}
                title={t('organization:employees.addEmployee', 'Add Employee')}
                description={t('organization:employees.addEmployeeDescription', 'Add an existing user to your facility staff.')}
                actions={
                    <>
                        <button
                            onClick={() => setShowAddModal(false)}
                            disabled={isInviting}
                            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                        >
                            {t('common:cancel', 'Cancel')}
                        </button>
                        <button
                            onClick={handleInviteEmployee}
                            disabled={isInviting || !inviteData.email}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {isInviting ? t('common:adding', 'Adding...') : t('organization:employees.add', 'Add Employee')}
                        </button>
                    </>
                }
            >
                <div className="space-y-4 pt-4">
                    <InputField
                        label={t('organization:employees.form.email', 'User Email')}
                        value={inviteData.email}
                        onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                        placeholder={t('organization:employees.form.emailPlaceholder', 'Enter user email')}
                        required
                        disabled={isInviting}
                        type="email"
                    />

                    <SimpleDropdown
                        label={t('organization:employees.form.facility', 'Facility')}
                        options={memberFacilities.map(f => ({
                            value: f.id,
                            label: f.facilityName || f.companyName || 'Unknown Facility'
                        }))}
                        value={inviteData.facilityId}
                        onChange={(value) => setInviteData({ ...inviteData, facilityId: value })}
                        disabled={isInviting || memberFacilities.length <= 1}
                    />

                    <SimpleDropdown
                        label={t('organization:employees.form.role', 'Initial Role')}
                        options={[
                            { value: 'employee', label: t('organization:employees.roles.employee', 'Employee') },
                            { value: 'scheduler', label: t('organization:employees.roles.scheduler', 'Scheduler') },
                            { value: 'recruiter', label: t('organization:employees.roles.recruiter', 'Recruiter') },
                            { value: 'admin', label: t('organization:employees.roles.admin', 'Admin') }
                        ]}
                        value={inviteData.role}
                        onChange={(value) => setInviteData({ ...inviteData, role: value })}
                        disabled={isInviting}
                    />
                </div>
            </Dialog>
        </div>
    );
};

Employees.propTypes = {
    hideHeader: PropTypes.bool,
    hideStats: PropTypes.bool
};

export default Employees;

