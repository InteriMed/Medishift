import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs, Timestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../services/services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import { Download, FileText, FileCode, FileType } from 'lucide-react';
import { format } from 'date-fns';
import SimpleDropdown from '../../../../components/boxedInputFields/dropdownField';
import Button from '../../../../components/boxedInputFields/button';
import FilterBar from '../../../pages/marketplace/components/filterbar';
import PageHeader from '../../../shared/components/titles/PageHeader';
import '../../../../styles/variables.css';

const ConsolidatedPayroll = () => {
    const { t } = useTranslation(['admin', 'common']);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        fromDate: '',
        toDate: '',
        exportType: 'weekly',
        exportFormat: 'csv'
    });

    const exportType = filters.exportType || 'weekly';
    const exportFormat = filters.exportFormat || 'csv';

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleClearFilters = () => {
        setFilters({
            fromDate: '',
            toDate: '',
            exportType: 'weekly',
            exportFormat: 'csv'
        });
    };

    const getDateRange = () => {
        const now = new Date();
        let start, end;

        switch (exportType) {
            case 'weekly':
                const day = now.getDay();
                const diff = day === 0 ? -6 : 1 - day;
                start = new Date(now);
                start.setDate(now.getDate() + diff);
                start.setHours(0, 0, 0, 0);
                end = new Date(start);
                end.setDate(start.getDate() + 6);
                end.setHours(23, 59, 59, 999);
                break;
            case 'monthly':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'period':
                start = filters.fromDate ? new Date(filters.fromDate) : null;
                end = filters.toDate ? new Date(filters.toDate) : null;
                if (end) end.setHours(23, 59, 59, 999);
                break;
            case 'unexported':
            case 'unexportedUsers':
            case 'allUsers':
                start = null;
                end = null;
                break;
            default:
                start = null;
                end = null;
        }

        return { start, end };
    };

    const handleExport = async () => {
        setLoading(true);
        try {
            if (exportType === 'unexportedUsers' || exportType === 'allUsers') {
                await handleUserExport();
                return;
            }

            const { start, end } = getDateRange();
            const shiftsRef = collection(db, 'shifts');
            let shiftsQuery;

            if (exportType === 'unexported') {
                shiftsQuery = query(
                    shiftsRef,
                    where('status', '==', 'completed'),
                    where('payrollExported', '==', false)
                );
            } else {
                shiftsQuery = query(shiftsRef, where('status', '==', 'completed'));
                if (start) {
                    shiftsQuery = query(shiftsQuery, where('startTime', '>=', Timestamp.fromDate(start)));
                }
                if (end) {
                    shiftsQuery = query(shiftsQuery, where('startTime', '<=', Timestamp.fromDate(end)));
                }
            }

            const shiftsSnapshot = await getDocs(shiftsQuery);

            if (shiftsSnapshot.empty) {
                alert(t('admin:payroll.errors.noShifts', 'No shifts found for the selected period.'));
                setLoading(false);
                return;
            }

            const shiftsData = [];
            const userCache = {};

            for (const shiftDoc of shiftsSnapshot.docs) {
                const shift = shiftDoc.data();
                const userId = shift.assignedUserId;
                if (!userId) continue;

                if (!userCache[userId]) {
                    const userDoc = await getDocs(query(collection(db, FIRESTORE_COLLECTIONS.USERS), where('__name__', '==', userId)));
                    if (!userDoc.empty) {
                        userCache[userId] = userDoc.docs[0].data();
                    }
                }

                const user = userCache[userId] || {};
                const start = shift.startTime?.toDate();
                const end = shift.endTime?.toDate();
                const hoursWorked = start && end ? (end - start) / (1000 * 60 * 60) : 0;

                shiftsData.push({
                    shiftId: shiftDoc.id,
                    userId: userId,
                    firstName: user.firstName || '',
                    lastName: user.lastName || '',
                    email: user.email || '',
                    phone: user.phone || '',
                    birthDate: user.birthDate?.toDate?.()?.toLocaleDateString() || user.birthDate || '',
                    avs: user.avs || '',
                    gln: user.gln || '',
                    iban: user.iban || '',
                    address: user.address || '',
                    city: user.city || '',
                    postalCode: user.postalCode || '',
                    facilityId: shift.facilityId || '',
                    role: shift.role || '',
                    date: shift.date?.toDate?.()?.toLocaleDateString() || '',
                    startTime: start?.toLocaleString() || '',
                    endTime: end?.toLocaleString() || '',
                    hoursWorked: hoursWorked.toFixed(2),
                    hourlyRate: shift.hourlyRate || '',
                    totalPay: (hoursWorked * (shift.hourlyRate || 0)).toFixed(2),
                    status: shift.status || '',
                    payrollExported: shift.payrollExported || false
                });
            }

            const { fileContent, mimeType, fileExtension } = generateFileContent(shiftsData, 'shifts');

            downloadFile(fileContent, mimeType, fileExtension, `payroll_export_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.${fileExtension}`);

            if (exportType === 'unexported') {
                const updatePromises = shiftsSnapshot.docs.map(shiftDoc =>
                    updateDoc(doc(db, 'shifts', shiftDoc.id), { payrollExported: true })
                );
                await Promise.all(updatePromises);
            }

            alert(t('admin:payroll.success.exported', { count: shiftsData.length }, `Successfully exported ${shiftsData.length} shifts.`));
        } catch (error) {
            console.error('Error exporting payroll:', error);
            alert(t('admin:payroll.errors.exportFailed', 'Error exporting payroll data. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    const handleUserExport = async () => {
        try {
            const usersRef = collection(db, FIRESTORE_COLLECTIONS.USERS);
            const usersSnapshot = await getDocs(usersRef);

            const professionalDocs = usersSnapshot.docs.filter(docSnap => {
                const data = docSnap.data();
                const role = data.role?.toLowerCase();
                const roles = (Array.isArray(data.roles) ? data.roles : [])
                    .filter(r => typeof r === 'string')
                    .map(r => r.toLowerCase());
                return role === 'professional' || roles.includes('professional') || data.isProfessionalProfileComplete;
            });

            if (professionalDocs.length === 0) {
                alert(t('admin:payroll.errors.noUsers', 'No professional users found.'));
                setLoading(false);
                return;
            }

            const usersData = [];
            const userIdsToUpdate = [];
            const exportAllUsers = exportType === 'allUsers';

            for (const userDoc of professionalDocs) {
                const userData = userDoc.data();
                const userId = userDoc.id;

                if (!exportAllUsers && userData.userPayrollExported) {
                    continue;
                }

                const professionalProfileDoc = await getDoc(doc(db, 'professionalProfiles', userId));
                const profileData = professionalProfileDoc.exists() ? professionalProfileDoc.data() : {};

                const identity = profileData.identity || {};
                const contact = profileData.contact || {};
                const banking = profileData.banking || {};
                const payrollData = profileData.payrollData || {};
                const employmentEligibility = profileData.employmentEligibility || {};
                const residentialAddress = contact.residentialAddress || {};
                const billingAddress = profileData.billingAddress || {};
                const insurance = profileData.insurance || {};
                const workPermit = employmentEligibility.workPermit || {};
                const withholdingTaxInfo = payrollData.withholdingTaxInfo || {};

                const formatDate = (dateValue) => {
                    if (!dateValue) return '';
                    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
                        return dateValue.toDate().toLocaleDateString();
                    }
                    if (dateValue instanceof Date) {
                        return dateValue.toLocaleDateString();
                    }
                    try {
                        return new Date(dateValue).toLocaleDateString();
                    } catch {
                        return String(dateValue);
                    }
                };

                usersData.push({
                    userId: userId,
                    email: userData.email || contact.primaryEmail || '',
                    firstName: userData.firstName || identity.legalFirstName || identity.firstName || '',
                    lastName: userData.lastName || identity.legalLastName || identity.lastName || '',
                    legalFirstName: identity.legalFirstName || userData.firstName || '',
                    legalLastName: identity.legalLastName || userData.lastName || '',
                    dateOfBirth: formatDate(identity.dateOfBirth),
                    nationality: identity.nationality || '',
                    ahvNumber: identity.ahvNumber || '',
                    primaryPhone: contact.primaryPhone || '',
                    primaryPhonePrefix: contact.primaryPhonePrefix || '',
                    residentialStreet: residentialAddress.street || '',
                    residentialNumber: residentialAddress.number || '',
                    residentialPostalCode: residentialAddress.postalCode || '',
                    residentialCity: residentialAddress.city || '',
                    residentialCanton: residentialAddress.canton || '',
                    residentialCountry: residentialAddress.country || 'CH',
                    iban: banking.iban || '',
                    bicSwift: banking.bicSwift || banking.bic || '',
                    bankName: banking.bankName || '',
                    accountHolderName: banking.accountHolderName || '',
                    avsNumber: insurance.avsNumber || identity.ahvNumber || '',
                    insuranceName: insurance.insuranceName || '',
                    billingStreet: billingAddress.street || residentialAddress.street || '',
                    billingNumber: billingAddress.number || residentialAddress.number || '',
                    billingPostalCode: billingAddress.postalCode || residentialAddress.postalCode || '',
                    billingCity: billingAddress.city || residentialAddress.city || '',
                    billingCanton: billingAddress.canton || residentialAddress.canton || '',
                    billingCountry: billingAddress.country || residentialAddress.country || 'CH',
                    sameAsResidential: profileData.sameAsResidential || false,
                    civilStatus: payrollData.civilStatus || '',
                    numberOfChildren: payrollData.numberOfChildren || 0,
                    familyAllocation: payrollData.familyAllocation || '',
                    withholdingTaxSubject: withholdingTaxInfo.isSubject || false,
                    withholdingTaxCanton: withholdingTaxInfo.taxCanton || '',
                    withholdingTaxRateGroup: withholdingTaxInfo.rateGroup || '',
                    religion: payrollData.religion || '',
                    workPermitType: workPermit.type || '',
                    workPermitNumber: workPermit.permitNumber || '',
                    workPermitExpiryDate: formatDate(workPermit.expiryDate),
                    workPermitIssuingCanton: workPermit.issuingCanton || '',
                    taxationLocation: payrollData.taxationLocation || '',
                    spouseName: payrollData.spouse?.name || '',
                    spouseBirthdate: formatDate(payrollData.spouse?.birthdate),
                    spousePermitType: payrollData.spouse?.permitType || '',
                    spouseActivity: payrollData.spouse?.activity || '',
                    spouseInSwitzerland: payrollData.spouse?.inSwitzerland || false,
                    spouseActivityPercentage: payrollData.spouse?.activityPercentage || ''
                });

                if (!exportAllUsers) {
                    userIdsToUpdate.push(userId);
                }
            }

            if (usersData.length === 0) {
                alert(exportAllUsers ? t('admin:payroll.errors.noUsers', 'No professional users found.') : t('admin:payroll.errors.noUnexportedUsers', 'No unexported users found.'));
                setLoading(false);
                return;
            }

            const { fileContent, mimeType, fileExtension } = generateFileContent(usersData, 'users');
            downloadFile(fileContent, mimeType, fileExtension, `user_payroll_export_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.${fileExtension}`);

            if (!exportAllUsers && userIdsToUpdate.length > 0) {
                const updatePromises = userIdsToUpdate.map(userId =>
                    updateDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, userId), { userPayrollExported: true })
                );
                await Promise.all(updatePromises);
            }

            alert(t('admin:payroll.success.exportedUsers', { count: usersData.length }, `Successfully exported ${usersData.length} users.`));
        } catch (error) {
            console.error('Error exporting users:', error);
            alert(t('admin:payroll.errors.exportFailed', 'Error exporting user data. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    const generateFileContent = (data, type) => {
        if (exportFormat === 'csv') {
            return generateCSV(data, type);
        } else if (exportFormat === 'xml') {
            return generateXML(data, type);
        } else {
            return generateTXT(data, type);
        }
    };

    const generateCSV = (data, type) => {
        const headers = type === 'shifts' ? [
            'Shift ID', 'User ID', 'First Name', 'Last Name', 'Email', 'Phone',
            'Birth Date', 'AVS Number', 'GLN Number', 'IBAN', 'Address', 'City',
            'Postal Code', 'Facility ID', 'Role', 'Date', 'Start Time', 'End Time',
            'Hours Worked', 'Hourly Rate (CHF)', 'Total Pay (CHF)', 'Status', 'Previously Exported'
        ] : [
            'User ID', 'Email', 'First Name', 'Last Name', 'Legal First Name', 'Legal Last Name',
            'Date of Birth', 'Nationality', 'AHV Number', 'Primary Phone', 'IBAN', 'BIC/SWIFT',
            'Bank Name', 'Account Holder', 'AVS Number', 'Civil Status', 'Number of Children'
        ];

        const csvRows = [
            headers.join(','),
            ...data.map(row => Object.values(row).map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        ];

        return {
            fileContent: csvRows.join('\n'),
            mimeType: 'text/csv;charset=utf-8;',
            fileExtension: 'csv'
        };
    };

    const generateXML = (data, type) => {
        const rootTag = type === 'shifts' ? 'payrollExport' : 'userPayrollExport';
        const itemTag = type === 'shifts' ? 'shift' : 'user';
        const itemsTag = type === 'shifts' ? 'shifts' : 'users';

        let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xmlContent += `<${rootTag}>\n`;
        xmlContent += `  <exportDate>${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</exportDate>\n`;
        xmlContent += `  <totalRecords>${data.length}</totalRecords>\n`;
        xmlContent += `  <${itemsTag}>\n`;

        data.forEach(row => {
            xmlContent += `    <${itemTag}>\n`;
            Object.entries(row).forEach(([key, value]) => {
                const tagName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                xmlContent += `      <${tagName}>${escapeXml(String(value))}</${tagName}>\n`;
            });
            xmlContent += `    </${itemTag}>\n`;
        });

        xmlContent += `  </${itemsTag}>\n`;
        xmlContent += `</${rootTag}>`;

        return {
            fileContent: xmlContent,
            mimeType: 'application/xml;charset=utf-8;',
            fileExtension: 'xml'
        };
    };

    const generateTXT = (data, type) => {
        const headers = type === 'shifts' ? [
            'Shift ID', 'User ID', 'First Name', 'Last Name', 'Email', 'Phone',
            'Birth Date', 'AVS Number', 'GLN Number', 'IBAN', 'Address', 'City',
            'Postal Code', 'Facility ID', 'Role', 'Date', 'Start Time', 'End Time',
            'Hours Worked', 'Hourly Rate (CHF)', 'Total Pay (CHF)', 'Status', 'Previously Exported'
        ] : [
            'User ID', 'Email', 'First Name', 'Last Name', 'Legal First Name', 'Legal Last Name',
            'Date of Birth', 'Nationality', 'AHV Number', 'Primary Phone', 'IBAN', 'BIC/SWIFT',
            'Bank Name', 'Account Holder', 'AVS Number', 'Civil Status', 'Number of Children'
        ];

        const headerLine = headers.join('\t');
        const dataLines = data.map(row => Object.values(row).join('\t'));

        return {
            fileContent: [headerLine, ...dataLines].join('\n'),
            mimeType: 'text/plain;charset=utf-8;',
            fileExtension: 'txt'
        };
    };

    const downloadFile = (fileContent, mimeType, fileExtension, filename) => {
        const blob = new Blob([fileContent], { type: mimeType });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const escapeXml = (str) => {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    };

    const exportTypeOptions = [
        { value: 'weekly', label: t('admin:payroll.exportType.weekly', 'Weekly - Current Week') },
        { value: 'monthly', label: t('admin:payroll.exportType.monthly', 'Monthly - Current Month') },
        { value: 'period', label: t('admin:payroll.exportType.period', 'Custom Period') },
        { value: 'unexported', label: t('admin:payroll.exportType.unexported', 'Unexported Shifts Only') },
        { value: 'unexportedUsers', label: t('admin:payroll.exportType.unexportedUsers', 'Unexported Users Only') },
        { value: 'allUsers', label: t('admin:payroll.exportType.allUsers', 'All Users') }
    ];

    const exportFormatOptions = [
        { value: 'csv', label: t('admin:payroll.format.csv', 'CSV (Comma Separated Values)') },
        { value: 'xml', label: t('admin:payroll.format.xml', 'XML (Extensible Markup Language)') },
        { value: 'txt', label: t('admin:payroll.format.txt', 'TXT (Tab Delimited Text)') }
    ];

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <PageHeader
                title={t('admin:payroll.title', 'Consolidated Payroll')}
                subtitle={t('admin:payroll.subtitle', 'Export payroll data for all facilities')}
            />

            <div className="shrink-0 px-6 py-6">
                <FilterBar
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onClearFilters={handleClearFilters}
                    dropdownFields={[
                        {
                            key: 'exportType',
                            label: t('admin:payroll.filter.exportType', 'Export Type'),
                            options: exportTypeOptions,
                            defaultValue: 'weekly'
                        },
                        {
                            key: 'exportFormat',
                            label: t('admin:payroll.filter.exportFormat', 'Export Format'),
                            options: exportFormatOptions,
                            defaultValue: 'csv'
                        }
                    ]}
                    dateFields={[
                        {
                            key: 'fromDate',
                            showClearButton: true
                        },
                        {
                            key: 'toDate',
                            showClearButton: true
                        }
                    ]}
                    translationNamespace="admin"
                    title={t('admin:payroll.info.title', 'Consolidated Payroll')}
                    description={t('admin:payroll.info.description', 'Export payroll data for shifts or users in various formats.')}
                />
            </div>

            <div className="flex-1 overflow-auto px-6 pb-6">
                <div className="bg-card rounded-xl border border-border p-6">
                    <div className="flex flex-col gap-4">
                        <div>
                            <Button
                                onClick={handleExport}
                                disabled={loading || (exportType === 'period' && (!filters.fromDate || !filters.toDate))}
                                variant="primary"
                                style={{
                                    width: '100%',
                                    padding: 'var(--spacing-md) var(--spacing-xl)',
                                    fontSize: 'var(--font-size-medium)',
                                    fontWeight: 'var(--font-weight-medium)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 'var(--spacing-sm)'
                                }}
                            >
                                {exportFormat === 'csv' && <FileText style={{ width: '20px', height: '20px' }} />}
                                {exportFormat === 'xml' && <FileCode style={{ width: '20px', height: '20px' }} />}
                                {exportFormat === 'txt' && <FileType style={{ width: '20px', height: '20px' }} />}
                                <Download style={{ width: '20px', height: '20px' }} />
                                {loading
                                    ? t('admin:payroll.exporting', 'Exporting...')
                                    : t('admin:payroll.exportButton', 'Export Payroll Data')
                                }
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConsolidatedPayroll;

