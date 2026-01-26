import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import { useAuth } from '../../../../contexts/AuthContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import {
    FiShield,
    FiUsers,
    FiSettings,
    FiUserPlus,
    FiX,
    FiCheck,
    FiSearch,
    FiMail,
    FiKey,
    FiLock,
    FiUnlock,
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiSave,
    FiBriefcase
} from 'react-icons/fi';
import { cn } from '../../../../utils/cn';
import EmployeePopup from './EmployeePopup';
import Dialog from '../../../../components/Dialog/Dialog';
import InputField from '../../../../components/BoxedInputFields/Personnalized-InputField';
import InputFieldParagraph from '../../../../components/BoxedInputFields/TextareaField';

const OrganizationAdmin = ({ organization, memberFacilities = [] }) => {
    const { t } = useTranslation(['organization', 'common']);
    const { currentUser } = useAuth();
    const { showNotification } = useNotification();
    
    const [admins, setAdmins] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeView, setActiveView] = useState('admins');
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [roleForm, setRoleForm] = useState({ name: '', description: '', permissions: [] });
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [isEmployeePopupOpen, setIsEmployeePopupOpen] = useState(false);

    const getAvailablePermissions = () => [
        { key: 'manage_employees', label: t('organization:admin.permissions.manageEmployees', 'Manage Employees'), category: 'employees' },
        { key: 'view_employees', label: t('organization:admin.permissions.viewEmployees', 'View Employees'), category: 'employees' },
        { key: 'invite_users', label: t('organization:admin.permissions.inviteUsers', 'Invite Users'), category: 'employees' },
        { key: 'manage_facilities', label: t('organization:admin.permissions.manageFacilities', 'Manage Facilities'), category: 'facilities' },
        { key: 'view_facilities', label: t('organization:admin.permissions.viewFacilities', 'View Facilities'), category: 'facilities' },
        { key: 'manage_schedules', label: t('organization:admin.permissions.manageSchedules', 'Manage Schedules'), category: 'scheduling' },
        { key: 'view_schedules', label: t('organization:admin.permissions.viewSchedules', 'View Schedules'), category: 'scheduling' },
        { key: 'post_positions', label: t('organization:admin.permissions.postPositions', 'Post Positions'), category: 'hiring' },
        { key: 'view_applications', label: t('organization:admin.permissions.viewApplications', 'View Applications'), category: 'hiring' },
        { key: 'manage_contracts', label: t('organization:admin.permissions.manageContracts', 'Manage Contracts'), category: 'contracts' },
        { key: 'view_contracts', label: t('organization:admin.permissions.viewContracts', 'View Contracts'), category: 'contracts' },
        { key: 'manage_settings', label: t('organization:admin.permissions.manageSettings', 'Manage Settings'), category: 'settings' },
        { key: 'view_reports', label: t('organization:admin.permissions.viewReports', 'View Reports'), category: 'reports' },
        { key: 'view_analytics', label: t('organization:admin.permissions.viewAnalytics', 'View Analytics'), category: 'reports' },
        { key: 'manage_organization', label: t('organization:admin.permissions.manageOrganization', 'Manage Organization'), category: 'organization' },
        { key: 'manage_roles', label: t('organization:admin.permissions.manageRoles', 'Manage Roles'), category: 'organization' }
    ];

    const getPermissionCategories = () => [
        { key: 'employees', label: t('organization:admin.permissions.categories.employees', 'Employees') },
        { key: 'facilities', label: t('organization:admin.permissions.categories.facilities', 'Facilities') },
        { key: 'scheduling', label: t('organization:admin.permissions.categories.scheduling', 'Scheduling') },
        { key: 'hiring', label: t('organization:admin.permissions.categories.hiring', 'Hiring') },
        { key: 'contracts', label: t('organization:admin.permissions.categories.contracts', 'Contracts') },
        { key: 'settings', label: t('organization:admin.permissions.categories.settings', 'Settings') },
        { key: 'reports', label: t('organization:admin.permissions.categories.reports', 'Reports') },
        { key: 'organization', label: t('organization:admin.permissions.categories.organization', 'Organization') }
    ];

    const loadAdmins = useCallback(async () => {
        if (!organization) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const adminList = [];
            const adminIds = organization.admins || [];

            for (const adminId of adminIds) {
                try {
                    const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, adminId);
                    const userSnap = await getDoc(userRef);
                    
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        adminList.push({
                            id: adminId,
                            email: userData.email || '',
                            displayName: userData.displayName || userData.firstName + ' ' + userData.lastName || 'Unknown',
                            photoURL: userData.photoURL || '',
                            isOrgAdmin: true
                        });
                    }
                } catch (error) {
                    console.error(`Error loading admin ${adminId}:`, error);
                }
            }

            setAdmins(adminList);
        } catch (error) {
            console.error('Error loading admins:', error);
            showNotification(t('organization:admin.errors.loadFailed', 'Failed to load administrators'), 'error');
        } finally {
            setLoading(false);
        }
    }, [organization, showNotification, t]);

    const loadRoles = useCallback(async () => {
        if (!organization) {
            setRoles([]);
            return;
        }

        try {
            const orgRoles = organization.customRoles || [];
            setRoles(orgRoles);
        } catch (error) {
            console.error('Error loading roles:', error);
            showNotification(t('organization:admin.roles.errors.loadFailed', 'Failed to load roles'), 'error');
        }
    }, [organization, showNotification, t]);

    const loadEmployees = useCallback(async () => {
        if (!organization || !memberFacilities || memberFacilities.length === 0) {
            return;
        }

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
        }
    }, [organization, memberFacilities]);

    useEffect(() => {
        loadAdmins();
        loadRoles();
        loadEmployees();
    }, [loadAdmins, loadRoles, loadEmployees]);

    const isCurrentUserAdmin = organization?.admins?.includes(currentUser?.uid);

    const filteredAdmins = admins.filter(admin => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            admin.email?.toLowerCase().includes(query) ||
            admin.displayName?.toLowerCase().includes(query)
        );
    });

    const handleCreateRole = () => {
        setEditingRole(null);
        setRoleForm({ name: '', description: '', permissions: [] });
        setShowRoleModal(true);
    };

    const handleEditRole = (role) => {
        setEditingRole(role);
        setRoleForm({
            name: role.name || '',
            description: role.description || '',
            permissions: role.permissions || []
        });
        setShowRoleModal(true);
    };

    const handleDeleteRole = async (roleId) => {
        if (!window.confirm(t('organization:admin.roles.confirmDelete', 'Are you sure you want to delete this role? This action cannot be undone.'))) {
            return;
        }

        try {
            const updatedRoles = roles.filter(r => r.id !== roleId);
            const orgRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, organization.id);
            await updateDoc(orgRef, {
                customRoles: updatedRoles,
                updatedAt: serverTimestamp()
            });

            showNotification(t('organization:admin.roles.deleted', 'Role deleted successfully'), 'success');
            loadRoles();
        } catch (error) {
            console.error('Error deleting role:', error);
            showNotification(t('organization:admin.roles.errors.deleteFailed', 'Failed to delete role'), 'error');
        }
    };

    const handleSaveRole = async () => {
        if (!roleForm.name.trim()) {
            showNotification(t('organization:admin.roles.errors.nameRequired', 'Role name is required'), 'error');
            return;
        }

        if (roleForm.permissions.length === 0) {
            showNotification(t('organization:admin.roles.errors.permissionsRequired', 'At least one permission is required'), 'error');
            return;
        }

        try {
            const orgRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, organization.id);
            let updatedRoles;

            if (editingRole) {
                updatedRoles = roles.map(r => 
                    r.id === editingRole.id 
                        ? { ...r, ...roleForm, updatedAt: new Date().toISOString() }
                        : r
                );
            } else {
                const newRole = {
                    id: `role_${Date.now()}`,
                    ...roleForm,
                    createdAt: new Date().toISOString(),
                    createdBy: currentUser?.uid
                };
                updatedRoles = [...roles, newRole];
            }

            await updateDoc(orgRef, {
                customRoles: updatedRoles,
                updatedAt: serverTimestamp()
            });

            showNotification(
                editingRole 
                    ? t('organization:admin.roles.updated', 'Role updated successfully')
                    : t('organization:admin.roles.created', 'Role created successfully'),
                'success'
            );
            setShowRoleModal(false);
            setRoleForm({ name: '', description: '', permissions: [] });
            loadRoles();
        } catch (error) {
            console.error('Error saving role:', error);
            showNotification(t('organization:admin.roles.errors.saveFailed', 'Failed to save role'), 'error');
        }
    };

    const togglePermission = (permissionKey) => {
        setRoleForm(prev => ({
            ...prev,
            permissions: prev.permissions.includes(permissionKey)
                ? prev.permissions.filter(p => p !== permissionKey)
                : [...prev.permissions, permissionKey]
        }));
    };

    const toggleAllPermissionsInCategory = (category) => {
        const availablePermissions = getAvailablePermissions();
        const categoryPermissions = availablePermissions
            .filter(p => p.category === category)
            .map(p => p.key);
        
        const allSelected = categoryPermissions.every(p => roleForm.permissions.includes(p));
        
        setRoleForm(prev => ({
            ...prev,
            permissions: allSelected
                ? prev.permissions.filter(p => !categoryPermissions.includes(p))
                : [...new Set([...prev.permissions, ...categoryPermissions])]
        }));
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
            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">
                            {t('organization:admin.title', 'Organization Administration')}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('organization:admin.subtitle', 'Manage administrators, permissions, and organization settings')}
                        </p>
                    </div>
                    {isCurrentUserAdmin && (
                        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                            <FiUserPlus className="w-4 h-4" />
                            {t('organization:admin.addAdmin', 'Add Administrator')}
                        </button>
                    )}
                </div>

                <div className="flex gap-2 border-b border-border mb-6">
                    {[
                        { id: 'admins', label: t('organization:admin.views.admins', 'Administrators'), icon: FiShield },
                        { id: 'roles', label: t('organization:admin.views.roles', 'Roles & Permissions'), icon: FiKey },
                        { id: 'settings', label: t('organization:admin.views.settings', 'Settings'), icon: FiSettings }
                    ].map((view) => {
                        const ViewIcon = view.icon;
                        return (
                            <button
                                key={view.id}
                                onClick={() => setActiveView(view.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                                    activeView === view.id
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <ViewIcon className="w-4 h-4" />
                                {view.label}
                            </button>
                        );
                    })}
                </div>

                {activeView === 'admins' && (
                    <div className="space-y-4">
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <input
                                type="text"
                                placeholder={t('organization:admin.searchPlaceholder', 'Search employees...')}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="space-y-3">
                            {employees.filter(emp => {
                                if (!searchQuery) return true;
                                const query = searchQuery.toLowerCase();
                                const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
                                const email = (emp.email || '').toLowerCase();
                                return fullName.includes(query) || email.includes(query);
                            }).map((employee) => {
                                const fullName = `${employee.firstName} ${employee.lastName}`.trim() || 'Unknown';
                                const initials = `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase() || '?';
                                
                                return (
                                    <div 
                                        key={employee.id}
                                        className="bg-card border border-border rounded-lg p-4 hover:bg-muted/10 transition-colors cursor-pointer"
                                        onClick={() => {
                                            setSelectedEmployee(employee);
                                            setIsEmployeePopupOpen(true);
                                        }}
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
                                                    {employee.isAdmin && (
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
                                                <div className="flex items-center gap-4 text-sm">
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <FiBriefcase className="w-4 h-4 shrink-0" />
                                                        <span className="truncate">{employee.facilityName}</span>
                                                    </div>
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
                                    </div>
                                );
                            })}
                        </div>

                        {employees.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                <FiUsers className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>{t('organization:admin.noAdmins', 'No employees found')}</p>
                            </div>
                        )}
                    </div>
                )}

                {activeView === 'roles' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-foreground">
                                {t('organization:admin.roles.title', 'Custom Roles')}
                            </h3>
                            {isCurrentUserAdmin && (
                                <button
                                    onClick={handleCreateRole}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    <FiPlus className="w-4 h-4" />
                                    {t('organization:admin.roles.create', 'Create Role')}
                                </button>
                            )}
                        </div>

                        {roles.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground border border-border rounded-lg">
                                <FiKey className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>{t('organization:admin.roles.empty', 'No custom roles created yet')}</p>
                                {isCurrentUserAdmin && (
                                    <button
                                        onClick={handleCreateRole}
                                        className="mt-4 px-4 py-2 text-sm text-primary hover:underline"
                                    >
                                        {t('organization:admin.roles.createFirst', 'Create your first role')}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {roles.map((role) => (
                                    <div key={role.id} className="border border-border rounded-lg p-4 hover:bg-muted/10 transition-colors">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-foreground mb-1">{role.name}</h4>
                                                {role.description && (
                                                    <p className="text-sm text-muted-foreground mb-2">{role.description}</p>
                                                )}
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {role.permissions?.slice(0, 3).map(permKey => {
                                                        const perm = getAvailablePermissions().find(p => p.key === permKey);
                                                        return perm ? (
                                                            <span key={permKey} className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
                                                                {perm.label}
                                                            </span>
                                                        ) : null;
                                                    })}
                                                    {role.permissions?.length > 3 && (
                                                        <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded">
                                                            +{role.permissions.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {isCurrentUserAdmin && (
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => handleEditRole(role)}
                                                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                        title={t('organization:admin.roles.edit', 'Edit role')}
                                                    >
                                                        <FiEdit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteRole(role.id)}
                                                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title={t('organization:admin.roles.delete', 'Delete role')}
                                                    >
                                                        <FiTrash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeView === 'settings' && (
                    <div className="space-y-4">
                        <div className="bg-muted/30 border border-border rounded-lg p-6">
                            <h3 className="font-semibold text-foreground mb-4">
                                {t('organization:admin.settings.title', 'Organization Settings')}
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {t('organization:admin.settings.sharedStaff', 'Shared Staff Pool')}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {t('organization:admin.settings.sharedStaffDesc', 'Allow facilities to share staff members')}
                                        </p>
                                    </div>
                                    <button className={cn(
                                        "p-2 rounded-lg transition-colors",
                                        organization?.settings?.sharedStaffPool
                                            ? "bg-green-100 text-green-700"
                                            : "bg-gray-100 text-gray-400"
                                    )}>
                                        {organization?.settings?.sharedStaffPool ? <FiUnlock className="w-4 h-4" /> : <FiLock className="w-4 h-4" />}
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {t('organization:admin.settings.crossScheduling', 'Cross-Facility Scheduling')}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {t('organization:admin.settings.crossSchedulingDesc', 'Enable scheduling across multiple facilities')}
                                        </p>
                                    </div>
                                    <button className={cn(
                                        "p-2 rounded-lg transition-colors",
                                        organization?.settings?.crossFacilityScheduling
                                            ? "bg-green-100 text-green-700"
                                            : "bg-gray-100 text-gray-400"
                                    )}>
                                        {organization?.settings?.crossFacilityScheduling ? <FiUnlock className="w-4 h-4" /> : <FiLock className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <Dialog
                isOpen={showRoleModal}
                onClose={() => {
                    setShowRoleModal(false);
                    setRoleForm({ name: '', description: '', permissions: [] });
                }}
                title={editingRole 
                    ? t('organization:admin.roles.editRole', 'Edit Role')
                    : t('organization:admin.roles.createRole', 'Create New Role')
                }
                size="large"
                actions={
                    <>
                        <button
                            onClick={() => {
                                setShowRoleModal(false);
                                setRoleForm({ name: '', description: '', permissions: [] });
                            }}
                            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t('common:cancel', 'Cancel')}
                        </button>
                        <button
                            onClick={handleSaveRole}
                            disabled={!roleForm.name.trim() || roleForm.permissions.length === 0}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {editingRole 
                                ? t('common:save', 'Save Changes')
                                : t('common:create', 'Create Role')
                            }
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    <InputField
                        label={t('organization:admin.roles.form.name', 'Role Name')}
                        value={roleForm.name}
                        onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                        placeholder={t('organization:admin.roles.form.namePlaceholder', 'e.g., HR Manager, Team Lead')}
                        required
                        name="roleName"
                    />

                    <InputFieldParagraph
                        label={t('organization:admin.roles.form.description', 'Description')}
                        value={roleForm.description}
                        onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                        placeholder={t('organization:admin.roles.form.descriptionPlaceholder', 'Describe the role and its responsibilities')}
                        rows={3}
                        name="roleDescription"
                    />

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-3">
                            {t('organization:admin.roles.form.permissions', 'Permissions')} *
                        </label>
                        <div className="space-y-4 max-h-96 overflow-y-auto border border-border rounded-lg p-4">
                            {getPermissionCategories().map(category => {
                                const availablePermissions = getAvailablePermissions();
                                const categoryPermissions = availablePermissions.filter(p => p.category === category.key);
                                const allSelected = categoryPermissions.every(p => roleForm.permissions.includes(p.key));

                                return (
                                    <div key={category.key} className="space-y-2">
                                        <div className="flex items-center justify-between pb-2 border-b border-border">
                                            <h4 className="text-sm font-semibold text-foreground">{category.label}</h4>
                                            <button
                                                onClick={() => toggleAllPermissionsInCategory(category.key)}
                                                className="text-xs text-primary hover:underline"
                                            >
                                                {allSelected 
                                                    ? t('organization:admin.roles.deselectAll', 'Deselect All')
                                                    : t('organization:admin.roles.selectAll', 'Select All')
                                                }
                                            </button>
                                        </div>
                                        <div className="space-y-2 pl-2">
                                            {categoryPermissions.map(permission => (
                                                <label
                                                    key={permission.key}
                                                    className="flex items-center gap-2 p-2 hover:bg-muted/30 rounded cursor-pointer"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={roleForm.permissions.includes(permission.key)}
                                                        onChange={() => togglePermission(permission.key)}
                                                        className="w-4 h-4 text-primary border-border rounded focus:ring-primary/20"
                                                    />
                                                    <span className="text-sm text-foreground flex-1">{permission.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {t('organization:admin.roles.selectedCount', '{{count}} permissions selected', { count: roleForm.permissions.length })}
                        </p>
                    </div>
                </div>
            </Dialog>

            <EmployeePopup
                employee={selectedEmployee}
                isOpen={isEmployeePopupOpen}
                onClose={() => {
                    setIsEmployeePopupOpen(false);
                    setSelectedEmployee(null);
                }}
            />
        </div>
    );
};

export default OrganizationAdmin;

