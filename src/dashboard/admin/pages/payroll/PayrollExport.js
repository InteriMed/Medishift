import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs, Timestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { Download, Calendar, Users, Clock, FileText, CheckCircle, Info, FileCode, FileType } from 'lucide-react';
import { format } from 'date-fns';
import SimpleDropdown from '../../../../components/BoxedInputFields/Dropdown-Field';
import Button from '../../../../components/BoxedInputFields/Button';
import PersonnalizedInputField from '../../../../components/BoxedInputFields/Personnalized-InputField';
import '../../../../styles/variables.css';

const PayrollExport = () => {
    const { t } = useTranslation(['admin']);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('shifts');
    const [exportType, setExportType] = useState('weekly');
    const [exportFormat, setExportFormat] = useState('csv');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalShifts: 0,
        totalHours: 0,
        unexportedCount: 0,
        unexportedUsersCount: 0
    });

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            // Get total professional users
            const usersRef = collection(db, 'users');
            const usersSnapshot = await getDocs(usersRef);

            // Filter professionals locally to support both role (string) and roles (array)
            const professionalUsers = usersSnapshot.docs.filter(docSnap => {
                const data = docSnap.data();
                const role = data.role?.toLowerCase();
                const roles = (Array.isArray(data.roles) ? data.roles : []).map(r => r.toLowerCase());
                return role === 'professional' || roles.includes('professional') || data.isProfessionalProfileComplete;
            });

            // Get all completed shifts
            const shiftsRef = collection(db, 'shifts');
            const completedQuery = query(shiftsRef, where('status', '==', 'completed'));
            const shiftsSnapshot = await getDocs(completedQuery);

            // Get unexported shifts
            const unexportedQuery = query(
                shiftsRef,
                where('status', '==', 'completed'),
                where('payrollExported', '==', false)
            );
            const unexportedSnapshot = await getDocs(unexportedQuery);

            // Get unexported users
            let unexportedUsersCount = 0;
            professionalUsers.forEach((userDoc) => {
                const userData = userDoc.data();
                if (!userData.userPayrollExported) {
                    unexportedUsersCount++;
                }
            });

            // Calculate total hours
            let totalHours = 0;
            shiftsSnapshot.forEach(docSnap => {
                const shift = docSnap.data();
                if (shift.startTime && shift.endTime) {
                    const start = shift.startTime.toDate();
                    const end = shift.endTime.toDate();
                    const hours = (end - start) / (1000 * 60 * 60);
                    totalHours += hours;
                }
            });

            setStats({
                totalUsers: professionalUsers.length,
                totalShifts: shiftsSnapshot.size,
                totalHours: Math.round(totalHours),
                unexportedCount: unexportedSnapshot.size,
                unexportedUsersCount: unexportedUsersCount
            });
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    const getDateRange = () => {
        const now = new Date();
        let start, end;

        switch (exportType) {
            case 'weekly':
                // Current week (Monday to Sunday)
                const day = now.getDay();
                const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
                start = new Date(now);
                start.setDate(now.getDate() + diff);
                start.setHours(0, 0, 0, 0);

                end = new Date(start);
                end.setDate(start.getDate() + 6);
                end.setHours(23, 59, 59, 999);
                break;

            case 'monthly':
                // Current month
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;

            case 'period':
                // Custom period
                start = startDate ? new Date(startDate) : null;
                end = endDate ? new Date(endDate) : null;
                if (end) end.setHours(23, 59, 59, 999);
                break;

            case 'unexported':
                // All unexported data
                start = null;
                end = null;
                break;

            case 'unexportedUsers':
                // All unexported users
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
            if (activeTab === 'users' || exportType === 'unexportedUsers' || exportType === 'allUsers') {
                await handleUserExport();
                return;
            }

            const { start, end } = getDateRange();

            // Build query
            const shiftsRef = collection(db, 'shifts');
            let shiftsQuery;

            if (exportType === 'unexported') {
                shiftsQuery = query(
                    shiftsRef,
                    where('status', '==', 'completed'),
                    where('payrollExported', '==', false)
                );
            } else {
                shiftsQuery = query(
                    shiftsRef,
                    where('status', '==', 'completed')
                );

                if (start) {
                    shiftsQuery = query(shiftsQuery, where('startTime', '>=', Timestamp.fromDate(start)));
                }
                if (end) {
                    shiftsQuery = query(shiftsQuery, where('startTime', '<=', Timestamp.fromDate(end)));
                }
            }

            const shiftsSnapshot = await getDocs(shiftsQuery);

            if (shiftsSnapshot.empty) {
                alert('No shifts found for the selected period.');
                setLoading(false);
                return;
            }

            // Get user details for each shift
            const shiftsData = [];
            const userCache = {};

            for (const shiftDoc of shiftsSnapshot.docs) {
                const shift = shiftDoc.data();
                const userId = shift.assignedUserId;

                if (!userId) continue;

                // Get user data (cached to avoid repeated queries)
                if (!userCache[userId]) {
                    const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', userId)));
                    if (!userDoc.empty) {
                        userCache[userId] = userDoc.docs[0].data();
                    }
                }

                const user = userCache[userId] || {};

                // Calculate hours worked
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

            let fileContent = '';
            let mimeType = '';
            let fileExtension = '';

            if (exportFormat === 'csv') {
                const headers = [
                    'Shift ID',
                    'User ID',
                    'First Name',
                    'Last Name',
                    'Email',
                    'Phone',
                    'Birth Date',
                    'AVS Number',
                    'GLN Number',
                    'IBAN',
                    'Address',
                    'City',
                    'Postal Code',
                    'Facility ID',
                    'Role',
                    'Date',
                    'Start Time',
                    'End Time',
                    'Hours Worked',
                    'Hourly Rate (CHF)',
                    'Total Pay (CHF)',
                    'Status',
                    'Previously Exported'
                ];

                const csvRows = [
                    headers.join(','),
                    ...shiftsData.map(row => [
                        row.shiftId,
                        row.userId,
                        row.firstName,
                        row.lastName,
                        row.email,
                        row.phone,
                        row.birthDate,
                        row.avs,
                        row.gln,
                        row.iban,
                        row.address,
                        row.city,
                        row.postalCode,
                        row.facilityId,
                        row.role,
                        row.date,
                        row.startTime,
                        row.endTime,
                        row.hoursWorked,
                        row.hourlyRate,
                        row.totalPay,
                        row.status,
                        row.payrollExported ? 'Yes' : 'No'
                    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
                ];

                fileContent = csvRows.join('\n');
                mimeType = 'text/csv;charset=utf-8;';
                fileExtension = 'csv';
            } else if (exportFormat === 'xml') {
                let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
                xmlContent += '<payrollExport>\n';
                xmlContent += `  <exportDate>${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</exportDate>\n`;
                xmlContent += `  <totalRecords>${shiftsData.length}</totalRecords>\n`;
                xmlContent += '  <shifts>\n';

                shiftsData.forEach(row => {
                    xmlContent += '    <shift>\n';
                    xmlContent += `      <shiftId>${escapeXml(row.shiftId)}</shiftId>\n`;
                    xmlContent += `      <userId>${escapeXml(row.userId)}</userId>\n`;
                    xmlContent += `      <firstName>${escapeXml(row.firstName)}</firstName>\n`;
                    xmlContent += `      <lastName>${escapeXml(row.lastName)}</lastName>\n`;
                    xmlContent += `      <email>${escapeXml(row.email)}</email>\n`;
                    xmlContent += `      <phone>${escapeXml(row.phone)}</phone>\n`;
                    xmlContent += `      <birthDate>${escapeXml(row.birthDate)}</birthDate>\n`;
                    xmlContent += `      <avsNumber>${escapeXml(row.avs)}</avsNumber>\n`;
                    xmlContent += `      <glnNumber>${escapeXml(row.gln)}</glnNumber>\n`;
                    xmlContent += `      <iban>${escapeXml(row.iban)}</iban>\n`;
                    xmlContent += `      <address>${escapeXml(row.address)}</address>\n`;
                    xmlContent += `      <city>${escapeXml(row.city)}</city>\n`;
                    xmlContent += `      <postalCode>${escapeXml(row.postalCode)}</postalCode>\n`;
                    xmlContent += `      <facilityId>${escapeXml(row.facilityId)}</facilityId>\n`;
                    xmlContent += `      <role>${escapeXml(row.role)}</role>\n`;
                    xmlContent += `      <date>${escapeXml(row.date)}</date>\n`;
                    xmlContent += `      <startTime>${escapeXml(row.startTime)}</startTime>\n`;
                    xmlContent += `      <endTime>${escapeXml(row.endTime)}</endTime>\n`;
                    xmlContent += `      <hoursWorked>${escapeXml(row.hoursWorked)}</hoursWorked>\n`;
                    xmlContent += `      <hourlyRate>${escapeXml(row.hourlyRate)}</hourlyRate>\n`;
                    xmlContent += `      <totalPay>${escapeXml(row.totalPay)}</totalPay>\n`;
                    xmlContent += `      <status>${escapeXml(row.status)}</status>\n`;
                    xmlContent += `      <previouslyExported>${row.payrollExported ? 'Yes' : 'No'}</previouslyExported>\n`;
                    xmlContent += '    </shift>\n';
                });

                xmlContent += '  </shifts>\n';
                xmlContent += '</payrollExport>';
                fileContent = xmlContent;
                mimeType = 'application/xml;charset=utf-8;';
                fileExtension = 'xml';
            } else if (exportFormat === 'txt') {
                const headers = [
                    'Shift ID', 'User ID', 'First Name', 'Last Name', 'Email', 'Phone',
                    'Birth Date', 'AVS Number', 'GLN Number', 'IBAN', 'Address', 'City',
                    'Postal Code', 'Facility ID', 'Role', 'Date', 'Start Time', 'End Time',
                    'Hours Worked', 'Hourly Rate (CHF)', 'Total Pay (CHF)', 'Status', 'Previously Exported'
                ];

                const headerLine = headers.join('\t');
                const dataLines = shiftsData.map(row => [
                    row.shiftId, row.userId, row.firstName, row.lastName, row.email, row.phone,
                    row.birthDate, row.avs, row.gln, row.iban, row.address, row.city,
                    row.postalCode, row.facilityId, row.role, row.date, row.startTime, row.endTime,
                    row.hoursWorked, row.hourlyRate, row.totalPay, row.status, row.payrollExported ? 'Yes' : 'No'
                ].join('\t'));

                fileContent = [headerLine, ...dataLines].join('\n');
                mimeType = 'text/plain;charset=utf-8;';
                fileExtension = 'txt';
            }

            const blob = new Blob([fileContent], { type: mimeType });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `payroll_export_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.${fileExtension}`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Mark shifts as exported
            if (exportType === 'unexported') {
                const updatePromises = shiftsSnapshot.docs.map(shiftDoc =>
                    updateDoc(doc(db, 'shifts', shiftDoc.id), { payrollExported: true })
                );
                await Promise.all(updatePromises);

                // Refresh stats
                await loadStats();
            }

            alert(`Successfully exported ${shiftsData.length} shifts.`);
        } catch (error) {
            console.error('Error exporting payroll:', error);
            alert('Error exporting payroll data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleUserExport = async () => {
        try {
            const usersRef = collection(db, 'users');
            const usersSnapshot = await getDocs(usersRef);

            // Filter professionals locally to support both role (string) and roles (array)
            const professionalDocs = usersSnapshot.docs.filter(docSnap => {
                const data = docSnap.data();
                const role = data.role?.toLowerCase();
                const roles = (Array.isArray(data.roles) ? data.roles : []).map(r => r.toLowerCase());
                return role === 'professional' || roles.includes('professional') || data.isProfessionalProfileComplete;
            });

            if (professionalDocs.length === 0) {
                alert('No professional users found.');
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

                const formattedDateOfBirth = formatDate(identity.dateOfBirth);
                const formattedPermitExpiry = formatDate(workPermit.expiryDate);

                usersData.push({
                    userId: userId,
                    email: userData.email || contact.primaryEmail || '',
                    firstName: userData.firstName || identity.legalFirstName || identity.firstName || '',
                    lastName: userData.lastName || identity.legalLastName || identity.lastName || '',
                    legalFirstName: identity.legalFirstName || userData.firstName || '',
                    legalLastName: identity.legalLastName || userData.lastName || '',
                    dateOfBirth: formattedDateOfBirth,
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
                    workPermitExpiryDate: formattedPermitExpiry,
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
                alert(exportAllUsers ? 'No professional users found.' : 'No unexported users found.');
                setLoading(false);
                return;
            }

            let fileContent = '';
            let mimeType = '';
            let fileExtension = '';

            if (exportFormat === 'csv') {
                const headers = [
                    'User ID',
                    'Email',
                    'First Name',
                    'Last Name',
                    'Legal First Name',
                    'Legal Last Name',
                    'Date of Birth',
                    'Nationality',
                    'AHV Number',
                    'Primary Phone',
                    'Primary Phone Prefix',
                    'Residential Street',
                    'Residential Number',
                    'Residential Postal Code',
                    'Residential City',
                    'Residential Canton',
                    'Residential Country',
                    'IBAN',
                    'BIC/SWIFT Code',
                    'Bank Name',
                    'Account Holder Name',
                    'AVS Number',
                    'Insurance Name',
                    'Billing Street',
                    'Billing Number',
                    'Billing Postal Code',
                    'Billing City',
                    'Billing Canton',
                    'Billing Country',
                    'Same as Residential Address',
                    'Civil Status',
                    'Number of Children',
                    'Family Allocation',
                    'Subject to Withholding Tax',
                    'Withholding Tax Canton',
                    'Withholding Tax Rate Group',
                    'Religion',
                    'Work Permit Type',
                    'Work Permit Number',
                    'Work Permit Expiry Date',
                    'Work Permit Issuing Canton',
                    'Taxation Location',
                    'Spouse Name',
                    'Spouse Birthdate',
                    'Spouse Permit Type',
                    'Spouse Activity',
                    'Spouse in Switzerland',
                    'Spouse Activity Percentage'
                ];

                const csvRows = [
                    headers.join(','),
                    ...usersData.map(row => [
                        row.userId,
                        row.email,
                        row.firstName,
                        row.lastName,
                        row.legalFirstName,
                        row.legalLastName,
                        row.dateOfBirth,
                        row.nationality,
                        row.ahvNumber,
                        row.primaryPhone,
                        row.primaryPhonePrefix,
                        row.residentialStreet,
                        row.residentialNumber,
                        row.residentialPostalCode,
                        row.residentialCity,
                        row.residentialCanton,
                        row.residentialCountry,
                        row.iban,
                        row.bicSwift,
                        row.bankName,
                        row.accountHolderName,
                        row.avsNumber,
                        row.insuranceName,
                        row.billingStreet,
                        row.billingNumber,
                        row.billingPostalCode,
                        row.billingCity,
                        row.billingCanton,
                        row.billingCountry,
                        row.sameAsResidential ? 'Yes' : 'No',
                        row.civilStatus,
                        row.numberOfChildren,
                        row.familyAllocation,
                        row.withholdingTaxSubject ? 'Yes' : 'No',
                        row.withholdingTaxCanton,
                        row.withholdingTaxRateGroup,
                        row.religion,
                        row.workPermitType,
                        row.workPermitNumber,
                        row.workPermitExpiryDate,
                        row.workPermitIssuingCanton,
                        row.taxationLocation,
                        row.spouseName,
                        row.spouseBirthdate,
                        row.spousePermitType,
                        row.spouseActivity,
                        row.spouseInSwitzerland ? 'Yes' : 'No',
                        row.spouseActivityPercentage
                    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
                ];

                fileContent = csvRows.join('\n');
                mimeType = 'text/csv;charset=utf-8;';
                fileExtension = 'csv';
            } else if (exportFormat === 'xml') {
                let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
                xmlContent += '<userPayrollExport>\n';
                xmlContent += `  <exportDate>${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</exportDate>\n`;
                xmlContent += `  <totalRecords>${usersData.length}</totalRecords>\n`;
                xmlContent += '  <users>\n';

                usersData.forEach(row => {
                    xmlContent += '    <user>\n';
                    xmlContent += `      <userId>${escapeXml(row.userId)}</userId>\n`;
                    xmlContent += `      <email>${escapeXml(row.email)}</email>\n`;
                    xmlContent += `      <firstName>${escapeXml(row.firstName)}</firstName>\n`;
                    xmlContent += `      <lastName>${escapeXml(row.lastName)}</lastName>\n`;
                    xmlContent += `      <legalFirstName>${escapeXml(row.legalFirstName)}</legalFirstName>\n`;
                    xmlContent += `      <legalLastName>${escapeXml(row.legalLastName)}</legalLastName>\n`;
                    xmlContent += `      <dateOfBirth>${escapeXml(row.dateOfBirth)}</dateOfBirth>\n`;
                    xmlContent += `      <nationality>${escapeXml(row.nationality)}</nationality>\n`;
                    xmlContent += `      <ahvNumber>${escapeXml(row.ahvNumber)}</ahvNumber>\n`;
                    xmlContent += `      <primaryPhone>${escapeXml(row.primaryPhone)}</primaryPhone>\n`;
                    xmlContent += `      <iban>${escapeXml(row.iban)}</iban>\n`;
                    xmlContent += `      <bicSwift>${escapeXml(row.bicSwift)}</bicSwift>\n`;
                    xmlContent += `      <bankName>${escapeXml(row.bankName)}</bankName>\n`;
                    xmlContent += `      <accountHolderName>${escapeXml(row.accountHolderName)}</accountHolderName>\n`;
                    xmlContent += `      <avsNumber>${escapeXml(row.avsNumber)}</avsNumber>\n`;
                    xmlContent += `      <civilStatus>${escapeXml(row.civilStatus)}</civilStatus>\n`;
                    xmlContent += `      <numberOfChildren>${row.numberOfChildren}</numberOfChildren>\n`;
                    xmlContent += `      <withholdingTaxSubject>${row.withholdingTaxSubject ? 'Yes' : 'No'}</withholdingTaxSubject>\n`;
                    xmlContent += '    </user>\n';
                });

                xmlContent += '  </users>\n';
                xmlContent += '</userPayrollExport>';
                fileContent = xmlContent;
                mimeType = 'application/xml;charset=utf-8;';
                fileExtension = 'xml';
            } else if (exportFormat === 'txt') {
                const headers = [
                    'User ID', 'Email', 'First Name', 'Last Name', 'Legal First Name', 'Legal Last Name',
                    'Date of Birth', 'Nationality', 'AHV Number', 'Primary Phone', 'IBAN', 'BIC/SWIFT',
                    'Bank Name', 'Account Holder', 'AVS Number', 'Civil Status', 'Number of Children'
                ];

                const headerLine = headers.join('\t');
                const dataLines = usersData.map(row => [
                    row.userId, row.email, row.firstName, row.lastName, row.legalFirstName, row.legalLastName,
                    row.dateOfBirth, row.nationality, row.ahvNumber, row.primaryPhone, row.iban, row.bicSwift,
                    row.bankName, row.accountHolderName, row.avsNumber, row.civilStatus, row.numberOfChildren
                ].join('\t'));

                fileContent = [headerLine, ...dataLines].join('\n');
                mimeType = 'text/plain;charset=utf-8;';
                fileExtension = 'txt';
            }

            const blob = new Blob([fileContent], { type: mimeType });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `user_payroll_export_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.${fileExtension}`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            if (!exportAllUsers && userIdsToUpdate.length > 0) {
                const updatePromises = userIdsToUpdate.map(userId =>
                    updateDoc(doc(db, 'users', userId), { userPayrollExported: true })
                );
                await Promise.all(updatePromises);
            }

            await loadStats();

            alert(`Successfully exported ${usersData.length} users.`);
        } catch (error) {
            console.error('Error exporting users:', error);
            alert('Error exporting user data. Please try again.');
        } finally {
            setLoading(false);
        }
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

    const shiftsExportTypeOptions = [
        { value: 'weekly', label: t('admin:payroll.exportType.weekly', 'Weekly - Current Week') },
        { value: 'monthly', label: t('admin:payroll.exportType.monthly', 'Monthly - Current Month') },
        { value: 'period', label: t('admin:payroll.exportType.period', 'Custom Period') },
        { value: 'unexported', label: t('admin:payroll.exportType.unexported', 'Unexported Shifts Only') }
    ];

    const usersExportTypeOptions = [
        { value: 'unexportedUsers', label: t('admin:payroll.exportType.unexportedUsers', 'Unexported Users Only') },
        { value: 'allUsers', label: t('admin:payroll.exportType.allUsers', 'All Users') }
    ];

    const exportFormatOptions = [
        { value: 'csv', label: t('admin:payroll.format.csv', 'CSV (Comma Separated Values)') },
        { value: 'xml', label: t('admin:payroll.format.xml', 'XML (Extensible Markup Language)') },
        { value: 'txt', label: t('admin:payroll.format.txt', 'TXT (Tab Delimited Text)') }
    ];

    return (
        <div style={{
            padding: 'var(--spacing-xl)',
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-xl)'
        }}>
            <div>
                <h1 style={{
                    fontSize: 'var(--font-size-xxxlarge)',
                    fontWeight: 'var(--font-weight-large)',
                    color: 'var(--text-color)',
                    marginBottom: 0,
                    letterSpacing: '-0.5px'
                }}>
                    {t('admin:payroll.title', 'Payroll Export Tool')}
                </h1>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: 'var(--spacing-lg)',
                marginBottom: 'var(--spacing-xl)'
            }}>
                <div style={{
                    background: 'var(--background-div-color)',
                    padding: 'var(--spacing-lg)',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--grey-2)',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'var(--transition-normal)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-md)',
                        marginBottom: 'var(--spacing-md)'
                    }}>
                        <Users style={{ width: '24px', height: '24px', color: 'var(--primary-color)' }} />
                        <span style={{
                            fontSize: 'var(--font-size-small)',
                            color: 'var(--text-light-color)',
                            fontWeight: 'var(--font-weight-medium)'
                        }}>
                            {t('admin:payroll.stats.totalProfessionals', 'Total Professionals')}
                        </span>
                    </div>
                    <div style={{
                        fontSize: 'var(--font-size-xxlarge)',
                        fontWeight: 'var(--font-weight-large)',
                        color: 'var(--text-color)'
                    }}>
                        {stats.totalUsers}
                    </div>
                </div>

                <div style={{
                    background: 'var(--background-div-color)',
                    padding: 'var(--spacing-lg)',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--grey-2)',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'var(--transition-normal)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-md)',
                        marginBottom: 'var(--spacing-md)'
                    }}>
                        <FileText style={{ width: '24px', height: '24px', color: 'var(--green-3)' }} />
                        <span style={{
                            fontSize: 'var(--font-size-small)',
                            color: 'var(--text-light-color)',
                            fontWeight: 'var(--font-weight-medium)'
                        }}>
                            {t('admin:payroll.stats.completedShifts', 'Completed Shifts')}
                        </span>
                    </div>
                    <div style={{
                        fontSize: 'var(--font-size-xxlarge)',
                        fontWeight: 'var(--font-weight-large)',
                        color: 'var(--text-color)'
                    }}>
                        {stats.totalShifts}
                    </div>
                </div>

                <div style={{
                    background: 'var(--background-div-color)',
                    padding: 'var(--spacing-lg)',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--grey-2)',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'var(--transition-normal)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-md)',
                        marginBottom: 'var(--spacing-md)'
                    }}>
                        <Clock style={{ width: '24px', height: '24px', color: 'var(--blue-3)' }} />
                        <span style={{
                            fontSize: 'var(--font-size-small)',
                            color: 'var(--text-light-color)',
                            fontWeight: 'var(--font-weight-medium)'
                        }}>
                            {t('admin:payroll.stats.totalHours', 'Total Hours')}
                        </span>
                    </div>
                    <div style={{
                        fontSize: 'var(--font-size-xxlarge)',
                        fontWeight: 'var(--font-weight-large)',
                        color: 'var(--text-color)'
                    }}>
                        {stats.totalHours}
                    </div>
                </div>

                <div style={{
                    background: 'var(--background-div-color)',
                    padding: 'var(--spacing-lg)',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--grey-2)',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'var(--transition-normal)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-md)',
                        marginBottom: 'var(--spacing-md)'
                    }}>
                        <CheckCircle style={{ width: '24px', height: '24px', color: 'var(--yellow-3)' }} />
                        <span style={{
                            fontSize: 'var(--font-size-small)',
                            color: 'var(--text-light-color)',
                            fontWeight: 'var(--font-weight-medium)'
                        }}>
                            {t('admin:payroll.stats.unexportedShifts', 'Unexported Shifts')}
                        </span>
                    </div>
                    <div style={{
                        fontSize: 'var(--font-size-xxlarge)',
                        fontWeight: 'var(--font-weight-large)',
                        color: 'var(--yellow-3)'
                    }}>
                        {stats.unexportedCount}
                    </div>
                </div>

                <div style={{
                    background: 'var(--background-div-color)',
                    padding: 'var(--spacing-lg)',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--grey-2)',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'var(--transition-normal)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-md)',
                        marginBottom: 'var(--spacing-md)'
                    }}>
                        <Users style={{ width: '24px', height: '24px', color: 'var(--purple-3)' }} />
                        <span style={{
                            fontSize: 'var(--font-size-small)',
                            color: 'var(--text-light-color)',
                            fontWeight: 'var(--font-weight-medium)'
                        }}>
                            {t('admin:payroll.stats.unexportedUsers', 'Unexported Users')}
                        </span>
                    </div>
                    <div style={{
                        fontSize: 'var(--font-size-xxlarge)',
                        fontWeight: 'var(--font-weight-large)',
                        color: 'var(--purple-3)'
                    }}>
                        {stats.unexportedUsersCount}
                    </div>
                </div>
            </div>

            <div style={{
                background: 'var(--background-div-color)',
                padding: 'var(--spacing-xl)',
                borderRadius: 'var(--border-radius-lg)',
                border: '1px solid var(--grey-2)',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <h2 style={{
                    fontSize: 'var(--font-size-xlarge)',
                    fontWeight: 'var(--font-weight-large)',
                    marginBottom: 'var(--spacing-lg)',
                    color: 'var(--text-color)'
                }}>
                    {t('admin:payroll.configuration.title', 'Export Configuration')}
                </h2>

                <div style={{
                    display: 'flex',
                    gap: 'var(--spacing-sm)',
                    marginBottom: 'var(--spacing-lg)',
                    borderBottom: '2px solid var(--grey-2)'
                }}>
                    <button
                        onClick={() => {
                            setActiveTab('shifts');
                            setExportType('weekly');
                        }}
                        style={{
                            padding: 'var(--spacing-md) var(--spacing-lg)',
                            fontSize: 'var(--font-size-medium)',
                            fontWeight: 'var(--font-weight-medium)',
                            color: activeTab === 'shifts' ? 'var(--color-logo-2)' : 'var(--text-light-color)',
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'shifts' ? '3px solid var(--color-logo-2)' : '3px solid transparent',
                            cursor: 'pointer',
                            transition: 'var(--transition-normal)',
                            marginBottom: '-2px'
                        }}
                    >
                        {t('admin:payroll.tabs.shifts', 'Shifts')}
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('users');
                            setExportType('unexportedUsers');
                        }}
                        style={{
                            padding: 'var(--spacing-md) var(--spacing-lg)',
                            fontSize: 'var(--font-size-medium)',
                            fontWeight: 'var(--font-weight-medium)',
                            color: activeTab === 'users' ? 'var(--color-logo-2)' : 'var(--text-light-color)',
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === 'users' ? '3px solid var(--color-logo-2)' : '3px solid transparent',
                            cursor: 'pointer',
                            transition: 'var(--transition-normal)',
                            marginBottom: '-2px'
                        }}
                    >
                        {t('admin:payroll.tabs.users', 'Users')}
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                    {activeTab === 'shifts' && (
                        <>
                            <div>
                                <SimpleDropdown
                                    label={t('admin:payroll.configuration.exportType', 'Export Type')}
                                    options={shiftsExportTypeOptions}
                                    value={exportType}
                                    onChange={setExportType}
                                    searchable={false}
                                />
                            </div>

                            {exportType === 'period' && (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                    gap: 'var(--spacing-lg)'
                                }}>
                                    <PersonnalizedInputField
                                        label={t('admin:payroll.configuration.startDate', 'Start Date')}
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                    <PersonnalizedInputField
                                        label={t('admin:payroll.configuration.endDate', 'End Date')}
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            )}

                            <div>
                                <SimpleDropdown
                                    label={t('admin:payroll.configuration.exportFormat', 'Export Format')}
                                    options={exportFormatOptions}
                                    value={exportFormat}
                                    onChange={setExportFormat}
                                    searchable={false}
                                />
                            </div>

                            <div style={{ marginTop: 'var(--spacing-md)' }}>
                                <Button
                                    onClick={handleExport}
                                    disabled={loading || (exportType === 'period' && (!startDate || !endDate))}
                                    variant="primary"
                                    className="actionButton"
                                    style={{
                                        width: '100%',
                                        padding: 'var(--spacing-md) var(--spacing-xl)',
                                        fontSize: 'var(--font-size-medium)',
                                        fontWeight: 'var(--font-weight-medium)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 'var(--spacing-sm)',
                                        backgroundColor: 'var(--color-logo-2)',
                                        color: 'var(--text-color-logo-2)'
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
                        </>
                    )}

                    {activeTab === 'users' && (
                        <>
                            <div>
                                <SimpleDropdown
                                    label={t('admin:payroll.configuration.exportType', 'Export Type')}
                                    options={usersExportTypeOptions}
                                    value={exportType}
                                    onChange={setExportType}
                                    searchable={false}
                                />
                            </div>

                            <div>
                                <SimpleDropdown
                                    label={t('admin:payroll.configuration.exportFormat', 'Export Format')}
                                    options={exportFormatOptions}
                                    value={exportFormat}
                                    onChange={setExportFormat}
                                    searchable={false}
                                />
                            </div>

                            <div style={{ marginTop: 'var(--spacing-md)' }}>
                                <Button
                                    onClick={handleExport}
                                    disabled={loading}
                                    variant="primary"
                                    className="actionButton"
                                    style={{
                                        width: '100%',
                                        padding: 'var(--spacing-md) var(--spacing-xl)',
                                        fontSize: 'var(--font-size-medium)',
                                        fontWeight: 'var(--font-weight-medium)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 'var(--spacing-sm)',
                                        backgroundColor: 'var(--color-logo-2)',
                                        color: 'var(--text-color-logo-2)'
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
                        </>
                    )}
                </div>
            </div>

            <div style={{
                background: 'var(--blue-1)',
                border: '1px solid var(--blue-2)',
                borderRadius: 'var(--border-radius-md)',
                padding: 'var(--spacing-lg)',
                display: 'flex',
                gap: 'var(--spacing-lg)',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <Info style={{
                    width: '24px',
                    height: '24px',
                    color: 'var(--blue-3)',
                    flexShrink: 0,
                    marginTop: '2px'
                }} />
                <div>
                    <h3 style={{
                        fontWeight: 'var(--font-weight-large)',
                        color: 'var(--blue-4)',
                        marginBottom: 'var(--spacing-md)',
                        fontSize: 'var(--font-size-large)'
                    }}>
                        {t('admin:payroll.info.title', 'Export Information')}
                    </h3>
                    <ul style={{
                        fontSize: 'var(--font-size-small)',
                        color: 'var(--blue-4)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--spacing-sm)',
                        margin: 0,
                        paddingLeft: 'var(--spacing-md)'
                    }}>
                        {activeTab === 'shifts' ? (
                            <>
                                <li>
                                    <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
                                        {t('admin:payroll.info.weekly', '• Weekly:')}
                                    </span>
                                    {' '}
                                    {t('admin:payroll.info.weeklyDesc', 'Exports shifts from the current week (Monday to Sunday)')}
                                </li>
                                <li>
                                    <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
                                        {t('admin:payroll.info.monthly', '• Monthly:')}
                                    </span>
                                    {' '}
                                    {t('admin:payroll.info.monthlyDesc', 'Exports shifts from the current month')}
                                </li>
                                <li>
                                    <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
                                        {t('admin:payroll.info.customPeriod', '• Custom Period:')}
                                    </span>
                                    {' '}
                                    {t('admin:payroll.info.customPeriodDesc', 'Exports shifts within your specified date range')}
                                </li>
                                <li>
                                    <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
                                        {t('admin:payroll.info.unexported', '• Unexported:')}
                                    </span>
                                    {' '}
                                    {t('admin:payroll.info.unexportedDesc', 'Exports all shifts not previously exported (marks them as exported after download)')}
                                </li>
                            </>
                        ) : (
                            <>
                                <li>
                                    <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
                                        {t('admin:payroll.info.unexportedUsers', '• Unexported Users:')}
                                    </span>
                                    {' '}
                                    {t('admin:payroll.info.unexportedUsersDesc', 'Exports all user profiles with billing information that have not been exported yet (marks them as exported after download)')}
                                </li>
                                <li>
                                    <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
                                        {t('admin:payroll.info.allUsers', '• All Users:')}
                                    </span>
                                    {' '}
                                    {t('admin:payroll.info.allUsersDesc', 'Exports all user profiles with billing information regardless of export status (does not mark them as exported)')}
                                </li>
                            </>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default PayrollExport;
