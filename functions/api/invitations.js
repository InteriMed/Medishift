const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Import centralized database instance configured for medishift
const db = require('../database/db');

const INVITATION_EXPIRY_DAYS = 30;

function generateDeterministicToken(facilityId, roleId, workerId) {
  const input = `${facilityId}_${roleId}_${workerId}`;
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 32);
}

exports.generateFacilityRoleInvitation = onCall({ cors: true, database: 'medishift' }, async (request) => {
  try {
    if (!db) {
      throw new Error('Firestore database not initialized');
    }

    const data = request.data || {};
    const context = { auth: request.auth };

    if (!context.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in to generate invitations');
    }

    const { facilityId, roleId, workerType, workerTypeOther, workerId } = data;

    if (!facilityId || !roleId || !workerId) {
      throw new HttpsError('invalid-argument', 'Facility ID, Role ID, and Worker ID are required');
    }

    if (workerType === 'none' || !workerType) {
      throw new HttpsError('invalid-argument', 'Worker type must be specified and cannot be "none"');
    }

    if (workerType === 'other' && (!workerTypeOther || !workerTypeOther.trim())) {
      throw new HttpsError('invalid-argument', 'Worker type "other" requires a custom type name');
    }

    logger.info('Generating facility role invitation', {
      facilityId,
      roleId,
      workerId,
      workerType,
      workerTypeOther: workerTypeOther || '',
      userId: context.auth.uid
    });

    const facilityRef = db.collection('facilityProfiles').doc(facilityId);
    const facilitySnap = await facilityRef.get();

    if (!facilitySnap.exists) {
      throw new HttpsError('not-found', 'Facility not found');
    }

    const facilityData = facilitySnap.data();
    const employeesList = facilityData.employees || [];
    const admins = employeesList.filter(emp => emp.roles?.includes('admin')).map(emp => emp.user_uid);

    if (!admins.includes(context.auth.uid)) {
      throw new HttpsError('permission-denied', 'You must be an admin of this facility to generate invitations');
    }

    const invitationToken = generateDeterministicToken(facilityId, roleId, workerId);
    const invitationRef = db.collection('facilityInvitations').doc(invitationToken);
    const existingInvitation = await invitationRef.get();

    let expiresAt = new Date();
    if (existingInvitation.exists) {
      const existingData = existingInvitation.data();
      expiresAt = existingData.expiresAt?.toDate() || new Date();
      if (expiresAt < new Date()) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);
      }
    } else {
      expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);
    }

    const existingData = existingInvitation.exists ? existingInvitation.data() : {};
    const invitationData = {
      token: invitationToken,
      facilityId: facilityId,
      roleId: roleId,
      workerId: workerId,
      workerType: workerType || existingData.workerType || 'pharmacist',
      workerTypeOther: workerTypeOther || existingData.workerTypeOther || '',
      createdBy: existingData.createdBy || context.auth.uid,
      createdAt: existingData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      status: existingData.status || 'pending',
      acceptedBy: existingData.acceptedBy || null,
      acceptedAt: existingData.acceptedAt || null
    };

    logger.info('Attempting to save invitation to Firestore', {
      invitationToken,
      facilityId,
      workerId,
      isNew: !existingInvitation.exists
    });

    await invitationRef.set(invitationData, { merge: true });

    logger.info('Facility role invitation generated successfully', {
      invitationToken,
      facilityId,
      roleId,
      createdBy: context.auth.uid
    });

    return {
      success: true,
      invitationToken,
      invitationLink: `${process.env.INVITATION_BASE_URL || 'https://MediShift.ch'}/invite/${invitationToken}`,
      expiresAt: expiresAt.toISOString()
    };
  } catch (error) {
    const errorDetails = {
      message: error?.message || String(error),
      stack: error?.stack,
      code: error?.code,
      details: error?.details,
      name: error?.name,
      toString: error?.toString(),
      type: typeof error
    };

    logger.error('Error generating facility role invitation', errorDetails);

    if (error instanceof HttpsError) {
      throw error;
    }

    let errorMessage = 'Failed to generate invitation';
    if (error?.message) {
      errorMessage = error.message;
    } else if (error?.toString && typeof error.toString === 'function') {
      const errorStr = error.toString();
      if (errorStr && errorStr !== '[object Object]') {
        errorMessage = errorStr;
      }
    }

    logger.error('Throwing internal error', {
      originalError: errorDetails,
      errorMessage: errorMessage
    });

    throw new HttpsError('internal', errorMessage);
  }
});

