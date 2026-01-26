import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FiFileText, FiUploadCloud, FiClock, FiX, FiDownload, FiTrash2, FiInfo, FiPlus, FiSearch, FiEye, FiArrowDown, FiSliders, FiGrid, FiList, FiCheck, FiRefreshCw, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import DateField from '../../../../components/BoxedInputFields/DateField';
import SimpleDropdown from '../../../../components/BoxedInputFields/Dropdown-Field';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, getDoc, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { uploadFile } from '../../../../services/storageService';
import { useDashboard } from '../../../contexts/DashboardContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import { useAuth } from '../../../../contexts/AuthContext';
import Dialog from '../../../../components/Dialog/Dialog';
import BoxedSwitchField from '../../../../components/BoxedInputFields/BoxedSwitchField';
import InputField from '../../../../components/BoxedInputFields/Personnalized-InputField';
import InputFieldParagraph from '../../../../components/BoxedInputFields/TextareaField';
import { cn } from '../../../../utils/cn';
import PageHeader from '../../../components/PageHeader/PageHeader';
import PropTypes from 'prop-types';

const PolicyLibrary = ({ hideHeader = false, hideStats = false }) => {
    const { t } = useTranslation(['organization', 'common']);
    const { selectedWorkspace } = useDashboard();
    const { showNotification } = useNotification();
    const { currentUser } = useAuth();

    const [policies, setPolicies] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [policyName, setPolicyName] = useState('');
    const [policyDescription, setPolicyDescription] = useState('');
    const [policyStatus, setPolicyStatus] = useState('active');
    const [policyType, setPolicyType] = useState('internal');
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [selectedFacilities, setSelectedFacilities] = useState([]);
    const [effectiveDate, setEffectiveDate] = useState(null);
    const [expiryDate, setExpiryDate] = useState(null);
    const [priority, setPriority] = useState('medium');
    const [requiresAcknowledgment, setRequiresAcknowledgment] = useState(false);
    const [createCommunication, setCreateCommunication] = useState(false);
    const [tags, setTags] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [filters, setFilters] = useState({
        status: 'all',
        type: 'all',
        role: 'all',
        facility: 'all',
        priority: 'all',
        fromDate: '',
        toDate: ''
    });
    const [sortBy, setSortBy] = useState('date');
    const [viewMode, setViewMode] = useState('list');
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [showActiveFilters, setShowActiveFilters] = useState(false);
    const [justExpanded, setJustExpanded] = useState(false);

    const organizationId = selectedWorkspace?.facilityId;
    const [memberFacilities, setMemberFacilities] = useState([]);
    const isOrganizationWorkspace = selectedWorkspace?.type === 'organization';

    const availableRoles = [
        { value: 'all', label: t('organization:policy.roles.all', 'All Roles') },
        { value: 'pharmacist', label: t('organization:policy.roles.pharmacist', 'Pharmacist') },
        { value: 'pharmacy_technician', label: t('organization:policy.roles.pharmacyTechnician', 'Pharmacy Technician') },
        { value: 'intern', label: t('organization:policy.roles.intern', 'Intern') },
        { value: 'admin', label: t('organization:policy.roles.admin', 'Admin') },
        { value: 'scheduler', label: t('organization:policy.roles.scheduler', 'Scheduler') },
        { value: 'recruiter', label: t('organization:policy.roles.recruiter', 'Recruiter') },
        { value: 'employee', label: t('organization:policy.roles.employee', 'Employee') }
    ];

    const policyTypes = [
        { value: 'internal', label: t('organization:policy.types.internal', 'Internal Policy') },
        { value: 'shortTerm', label: t('organization:policy.types.shortTerm', 'Short-term Contract Template') },
        { value: 'longTerm', label: t('organization:policy.types.longTerm', 'Long-term Contract Template') },
        { value: 'hr', label: t('organization:policy.types.hr', 'HR Policy') },
        { value: 'safety', label: t('organization:policy.types.safety', 'Safety & Compliance') },
        { value: 'operational', label: t('organization:policy.types.operational', 'Operational Procedure') },
        { value: 'training', label: t('organization:policy.types.training', 'Training Material') },
        { value: 'legal', label: t('organization:policy.types.legal', 'Legal Document') },
        { value: 'other', label: t('organization:policy.types.other', 'Other') }
    ];

    const statusOptions = [
        { value: 'active', label: t('organization:policy.status.active', 'Active') },
        { value: 'review', label: t('organization:policy.status.review', 'Review') },
        { value: 'archived', label: t('organization:policy.status.archived', 'Archived') },
        { value: 'draft', label: t('organization:policy.status.draft', 'Draft') }
    ];

    const priorityOptions = [
        { value: 'high', label: t('organization:policy.priority.high', 'High') },
        { value: 'medium', label: t('organization:policy.priority.medium', 'Medium') },
        { value: 'low', label: t('organization:policy.priority.low', 'Low') }
    ];

    useEffect(() => {
        const fetchMemberFacilities = async () => {
            if (!organizationId) return;
            try {
                const facilityRef = doc(db, 'facilityProfiles', organizationId);
                const facilitySnap = await getDoc(facilityRef);
                if (facilitySnap.exists()) {
                    const data = facilitySnap.data();
                    const memberIds = data.memberFacilityIds || [organizationId];
                    const facilitiesPromises = memberIds.map(async (fid) => {
                        const fRef = doc(db, 'facilityProfiles', fid);
                        const fSnap = await getDoc(fRef);
                        return fSnap.exists() ? { id: fSnap.id, ...fSnap.data() } : null;
                    });
                    const facilities = (await Promise.all(facilitiesPromises)).filter(Boolean);
                    setMemberFacilities(facilities);
                }
            } catch (error) {
                console.error('Error fetching member facilities:', error);
            }
        };
        fetchMemberFacilities();
    }, [organizationId]);

    const fetchPolicies = useCallback(async () => {
        if (!organizationId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const policiesRef = collection(db, 'organizationPolicies');
            const q = query(
                policiesRef,
                where('organizationId', '==', organizationId),
                orderBy('uploadedAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const policiesData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPolicies(policiesData);
        } catch (error) {
            console.error('Error fetching policies:', error);
            showNotification(t('organization:errors.fetchPoliciesFailed', 'Failed to load policies'), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [organizationId, showNotification, t]);

    useEffect(() => {
        fetchPolicies();
    }, [fetchPolicies]);

    useEffect(() => {
        const handleOpenModal = (event) => {
            if (event.detail?.type === 'policyUpload') {
                setIsUploadModalOpen(true);
            }
        };

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('modal') === 'upload') {
            setIsUploadModalOpen(true);
        }

        window.addEventListener('openModal', handleOpenModal);
        return () => window.removeEventListener('openModal', handleOpenModal);
    }, []);

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                showNotification(t('organization:errors.fileTooLarge', 'File size must be less than 10MB'), 'error');
                return;
            }
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                showNotification(t('organization:errors.invalidFileType', 'Only PDF and Word documents are allowed'), 'error');
                return;
            }
            setSelectedFile(file);
            if (!policyName) {
                setPolicyName(file.name.replace(/\.[^/.]+$/, ''));
            }
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !policyName.trim() || !organizationId || !currentUser) {
            showNotification(t('organization:errors.missingFields', 'Please fill in all required fields'), 'error');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const timestamp = Date.now();
            const fileExtension = selectedFile.name.split('.').pop();
            const baseName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || selectedFile.name;
            const normalizedFileName = `${baseName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${timestamp}.${fileExtension}`;
            const storagePath = `organizationPolicies/${organizationId}/${normalizedFileName}`;

            const downloadURL = await uploadFile(selectedFile, storagePath, (progress) => {
                setUploadProgress(progress);
            });

            const policyData = {
                organizationId,
                name: policyName.trim(),
                description: policyDescription.trim() || '',
                fileName: selectedFile.name,
                fileSize: selectedFile.size,
                fileType: selectedFile.type,
                storagePath,
                downloadURL,
                status: policyStatus,
                type: policyType,
                roles: selectedRoles.length > 0 ? selectedRoles : ['all'],
                facilities: selectedFacilities.length > 0 ? selectedFacilities : ['all'],
                effectiveDate: effectiveDate ? Timestamp.fromDate(new Date(effectiveDate)) : null,
                expiryDate: expiryDate ? Timestamp.fromDate(new Date(expiryDate)) : null,
                priority,
                requiresAcknowledgment,
                createCommunication,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                version: 1,
                uploadedBy: currentUser.uid,
                uploadedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            await addDoc(collection(db, 'organizationPolicies'), policyData);

            showNotification(t('organization:success.policyUploaded', 'Policy uploaded successfully'), 'success');
            setIsUploadModalOpen(false);
            setSelectedFile(null);
            setPolicyName('');
            setPolicyDescription('');
            setPolicyStatus('active');
            setPolicyType('internal');
            setSelectedRoles([]);
            setSelectedFacilities([]);
            setEffectiveDate(null);
            setExpiryDate(null);
            setPriority('medium');
            setRequiresAcknowledgment(false);
            setCreateCommunication(false);
            setTags('');
            setUploadProgress(0);
            fetchPolicies();
        } catch (error) {
            console.error('Error uploading policy:', error);
            showNotification(error.message || t('organization:errors.uploadFailed', 'Failed to upload policy'), 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeletePolicy = async (policyId, storagePath) => {
        if (!window.confirm(t('organization:confirm.deletePolicy', 'Are you sure you want to delete this policy?'))) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'organizationPolicies', policyId));
            showNotification(t('organization:success.policyDeleted', 'Policy deleted successfully'), 'success');
            fetchPolicies();
        } catch (error) {
            console.error('Error deleting policy:', error);
            showNotification(t('organization:errors.deleteFailed', 'Failed to delete policy'), 'error');
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return t('common:today', 'Today');
        if (diffDays === 1) return t('common:yesterday', 'Yesterday');
        if (diffDays < 7) return t('organization:daysAgo', { count: diffDays }, `${diffDays} days ago`);
        if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return t('organization:weeksAgo', { count: weeks }, `${weeks} week${weeks > 1 ? 's' : ''} ago`);
        }
        if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return t('organization:monthsAgo', { count: months }, `${months} month${months > 1 ? 's' : ''} ago`);
        }
        return date.toLocaleDateString();
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const clearAllFilters = () => {
        setFilters({
            status: 'all',
            type: 'all',
            role: 'all',
            facility: 'all',
            priority: 'all',
            fromDate: '',
            toDate: ''
        });
    };

    const activeCount = (filters.status !== 'all' ? 1 : 0) + (filters.type !== 'all' ? 1 : 0) + (filters.role !== 'all' ? 1 : 0) + (isOrganizationWorkspace && filters.facility !== 'all' ? 1 : 0) + (filters.priority !== 'all' ? 1 : 0) + (filters.fromDate ? 1 : 0) + (filters.toDate ? 1 : 0);

    const filteredPolicies = policies.filter(policy => {
        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase();
            const matchesSearch = (
                policy.name?.toLowerCase().includes(search) ||
                policy.description?.toLowerCase().includes(search)
            );
            if (!matchesSearch) return false;
        }

        if (filters.status !== 'all' && policy.status !== filters.status) {
            return false;
        }

        if (filters.type !== 'all' && policy.type !== filters.type) {
            return false;
        }

        if (filters.role !== 'all') {
            const policyRoles = policy.roles || ['all'];
            if (!policyRoles.includes(filters.role) && !policyRoles.includes('all')) {
                return false;
            }
        }

        if (filters.facility !== 'all') {
            const policyFacilities = policy.facilities || ['all'];
            if (!policyFacilities.includes(filters.facility) && !policyFacilities.includes('all')) {
                return false;
            }
        }

        if (filters.priority !== 'all' && policy.priority !== filters.priority) {
            return false;
        }

        if (filters.fromDate || filters.toDate) {
            const policyDate = policy.uploadedAt?.toDate ? policy.uploadedAt.toDate() : new Date(policy.uploadedAt);
            if (filters.fromDate) {
                const fromDate = new Date(filters.fromDate);
                fromDate.setHours(0, 0, 0, 0);
                if (policyDate < fromDate) return false;
            }
            if (filters.toDate) {
                const toDate = new Date(filters.toDate);
                toDate.setHours(23, 59, 59, 999);
                if (policyDate > toDate) return false;
            }
        }

        return true;
    });

    const sortedPolicies = [...filteredPolicies].sort((a, b) => {
        if (sortBy === 'date') {
            const dateA = a.uploadedAt?.toDate ? a.uploadedAt.toDate() : new Date(a.uploadedAt || 0);
            const dateB = b.uploadedAt?.toDate ? b.uploadedAt.toDate() : new Date(b.uploadedAt || 0);
            return dateB - dateA;
        } else if (sortBy === 'name') {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        }
        return 0;
    });

    const handlePolicySelect = (policy) => {
        setSelectedPolicy(policy);
        setIsDetailsModalOpen(true);
    };

    const handleCloseDetails = () => {
        setIsDetailsModalOpen(false);
        setSelectedPolicy(null);
    };

    const hasPolicies = policies.length > 0;
    const hasFilteredPolicies = sortedPolicies.length > 0;

    const stats = useMemo(() => {
        const total = policies.length;
        const active = policies.filter(p => p.status === 'active').length;
        const review = policies.filter(p => p.status === 'review').length;
        const archived = policies.filter(p => p.status === 'archived').length;
        return { total, active, review, archived };
    }, [policies]);

    const StatCard = ({ icon: Icon, label, value, subValue, className }) => (
        <div className={cn(
            "bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow",
            className
        )}>
            <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    {subValue && (
                        <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
                    )}
                </div>
            </div>
        </div>
    );

    StatCard.propTypes = {
        icon: PropTypes.elementType.isRequired,
        label: PropTypes.string.isRequired,
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        subValue: PropTypes.string,
        className: PropTypes.string
    };

    return (
        <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
            {!hideHeader && (
                <PageHeader
                    title={t('organization:policy.title', 'Policy Library')}
                    subtitle={t('organization:policy.subtitle', 'Manage and distribute policies to all facilities instantly')}
                    actions={
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsUploadModalOpen(true)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground",
                                    "hover:bg-primary/90 transition-colors"
                                )}
                            >
                                <FiPlus className="w-4 h-4" />
                                {t('organization:policy.uploadNew', 'Upload Policy')}
                            </button>
                            <button
                                onClick={fetchPolicies}
                                disabled={isLoading}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg border border-border",
                                    "hover:bg-muted transition-colors",
                                    isLoading && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                <FiRefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                                {t('common:refresh', 'Refresh')}
                            </button>
                        </div>
                    }
                />
            )}

            {!hideStats && (
                <div className="shrink-0 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            icon={FiFileText}
                            label={t('organization:policy.stats.total', 'Total Policies')}
                            value={stats.total}
                        />
                        <StatCard
                            icon={FiCheckCircle}
                            label={t('organization:policy.stats.active', 'Active')}
                            value={stats.active || 0}
                        />
                        <StatCard
                            icon={FiAlertCircle}
                            label={t('organization:policy.stats.review', 'Under Review')}
                            value={stats.review || 0}
                        />
                        <StatCard
                            icon={FiFileText}
                            label={t('organization:policy.stats.archived', 'Archived')}
                            value={stats.archived || 0}
                        />
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-auto">
                <div className="px-6 pb-6">
            <div 
                className={cn(
                    "bg-card rounded-xl border border-border hover:shadow-md transition-shadow w-full mb-4",
                    isFiltersExpanded ? 'px-6 py-3' : 'px-6 py-2'
                )}
                onMouseDown={(e) => {
                    if (e.target.closest('button[title="Parameters"]')) {
                        e.stopPropagation();
                    }
                }}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-foreground">
                        {t('organization:policy.info.title', 'Policy Library')}
                    </h3>
                    <button
                        onClick={fetchPolicies}
                        disabled={isLoading}
                        className={cn(
                            "px-4 rounded-xl border-2 border-input bg-background text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 text-sm font-medium transition-all flex items-center gap-2 shrink-0",
                            isLoading && "opacity-50 cursor-not-allowed"
                        )}
                        style={{ height: 'var(--boxed-inputfield-height)' }}
                    >
                        <FiRefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                        {t('common:refresh', 'Refresh')}
                    </button>
                </div>
                <div className="pt-3 border-t border-border mb-4">
                    <p className="text-sm text-muted-foreground">
                        {t('organization:policy.info.description', 'Browse and search for policies in the library.')}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full">
                    <div className="relative flex-1 min-w-[200px]">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t('organization:policy.searchPlaceholder', 'Search policies...')}
                            className="w-full pl-9 pr-8 rounded-xl border-2 border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-0 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.1)] transition-all hover:border-muted-foreground/30 hover:bg-muted/30"
                            style={{
                                height: 'var(--boxed-inputfield-height)',
                                fontWeight: '500',
                                fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
                                color: 'var(--boxed-inputfield-color-text)'
                            }}
                        />
                    </div>

                    <div className="relative shrink-0 w-[218px]">
                        <DateField
                            label="From"
                            value={filters.fromDate ? new Date(filters.fromDate) : null}
                            onChange={(date) => handleFilterChange('fromDate', date ? date.toISOString().split('T')[0] : '')}
                            marginBottom="0"
                            showClearButton={true}
                        />
                    </div>

                    <div className="relative shrink-0 w-[218px]">
                        <DateField
                            label="To"
                            value={filters.toDate ? new Date(filters.toDate) : null}
                            onChange={(date) => handleFilterChange('toDate', date ? date.toISOString().split('T')[0] : '')}
                            marginBottom="0"
                            showClearButton={true}
                        />
                    </div>

                    <div className="relative shrink-0">
                        <button
                            onClick={() => setShowSortDropdown(!showSortDropdown)}
                            className="px-4 rounded-xl border-2 border-input bg-background text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 text-sm font-medium transition-all flex items-center gap-2 shrink-0"
                            style={{ height: 'var(--boxed-inputfield-height)' }}
                        >
                            <FiArrowDown className="w-4 h-4" />
                            {t('organization:policy.sortBy', 'Sort by')}
                        </button>
                        {showSortDropdown && (
                            <>
                                <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={() => setShowSortDropdown(false)}
                                />
                                <div className="absolute top-full mt-2 right-0 z-20 bg-card border border-border rounded-lg shadow-lg min-w-[180px]">
                                    <button
                                        onClick={() => {
                                            setSortBy('date');
                                            setShowSortDropdown(false);
                                        }}
                                        className={cn(
                                            "w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors",
                                            sortBy === 'date' && "bg-muted"
                                        )}
                                    >
                                        {t('organization:policy.sort.date', 'Date')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSortBy('name');
                                            setShowSortDropdown(false);
                                        }}
                                        className={cn(
                                            "w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors",
                                            sortBy === 'name' && "bg-muted"
                                        )}
                                    >
                                        {t('organization:policy.sort.name', 'Name')}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

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
                        title="Parameters"
                    >
                        <FiSliders className={`w-4 h-4 ${isFiltersExpanded ? 'text-white' : ''}`} />
                        {activeCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                                {activeCount}
                            </span>
                        )}
                    </button>

                    <div className="flex items-center gap-1 border-2 border-input rounded-xl p-0.5 bg-background shrink-0" style={{ height: 'var(--boxed-inputfield-height)' }}>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "h-full aspect-square flex items-center justify-center rounded-lg transition-all",
                                viewMode === 'grid'
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                            title={t('organization:policy.view.grid', 'Grid view')}
                        >
                            <FiGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "h-full aspect-square flex items-center justify-center rounded-lg transition-all",
                                viewMode === 'list'
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                            title={t('organization:policy.view.list', 'List view')}
                        >
                            <FiList className="w-4 h-4" />
                        </button>
                    </div>
                </div>

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
                                label={t('organization:policy.filter.status', 'Status')}
                                options={[
                                    { value: 'all', label: t('organization:policy.filter.all', 'All') },
                                    ...statusOptions
                                ]}
                                value={filters.status}
                                onChange={(value) => handleFilterChange('status', value)}
                            />
                            <SimpleDropdown
                                label={t('organization:policy.filter.type', 'Type')}
                                options={[
                                    { value: 'all', label: t('organization:policy.filter.all', 'All') },
                                    ...policyTypes
                                ]}
                                value={filters.type}
                                onChange={(value) => handleFilterChange('type', value)}
                            />
                            <SimpleDropdown
                                label={t('organization:policy.filter.role', 'Role')}
                                options={availableRoles}
                                value={filters.role}
                                onChange={(value) => handleFilterChange('role', value)}
                            />
                            {isOrganizationWorkspace && memberFacilities.length > 0 && (
                                <SimpleDropdown
                                    label={t('organization:policy.filter.facility', 'Facility')}
                                    options={[
                                        { value: 'all', label: t('organization:policy.filter.allFacilities', 'All Facilities') },
                                        ...memberFacilities.map(facility => ({
                                            value: facility.id,
                                            label: facility.facilityName || facility.companyName || t('organization:labels.unnamedFacility', 'Unnamed Facility')
                                        }))
                                    ]}
                                    value={filters.facility}
                                    onChange={(value) => handleFilterChange('facility', value)}
                                />
                            )}
                            <SimpleDropdown
                                label={t('organization:policy.filter.priority', 'Priority')}
                                options={[
                                    { value: 'all', label: t('organization:policy.filter.all', 'All') },
                                    ...priorityOptions
                                ]}
                                value={filters.priority}
                                onChange={(value) => handleFilterChange('priority', value)}
                            />
                        </div>
                        {activeCount > 0 && (
                            <div className="mt-3 pt-3 border-t border-border w-full">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            setShowActiveFilters(!showActiveFilters);
                                        }}
                                        className="px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2 shrink-0"
                                        style={{ height: 'var(--boxed-inputfield-height)' }}
                                    >
                                        <FiCheck className="w-4 h-4" />
                                        {t('organization:policy.filter.apply', 'Apply Filters')}
                                    </button>
                                    
                                    {showActiveFilters && (
                                        <div className="flex-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground animate-in fade-in slide-in-from-left-1 duration-200">
                                            {filters.status !== 'all' && (
                                                <span className="px-2 py-1 rounded-md bg-muted border border-border">
                                                    {t('organization:policy.filter.status', 'Status')}: {statusOptions.find(o => o.value === filters.status)?.label || filters.status}
                                                </span>
                                            )}
                                            {filters.type !== 'all' && (
                                                <span className="px-2 py-1 rounded-md bg-muted border border-border">
                                                    {t('organization:policy.filter.type', 'Type')}: {policyTypes.find(o => o.value === filters.type)?.label || filters.type}
                                                </span>
                                            )}
                                            {filters.role !== 'all' && (
                                                <span className="px-2 py-1 rounded-md bg-muted border border-border">
                                                    {t('organization:policy.filter.role', 'Role')}: {availableRoles.find(o => o.value === filters.role)?.label || filters.role}
                                                </span>
                                            )}
                                            {filters.facility !== 'all' && (
                                                <span className="px-2 py-1 rounded-md bg-muted border border-border">
                                                    {t('organization:policy.filter.facility', 'Facility')}: {memberFacilities.find(f => f.id === filters.facility)?.facilityName || memberFacilities.find(f => f.id === filters.facility)?.companyName || filters.facility}
                                                </span>
                                            )}
                                            {filters.priority !== 'all' && (
                                                <span className="px-2 py-1 rounded-md bg-muted border border-border">
                                                    {t('organization:policy.filter.priority', 'Priority')}: {priorityOptions.find(o => o.value === filters.priority)?.label || filters.priority}
                                                </span>
                                            )}
                                            {filters.fromDate && (
                                                <span className="px-2 py-1 rounded-md bg-muted border border-border">
                                                    From: {new Date(filters.fromDate).toLocaleDateString()}
                                                </span>
                                            )}
                                            {filters.toDate && (
                                                <span className="px-2 py-1 rounded-md bg-muted border border-border">
                                                    To: {new Date(filters.toDate).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : !hasPolicies ? (
                    <div className="dashboard-empty-state">
                        <div className="dashboard-empty-state-card">
                            <div className="dashboard-empty-state-icon">
                                <FiFileText className="w-8 h-8" />
                            </div>
                            <h2 className="dashboard-empty-state-title">{t('organization:policy.empty.title', 'No policies found')}</h2>
                            <p className="dashboard-empty-state-description">
                                {t('organization:policy.empty.description', 'No policies available at the moment')}
                            </p>
                        </div>
                    </div>
                ) : !hasFilteredPolicies ? (
                    <div className="dashboard-empty-state">
                        <div className="dashboard-empty-state-card">
                            <div className="dashboard-empty-state-icon">
                                <FiSearch className="w-8 h-8" />
                            </div>
                            <h2 className="dashboard-empty-state-title">{t('organization:policy.noMatches', 'No policies match your search')}</h2>
                            <p className="dashboard-empty-state-description">
                                {t('organization:policy.noMatches.description', 'Try adjusting your filters to see more results')}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
                        {sortedPolicies.map((policy) => (
                            <div
                                key={policy.id}
                                className={cn(
                                    "bg-background border border-border rounded-lg hover:border-primary/50 transition-colors group cursor-pointer",
                                    viewMode === 'grid' ? "p-4 flex flex-col" : "flex items-center p-4"
                                )}
                                onClick={() => handlePolicySelect(policy)}
                            >
                                <div className={cn(
                                    "rounded-lg bg-primary/10 flex items-center justify-center shrink-0",
                                    viewMode === 'grid' ? "w-12 h-12 mb-3" : "w-10 h-10 mr-4"
                                )}>
                                    <FiFileText className="text-primary w-5 h-5" />
                                </div>
                                <div className={cn("flex-1 min-w-0", viewMode === 'grid' && "flex flex-col")}>
                                    <div className={cn(
                                        "flex items-start justify-between gap-2 mb-1",
                                        viewMode === 'grid' && "flex-col"
                                    )}>
                                        <h4 className={cn(
                                            "font-medium text-foreground group-hover:text-primary transition-colors",
                                            viewMode === 'grid' ? "text-base mb-2" : "truncate flex-1"
                                        )}>
                                            {policy.name}
                                        </h4>
                                        <div className="flex items-center gap-1 flex-wrap">
                                            <span
                                                className={cn(
                                                    'px-2 py-1 rounded text-xs shrink-0',
                                                    policy.status === 'active'
                                                        ? 'bg-green-100 text-green-700'
                                                        : policy.status === 'archived'
                                                        ? 'bg-gray-100 text-gray-700'
                                                        : policy.status === 'draft'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-yellow-100 text-yellow-700',
                                                    viewMode === 'grid' && "self-start"
                                                )}
                                            >
                                                {statusOptions.find(o => o.value === policy.status)?.label || policy.status}
                                            </span>
                                            {policy.priority && (
                                                <span className={cn(
                                                    'px-2 py-1 rounded text-xs shrink-0',
                                                    policy.priority === 'high' ? 'bg-red-100 text-red-700' :
                                                    policy.priority === 'medium' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-gray-100 text-gray-700'
                                                )}>
                                                    {priorityOptions.find(o => o.value === policy.priority)?.label || policy.priority}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {policy.description && (
                                        <p className={cn(
                                            "text-xs text-muted-foreground mb-1",
                                            viewMode === 'grid' ? "line-clamp-2 mb-2" : "truncate"
                                        )}>
                                            {policy.description}
                                        </p>
                                    )}
                                    <div className={cn(
                                        "flex items-center text-xs text-muted-foreground",
                                        viewMode === 'grid' && "mt-auto pt-2"
                                    )}>
                                        <FiClock className="mr-1" />
                                        {formatDate(policy.uploadedAt)}
                                    </div>
                                </div>
                                <div className={cn(
                                    "flex items-center gap-2 shrink-0",
                                    viewMode === 'grid' ? "mt-3 pt-3 border-t border-border justify-end" : "ml-2"
                                )}>
                                    {policy.downloadURL && (
                                        <a
                                            href={policy.downloadURL}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                            title={t('common:download', 'Download')}
                                        >
                                            <FiDownload className="w-4 h-4" />
                                        </a>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePolicySelect(policy);
                                        }}
                                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                        title={t('organization:policy.viewDetails', 'View Details')}
                                    >
                                        <FiEye className="w-4 h-4" />
                                    </button>
                                    {currentUser?.uid === policy.uploadedBy && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeletePolicy(policy.id, policy.storagePath);
                                            }}
                                            className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title={t('common:delete', 'Delete')}
                                        >
                                            <FiTrash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            <Dialog
                isOpen={isUploadModalOpen}
                onClose={() => {
                    if (!isUploading) {
                        setIsUploadModalOpen(false);
                        setSelectedFile(null);
                        setPolicyName('');
                        setPolicyDescription('');
                        setPolicyStatus('active');
                        setPolicyType('internal');
                        setSelectedRoles([]);
                        setSelectedFacilities([]);
                        setEffectiveDate(null);
                        setExpiryDate(null);
                        setPriority('medium');
                        setRequiresAcknowledgment(false);
                        setCreateCommunication(false);
                        setTags('');
                        setUploadProgress(0);
                    }
                }}
                title={t('organization:policy.uploadTitle', 'Upload New Policy')}
                size="medium"
                closeOnBackdropClick={!isUploading}
                actions={
                    <>
                        <button
                            onClick={() => {
                                if (!isUploading) {
                                    setIsUploadModalOpen(false);
                                    setSelectedFile(null);
                                    setPolicyName('');
                                    setPolicyDescription('');
                                    setPolicyStatus('active');
                                    setPolicyType('internal');
                                    setSelectedRoles([]);
                                    setSelectedFacilities([]);
                                    setEffectiveDate(null);
                                    setExpiryDate(null);
                                    setPriority('medium');
                                    setRequiresAcknowledgment(false);
                                    setCreateCommunication(false);
                                    setTags('');
                                    setUploadProgress(0);
                                }
                            }}
                            disabled={isUploading}
                            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t('common:cancel', 'Cancel')}
                        </button>
                        <button
                            onClick={handleUpload}
                            disabled={!selectedFile || !policyName.trim() || isUploading}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUploading
                                ? t('common:uploading', 'Uploading...')
                                : t('organization:policy.upload', 'Upload Policy')}
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="mt-4">
                        <InputField
                            label={t('organization:policy.policyName', 'Policy Name')}
                            value={policyName}
                            onChange={(e) => setPolicyName(e.target.value)}
                            placeholder={t('organization:policy.policyNamePlaceholder', 'Enter policy name')}
                            required
                            disabled={isUploading}
                            name="policyName"
                        />
                    </div>

                    <InputFieldParagraph
                        label={t('organization:policy.description', 'Description')}
                        value={policyDescription}
                        onChange={(e) => setPolicyDescription(e.target.value)}
                        placeholder={t('organization:policy.descriptionPlaceholder', 'Enter policy description (optional)')}
                        rows={3}
                        disabled={isUploading}
                        name="policyDescription"
                    />

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            {t('organization:policy.file', 'Policy File')} *
                        </label>
                        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                            <input
                                type="file"
                                onChange={handleFileSelect}
                                accept=".pdf,.doc,.docx"
                                className="hidden"
                                id="policy-file-input"
                                disabled={isUploading}
                            />
                            <label
                                htmlFor="policy-file-input"
                                className={cn(
                                    'cursor-pointer flex flex-col items-center gap-2',
                                    isUploading && 'cursor-not-allowed opacity-50'
                                )}
                            >
                                <FiUploadCloud className="w-8 h-8 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    {selectedFile
                                        ? selectedFile.name
                                        : t('organization:policy.selectFile', 'Click to select a file or drag and drop')}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {t('organization:policy.fileTypes', 'PDF or Word documents only, max 10MB')}
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SimpleDropdown
                            label={t('organization:policy.form.status', 'Status')}
                            options={statusOptions}
                            value={policyStatus}
                            onChange={setPolicyStatus}
                            disabled={isUploading}
                        />
                        <SimpleDropdown
                            label={t('organization:policy.form.type', 'Type')}
                            options={policyTypes}
                            value={policyType}
                            onChange={setPolicyType}
                            disabled={isUploading}
                        />
                        <SimpleDropdown
                            label={t('organization:policy.form.priority', 'Priority')}
                            options={priorityOptions}
                            value={priority}
                            onChange={setPriority}
                            disabled={isUploading}
                        />
                        <DateField
                            label={t('organization:policy.form.effectiveDate', 'Effective Date')}
                            value={effectiveDate}
                            onChange={setEffectiveDate}
                            marginBottom="0"
                            showClearButton={true}
                            disabled={isUploading}
                        />
                        <DateField
                            label={t('organization:policy.form.expiryDate', 'Expiry Date (Optional)')}
                            value={expiryDate}
                            onChange={setExpiryDate}
                            marginBottom="0"
                            showClearButton={true}
                            disabled={isUploading}
                        />
                        <InputField
                            label={t('organization:policy.form.tags', 'Tags (comma-separated)')}
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder={t('organization:policy.form.tagsPlaceholder', 'e.g., HR, Safety, Compliance')}
                            disabled={isUploading}
                            name="tags"
                        />
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                {t('organization:policy.form.applicableRoles', 'Applicable Roles')}
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 border border-border rounded-lg bg-background">
                                {availableRoles.filter(r => r.value !== 'all').map(role => (
                                    <label key={role.value} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedRoles.includes(role.value)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedRoles([...selectedRoles, role.value]);
                                                } else {
                                                    setSelectedRoles(selectedRoles.filter(r => r !== role.value));
                                                }
                                            }}
                                            disabled={isUploading}
                                            className="rounded border-border"
                                        />
                                        <span className="text-sm text-foreground">{role.label}</span>
                                    </label>
                                ))}
                            </div>
                            {selectedRoles.length === 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t('organization:policy.form.allRolesNote', 'Leave empty to apply to all roles')}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                {t('organization:policy.form.applicableFacilities', 'Applicable Facilities')}
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 border border-border rounded-lg bg-background max-h-40 overflow-y-auto">
                                {memberFacilities.map(facility => (
                                    <label key={facility.id} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedFacilities.includes(facility.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedFacilities([...selectedFacilities, facility.id]);
                                                } else {
                                                    setSelectedFacilities(selectedFacilities.filter(f => f !== facility.id));
                                                }
                                            }}
                                            disabled={isUploading}
                                            className="rounded border-border"
                                        />
                                        <span className="text-sm text-foreground">
                                            {facility.facilityName || facility.companyName || t('organization:labels.unnamedFacility', 'Unnamed Facility')}
                                        </span>
                                    </label>
                                ))}
                            </div>
                            {selectedFacilities.length === 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t('organization:policy.form.allFacilitiesNote', 'Leave empty to apply to all facilities')}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="pt-2 border-t border-border">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-sm font-medium text-foreground">
                                {t('organization:policy.options', 'Additional Options')}
                            </span>
                        </div>
                        <div className="space-y-3">
                            <BoxedSwitchField
                                label={t('organization:policy.form.requiresAcknowledgment', 'Requires Acknowledgment')}
                                checked={requiresAcknowledgment}
                                onChange={setRequiresAcknowledgment}
                                disabled={isUploading}
                            />
                            <BoxedSwitchField
                                label={t('organization:policy.createCommunication', 'Create Communication')}
                                checked={createCommunication}
                                onChange={setCreateCommunication}
                                disabled={isUploading}
                            />
                        </div>
                    </div>

                    {isUploading && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{t('common:uploading', 'Uploading')}...</span>
                                <span className="text-muted-foreground">{Math.round(uploadProgress)}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                                <div
                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </Dialog>

            <Dialog
                isOpen={isDetailsModalOpen}
                onClose={handleCloseDetails}
                title={selectedPolicy ? selectedPolicy.name : t('organization:policy.details', 'Policy Details')}
                size="large"
                closeOnBackdropClick={true}
            >
                {selectedPolicy && (
                    <div className="space-y-6 max-h-[70vh] overflow-y-auto">
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-2">
                                {t('organization:policy.description', 'Description')}
                            </h3>
                            <p className="text-sm text-foreground">
                                {selectedPolicy.description || t('organization:policy.noDescription', 'No description provided')}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                                    {t('organization:policy.status', 'Status')}
                                </h3>
                                <span
                                    className={cn(
                                        'inline-block px-3 py-1 rounded text-sm',
                                        selectedPolicy.status === 'active'
                                            ? 'bg-green-100 text-green-700'
                                            : selectedPolicy.status === 'archived'
                                            ? 'bg-gray-100 text-gray-700'
                                            : selectedPolicy.status === 'draft'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-yellow-100 text-yellow-700'
                                    )}
                                >
                                    {statusOptions.find(o => o.value === selectedPolicy.status)?.label || selectedPolicy.status}
                                </span>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                                    {t('organization:policy.form.type', 'Type')}
                                </h3>
                                <p className="text-sm text-foreground">
                                    {policyTypes.find(o => o.value === selectedPolicy.type)?.label || selectedPolicy.type || 'N/A'}
                                </p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                                    {t('organization:policy.form.priority', 'Priority')}
                                </h3>
                                {selectedPolicy.priority ? (
                                    <span className={cn(
                                        'inline-block px-3 py-1 rounded text-sm',
                                        selectedPolicy.priority === 'high' ? 'bg-red-100 text-red-700' :
                                        selectedPolicy.priority === 'medium' ? 'bg-orange-100 text-orange-700' :
                                        'bg-gray-100 text-gray-700'
                                    )}>
                                        {priorityOptions.find(o => o.value === selectedPolicy.priority)?.label || selectedPolicy.priority}
                                    </span>
                                ) : (
                                    <p className="text-sm text-foreground">N/A</p>
                                )}
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                                    {t('organization:policy.uploadedAt', 'Uploaded')}
                                </h3>
                                <p className="text-sm text-foreground flex items-center">
                                    <FiClock className="mr-1" />
                                    {formatDate(selectedPolicy.uploadedAt)}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                                    {t('organization:policy.form.effectiveDate', 'Effective Date')}
                                </h3>
                                <p className="text-sm text-foreground">
                                    {selectedPolicy.effectiveDate ? (
                                        selectedPolicy.effectiveDate.toDate 
                                            ? formatDate(selectedPolicy.effectiveDate) 
                                            : new Date(selectedPolicy.effectiveDate).toLocaleDateString()
                                    ) : t('organization:policy.form.immediate', 'Immediate')}
                                </p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                                    {t('organization:policy.form.expiryDate', 'Expiry Date')}
                                </h3>
                                <p className="text-sm text-foreground">
                                    {selectedPolicy.expiryDate ? (
                                        selectedPolicy.expiryDate.toDate 
                                            ? formatDate(selectedPolicy.expiryDate) 
                                            : new Date(selectedPolicy.expiryDate).toLocaleDateString()
                                    ) : t('organization:policy.form.noExpiry', 'No expiry')}
                                </p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                                    {t('organization:policy.fileName', 'File Name')}
                                </h3>
                                <p className="text-sm text-foreground">{selectedPolicy.fileName}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                                    {t('organization:policy.fileSize', 'File Size')}
                                </h3>
                                <p className="text-sm text-foreground">
                                    {selectedPolicy.fileSize ? `${(selectedPolicy.fileSize / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                                </p>
                            </div>
                        </div>

                        {selectedPolicy.roles && selectedPolicy.roles.length > 0 && !selectedPolicy.roles.includes('all') && (
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                                    {t('organization:policy.form.applicableRoles', 'Applicable Roles')}
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {selectedPolicy.roles.map(role => (
                                        <span key={role} className="px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                                            {availableRoles.find(r => r.value === role)?.label || role}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedPolicy.facilities && selectedPolicy.facilities.length > 0 && !selectedPolicy.facilities.includes('all') && (
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                                    {t('organization:policy.form.applicableFacilities', 'Applicable Facilities')}
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {selectedPolicy.facilities.map(facilityId => {
                                        const facility = memberFacilities.find(f => f.id === facilityId);
                                        return facility ? (
                                            <span key={facilityId} className="px-3 py-1 rounded-full text-xs bg-purple-100 text-purple-700">
                                                {facility.facilityName || facility.companyName || t('organization:labels.unnamedFacility', 'Unnamed Facility')}
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            </div>
                        )}

                        {selectedPolicy.tags && selectedPolicy.tags.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                                    {t('organization:policy.form.tags', 'Tags')}
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {selectedPolicy.tags.map(tag => (
                                        <span key={tag} className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-muted-foreground">
                                {t('organization:policy.options', 'Additional Options')}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {selectedPolicy.requiresAcknowledgment && (
                                    <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-700">
                                        {t('organization:policy.form.requiresAcknowledgment', 'Requires Acknowledgment')}
                                    </span>
                                )}
                                {selectedPolicy.createCommunication && (
                                    <span className="px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                                        {t('organization:policy.createCommunication', 'Create Communication')}
                                    </span>
                                )}
                            </div>
                        </div>

                        {selectedPolicy.downloadURL && (
                            <div className="pt-4 border-t border-border">
                                <a
                                    href={selectedPolicy.downloadURL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    <FiDownload className="w-4 h-4" />
                                    {t('common:download', 'Download')}
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </Dialog>
                </div>
            </div>
        </div>
    );
};

PolicyLibrary.propTypes = {
    hideHeader: PropTypes.bool,
    hideStats: PropTypes.bool
};

export default PolicyLibrary;
