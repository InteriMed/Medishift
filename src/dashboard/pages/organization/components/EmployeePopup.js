import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import { useDashboard } from '../../../contexts/DashboardContext';
import { buildDashboardUrl, getWorkspaceIdForUrl } from '../../../../config/routeUtils';
import {
    FiFileText, FiMessageSquare, FiCalendar, FiUser,
    FiMail
} from 'react-icons/fi';
import { cn } from '../../../../utils/cn';
import Dialog from '../../../../components/Dialog/Dialog';

const EmployeePopup = ({ employee, isOpen, onClose }) => {
    const { t } = useTranslation(['organization', 'common']);
    const navigate = useNavigate();
    const { selectedWorkspace } = useDashboard();
    const [activeTab, setActiveTab] = useState('contract');
    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(false);
    const [profileData, setProfileData] = useState(null);

    const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);

    const loadEmployeeData = useCallback(async () => {
        if (!employee?.id) return;
        setLoading(true);
        try {
            const employeeId = employee.id;
            
            const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, employeeId);
            const professionalRef = doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, employeeId);
            
            const [userSnap, professionalSnap] = await Promise.all([
                getDoc(userRef),
                getDoc(professionalRef)
            ]);

            let profile = {};
            if (userSnap.exists()) {
                profile = { ...profile, ...userSnap.data() };
            }
            if (professionalSnap.exists()) {
                profile = { ...profile, ...professionalSnap.data() };
            }
            setProfileData(profile);

            if (employee.contractId) {
                const contractRef = doc(db, FIRESTORE_COLLECTIONS.CONTRACTS, employee.contractId);
                const contractSnap = await getDoc(contractRef);
                if (contractSnap.exists()) {
                    setContract({ id: contractSnap.id, ...contractSnap.data() });
                }
            } else if (employee.facilityId) {
                const contractsQuery = query(
                    collection(db, FIRESTORE_COLLECTIONS.CONTRACTS),
                    where('parties.professional.profileId', '==', employeeId),
                    where('parties.employer.profileId', '==', employee.facilityId)
                );
                const contractsSnapshot = await getDocs(contractsQuery);
                if (!contractsSnapshot.empty) {
                    const contractDoc = contractsSnapshot.docs[0];
                    setContract({ id: contractDoc.id, ...contractDoc.data() });
                }
            }
        } catch (error) {
            console.error('Error loading employee data:', error);
        } finally {
            setLoading(false);
        }
    }, [employee]);

    useEffect(() => {
        if (isOpen && employee) {
            loadEmployeeData();
        }
    }, [isOpen, employee, loadEmployeeData]);

    const handleMessage = () => {
        if (employee?.id) {
            const messagesPath = buildDashboardUrl(`/messages?userId=${employee.id}`, workspaceId);
            navigate(messagesPath);
            onClose();
        }
    };

    const handleCalendar = () => {
        if (employee?.id) {
            const calendarPath = buildDashboardUrl(`/calendar?userId=${employee.id}`, workspaceId);
            navigate(calendarPath);
            onClose();
        }
    };

    const handleProfile = () => {
        setActiveTab('profile');
    };

    const handleContract = () => {
        setActiveTab('contract');
    };

    if (!isOpen || !employee) return null;

    const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || t('organization:employee.unknown', 'Unknown');
    const initials = `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase() || '?';

    const tabs = [
        { id: 'contract', label: t('common:contract', 'Contract'), icon: FiFileText, action: handleContract },
        { id: 'message', label: t('common:message', 'Message'), icon: FiMessageSquare, action: handleMessage, redirect: true },
        { id: 'calendar', label: t('common:calendar', 'Calendar'), icon: FiCalendar, action: handleCalendar, redirect: true },
        { id: 'profile', label: t('common:profile', 'Profile'), icon: FiUser, action: handleProfile }
    ];

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={fullName}
            size="xlarge"
            closeOnBackdropClick={true}
        >
            <div className="space-y-6">
                <div className="flex items-start gap-4 pb-4 border-b border-slate-200">
                    <div className="shrink-0">
                        {employee.photoURL ? (
                            <img 
                                src={employee.photoURL} 
                                alt={fullName}
                                className="w-20 h-20 rounded-xl object-cover border-4 border-slate-200"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl border-4 border-slate-200">
                                {initials}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-slate-600 mt-1">{employee.email}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap pb-4 border-b border-slate-200">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={tab.action}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                                    isActive
                                        ? "bg-primary text-white"
                                        : "bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {activeTab === 'contract' && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                        <FiFileText className="w-5 h-5 text-primary" />
                                        {t('organization:employee.contractDetails', 'Contract Details')}
                                    </h3>
                                    {contract ? (
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-medium text-slate-500 block mb-1">
                                                        {t('organization:employee.jobTitle', 'Job Title')}
                                                    </label>
                                                    <p className="font-semibold text-slate-900">
                                                        {contract.terms?.jobTitle || employee.roles?.[0] || 'N/A'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-slate-500 block mb-1">
                                                        {t('organization:employee.contractType', 'Contract Type')}
                                                    </label>
                                                    <p className="font-semibold text-slate-900">
                                                        {contract.terms?.contractType || 'N/A'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-slate-500 block mb-1">
                                                        {t('organization:employee.workPercentage', 'Work Percentage')}
                                                    </label>
                                                    <p className="font-semibold text-slate-900">
                                                        {contract.terms?.workPercentage ? `${contract.terms.workPercentage}%` : 'N/A'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-slate-500 block mb-1">
                                                        {t('organization:employee.startDate', 'Start Date')}
                                                    </label>
                                                    <p className="font-semibold text-slate-900">
                                                        {contract.terms?.startDate 
                                                            ? new Date(contract.terms.startDate?.toDate?.() || contract.terms.startDate).toLocaleDateString()
                                                            : employee.hireDate 
                                                                ? new Date(employee.hireDate?.toDate?.() || employee.hireDate).toLocaleDateString()
                                                                : 'N/A'}
                                                    </p>
                                                </div>
                                                {contract.terms?.endDate && (
                                                    <div>
                                                        <label className="text-xs font-medium text-slate-500 block mb-1">
                                                            {t('organization:employee.endDate', 'End Date')}
                                                        </label>
                                                        <p className="font-semibold text-slate-900">
                                                            {new Date(contract.terms.endDate?.toDate?.() || contract.terms.endDate).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                )}
                                                {contract.terms?.salary && (
                                                    <div>
                                                        <label className="text-xs font-medium text-slate-500 block mb-1">
                                                            {t('organization:employee.salary', 'Salary')}
                                                        </label>
                                                        <p className="font-semibold text-slate-900">
                                                            {contract.terms.salary.amount 
                                                                ? `${contract.terms.salary.amount} ${contract.terms.salary.currency || 'CHF'}`
                                                                : 'N/A'}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            {contract.statusLifecycle?.currentStatus && (
                                                <div className="pt-4 border-t border-slate-200">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-medium text-slate-500">
                                                            {t('organization:employee.status', 'Status')}:
                                                        </span>
                                                        <span className={cn(
                                                            "px-2 py-1 rounded-full text-xs font-medium",
                                                            contract.statusLifecycle.currentStatus === 'active'
                                                                ? "bg-green-100 text-green-700"
                                                                : "bg-gray-100 text-gray-700"
                                                        )}>
                                                            {contract.statusLifecycle.currentStatus}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                                            <FiFileText className="w-12 h-12 mx-auto mb-4 text-slate-400 opacity-50" />
                                            <p className="text-slate-600">
                                                {t('organization:employee.noContract', 'No contract information available')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'profile' && (
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                        <FiUser className="w-5 h-5 text-primary" />
                                        {t('organization:employee.profile', 'Profile Information')}
                                    </h3>
                                    {profileData ? (
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-medium text-slate-500 block mb-1">
                                                        {t('organization:employee.firstName', 'First Name')}
                                                    </label>
                                                    <p className="font-semibold text-slate-900">
                                                        {profileData.firstName || profileData.identity?.firstName || employee.firstName || 'N/A'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-slate-500 block mb-1">
                                                        {t('organization:employee.lastName', 'Last Name')}
                                                    </label>
                                                    <p className="font-semibold text-slate-900">
                                                        {profileData.lastName || profileData.identity?.lastName || employee.lastName || 'N/A'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-slate-500 block mb-1">
                                                        {t('common:email', 'Email')}
                                                    </label>
                                                    <p className="font-semibold text-slate-900 flex items-center gap-2">
                                                        {employee.email || profileData.email || 'N/A'}
                                                        {employee.email && <FiMail className="w-4 h-4 text-slate-500" />}
                                                    </p>
                                                </div>
                                                {profileData.phoneNumber && (
                                                    <div>
                                                        <label className="text-xs font-medium text-slate-500 block mb-1">
                                                            {t('common:phone', 'Phone')}
                                                        </label>
                                                        <p className="font-semibold text-slate-900">
                                                            {profileData.phoneNumber}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            {employee.roles && employee.roles.length > 0 && (
                                                <div className="pt-4 border-t border-slate-200">
                                                    <label className="text-xs font-medium text-slate-500 block mb-2">
                                                        {t('organization:employee.roles', 'Roles')}
                                                    </label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {employee.roles.map((role, idx) => (
                                                            <span 
                                                                key={idx}
                                                                className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20"
                                                            >
                                                                {role}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {profileData.profileDisplay?.bio && (
                                                <div className="pt-4 border-t border-slate-200">
                                                    <label className="text-xs font-medium text-slate-500 block mb-2">
                                                        {t('organization:employee.bio', 'Bio')}
                                                    </label>
                                                    <p className="text-slate-900 leading-relaxed">
                                                        {profileData.profileDisplay.bio}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                                            <FiUser className="w-12 h-12 mx-auto mb-4 text-slate-400 opacity-50" />
                                            <p className="text-slate-600">
                                                {t('organization:employee.noProfile', 'No profile information available')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {(activeTab === 'message' || activeTab === 'calendar') && (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        {activeTab === 'message' ? (
                                            <>
                                                <FiMessageSquare className="w-16 h-16 text-primary opacity-50" />
                                                <div>
                                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                                        {t('organization:employee.redirectingToMessages', 'Redirecting to Messages...')}
                                                    </h3>
                                                    <p className="text-slate-600">
                                                        {t('organization:employee.redirectingToMessagesDesc', 'You will be redirected to the messages page to start a conversation.')}
                                                    </p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <FiCalendar className="w-16 h-16 text-primary opacity-50" />
                                                <div>
                                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                                        {t('organization:employee.redirectingToCalendar', 'Redirecting to Calendar...')}
                                                    </h3>
                                                    <p className="text-slate-600">
                                                        {t('organization:employee.redirectingToCalendarDesc', 'You will be redirected to the calendar page to view schedules.')}
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </Dialog>
    );
};

EmployeePopup.propTypes = {
    employee: PropTypes.shape({
        id: PropTypes.string,
        firstName: PropTypes.string,
        lastName: PropTypes.string,
        email: PropTypes.string,
        photoURL: PropTypes.string,
        facilityId: PropTypes.string,
        facilityName: PropTypes.string,
        roles: PropTypes.array,
        contractId: PropTypes.string,
        hireDate: PropTypes.oneOfType([PropTypes.object, PropTypes.string, PropTypes.instanceOf(Date)])
    }),
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired
};

export default EmployeePopup;

