/**
 * PayrollPlus Integration Service
 * 
 * Handles communication with PayrollPlus (Staff Leasing Partner)
 * for processing worker payments and commissions.
 * 
 * Flow: Pharmacy → PayrollPlus → Worker (Salary) → You (Commission)
 */

const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const config = require('../config');
const db = require('../database/db');

// Email transporter (will be initialized with environment variables)
let transporter = null;

function getTransporter() {
    if (!transporter) {
        // Support multiple email providers
        const emailService = process.env.EMAIL_SERVICE || 'SendGrid';

        if (emailService === 'SendGrid') {
            transporter = nodemailer.createTransport({
                host: 'smtp.sendgrid.net',
                port: 587,
                auth: {
                    user: 'apikey',
                    pass: process.env.SENDGRID_API_KEY
                }
            });
        } else if (emailService === 'Gmail') {
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                }
            });
        } else {
            // Generic SMTP
            transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASSWORD
                }
            });
        }
    }
    return transporter;
}

/**
 * Generate CSV content for PayrollPlus
 */
function generatePayrollCSV(data) {
    const headers = [
        'Request ID',
        'Request Date',
        'Pharmacy Name',
        'Pharmacy GLN',
        'Pharmacy UID',
        'Pharmacy Address',
        'Billing Email',
        'Worker Name',
        'Worker Email',
        'Worker GLN',
        'Shift Date',
        'Start Time',
        'End Time',
        'Duration (hrs)',
        'Role',
        'Hourly Rate (CHF)',
        'Worker Gross Pay (CHF)',
        'Total Cost (CHF)',
        'Commission (CHF)',
        'Markup (%)'
    ];

    const pharmacyAddress = data.pharmacyProfile?.address
        ? `${data.pharmacyProfile.address.street}, ${data.pharmacyProfile.address.postalCode} ${data.pharmacyProfile.address.city}`
        : 'N/A';

    const shiftDate = data.shiftDetails?.date
        ? (data.shiftDetails.date.toDate ? data.shiftDetails.date.toDate().toISOString().split('T')[0] : data.shiftDetails.date)
        : 'N/A';

    const row = [
        data.requestId || 'N/A',
        new Date().toISOString().split('T')[0],
        data.pharmacyProfile?.companyName || 'N/A',
        data.pharmacyProfile?.glnNumber || 'N/A',
        data.pharmacyProfile?.uidNumber || 'N/A',
        pharmacyAddress,
        data.pharmacyProfile?.billingEmail || 'N/A',
        data.workerProfile?.fullName || 'N/A',
        data.workerProfile?.email || 'N/A',
        data.workerProfile?.glnNumber || 'N/A',
        shiftDate,
        data.shiftDetails?.startTime || 'N/A',
        data.shiftDetails?.endTime || 'N/A',
        data.shiftDetails?.duration || 0,
        data.shiftDetails?.role || 'Pharmacist',
        data.financials?.hourlyRate || 0,
        data.financials?.workerGrossPay || 0,
        data.financials?.totalCost || 0,
        data.financials?.commission || 0,
        data.financials?.markup || 0
    ];

    // Escape CSV values
    const escapeCSV = (val) => {
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    return [
        headers.join(','),
        row.map(escapeCSV).join(',')
    ].join('\n');
}

/**
 * Generate PDF-ready HTML content for payroll request
 */
function generatePayrollHTML(data) {
    const shiftDate = data.shiftDetails?.date
        ? (data.shiftDetails.date.toDate ? data.shiftDetails.date.toDate().toLocaleDateString('de-CH') : data.shiftDetails.date)
        : 'N/A';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 16px; font-weight: bold; color: #1e40af; margin-bottom: 10px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .field { margin-bottom: 8px; }
    .label { font-weight: bold; color: #666; }
    .value { color: #333; }
    .total { font-size: 18px; font-weight: bold; color: #059669; margin-top: 20px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">MediShift Staff Request</div>
    <div>Request ID: ${data.requestId}</div>
    <div>Date: ${new Date().toLocaleDateString('de-CH')}</div>
  </div>

  <div class="grid">
    <div class="section">
      <div class="section-title">Pharmacy (Client)</div>
      <div class="field"><span class="label">Company:</span> <span class="value">${data.pharmacyProfile?.companyName || 'N/A'}</span></div>
      <div class="field"><span class="label">GLN:</span> <span class="value">${data.pharmacyProfile?.glnNumber || 'N/A'}</span></div>
      <div class="field"><span class="label">UID:</span> <span class="value">${data.pharmacyProfile?.uidNumber || 'N/A'}</span></div>
      <div class="field"><span class="label">Billing Email:</span> <span class="value">${data.pharmacyProfile?.billingEmail || 'N/A'}</span></div>
    </div>

    <div class="section">
      <div class="section-title">Worker (Staff)</div>
      <div class="field"><span class="label">Name:</span> <span class="value">${data.workerProfile?.fullName || 'N/A'}</span></div>
      <div class="field"><span class="label">Email:</span> <span class="value">${data.workerProfile?.email || 'N/A'}</span></div>
      <div class="field"><span class="label">GLN:</span> <span class="value">${data.workerProfile?.glnNumber || 'N/A'}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Shift Details</div>
    <div class="field"><span class="label">Date:</span> <span class="value">${shiftDate}</span></div>
    <div class="field"><span class="label">Time:</span> <span class="value">${data.shiftDetails?.startTime || 'N/A'} - ${data.shiftDetails?.endTime || 'N/A'}</span></div>
    <div class="field"><span class="label">Duration:</span> <span class="value">${data.shiftDetails?.duration || 0} hours</span></div>
    <div class="field"><span class="label">Role:</span> <span class="value">${data.shiftDetails?.role || 'Pharmacist'}</span></div>
  </div>

  <div class="section">
    <div class="section-title">Financials</div>
    <div class="field"><span class="label">Hourly Rate:</span> <span class="value">CHF ${data.financials?.hourlyRate || 0}</span></div>
    <div class="field"><span class="label">Worker Gross Pay:</span> <span class="value">CHF ${data.financials?.workerGrossPay || 0}</span></div>
    <div class="field"><span class="label">Commission (${data.financials?.markup || 0}%):</span> <span class="value">CHF ${data.financials?.commission || 0}</span></div>
    <div class="total">Total Invoice Amount: CHF ${data.financials?.totalCost || 0}</div>
  </div>

  <div class="footer">
    <p>This request was generated by MediShift Healthcare Staffing Platform.</p>
    <p>For questions, contact: support@interimed.ch</p>
  </div>
</body>
</html>
  `;
}

/**
 * Calculate fees based on pilot mode
 */
function calculateFees(baseAmount, hoursWorked, hourlyRate) {
    const now = new Date();
    const pilotEndDate = new Date(config.pilot.endDate);

    // Check if still in pilot mode
    if (config.pilot.enabled && now < pilotEndDate) {
        return {
            workerGrossPay: baseAmount,
            commission: 0,
            totalCost: baseAmount,
            markup: 0,
            isPilot: true,
            message: config.pilot.message
        };
    }

    // Normal pricing (15% markup)
    const markup = 15;
    const commission = baseAmount * (markup / 100);

    return {
        workerGrossPay: baseAmount,
        commission: Math.round(commission * 100) / 100,
        totalCost: Math.round((baseAmount + commission) * 100) / 100,
        markup,
        isPilot: false,
        message: null
    };
}

/**
 * Firestore Trigger: When a payroll request is created
 */
const onPayrollRequestCreated = onDocumentCreated(
    {
        document: 'payroll_requests/{requestId}',
        region: config.region,
        database: 'medishift'
    },
    async (event) => {
        const data = event.data.data();
        const requestId = event.params.requestId;

        logger.info(`Processing payroll request ${requestId}`, {
            pharmacy: data.pharmacyProfile?.companyName,
            worker: data.workerProfile?.fullName
        });

        try {
            // Generate attachments
            const csv = generatePayrollCSV({ ...data, requestId });
            const html = generatePayrollHTML({ ...data, requestId });

            // Send email to PayrollPlus
            const mailTransporter = getTransporter();

            await mailTransporter.sendMail({
                from: process.env.EMAIL_FROM || 'billing@interimed.ch',
                to: config.payrollEmail,
                cc: data.pharmacyProfile?.billingEmail, // CC the pharmacy
                subject: `[MediShift] Staff Request ${requestId} - ${data.pharmacyProfile?.companyName || 'Unknown'}`,
                text: `
New staffing request has been submitted via MediShift.

Request ID: ${requestId}
Pharmacy: ${data.pharmacyProfile?.companyName || 'N/A'}
Worker: ${data.workerProfile?.fullName || 'N/A'}
Shift Date: ${data.shiftDetails?.date || 'N/A'}
Duration: ${data.shiftDetails?.duration || 0} hours
Total Amount: CHF ${data.financials?.totalCost || 0}

Please see attached files for complete details.

---
MediShift Healthcare Staffing Platform
support@interimed.ch
        `.trim(),
                html: html,
                attachments: [
                    {
                        filename: `payroll-request-${requestId}.csv`,
                        content: csv,
                        contentType: 'text/csv'
                    }
                ]
            });

            // Update request status
            await event.data.ref.update({
                status: 'sent',
                'payrollData.emailSentAt': admin.firestore.FieldValue.serverTimestamp(),
                'payrollData.sentTo': config.payrollEmail,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            logger.info(`Payroll email sent successfully for ${requestId}`);

        } catch (error) {
            logger.error(`Failed to send payroll email for ${requestId}`, { error: error.message });

            // Update with error status
            await event.data.ref.update({
                status: 'failed',
                'payrollData.error': error.message,
                'payrollData.failedAt': admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }
);

/**
 * Callable function to create a payroll request
 */
const createPayrollRequest = onCall(
    {
        region: config.region,
        enforceAppCheck: false
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'You must be logged in');
        }

        const {
            shiftId,
            workerId,
            shiftDetails,
            hourlyRate
        } = request.data;

        const pharmacyUid = request.auth.uid;

        try {
            // Get pharmacy profile
            const pharmacyDoc = await db.collection('facilityProfiles').doc(pharmacyUid).get();
            if (!pharmacyDoc.exists) {
                throw new HttpsError('not-found', 'Pharmacy profile not found');
            }
            const pharmacyData = pharmacyDoc.data();

            // Get worker profile
            const workerDoc = await db.collection('professionalProfiles').doc(workerId).get();
            if (!workerDoc.exists) {
                throw new HttpsError('not-found', 'Worker profile not found');
            }
            const workerData = workerDoc.data();

            // Calculate financials
            const baseAmount = shiftDetails.duration * hourlyRate;
            const financials = calculateFees(baseAmount, shiftDetails.duration, hourlyRate);
            financials.hourlyRate = hourlyRate;

            // Create payroll request
            const requestRef = await db.collection('payroll_requests').add({
                pharmacyUid,
                shiftId: shiftId || null,
                status: 'pending',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),

                pharmacyProfile: {
                    companyName: pharmacyData.companyName || pharmacyData.billing?.companyName,
                    glnNumber: pharmacyData.glnNumber || pharmacyData.billing?.glnNumber,
                    uidNumber: pharmacyData.uidNumber || pharmacyData.billing?.uidNumber,
                    billingEmail: pharmacyData.billing?.invoiceEmail || pharmacyData.email,
                    address: pharmacyData.billing?.address || pharmacyData.address
                },

                workerProfile: {
                    fullName: workerData.fullName || `${workerData.firstName} ${workerData.lastName}`,
                    email: workerData.email,
                    glnNumber: workerData.glnNumber
                },

                shiftDetails: {
                    date: shiftDetails.date,
                    startTime: shiftDetails.startTime,
                    endTime: shiftDetails.endTime,
                    duration: shiftDetails.duration,
                    role: shiftDetails.role || 'Pharmacist'
                },

                financials,

                payrollData: {
                    emailSentAt: null,
                    csvExportPath: null,
                    confirmationReceived: false
                }
            });

            logger.info(`Payroll request created: ${requestRef.id}`);

            return {
                success: true,
                requestId: requestRef.id,
                financials,
                message: financials.isPilot
                    ? 'Request created (Pilot Mode: 0% commission)'
                    : 'Request created successfully'
            };

        } catch (error) {
            logger.error('Failed to create payroll request', { error: error.message });
            throw new HttpsError('internal', error.message);
        }
    }
);

/**
 * Get payroll requests for a pharmacy
 */
const getPayrollRequests = onCall(
    {
        region: config.region,
        enforceAppCheck: false
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'You must be logged in');
        }

        const { status, limit = 50, facilityId } = request.data || {};
        const pharmacyUid = facilityId || request.auth.uid;

        logger.info(`Fetching payroll requests for pharmacy: ${pharmacyUid}`, {
            requestedBy: request.auth.uid,
            status,
            facilityId
        });

        try {
            let baseQuery = db.collection('payroll_requests')
                .where('pharmacyUid', '==', pharmacyUid);

            if (status) {
                baseQuery = baseQuery.where('status', '==', status);
            }

            let query = baseQuery.orderBy('createdAt', 'desc').limit(limit);
            let snapshot;

            try {
                snapshot = await query.get();
            } catch (queryError) {
                const errorCode = queryError.code || queryError.status || String(queryError.message || queryError).match(/code:\s*(\d+)/)?.[1];
                const errorMessage = String(queryError.message || queryError);
                
                if (errorCode === 5 || 
                    errorCode === 'NOT_FOUND' || 
                    errorCode === 'FAILED_PRECONDITION' ||
                    errorMessage?.includes('NOT_FOUND') || 
                    errorMessage?.includes('index') ||
                    errorMessage?.includes('no index') ||
                    errorMessage?.includes('index not found') ||
                    errorMessage?.includes('FAILED_PRECONDITION')) {
                    logger.info('Payroll requests index not found, trying without orderBy', {
                        pharmacyUid,
                        error: errorMessage,
                        code: errorCode
                    });
                    
                    try {
                        snapshot = await baseQuery.limit(limit).get();
                        const requests = [];
                        snapshot.forEach(doc => {
                            const data = doc.data();
                            requests.push({
                                id: doc.id,
                                ...data,
                                createdAt: data.createdAt?.toDate?.() || data.createdAt,
                                updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
                            });
                        });
                        
                        requests.sort((a, b) => {
                            const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                            const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                            return bDate - aDate;
                        });
                        
                        return {
                            success: true,
                            requests: requests.slice(0, limit),
                            count: requests.length
                        };
                    } catch (fallbackError) {
                        logger.info('Payroll requests collection may not exist yet, returning empty array', {
                            pharmacyUid,
                            error: String(fallbackError.message || fallbackError)
                        });
                        return {
                            success: true,
                            requests: [],
                            count: 0
                        };
                    }
                }
                throw queryError;
            }

            const requests = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                requests.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate?.() || data.createdAt,
                    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
                });
            });

            return {
                success: true,
                requests,
                count: requests.length
            };

        } catch (error) {
            const errorCode = error.code || error.status || String(error.message || error).match(/code:\s*(\d+)/)?.[1];
            const errorMessage = String(error.message || error);
            
            if (errorCode === 5 || 
                errorCode === 'NOT_FOUND' || 
                errorCode === 'FAILED_PRECONDITION' ||
                errorMessage?.includes('NOT_FOUND') || 
                errorMessage?.includes('index') ||
                errorMessage?.includes('no index') ||
                errorMessage?.includes('index not found') ||
                errorMessage?.includes('FAILED_PRECONDITION')) {
                logger.info('Payroll requests collection or index not found yet, returning empty array', {
                    pharmacyUid,
                    error: errorMessage,
                    code: errorCode
                });
                return {
                    success: true,
                    requests: [],
                    count: 0
                };
            }
            
            logger.error('Failed to get payroll requests', { 
                error: errorMessage, 
                code: errorCode,
                stack: error.stack 
            });
            throw new HttpsError('internal', `Failed to fetch payroll requests: ${errorMessage}`);
        }
    }
);

module.exports = {
    onPayrollRequestCreated,
    createPayrollRequest,
    getPayrollRequests,
    calculateFees,
    generatePayrollCSV
};
