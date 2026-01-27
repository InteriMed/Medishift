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
        { key: 'manage_schedules', label: t('organization:admin.permissions.manageSchedules', 'Manage Schedules'), category: 'employees' },
        { key: 'view_payroll', label: t('organization:admin.permissions.viewPayroll', 'View Payroll'), category: 'finance' },
        { key: 'manage_payroll', label: t('organization:admin.permissions.managePayroll', 'Manage Payroll'), category: 'finance' },
        { key: 'manage_roles', label: t('organization:admin.permissions.manageRoles', 'Manage Roles'), category: 'admin' },
        { key: 'manage_admins', label: t('organization:admin.permissions.manageAdmins', 'Manage Admins'), category: 'admin' },
        { key: 'view_analytics', label: t('organization:admin.permissions.viewAnalytics', 'View Analytics'), category: 'reports' },
        { key: 'manage_contracts', label: t('organization:admin.permissions.manageContracts', 'Manage Contracts'), category: 'employees' },
    ];

    useEffect(() => {
        fetchAdmins();
        fetchEmployees();
        fetchRoles();
    }, []);

    const fetchAdmins = async () => {
        try {
            setLoading(true);
            const adminsData = [];
            
            for (const facility of memberFacilities) {
                const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facility.id);
                const facilitySnap = await getDoc(facilityRef);
                
                if (facilitySnap.exists()) {
                    const data = facilitySnap.data();
                    const adminIds = data.admins || [];
                    
                    for (const adminId of adminIds) {
                        const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, adminId);
                        const userSnap = await getDoc(userRef);
                        
                        if (userSnap.exists()) {
                            const userData = userSnap.data();
                            adminsData.push({
                                id: adminId,
                                facilityId: facility.id,
                                facilityName: facility.facilityName || facility.companyName,
                                ...userData
                            });
                        }
                    }
                }
            }
            
            setAdmins(adminsData);
        } catch (error) {
            console.error('Error fetching admins:', error);
            showNotification(t('organization:errors.fetchAdminsFailed', 'Failed to fetch admins'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const employeesData = [];
            
            for (const facility of memberFacilities) {
                const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facility.id);
                const facilitySnap = await getDoc(facilityRef);
                
                if (facilitySnap.exists()) {
                    const data = facilitySnap.data();
                    const employeesList = data.employees || [];
                    
                    for (const emp of employeesList) {
                        const userId = emp.user_uid || emp.uid;
                        if (!userId) continue;
                        
                        const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
                        const userSnap = await getDoc(userRef);
                        
                        if (userSnap.exists()) {
                            const userData = userSnap.data();
                            employeesData.push({
                                id: userId,
                                facilityId: facility.id,
                                facilityName: facility.facilityName || facility.companyName,
                                role: emp.role,
                                ...userData,
                                ...emp
                            });
                        }
                    }
                }
            }
            
            setEmployees(employeesData);
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    const fetchRoles = async () => {
        try {
            const rolesData = [];
            
            for (const facility of memberFacilities) {
                const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facility.id);
                const facilitySnap = await getDoc(facilityRef);
                
                if (facilitySnap.exists()) {
                    const data = facilitySnap.data();
                    const facilityRoles = data.customRoles || [];
                    
                    facilityRoles.forEach(role => {
                        rolesData.push({
                            ...role,
                            facilityId: facility.id,
                            facilityName: facility.facilityName || facility.companyName
                        });
                    });
                }
            }
            
            setRoles(rolesData);
        } catch (error) {
            console.error('Error fetching roles:', error);
        }
    };

    const handleAddAdmin = async (employeeId, facilityId) => {
        try {
            const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
            const facilitySnap = await getDoc(facilityRef);
            
            if (facilitySnap.exists()) {
                const data = facilitySnap.data();
                const currentAdmins = data.admins || [];
                
                if (!currentAdmins.includes(employeeId)) {
                    await updateDoc(facilityRef, {
                        admins: [...currentAdmins, employeeId],
                        updatedAt: serverTimestamp()
                    });
                    
                    showNotification(t('organization:success.adminAdded', 'Admin added successfully'), 'success');
                    fetchAdmins();
                }
            }
        } catch (error) {
            console.error('Error adding admin:', error);
            showNotification(t('organization:errors.addAdminFailed', 'Failed to add admin'), 'error');
        }
    };

    const handleRemoveAdmin = async (employeeId, facilityId) => {
        try {
            const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
            const facilitySnap = await getDoc(facilityRef);
            
            if (facilitySnap.exists()) {
                const data = facilitySnap.data();
                const currentAdmins = data.admins || [];
                
                await updateDoc(facilityRef, {
                    admins: currentAdmins.filter(id => id !== employeeId),
                    updatedAt: serverTimestamp()
                });
                
                showNotification(t('organization:success.adminRemoved', 'Admin removed successfully'), 'success');
                fetchAdmins();
            }
        } catch (error) {
            console.error('Error removing admin:', error);
            showNotification(t('organization:errors.removeAdminFailed', 'Failed to remove admin'), 'error');
        }
    };

    const handleSaveRole = async () => {
        try {
            if (!roleForm.name.trim()) {
                showNotification(t('organization:errors.roleNameRequired', 'Role name is required'), 'error');
                return;
            }
            
            showNotification(t('organization:success.roleSaved', 'Role saved successfully'), 'success');
            setShowRoleModal(false);
            setRoleForm({ name: '', description: '', permissions: [] });
            setEditingRole(null);
            fetchRoles();
        } catch (error) {
            console.error('Error saving role:', error);
            showNotification(t('organization:errors.saveRoleFailed', 'Failed to save role'), 'error');
        }
    };

    const filteredAdmins = admins.filter(admin =>
        `${admin.firstName} ${admin.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        admin.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredEmployees = employees.filter(emp =>
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col bg-background">
            <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{t('organization:admin.title', 'Organization Administration')}</h1>
                        <p className="text-sm text-muted-foreground">{t('organization:admin.subtitle', 'Manage admins, roles, and permissions')}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                    <button
                        onClick={() => setActiveView('admins')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            activeView === 'admins'
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/70"
                        )}
                    >
                        <FiShield className="inline w-4 h-4 mr-2" />
                        {t('organization:admin.admins', 'Admins')}
                    </button>
                    <button
                        onClick={() => setActiveView('roles')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            activeView === 'roles'
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/70"
                        )}
                    >
                        <FiBriefcase className="inline w-4 h-4 mr-2" />
                        {t('organization:admin.roles', 'Roles')}
                    </button>
                    <button
                        onClick={() => setActiveView('employees')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            activeView === 'employees'
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/70"
                        )}
                    >
                        <FiUsers className="inline w-4 h-4 mr-2" />
                        {t('organization:admin.employees', 'Employees')}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                {activeView === 'admins' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="flex-1 relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder={t('organization:admin.searchAdmins', 'Search admins...')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground"
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : filteredAdmins.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                {t('organization:admin.noAdmins', 'No admins found')}
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {filteredAdmins.map((admin) => (
                                    <div key={`${admin.id}-${admin.facilityId}`} className="bg-card border border-border rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                                                    {admin.firstName?.[0]}{admin.lastName?.[0]}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-foreground">{admin.firstName} {admin.lastName}</h3>
                                                    <p className="text-sm text-muted-foreground">{admin.email}</p>
                                                    <p className="text-xs text-muted-foreground">{admin.facilityName}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveAdmin(admin.id, admin.facilityId)}
                                                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <FiTrash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeView === 'roles' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-foreground">{t('organization:admin.customRoles', 'Custom Roles')}</h2>
                            <button
                                onClick={() => {
                                    setShowRoleModal(true);
                                    setEditingRole(null);
                                    setRoleForm({ name: '', description: '', permissions: [] });
                                }}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                            >
                                <FiPlus className="inline w-4 h-4 mr-2" />
                                {t('organization:admin.createRole', 'Create Role')}
                            </button>
                        </div>

                        {roles.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                {t('organization:admin.noRoles', 'No custom roles defined')}
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {roles.map((role, index) => (
                                    <div key={`${role.facilityId}-${index}`} className="bg-card border border-border rounded-lg p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-foreground">{role.name}</h3>
                                                <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                                                <p className="text-xs text-muted-foreground mt-2">{role.facilityName}</p>
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {role.permissions?.map((perm) => (
                                                        <span key={perm} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                                                            {perm}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                                                <FiEdit2 className="w-4 h-4 text-muted-foreground" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeView === 'employees' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="flex-1 relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder={t('organization:admin.searchEmployees', 'Search employees...')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground"
                                />
                            </div>
                        </div>

                        {filteredEmployees.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                {t('organization:admin.noEmployees', 'No employees found')}
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {filteredEmployees.map((employee) => (
                                    <div key={`${employee.id}-${employee.facilityId}`} className="bg-card border border-border rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-semibold text-foreground">
                                                    {employee.firstName?.[0]}{employee.lastName?.[0]}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-foreground">{employee.firstName} {employee.lastName}</h3>
                                                    <p className="text-sm text-muted-foreground">{employee.email}</p>
                                                    <p className="text-xs text-muted-foreground">{employee.facilityName} • {employee.role}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAddAdmin(employee.id, employee.facilityId)}
                                                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                                            >
                                                <FiShield className="inline w-4 h-4 mr-1" />
                                                {t('organization:admin.makeAdmin', 'Make Admin')}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showRoleModal && (
                <Dialog
                    isOpen={showRoleModal}
                    onClose={() => setShowRoleModal(false)}
                    title={editingRole ? t('organization:admin.editRole', 'Edit Role') : t('organization:admin.createRole', 'Create Role')}
                >
                    <div className="space-y-4">
                        <InputField
                            label={t('organization:admin.roleName', 'Role Name')}
                            value={roleForm.name}
                            onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                        />
                        <InputFieldParagraph
                            label={t('organization:admin.roleDescription', 'Description')}
                            value={roleForm.description}
                            onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                        />
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                {t('organization:admin.permissions', 'Permissions')}
                            </label>
                            <div className="space-y-2">
                                {getAvailablePermissions().map((perm) => (
                                    <label key={perm.key} className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={roleForm.permissions.includes(perm.key)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setRoleForm({ ...roleForm, permissions: [...roleForm.permissions, perm.key] });
                                                } else {
                                                    setRoleForm({ ...roleForm, permissions: roleForm.permissions.filter(p => p !== perm.key) });
                                                }
                                            }}
                                            className="rounded border-border"
                                        />
                                        <span className="text-sm text-foreground">{perm.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <button
                                onClick={() => setShowRoleModal(false)}
                                className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                            >
                                {t('common:cancel', 'Cancel')}
                            </button>
                            <button
                                onClick={handleSaveRole}
                                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                <FiSave className="inline w-4 h-4 mr-1" />
                                {t('common:save', 'Save')}
                            </button>
                        </div>
                    </div>
                </Dialog>
            )}

            {isEmployeePopupOpen && selectedEmployee && (
                <EmployeePopup
                    isOpen={isEmployeePopupOpen}
                    onClose={() => {
                        setIsEmployeePopupOpen(false);
                        setSelectedEmployee(null);
                    }}
                    employeeId={selectedEmployee}
                />
            )}
        </div>
    );
};

export default OrganizationAdmin;

