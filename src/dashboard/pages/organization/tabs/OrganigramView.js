import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import { FiUsers, FiShield, FiUser } from 'react-icons/fi';
import EmployeePopup from '../components/EmployeePopup';

const OrganigramView = ({ organization, memberFacilities = [], selectedFacilityId = 'all' }) => {
    const { t } = useTranslation(['organization']);
    const [searchParams, setSearchParams] = useSearchParams();
    const [facilityEmployees, setFacilityEmployees] = useState({});
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [isPopupOpen, setIsPopupOpen] = useState(false);

    const facilitiesToShow = selectedFacilityId === 'all'
        ? memberFacilities
        : memberFacilities.filter(f => f.id === selectedFacilityId);

    const fetchEmployeesForFacilities = useCallback(async () => {
        if (facilitiesToShow.length === 0) return;
        
        setLoadingEmployees(true);
        try {
            const employeesMap = {};
            
            for (const facility of facilitiesToShow) {
                try {
                    const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facility.id);
                    const facilitySnap = await getDoc(facilityRef);
                    
                    if (facilitySnap.exists()) {
                        const facilityData = facilitySnap.data();
                        const employeesList = facilityData.employees || [];
                        
                        const employeePromises = employeesList.map(async (emp) => {
                            const userId = emp.user_uid || emp.uid;
                            if (!userId) return null;
                            
                            try {
                                const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
                                const professionalRef = doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, userId);
                                
                                const [userSnap, professionalSnap] = await Promise.all([
                                    getDoc(userRef),
                                    getDoc(professionalRef)
                                ]);
                                
                                let userData = {};
                                if (userSnap.exists()) {
                                    userData = { ...userData, ...userSnap.data() };
                                }
                                if (professionalSnap.exists()) {
                                    userData = { ...userData, ...professionalSnap.data() };
                                }
                                
                                const roles = emp.roles || ['employee'];
                                const isAdmin = facilityData.admins?.includes(userId) || roles.includes('admin');
                                
                                return {
                                    id: userId,
                                    email: userData.email || '',
                                    firstName: userData.firstName || userData.identity?.firstName || '',
                                    lastName: userData.lastName || userData.identity?.lastName || '',
                                    photoURL: userData.photoURL || userData.profileDisplay?.profilePictureUrl || '',
                                    roles: roles,
                                    isAdmin: isAdmin,
                                    rights: emp.rights || [],
                                    facilityId: facility.id,
                                    facilityName: facility.facilityName || facility.companyName || 'Unknown Facility',
                                    hireDate: emp.hireDate?.toDate?.() || emp.hireDate || null,
                                    contractId: emp.contractId || null,
                                    status: emp.status || 'active'
                                };
                            } catch (error) {
                                console.error(`Error loading employee ${userId}:`, error);
                                return null;
                            }
                        });
                        
                        const employees = (await Promise.all(employeePromises)).filter(Boolean);
                        employeesMap[facility.id] = employees;
                    }
                } catch (error) {
                    console.error(`Error loading facility ${facility.id}:`, error);
                }
            }
            
            setFacilityEmployees(employeesMap);
        } catch (error) {
            console.error('Error loading employees:', error);
        } finally {
            setLoadingEmployees(false);
        }
    }, [facilitiesToShow]);

    useEffect(() => {
        fetchEmployeesForFacilities();
    }, [fetchEmployeesForFacilities]);

    useEffect(() => {
        const modalParam = searchParams.get('modal');
        const employeeId = searchParams.get('employeeId');
        
        if (modalParam === 'employee' && employeeId && Object.keys(facilityEmployees).length > 0) {
            let foundEmployee = null;
            for (const facilityId in facilityEmployees) {
                foundEmployee = facilityEmployees[facilityId].find(emp => emp.id === employeeId);
                if (foundEmployee) break;
            }
            if (foundEmployee && !isPopupOpen) {
                setSelectedEmployee(foundEmployee);
                setIsPopupOpen(true);
            }
        }
    }, [searchParams, facilityEmployees, isPopupOpen]);

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

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <FiShield className="w-5 h-5 text-primary" />
                    {t('organization:organigram.hqTitle', 'Headquarters / Admin Core')}
                </h3>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {organization?.admins?.map((adminId, index) => (
                        <div key={adminId} className="flex items-center gap-3 p-4 bg-muted/20 rounded-lg border border-border">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                <FiUser />
                            </div>
                            <div>
                                <div className="font-medium">Admin ID: {adminId.substring(0, 8)}...</div>
                                <div className="text-xs text-muted-foreground">{t('common:roles.admin', 'Organization Admin')}</div>
                            </div>
                        </div>
                    )) || (
                            <div className="text-sm text-muted-foreground italic">No admins found</div>
                        )}
                </div>
            </div>

            {facilitiesToShow.length > 0 && (
                <div className="relative">
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border -z-10" />

                    <div className="space-y-8 pt-4">
                        {facilitiesToShow.map((facility) => (
                            <div key={facility.id} className="relative pl-12">
                                <div className="absolute left-6 top-6 w-6 h-0.5 bg-border" />
                                <div className="bg-card border border-border rounded-xl p-6">
                                    <h4 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                                        <FiUsers className="w-4 h-4 text-muted-foreground" />
                                        {facility.facilityName || facility.companyName || 'Unnamed Facility'}
                                    </h4>

                                    <div className="space-y-4">
                                        {facility.admins && facility.admins.length > 0 && (
                                            <div>
                                                <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                                                    {t('organization:organigram.localAdmins', 'Local Admins')}
                                                </h5>
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    {facility.admins.map((adminId) => {
                                                        const adminEmployee = facilityEmployees[facility.id]?.find(emp => emp.id === adminId);
                                                        if (adminEmployee) {
                                                            const fullName = `${adminEmployee.firstName} ${adminEmployee.lastName}`.trim() || adminId.substring(0, 8);
                                                            return (
                                                                <div 
                                                                    key={adminId} 
                                                                    className="flex items-center gap-2 p-2 bg-muted/10 rounded border border-border/50 text-sm cursor-pointer hover:bg-muted/20 transition-colors"
                                                                    onClick={() => handleOpenEmployeePopup(adminEmployee)}
                                                                >
                                                                    {adminEmployee.photoURL ? (
                                                                        <img 
                                                                            src={adminEmployee.photoURL} 
                                                                            alt={fullName}
                                                                            className="w-6 h-6 rounded-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs">
                                                                            <FiUser className="w-3 h-3 text-slate-500" />
                                                                        </div>
                                                                    )}
                                                                    <span className="truncate flex-1">{fullName}</span>
                                                                    <span className="text-[10px] shrink-0 bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">Admin</span>
                                                                </div>
                                                            );
                                                        }
                                                        return (
                                                            <div key={adminId} className="flex items-center gap-2 p-2 bg-muted/10 rounded border border-border/50 text-sm">
                                                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs">
                                                                    <FiUser className="w-3 h-3 text-slate-500" />
                                                                </div>
                                                                <span className="truncate">{adminId.substring(0, 8)}...</span>
                                                                <span className="text-[10px] ml-auto bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">Local Admin</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {facilityEmployees[facility.id] && facilityEmployees[facility.id].length > 0 && (
                                            <div>
                                                <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                                                    {t('organization:organigram.employees', 'Employees')}
                                                </h5>
                                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                    {facilityEmployees[facility.id]
                                                        .filter(emp => !emp.isAdmin)
                                                        .map((employee) => {
                                                            const fullName = `${employee.firstName} ${employee.lastName}`.trim() || 'Unknown';
                                                            return (
                                                                <div 
                                                                    key={employee.id} 
                                                                    className="flex items-center gap-2 p-2 bg-muted/10 rounded border border-border/50 text-sm cursor-pointer hover:bg-muted/20 transition-colors"
                                                                    onClick={() => handleOpenEmployeePopup(employee)}
                                                                >
                                                                    {employee.photoURL ? (
                                                                        <img 
                                                                            src={employee.photoURL} 
                                                                            alt={fullName}
                                                                            className="w-6 h-6 rounded-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-semibold">
                                                                            {employee.firstName?.[0]}{employee.lastName?.[0]}
                                                                        </div>
                                                                    )}
                                                                    <span className="truncate flex-1">{fullName}</span>
                                                                    {employee.roles?.[0] && (
                                                                        <span className="text-[10px] shrink-0 bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                                                            {employee.roles[0]}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {loadingEmployees && (
                                            <div className="text-xs text-muted-foreground italic">Loading employees...</div>
                                        )}
                                        
                                        {!loadingEmployees && 
                                         (!facilityEmployees[facility.id] || facilityEmployees[facility.id].length === 0) && 
                                         (!facility.admins || facility.admins.length === 0) && (
                                            <div className="text-xs text-muted-foreground italic">No employees found</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
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

export default OrganigramView;