exports.getInvitationDetails = onCall({ cors: true, database: 'medishift' }, async (request) => {
  const data = request.data;

  try {
    const { invitationToken } = data;

    if (!invitationToken) {
      throw new HttpsError('invalid-argument', 'Invitation token is required');
    }

    const invitationRef = db.collection('facilityInvitations').doc(invitationToken);
    const invitationSnap = await invitationRef.get();

    if (!invitationSnap.exists) {
      throw new HttpsError('not-found', 'Invitation not found');
    }

    const invitationData = invitationSnap.data();
    const now = new Date();
    const expiresAt = invitationData.expiresAt?.toDate();

    if (expiresAt && expiresAt < now) {
      throw new HttpsError('deadline-exceeded', 'This invitation has expired');
    }

    if (invitationData.status !== 'pending') {
      throw new HttpsError('failed-precondition', 'This invitation has already been used');
    }

    const facilityRef = db.collection('facilityProfiles').doc(invitationData.facilityId);
    const facilitySnap = await facilityRef.get();

    if (!facilitySnap.exists()) {
      throw new HttpsError('not-found', 'Facility not found');
    }

    const facilityData = facilitySnap.data();
    const facilityName = facilityData.facilityDetails?.name || facilityData.identityLegal?.legalCompanyName || 'Unknown Facility';

    return {
      success: true,
      invitation: {
        token: invitationToken,
        facilityId: invitationData.facilityId,
        facilityName: facilityName,
        roleId: invitationData.roleId,
        workerType: invitationData.workerType,
        workerTypeOther: invitationData.workerTypeOther,
        expiresAt: expiresAt?.toISOString()
      }
    };
  } catch (error) {
    logger.error('Error getting invitation details', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to get invitation details');
  }
});

exports.acceptFacilityInvitation = onCall({ cors: true, database: 'medishift' }, async (request) => {
  const data = request.data;
  const context = { auth: request.auth };

  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to accept an invitation');
  }

  try {
    const { invitationToken } = data;

    if (!invitationToken) {
      throw new HttpsError('invalid-argument', 'Invitation token is required');
    }

    const invitationRef = db.collection('facilityInvitations').doc(invitationToken);
    const invitationSnap = await invitationRef.get();

    if (!invitationSnap.exists) {
      throw new HttpsError('not-found', 'Invitation not found');
    }

    const invitationData = invitationSnap.data();
    const now = new Date();
    const expiresAt = invitationData.expiresAt?.toDate();

    if (expiresAt && expiresAt < now) {
      throw new HttpsError('deadline-exceeded', 'This invitation has expired');
    }

    if (invitationData.status !== 'pending') {
      throw new HttpsError('failed-precondition', 'This invitation has already been used');
    }

    const facilityId = invitationData.facilityId;
    const roleId = invitationData.roleId;
    const workerId = invitationData.workerId;
    const facilityRef = db.collection('facilityProfiles').doc(facilityId);
    const facilitySnap = await facilityRef.get();

    if (!facilitySnap.exists) {
      throw new HttpsError('not-found', 'Facility not found');
    }

    const facilityData = facilitySnap.data();
    const userId = context.auth.uid;

    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists()) {
      throw new HttpsError('not-found', 'User profile not found');
    }

    const userData = userSnap.data();
    const userRoles = userData.roles || [];
    const facilityName = facilityData.facilityDetails?.name || facilityData.identityLegal?.legalCompanyName || 'Unknown Facility';

    const isAlreadyMember = userRoles.some(r => r.facility_uid === facilityId);

    if (isAlreadyMember) {
      await invitationRef.update({
        status: 'accepted',
        acceptedBy: userId,
        acceptedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return {
        success: true,
        message: 'You are already a member of this facility',
        alreadyMember: true
      };
    }

    const batch = db.batch();

    const newMembership = {
      facilityId: facilityId,
      facilityName: facilityName,
      role: 'admin',
      facilityProfileId: facilityId,
      joinedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const userDoc = await userRef.get();
    const existingUserData = userDoc.exists ? userDoc.data() : {};
    const existingRoles = existingUserData.roles || [];
    const updatedUserRoles = existingRoles.filter(r => r.facility_uid !== facilityId);
    updatedUserRoles.push({ facility_uid: facilityId, roles: ['admin'] });
    
    batch.update(userRef, {
      roles: updatedUserRoles,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const employeesList = facilityData.employees || [];
    const admins = employeesList.filter(emp => emp.roles?.includes('admin')).map(emp => emp.user_uid);
    if (!admins.includes(userId)) {
      const existingEmployee = employeesList.find(emp => emp.user_uid === userId);
      if (!existingEmployee) {
        batch.update(facilityRef, {
          employees: admin.firestore.FieldValue.arrayUnion({ user_uid: userId, roles: ['admin'] }),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else if (!existingEmployee.roles?.includes('admin')) {
        const updatedEmployees = employeesList.map(emp =>
          emp.user_uid === userId ? { ...emp, roles: [...(emp.roles || []), 'admin'] } : emp
        );
        batch.update(facilityRef, {
          employees: updatedEmployees,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    const workerRequirements = facilityData.operationalSettings?.workerRequirements || [];
    const roleIndex = workerRequirements.findIndex(r => r.id === roleId);

    if (roleIndex >= 0) {
      const role = workerRequirements[roleIndex];
      const assignedWorkers = role.assignedWorkers || [];
      const workerIndex = assignedWorkers.findIndex(w => w.id === workerId);

      if (workerIndex >= 0) {
        assignedWorkers[workerIndex] = {
          ...assignedWorkers[workerIndex],
          workerId: userId,
          placeholderName: ''
        };
      } else {
        const defaultColor = { color: '#0f54bc', color1: '#a8c1ff' };
        const newWorker = {
          id: workerId,
          workerId: userId,
          placeholderName: '',
          color: defaultColor.color,
          color1: defaultColor.color1
        };
        assignedWorkers.push(newWorker);
      }

      workerRequirements[roleIndex] = {
        ...role,
        assignedWorkers: assignedWorkers
      };

      batch.update(facilityRef, {
        'operationalSettings.workerRequirements': workerRequirements,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    batch.update(invitationRef, {
      status: 'accepted',
      acceptedBy: userId,
      acceptedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();

    logger.info('Facility invitation accepted', {
      invitationToken,
      facilityId,
      userId
    });

    return {
      success: true,
      message: 'Successfully joined the facility',
      facilityId: facilityId,
      facilityName: facilityName
    };
  } catch (error) {
    logger.error('Error accepting facility invitation', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to accept invitation');
  }
});

/**
 * Invites a new admin employee by email
 * Sends an email with an invitation link/code
 */
exports.inviteAdminEmployee = onCall({ cors: true, region: 'europe-west6', database: 'medishift' }, async (request) => {
  logger.info("inviteAdminEmployee called", { structuredData: true });

  if (!request.auth) {
    logger.error("inviteAdminEmployee: Unauthenticated call");
    throw new HttpsError('unauthenticated', 'You must be signed in to invite employees');
  }

  const callerAdminDoc = await db.collection('admins').doc(request.auth.uid).get();
  if (!callerAdminDoc.exists || callerAdminDoc.data().isActive === false) {
    logger.error("inviteAdminEmployee: Caller is not an admin");
    throw new HttpsError('permission-denied', 'You must be an admin to invite employees');
  }

  const callerRoles = callerAdminDoc.data().roles || [];
  const canInvite = callerRoles.includes('super_admin') || callerRoles.includes('ops_manager');
  if (!canInvite) {
    logger.error("inviteAdminEmployee: Caller lacks permission to invite", { callerRoles });
    throw new HttpsError('permission-denied', 'You do not have permission to invite admin employees');
  }

  const { inviteEmail, inviteRole, invitedByName, customMessage } = request.data;
  logger.info("inviteAdminEmployee: Data received", { inviteEmail, inviteRole, invitedByName });

  if (!inviteEmail || !inviteRole) {
    logger.error("inviteAdminEmployee: Missing arguments", { inviteEmail, inviteRole });
    throw new HttpsError('invalid-argument', 'Email and Role are required');
  }

  const validRoles = ['super_admin', 'ops_manager', 'finance', 'recruiter', 'support', 'external_payroll'];
  if (!validRoles.includes(inviteRole)) {
    throw new HttpsError('invalid-argument', `Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }

  try {
    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    const inviteToken = crypto.randomBytes(32).toString('hex');

    logger.info("inviteAdminEmployee: Generated tokens", { inviteCodeHidden: "***", inviteTokenLen: inviteToken.length });

    const inviteRef = db.collection('adminInvitations').doc(inviteToken);
    await inviteRef.set({
      email: inviteEmail,
      role: inviteRole,
      code: inviteCode,
      invitedBy: request.auth.uid,
      invitedByName: invitedByName || 'An Admin',
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
    });

    logger.info("inviteAdminEmployee: Invitation saved to Firestore");

    // Send email (Using nodemailer)
    const emailService = process.env.EMAIL_SERVICE || 'Generic';
    logger.info("inviteAdminEmployee: Email service config", { emailService });

    let transporter;

    if (emailService === 'SendGrid') {
      if (!process.env.SENDGRID_API_KEY) {
        logger.error("inviteAdminEmployee: Missing SendGrid API Key");
        throw new Error("Server configuration error: Missing SendGrid API Key");
      }
      transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });
    } else {
      // Generic fallback for local/dev
      logger.info("inviteAdminEmployee: Using generic/fallback email transport");
      const smtpHost = process.env.SMTP_HOST || 'smtp.mailtrap.io';
      const smtpPort = parseInt(process.env.SMTP_PORT || '2525', 10);
      const smtpUser = process.env.SMTP_USER;
      const smtpPassword = process.env.SMTP_PASSWORD;

      if (!smtpUser || !smtpPassword) {
        logger.error("inviteAdminEmployee: Missing SMTP credentials", {
          hasUser: !!smtpUser,
          hasPassword: !!smtpPassword
        });
        throw new HttpsError('failed-precondition', 'Email service is not properly configured. Please contact system administrator.');
      }

      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        auth: {
          user: smtpUser,
          pass: smtpPassword
        }
      });
    }

    const appLogo = 'https://interimed-620fd.firebasestorage.app/v0/b/interimed-620fd.firebasestorage.app/o/public%2Flogo.png?alt=media'; // Placeholder or actual logo URL
    const signupLink = `${process.env.INVITATION_BASE_URL || 'https://MediShift.ch'}/signup?admin_invite=${inviteToken}`;

    const mailOptions = {
      from: '"MediShift Admin" <no-reply@interimed.ch>',
      to: inviteEmail,
      subject: 'Invitation to join MediShift Admin Team',
      html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; borderRadius: 8px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="${appLogo}" alt="MediShift Logo" style="height: 50px;" />
            </div>
            <h2 style="color: #1a73e8; text-align: center;">Welcome to the Team!</h2>
            <p>Hello,</p>
            <p>${customMessage || `You have been invited by <strong>${invitedByName || 'an administrator'}</strong> to join the MediShift Admin Team as a <strong>${inviteRole}</strong>.`}</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
              <p style="margin-bottom: 10px; color: #5f6368;">Your invitation code:</p>
              <h1 style="margin: 0; letter-spacing: 5px; color: #202124;">${inviteCode}</h1>
            </div>
            <p style="text-align: center;">
              <a href="${signupLink}" style="background-color: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                Complete Your Setup
              </a>
            </p>
            <p style="color: #5f6368; font-size: 12px; margin-top: 40px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
              This invitation will expire in 7 days. If you were not expecting this invitation, please ignore this email.
            </p>
          </div>
        `
    };

    logger.info("inviteAdminEmployee: Attempting to send email");
    await transporter.sendMail(mailOptions);
    logger.info("inviteAdminEmployee: Email sent successfully");

    return { success: true, message: 'Invitation sent successfully' };
  } catch (error) {
    logger.error('Error inviting admin employee:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error.message || 'Failed to send invitation');
  }
});

exports.acceptAdminInvitation = onCall({ cors: true, region: 'europe-west6', database: 'medishift' }, async (request) => {
  logger.info("acceptAdminInvitation called", { structuredData: true });

  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to accept an invitation');
  }

  const { invitationToken, inviteCode } = request.data;

  if (!invitationToken) {
    throw new HttpsError('invalid-argument', 'Invitation token is required');
  }

  try {
    const inviteRef = db.collection('adminInvitations').doc(invitationToken);
    const inviteSnap = await inviteRef.get();

    if (!inviteSnap.exists) {
      throw new HttpsError('not-found', 'Invitation not found');
    }

    const inviteData = inviteSnap.data();
    const now = new Date();
    const expiresAt = inviteData.expiresAt?.toDate();

    if (expiresAt && expiresAt < now) {
      throw new HttpsError('deadline-exceeded', 'This invitation has expired');
    }

    if (inviteData.status !== 'pending') {
      throw new HttpsError('failed-precondition', 'This invitation has already been used');
    }

    if (inviteCode && inviteData.code !== inviteCode) {
      throw new HttpsError('invalid-argument', 'Invalid invitation code');
    }

    const userId = request.auth.uid;
    const userEmail = request.auth.token.email;

    if (inviteData.email && inviteData.email.toLowerCase() !== userEmail?.toLowerCase()) {
      throw new HttpsError('permission-denied', 'This invitation was sent to a different email address');
    }

    const existingAdminDoc = await db.collection('admins').doc(userId).get();

    const batch = db.batch();

    if (existingAdminDoc.exists) {
      const existingData = existingAdminDoc.data();
      const existingRoles = existingData.roles || [];
      const newRole = inviteData.role;
      
      if (!existingRoles.includes(newRole)) {
        batch.update(db.collection('admins').doc(userId), {
          roles: admin.firestore.FieldValue.arrayUnion(newRole),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } else {
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.exists ? userDoc.data() : {};

      batch.set(db.collection('admins').doc(userId), {
        uid: userId,
        email: userEmail,
        displayName: userData.displayName || userData.firstName ? `${userData.firstName} ${userData.lastName}`.trim() : userEmail,
        roles: [inviteData.role],
        isActive: true,
        invitedBy: inviteData.invitedBy,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    batch.update(inviteRef, {
      status: 'accepted',
      acceptedBy: userId,
      acceptedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();

    logger.info('Admin invitation accepted', {
      invitationToken,
      userId,
      role: inviteData.role
    });

    return {
      success: true,
      message: 'Successfully joined as admin',
      role: inviteData.role
    };
  } catch (error) {
    logger.error('Error accepting admin invitation:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to accept invitation');
  }
});

exports.getAdminInvitationDetails = onCall({ cors: true, region: 'europe-west6', database: 'medishift' }, async (request) => {
  const { invitationToken } = request.data;

  if (!invitationToken) {
    throw new HttpsError('invalid-argument', 'Invitation token is required');
  }

  try {
    const inviteRef = db.collection('adminInvitations').doc(invitationToken);
    const inviteSnap = await inviteRef.get();

    if (!inviteSnap.exists) {
      throw new HttpsError('not-found', 'Invitation not found');
    }

    const inviteData = inviteSnap.data();
    const now = new Date();
    const expiresAt = inviteData.expiresAt?.toDate();

    if (expiresAt && expiresAt < now) {
      throw new HttpsError('deadline-exceeded', 'This invitation has expired');
    }

    if (inviteData.status !== 'pending') {
      throw new HttpsError('failed-precondition', 'This invitation has already been used');
    }

    return {
      success: true,
      invitation: {
        role: inviteData.role,
        invitedByName: inviteData.invitedByName,
        expiresAt: expiresAt?.toISOString()
      }
    };
  } catch (error) {
    logger.error('Error getting admin invitation details:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to get invitation details');
  }
});

