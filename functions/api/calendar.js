// Migrated to v2
// const functions = require('firebase-functions/v1');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore('medishift');

/**
 * EVENT PERMISSION HELPERS
 */

async function getUserRoles(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return { roles: [], facilityMemberships: [], organizationIds: [] };
    }
    const userData = userDoc.data();
    return {
      roles: userData.roles || [],
      facilityMemberships: userData.facilityMemberships || [],
      organizationIds: userData.organizationIds || [],
      professionalProfileId: userData.professionalProfileId,
      facilityProfileId: userData.facilityProfileId
    };
  } catch (error) {
    logger.error('Error fetching user roles', { userId, error: error.message });
    return { roles: [], facilityMemberships: [], organizationIds: [] };
  }
}

async function isFacilityAdmin(userId, facilityProfileId) {
  if (!facilityProfileId) return false;
  try {
    const facilityDoc = await db.collection('facilityProfiles').doc(facilityProfileId).get();
    if (!facilityDoc.exists) return false;
    const facilityData = facilityDoc.data();
    return facilityData.admins?.includes(userId) || 
           facilityData.chainAdmins?.includes(userId) ||
           facilityProfileId === userId;
  } catch (error) {
    logger.error('Error checking facility admin', { userId, facilityProfileId, error: error.message });
    return false;
  }
}

async function isChainAdmin(userId, organizationId) {
  if (!organizationId) return false;
  try {
    const orgDoc = await db.collection('organizations').doc(organizationId).get();
    if (!orgDoc.exists) return false;
    const orgData = orgDoc.data();
    return orgData.admins?.includes(userId);
  } catch (error) {
    logger.error('Error checking chain admin', { userId, organizationId, error: error.message });
    return false;
  }
}

async function isFacilityEmployee(userId, facilityProfileId) {
  if (!facilityProfileId) return false;
  try {
    const facilityDoc = await db.collection('facilityProfiles').doc(facilityProfileId).get();
    if (!facilityDoc.exists) return false;
    const facilityData = facilityDoc.data();
    return facilityData.employees?.includes(userId);
  } catch (error) {
    logger.error('Error checking facility employee', { userId, facilityProfileId, error: error.message });
    return false;
  }
}

async function determineEventPermissions(eventData, userId) {
  const userRoles = await getUserRoles(userId);
  const permissions = {
    owners: [userId],
    chainAdmins: [],
    facilityAdmins: [],
    viewers: []
  };

  if (eventData.facilityProfileId) {
    const facilityDoc = await db.collection('facilityProfiles').doc(eventData.facilityProfileId).get();
    if (facilityDoc.exists) {
      const facilityData = facilityDoc.data();
      permissions.facilityAdmins = facilityData.admins || [];
      
      if (facilityData.organizationId) {
        const orgDoc = await db.collection('organizations').doc(facilityData.organizationId).get();
        if (orgDoc.exists) {
          permissions.chainAdmins = orgDoc.data().admins || [];
        }
      }
    }
  }

  if (eventData.organizationId) {
    const orgDoc = await db.collection('organizations').doc(eventData.organizationId).get();
    if (orgDoc.exists) {
      permissions.chainAdmins = orgDoc.data().admins || [];
    }
  }

  return permissions;
}

async function canManageEvent(eventDoc, userId, action = 'update') {
  if (!eventDoc.exists) return false;
  
  const eventData = eventDoc.data();
  
  if (eventData.userId === userId) return true;
  
  if (eventData.permissions) {
    if (eventData.permissions.owners?.includes(userId)) return true;
    if (action === 'read' && eventData.permissions.viewers?.includes(userId)) return true;
    if (eventData.permissions.chainAdmins?.includes(userId)) return true;
    if (eventData.permissions.facilityAdmins?.includes(userId)) return true;
  }
  
  if (eventData.facilityProfileId) {
    if (await isFacilityAdmin(userId, eventData.facilityProfileId)) return true;
  }
  
  if (eventData.organizationId) {
    if (await isChainAdmin(userId, eventData.organizationId)) return true;
  }
  
  return false;
}

function determineEventType(data, userRoles) {
  if (data.type) return data.type;
  
  if (data.requestType === 'sick_leave' || data.requestType === 'time_off') {
    return 'time_off_request';
  }
  
  if (data.requestType === 'vacancy_application') {
    return 'vacancy_application';
  }
  
  if (data.requestType === 'vacancy_request' || data.requestType === 'sick_leave_request') {
    return 'employee_vacancy_request';
  }
  
  if (data.chainInternal || (data.facilityProfileId && data.organizationId && data.chainInternal)) {
    return 'chain_internal_availability';
  }
  
  if (data.isAvailability && (data.chainInternal || data.openInternally || data.openExternally)) {
    return 'chain_internal_availability';
  }
  
  if (data.facilityProfileId && data.employeeUserId) {
    return 'facility_employee_schedule';
  }
  
  if (data.facilityProfileId && data.status && data.jobTitle) {
    return 'facility_job_post';
  }
  
  if (data.facilityProfileId && data.vacancyType) {
    return 'vacancy_request';
  }
  
  return 'worker_availability';
}

/**
 * VACANCY APPLICATION HELPERS
 */

async function createVacancyApplication(applicationId, vacancyEventId, professionalId, applicationData) {
  try {
    const vacancyRef = db.collection('events').doc(vacancyEventId);
    const vacancyDoc = await vacancyRef.get();
    
    if (!vacancyDoc.exists) {
      logger.error('Vacancy event not found', { vacancyEventId });
      return;
    }
    
    const vacancyData = vacancyDoc.data();
    if (vacancyData.type !== 'vacancy_request') {
      logger.error('Event is not a vacancy request', { vacancyEventId, type: vacancyData.type });
      return;
    }
    
    const applicationsRef = vacancyRef.collection('applications');
    await applicationsRef.doc(applicationId).set({
      professionalId: professionalId,
      professionalProfileId: applicationData.professionalProfileId,
      applicationId: applicationId,
      status: 'pending',
      appliedAt: admin.firestore.FieldValue.serverTimestamp(),
      notes: applicationData.applicationNotes || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    logger.info('Vacancy application created', {
      applicationId,
      vacancyEventId,
      professionalId
    });
  } catch (error) {
    logger.error('Error creating vacancy application', {
      error: error.message,
      applicationId,
      vacancyEventId
    });
  }
}

/**
 * ACCEPT EMPLOYEE REQUEST AND CREATE POSTINGS
 */

async function acceptEmployeeRequestAndCreatePostings(requestId, requestType, acceptedBy, options = {}) {
  try {
    const collectionName = requestType === 'vacancy_request' ? 'employeeVacancyRequests' : 'timeOffRequests';
    const requestRef = db.collection(collectionName).doc(requestId);
    const requestDoc = await requestRef.get();
    
    if (!requestDoc.exists) {
      throw new HttpsError('not-found', 'Request not found');
    }
    
    const requestData = requestDoc.data();
    
    if (requestData.status !== 'pending') {
      throw new HttpsError('invalid-argument', 'Request has already been processed');
    }
    
    const facilityDoc = await db.collection('facilityProfiles').doc(requestData.facilityProfileId).get();
    if (!facilityDoc.exists) {
      throw new HttpsError('not-found', 'Facility not found');
    }
    
    const facilityData = facilityDoc.data();
    const organizationId = facilityData.organizationId;
    
    await requestRef.update({
      status: 'accepted',
      acceptedBy: acceptedBy,
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      openInternally: options.openInternally !== false,
      openExternally: options.openExternally || false
    });
    
    const createdEvents = [];
    
    if (options.openInternally !== false) {
      const internalEvent = {
        userId: requestData.userId,
        createdBy: acceptedBy,
        title: requestData.title || (requestType === 'vacancy_request' ? 'Vacancy Request' : 'Time Off Request'),
        from: requestData.from,
        to: requestData.to,
        type: requestType === 'vacancy_request' ? 'vacancy_request' : 'facility_employee_schedule',
        facilityProfileId: requestData.facilityProfileId,
        organizationId: organizationId,
        visibility: 'facility',
        status: requestType === 'vacancy_request' ? 'open' : 'scheduled',
        notes: requestData.requestNotes || requestData.reason || '',
        created: admin.firestore.FieldValue.serverTimestamp(),
        updated: admin.firestore.FieldValue.serverTimestamp()
      };
      
      if (requestType === 'vacancy_request') {
        internalEvent.vacancyType = requestData.vacancyType || 'temporary';
        internalEvent.urgency = requestData.urgency || 'medium';
        internalEvent.requiredSkills = requestData.requiredSkills || [];
      } else {
        internalEvent.employeeUserId = requestData.userId;
        internalEvent.employeeRole = requestData.employeeRole || '';
        internalEvent.shiftType = 'time_off';
      }
      
      const permissions = await determineEventPermissions(internalEvent, acceptedBy);
      internalEvent.permissions = permissions;
      
      const internalEventRef = await db.collection('events').add(internalEvent);
      createdEvents.push({ id: internalEventRef.id, type: 'internal' });
    }
    
    if (options.openExternally) {
      const externalEvent = {
        userId: requestData.userId,
        createdBy: acceptedBy,
        title: requestData.title || 'Open Position',
        from: requestData.from,
        to: requestData.to,
        type: requestType === 'vacancy_request' ? 'facility_job_post' : 'worker_availability',
        facilityProfileId: requestData.facilityProfileId,
        organizationId: organizationId,
        visibility: 'public',
        status: requestType === 'vacancy_request' ? 'open' : 'available',
        notes: requestData.requestNotes || requestData.reason || '',
        created: admin.firestore.FieldValue.serverTimestamp(),
        updated: admin.firestore.FieldValue.serverTimestamp()
      };
      
      if (requestType === 'vacancy_request') {
        externalEvent.jobTitle = requestData.jobTitle || 'Open Position';
        externalEvent.jobType = requestData.jobType || 'general';
        externalEvent.compensation = requestData.compensation || {};
        externalEvent.requiredSkills = requestData.requiredSkills || [];
      } else {
        externalEvent.isAvailability = true;
        externalEvent.isValidated = false;
        externalEvent.professionalProfileId = requestData.professionalProfileId;
      }
      
      const permissions = await determineEventPermissions(externalEvent, acceptedBy);
      externalEvent.permissions = permissions;
      
      const externalEventRef = await db.collection('events').add(externalEvent);
      createdEvents.push({ id: externalEventRef.id, type: 'external' });
    }
    
    logger.info('Employee request accepted and postings created', {
      requestId,
      requestType,
      acceptedBy,
      createdEvents
    });
    
    return {
      success: true,
      requestId,
      createdEvents
    };
  } catch (error) {
    logger.error('Error accepting employee request', {
      error: error.message,
      requestId,
      requestType
    });
    throw error;
  }
}

exports.acceptEmployeeRequest = onCall(async (request) => {
  const data = request.data;
  const context = { auth: request.auth };
  
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in');
  }
  
  const { requestId, requestType, openInternally, openExternally } = data;
  
  if (!requestId || !requestType) {
    throw new HttpsError('invalid-argument', 'Request ID and type are required');
  }
  
  return await acceptEmployeeRequestAndCreatePostings(
    requestId,
    requestType,
    context.auth.uid,
    { openInternally, openExternally }
  );
});

/**
 * EVENT FILTERING HELPERS
 */

async function getAccessibleEvents(userId, filters = {}) {
  const userRoles = await getUserRoles(userId);
  const queries = [];

  const baseQuery = db.collection('events');

  if (filters.type) {
    queries.push(baseQuery.where('type', '==', filters.type));
  }

  if (filters.userId) {
    queries.push(baseQuery.where('userId', '==', filters.userId));
  }

  if (filters.facilityProfileId) {
    queries.push(baseQuery.where('facilityProfileId', '==', filters.facilityProfileId));
  }

  if (filters.organizationId) {
    queries.push(baseQuery.where('organizationId', '==', filters.organizationId));
  }

  if (filters.visibility) {
    queries.push(baseQuery.where('visibility', '==', filters.visibility));
  }

  if (queries.length === 0) {
    queries.push(baseQuery);
  }

  const allEvents = [];
  for (const query of queries) {
    const snapshot = await query.get();
    for (const doc of snapshot.docs) {
      const eventData = doc.data();
      
      if (await canViewEvent(doc, userId)) {
        allEvents.push({
          id: doc.id,
          ...eventData
        });
      }
    }
  }

  return allEvents;
}

async function canViewEvent(eventDoc, userId) {
  if (!eventDoc.exists) return false;
  
  const eventData = eventDoc.data();
  
  if (eventData.userId === userId) return true;
  
  if (eventData.visibility === 'public' && eventData.type === 'worker_availability' && eventData.isValidated) {
    return true;
  }
  
  if (eventData.permissions) {
    if (eventData.permissions.owners?.includes(userId)) return true;
    if (eventData.permissions.viewers?.includes(userId)) return true;
    if (eventData.permissions.chainAdmins?.includes(userId)) return true;
    if (eventData.permissions.facilityAdmins?.includes(userId)) return true;
  }
  
  if (eventData.facilityProfileId) {
    if (await isFacilityAdmin(userId, eventData.facilityProfileId)) return true;
    
    if (eventData.type === 'facility_employee_schedule') {
      if (await isFacilityEmployee(userId, eventData.facilityProfileId)) {
        const facilityDoc = await db.collection('facilityProfiles').doc(eventData.facilityProfileId).get();
        if (facilityDoc.exists) {
          const facilityData = facilityDoc.data();
          const userPermissions = facilityData.permissions?.[userId] || [];
          if (userPermissions.includes('facility:schedule:view')) {
            return true;
          }
        }
      }
    } else if (await isFacilityEmployee(userId, eventData.facilityProfileId)) {
      if (eventData.type === 'facility_job_post' || eventData.visibility === 'facility') {
        return true;
      }
    }
  }
  
  if (eventData.organizationId) {
    if (await isChainAdmin(userId, eventData.organizationId)) return true;
    
    const userRoles = await getUserRoles(userId);
    const userFacilities = userRoles.facilityMemberships || [];
    const userFacilityIds = userFacilities.map(f => f.facilityProfileId || f.facilityId);
    
    if (eventData.facilityProfileId && userFacilityIds.includes(eventData.facilityProfileId)) {
      if (eventData.type === 'chain_internal_availability' || 
          eventData.visibility === 'chain') {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Save a calendar event (availability)
 */
exports.saveCalendarEvent = onCall(async (request) => {
  // V2 compatibility shim
  const data = request.data;
  const context = { auth: request.auth };

  // Ensure user is authenticated
  if (!context.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to save calendar events'
    );
  }

  try {
    const {
      userId, title, start, end, color, color1, color2, notes, location,
      type, facilityProfileId, organizationId, employeeUserId,
      isAvailability, isValidated, canton, area, languages, experience,
      software, certifications, workAmount,
      status, jobTitle, jobType, compensation, requiredSkills,
      employeeRole, shiftType, isSublettable,
      vacancyType, urgency,
      visibility, chainInternal, sharedFacilityIds
    } = data;

    const callerId = context.auth.uid;
    const userRoles = await getUserRoles(callerId);

    const eventType = determineEventType(data, userRoles);

    if (eventType === 'worker_availability') {
      if (userId !== callerId) {
        throw new HttpsError('permission-denied', 'You can only save events for your own account');
      }
    } else if (eventType === 'time_off_request') {
      if (userId !== callerId) {
        throw new HttpsError('permission-denied', 'You can only request time off for yourself');
      }
      if (!facilityProfileId) {
        throw new HttpsError('invalid-argument', 'Facility profile ID is required for time off requests');
      }
      if (!(await isFacilityEmployee(callerId, facilityProfileId))) {
        throw new HttpsError('permission-denied', 'You must be an employee of the facility to request time off');
      }
    } else if (eventType === 'vacancy_application') {
      if (userId !== callerId) {
        throw new HttpsError('permission-denied', 'You can only apply for vacancies yourself');
      }
      if (!data.vacancyEventId) {
        throw new HttpsError('invalid-argument', 'Vacancy event ID is required for applications');
      }
    } else if (eventType === 'employee_vacancy_request') {
      if (userId !== callerId) {
        throw new HttpsError('permission-denied', 'You can only request vacancies for yourself');
      }
      if (!facilityProfileId) {
        throw new HttpsError('invalid-argument', 'Facility profile ID is required for vacancy requests');
      }
      if (!(await isFacilityEmployee(callerId, facilityProfileId))) {
        throw new HttpsError('permission-denied', 'You must be an employee of the facility to request vacancies');
      }
    } else if (eventType === 'facility_job_post' || eventType === 'vacancy_request') {
      if (!facilityProfileId) {
        throw new HttpsError('invalid-argument', 'Facility profile ID is required for this event type');
      }
      if (!(await isFacilityAdmin(callerId, facilityProfileId))) {
        throw new HttpsError('permission-denied', 'Only facility admins can create job posts or approved vacancy requests');
      }
    } else if (eventType === 'facility_employee_schedule') {
      if (!facilityProfileId) {
        throw new HttpsError('invalid-argument', 'Facility profile ID is required');
      }
      if (!(await isFacilityAdmin(callerId, facilityProfileId))) {
        throw new HttpsError('permission-denied', 'Only facility admins can create employee schedules');
      }
    } else if (eventType === 'chain_internal_availability') {
      if (!organizationId) {
        throw new HttpsError('invalid-argument', 'Organization ID is required for chain events');
      }
      if (!(await isChainAdmin(callerId, organizationId))) {
        throw new HttpsError('permission-denied', 'Only chain admins can create chain-wide availability');
      }
    }

    if (!start || !end) {
      throw new HttpsError('invalid-argument', 'Start and end times are required');
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new HttpsError('invalid-argument', 'Invalid date format');
    }

    if (startDate >= endDate) {
      throw new HttpsError('invalid-argument', 'End time must be after start time');
    }

    const baseEventData = {
      userId: userId || callerId,
      createdBy: callerId,
      title: title || 'Available',
      from: startDate.toISOString(),
      to: endDate.toISOString(),
      color: color || '#0f54bc',
      color1: color1 || '#a8c1ff',
      color2: color2 || '#4da6fb',
      notes: notes || '',
      location: location || {},
      recurring: false,
      visibility: visibility || (eventType === 'worker_availability' ? 'public' : 'facility'),
      created: admin.firestore.FieldValue.serverTimestamp(),
      updated: admin.firestore.FieldValue.serverTimestamp()
    };

    const typeSpecificData = {};
    
    if (eventType === 'worker_availability') {
      typeSpecificData.isAvailability = isAvailability !== false;
      typeSpecificData.isValidated = isValidated !== false;
      typeSpecificData.professionalProfileId = userRoles.professionalProfileId || userId;
      typeSpecificData.locationCountry = Array.isArray(canton) ? canton : [];
      typeSpecificData.LocationArea = Array.isArray(area) ? area : [];
      typeSpecificData.languages = Array.isArray(languages) ? languages : [];
      typeSpecificData.experience = experience || '';
      typeSpecificData.software = Array.isArray(software) ? software : [];
      typeSpecificData.certifications = Array.isArray(certifications) ? certifications : [];
      typeSpecificData.workAmount = workAmount || '';
    } else if (eventType === 'time_off_request') {
      typeSpecificData.requestType = data.requestType || 'sick_leave';
      typeSpecificData.timeOffType = data.timeOffType || 'sick_leave';
      typeSpecificData.reason = notes || '';
      typeSpecificData.status = 'pending';
      typeSpecificData.professionalProfileId = userRoles.professionalProfileId || userId;
    } else if (eventType === 'vacancy_application') {
      typeSpecificData.vacancyEventId = data.vacancyEventId;
      typeSpecificData.applicationStatus = 'pending';
      typeSpecificData.professionalProfileId = userRoles.professionalProfileId || userId;
      typeSpecificData.applicationNotes = notes || '';
    } else if (eventType === 'facility_job_post') {
      typeSpecificData.status = status || 'open';
      typeSpecificData.jobTitle = jobTitle || title || 'Open Position';
      typeSpecificData.jobType = jobType || 'general';
      typeSpecificData.compensation = compensation || {};
      typeSpecificData.requiredSkills = Array.isArray(requiredSkills) ? requiredSkills : [];
    } else if (eventType === 'facility_employee_schedule') {
      typeSpecificData.employeeUserId = employeeUserId || userId;
      typeSpecificData.employeeRole = employeeRole || '';
      typeSpecificData.shiftType = shiftType || 'regular';
      typeSpecificData.isSublettable = isSublettable !== false;
    } else if (eventType === 'chain_internal_availability') {
      typeSpecificData.chainInternal = true;
      typeSpecificData.isAvailability = true;
      typeSpecificData.openInternally = data.openInternally !== false;
      typeSpecificData.openExternally = data.openExternally || false;
      typeSpecificData.sharedFacilityIds = Array.isArray(sharedFacilityIds) ? sharedFacilityIds : [];
      typeSpecificData.locationCountry = Array.isArray(canton) ? canton : [];
      typeSpecificData.LocationArea = Array.isArray(area) ? area : [];
      typeSpecificData.languages = Array.isArray(languages) ? languages : [];
      typeSpecificData.experience = experience || '';
      typeSpecificData.software = Array.isArray(software) ? software : [];
      typeSpecificData.certifications = Array.isArray(certifications) ? certifications : [];
      typeSpecificData.workAmount = workAmount || '';
      if (data.openExternally) {
        typeSpecificData.isValidated = false;
        typeSpecificData.visibility = 'public';
      } else {
        typeSpecificData.visibility = 'chain';
      }
    } else if (eventType === 'employee_vacancy_request') {
      typeSpecificData.requestType = data.requestType || 'vacancy_request';
      typeSpecificData.vacancyType = vacancyType || 'temporary';
      typeSpecificData.urgency = urgency || 'medium';
      typeSpecificData.requiredSkills = Array.isArray(requiredSkills) ? requiredSkills : [];
      typeSpecificData.status = 'pending';
      typeSpecificData.professionalProfileId = userRoles.professionalProfileId || userId;
      typeSpecificData.requestNotes = notes || '';
    } else if (eventType === 'vacancy_request') {
      typeSpecificData.vacancyType = vacancyType || 'temporary';
      typeSpecificData.urgency = urgency || 'medium';
      typeSpecificData.requiredSkills = Array.isArray(requiredSkills) ? requiredSkills : [];
      typeSpecificData.status = 'open';
      typeSpecificData.openInternally = data.openInternally !== false;
      typeSpecificData.openExternally = data.openExternally || false;
    }

    const eventData = {
      ...baseEventData,
      type: eventType,
      facilityProfileId: facilityProfileId || null,
      organizationId: organizationId || null,
      ...typeSpecificData
    };

    const permissions = await determineEventPermissions(eventData, callerId);
    eventData.permissions = permissions;

    logger.info('Attempting to save event to events collection', {
      userId,
      hasData: !!eventData,
      dataKeys: Object.keys(eventData)
    });

    let docRef;
    try {
      logger.info('Accessing availability collection', {
        userId,
        dbType: typeof db,
        hasCollection: typeof db.collection === 'function'
      });
      
      let collectionName = 'events';
      
      if (eventType === 'time_off_request') {
        collectionName = 'timeOffRequests';
      } else if (eventType === 'vacancy_application') {
        collectionName = 'vacancyApplications';
      } else if (eventType === 'employee_vacancy_request') {
        collectionName = 'employeeVacancyRequests';
      }
      
      const eventsRef = db.collection(collectionName);
      logger.info('Collection reference obtained', { userId, collectionName });
      
      docRef = await eventsRef.add(eventData);
      logger.info('Document reference created', { docId: docRef.id, userId, collectionName });
      
      if (eventType === 'vacancy_application') {
        await createVacancyApplication(docRef.id, data.vacancyEventId, callerId, eventData);
      }
    } catch (addError) {
      const addErrorMessage = addError.message || addError.toString() || 'Unknown error';
      logger.error('Error adding document to events collection', {
        error: addErrorMessage,
        code: addError.code,
        stack: addError.stack,
        name: addError.name,
        details: addError.details,
        userId,
        collectionName: 'events',
        eventDataKeys: Object.keys(eventData)
      });
      throw new HttpsError(
        'internal',
        `Failed to save to events collection: ${addErrorMessage} (code: ${addError.code || 'unknown'})`
      );
    }

    logger.info('Calendar event saved', {
      eventId: docRef.id,
      userId: userId,
      start: start,
      end: end
    });

    return {
      success: true,
      id: docRef.id
    };
  } catch (error) {
    const errorMessage = error.message || error.toString() || 'Unknown error';
    const errorCode = error.code || 'unknown';
    
    logger.error('Error saving calendar event', {
      error: errorMessage,
      code: errorCode,
      stack: error.stack,
      name: error.name,
      details: error.details
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      'internal',
      `Error saving calendar event: ${errorMessage}`
    );
  }
});

/**
 * Update a calendar event
 */
exports.updateCalendarEvent = onCall(async (request) => {
  // V2 compatibility shim
  const data = request.data;
  const context = { auth: request.auth };

  // Ensure user is authenticated
  if (!context.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to update calendar events'
    );
  }

  try {
    const {
      eventId, userId, accountType, title, start, end, color, color1, color2,
      notes, location, isValidated, isRecurring, recurrenceId, canton, area,
      languages, experience, software, certifications, workAmount, isAvailability,
      type, facilityProfileId, organizationId, employeeUserId,
      status, jobTitle, jobType, compensation, requiredSkills,
      employeeRole, shiftType, isSublettable,
      vacancyType, urgency, visibility
    } = data;

    const callerId = context.auth.uid;

    if (!eventId) {
      throw new HttpsError('invalid-argument', 'Event ID is required');
    }

    const collectionName = accountType === 'manager' ? 'jobs-listing' : 'events';
    const eventRef = db.collection(collectionName).doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      throw new HttpsError('not-found', 'Event not found');
    }

    const eventData = eventDoc.data();

    if (!(await canManageEvent(eventDoc, callerId, 'update'))) {
      throw new HttpsError('permission-denied', 'You do not have permission to update this event');
    }

    // Prepare update data
    const updateData = {
      updated: admin.firestore.FieldValue.serverTimestamp()
    };

    if (title !== undefined) updateData.title = title;
    if (start) {
      const startDate = new Date(start);
      if (isNaN(startDate.getTime())) {
        throw new HttpsError('invalid-argument', 'Invalid start date');
      }
      updateData.from = startDate.toISOString();
    }
    if (end) {
      const endDate = new Date(end);
      if (isNaN(endDate.getTime())) {
        throw new HttpsError('invalid-argument', 'Invalid end date');
      }
      updateData.to = endDate.toISOString();
    }
    if (color !== undefined) updateData.color = color;
    if (color1 !== undefined) updateData.color1 = color1;
    if (color2 !== undefined) updateData.color2 = color2;
    if (notes !== undefined) updateData.notes = notes;
    if (location !== undefined) updateData.location = location;
    if (isValidated !== undefined) updateData.isValidated = isValidated;

    // Handle recurrence fields
    if (isRecurring !== undefined) {
      updateData.recurring = isRecurring;
      if (isRecurring && recurrenceId) {
        updateData.recurrenceId = recurrenceId;
      } else if (!isRecurring) {
        updateData.recurrenceId = admin.firestore.FieldValue.delete();
      }
    }

    if (collectionName === 'events') {
      const eventType = eventData.type || 'worker_availability';
      
      if (eventType === 'worker_availability') {
        if (canton !== undefined) updateData.locationCountry = canton;
        if (area !== undefined) updateData.LocationArea = area;
        if (languages !== undefined) updateData.languages = languages;
        if (experience !== undefined) updateData.experience = experience;
        if (software !== undefined) updateData.software = software;
        if (certifications !== undefined) updateData.certifications = certifications;
        if (workAmount !== undefined) updateData.workAmount = workAmount;
        if (isAvailability !== undefined) updateData.isAvailability = isAvailability;
        if (isValidated !== undefined) updateData.isValidated = isValidated;
      } else if (eventType === 'facility_job_post') {
        if (status !== undefined) updateData.status = status;
        if (jobTitle !== undefined) updateData.jobTitle = jobTitle;
        if (jobType !== undefined) updateData.jobType = jobType;
        if (compensation !== undefined) updateData.compensation = compensation;
        if (requiredSkills !== undefined) updateData.requiredSkills = requiredSkills;
      } else if (eventType === 'facility_employee_schedule') {
        if (employeeRole !== undefined) updateData.employeeRole = employeeRole;
        if (shiftType !== undefined) updateData.shiftType = shiftType;
        if (isSublettable !== undefined) updateData.isSublettable = isSublettable;
      } else if (eventType === 'vacancy_request') {
        if (vacancyType !== undefined) updateData.vacancyType = vacancyType;
        if (urgency !== undefined) updateData.urgency = urgency;
        if (requiredSkills !== undefined) updateData.requiredSkills = requiredSkills;
      }
      
      if (visibility !== undefined) updateData.visibility = visibility;
      if (facilityProfileId !== undefined) updateData.facilityProfileId = facilityProfileId;
      if (organizationId !== undefined) updateData.organizationId = organizationId;
      
      if (facilityProfileId || organizationId) {
        const updatedPermissions = await determineEventPermissions(
          { ...eventData, ...updateData, facilityProfileId, organizationId },
          callerId
        );
        updateData.permissions = updatedPermissions;
      }
    }

    // Validate date order if both dates are being updated
    if (updateData.from && updateData.to) {
      if (new Date(updateData.from) >= new Date(updateData.to)) {
        throw new HttpsError(
          'invalid-argument',
          'End time must be after start time'
        );
      }
    }

    // Update the document
    await eventRef.update(updateData);

    logger.info('Calendar event updated', {
      eventId: eventId,
      userId: userId,
      updateFields: Object.keys(updateData)
    });

    return {
      success: true
    };
  } catch (error) {
    logger.error('Error updating calendar event', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      'internal',
      'Error updating calendar event'
    );
  }
});

/**
 * Delete a calendar event
 */
exports.deleteCalendarEvent = onCall(async (request) => {
  // V2 compatibility shim
  const data = request.data;
  const context = { auth: request.auth };

  // Ensure user is authenticated
  if (!context.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to delete calendar events'
    );
  }

  try {
    const { eventId, userId, accountType, deleteType, recurrenceId, selectedDays } = data;

    const callerId = context.auth.uid;

    if (!eventId) {
      throw new HttpsError('invalid-argument', 'Event ID is required');
    }

    const collectionName = accountType === 'manager' ? 'jobs-listing' : 'events';
    let deletedCount = 0;

    if (deleteType === 'single' || !recurrenceId) {
      const eventRef = db.collection(collectionName).doc(eventId);
      const eventDoc = await eventRef.get();

      if (!eventDoc.exists) {
        throw new HttpsError('not-found', 'Event not found');
      }

      if (!(await canManageEvent(eventDoc, callerId, 'delete'))) {
        throw new HttpsError('permission-denied', 'You do not have permission to delete this event');
      }

      await eventRef.delete();
      deletedCount = 1;
    } else if (deleteType === 'all' && recurrenceId) {
      const seriesQuery = db.collection(collectionName)
        .where('recurrenceId', '==', recurrenceId);

      const seriesSnapshot = await seriesQuery.get();

      if (seriesSnapshot.empty) {
        throw new HttpsError(
          'not-found',
          'No events found in the series'
        );
      }

      const batch = db.batch();
      for (const doc of seriesSnapshot.docs) {
        if (await canManageEvent(doc, callerId, 'delete')) {
          batch.delete(doc.ref);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        await batch.commit();
      } else {
        throw new HttpsError('permission-denied', 'You do not have permission to delete any events in this series');
      }
    } else if (deleteType === 'future' && recurrenceId) {
      // Delete future events in the series
      const eventRef = db.collection(collectionName).doc(eventId);
      const eventDoc = await eventRef.get();

      if (!eventDoc.exists) {
        throw new HttpsError(
          'not-found',
          'Event not found'
        );
      }

      const eventData = eventDoc.data();
      const currentEventDate = new Date(eventData.from);

      const seriesQuery = db.collection(collectionName)
        .where('recurrenceId', '==', recurrenceId);

      const seriesSnapshot = await seriesQuery.get();

      const batch = db.batch();
      for (const doc of seriesSnapshot.docs) {
        const docData = doc.data();
        const eventDate = new Date(docData.from);

        if (eventDate >= currentEventDate && await canManageEvent(doc, callerId, 'delete')) {
          batch.delete(doc.ref);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        await batch.commit();
      }
    } else if (deleteType === 'days' && recurrenceId && selectedDays) {
      // Delete events on specific days of the week (for weekly repeats)
      const eventRef = db.collection(collectionName).doc(eventId);
      const eventDoc = await eventRef.get();

      if (!eventDoc.exists) {
        throw new HttpsError(
          'not-found',
          'Event not found'
        );
      }

      const eventData = eventDoc.data();
      const currentEventDate = new Date(eventData.from);

      const seriesQuery = db.collection(collectionName)
        .where('recurrenceId', '==', recurrenceId);

      const seriesSnapshot = await seriesQuery.get();

      const batch = db.batch();
      for (const doc of seriesSnapshot.docs) {
        const docData = doc.data();
        const eventDate = new Date(docData.from);

        if (eventDate >= currentEventDate && await canManageEvent(doc, callerId, 'delete')) {
          const dayOfWeek = eventDate.getDay();
          const mondayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          
          if (selectedDays[mondayIndex]) {
            batch.delete(doc.ref);
            deletedCount++;
          }
        }
      }

      if (deletedCount > 0) {
        await batch.commit();
      }
    }

    logger.info('Calendar events deleted', {
      eventId: eventId,
      userId: userId,
      deleteType: deleteType,
      count: deletedCount
    });

    return {
      success: true,
      count: deletedCount
    };
  } catch (error) {
    logger.error('Error deleting calendar event', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      'internal',
      'Error deleting calendar event'
    );
  }
});

/**
 * Save recurring calendar events
 */
exports.saveRecurringEvents = onCall(async (request) => {
  // V2 compatibility shim
  const data = request.data;
  const context = { auth: request.auth };

  // Ensure user is authenticated
  if (!context.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to save recurring events'
    );
  }

  try {
    const { userId, baseEvent } = data;

    // Ensure the caller can only save events for their own account
    if (userId !== context.auth.uid) {
      throw new HttpsError(
        'permission-denied',
        'You can only save events for your own account'
      );
    }

    if (!baseEvent || !baseEvent.start || !baseEvent.end) {
      throw new HttpsError(
        'invalid-argument',
        'Base event with start and end times is required'
      );
    }

    const recurrenceId = `${userId}_${Date.now()}_recurrence`;

    let startDate, endDate, duration;
    try {
      startDate = new Date(baseEvent.start);
      endDate = new Date(baseEvent.end);

      if (isNaN(startDate.getTime())) {
        throw new HttpsError(
          'invalid-argument',
          `Invalid start date: ${baseEvent.start}`
        );
      }

      if (isNaN(endDate.getTime())) {
        throw new HttpsError(
          'invalid-argument',
          `Invalid end date: ${baseEvent.end}`
        );
      }

      if (startDate >= endDate) {
        throw new HttpsError(
          'invalid-argument',
          'End time must be after start time'
        );
      }

      duration = endDate.getTime() - startDate.getTime();
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error('Error parsing dates', {
        error: error.message,
        start: baseEvent.start,
        end: baseEvent.end
      });
      throw new HttpsError(
        'invalid-argument',
        `Invalid date format: ${error.message}`
      );
    }

    let endRepeatDate = null;
    try {
      if (baseEvent.endRepeatValue === 'On Date' && baseEvent.endRepeatDate) {
        endRepeatDate = new Date(baseEvent.endRepeatDate);
        if (isNaN(endRepeatDate.getTime())) {
          throw new Error(`Invalid endRepeatDate: ${baseEvent.endRepeatDate}`);
        }
      } else if (baseEvent.endRepeatValue === 'Never') {
        endRepeatDate = new Date(startDate);
        endRepeatDate.setFullYear(endRepeatDate.getFullYear() + 2);
      } else if (baseEvent.endRepeatDate) {
        endRepeatDate = new Date(baseEvent.endRepeatDate);
        if (isNaN(endRepeatDate.getTime())) {
          throw new Error(`Invalid endRepeatDate: ${baseEvent.endRepeatDate}`);
        }
      } else {
        endRepeatDate = new Date(startDate);
        endRepeatDate.setFullYear(endRepeatDate.getFullYear() + 1);
      }
    } catch (error) {
      logger.error('Error calculating end repeat date', {
        error: error.message,
        endRepeatValue: baseEvent.endRepeatValue,
        endRepeatDate: baseEvent.endRepeatDate
      });
      endRepeatDate = new Date(startDate);
      endRepeatDate.setFullYear(endRepeatDate.getFullYear() + 1);
    }

    logger.info('Generating recurring events', {
      userId,
      repeatValue: baseEvent.repeatValue,
      endRepeatValue: baseEvent.endRepeatValue,
      endRepeatCount: baseEvent.endRepeatCount,
      endRepeatDate: endRepeatDate?.toISOString(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    let occurrences;
    try {
      occurrences = generateRecurringDates(
        startDate,
        baseEvent.repeatValue || 'Every Day',
        baseEvent.endRepeatValue || 'After',
        baseEvent.endRepeatCount || 30,
        endRepeatDate,
        {
          weeklyDays: baseEvent.weeklyDays,
          monthlyType: baseEvent.monthlyType,
          monthlyDay: baseEvent.monthlyDay,
          monthlyWeek: baseEvent.monthlyWeek,
          monthlyDayOfWeek: baseEvent.monthlyDayOfWeek
        }
      );
    } catch (error) {
      logger.error('Error generating recurring dates', {
        error: error.message,
        stack: error.stack,
        repeatValue: baseEvent.repeatValue,
        endRepeatValue: baseEvent.endRepeatValue
      });
      throw new HttpsError(
        'internal',
        `Error generating recurring dates: ${error.message}`
      );
    }

    logger.info('Generated occurrences', {
      userId,
      count: occurrences.length,
      firstOccurrence: occurrences[0]?.toISOString(),
      lastOccurrence: occurrences[occurrences.length - 1]?.toISOString()
    });

    if (occurrences.length === 0) {
      throw new HttpsError(
        'invalid-argument',
        'No occurrences generated for recurring event'
      );
    }

    // Save all occurrences in batches
    const batchSize = 500; // Firestore batch limit
    const batches = [];
    let currentBatch = db.batch();
    let operationCount = 0;
    let totalSaved = 0;

    try {
      for (let i = 0; i < occurrences.length; i++) {
        const occurrence = occurrences[i];
        const isLastOccurrence = i === occurrences.length - 1;

        if (!(occurrence instanceof Date) || isNaN(occurrence.getTime())) {
          logger.error('Invalid occurrence date', {
            index: i,
            occurrence: occurrence,
            type: typeof occurrence
          });
          continue;
        }

        const occurrenceEnd = new Date(occurrence.getTime() + duration);

        if (isNaN(occurrenceEnd.getTime())) {
          logger.error('Invalid occurrence end date', {
            index: i,
            occurrence: occurrence.toISOString(),
            duration: duration
          });
          continue;
        }

        const eventData = {
        userId: userId,
        title: baseEvent.title || 'Available',
        from: occurrence.toISOString(),
        to: occurrenceEnd.toISOString(),
        color: baseEvent.color || '#0f54bc',
        color1: baseEvent.color1 || '#a8c1ff',
        color2: baseEvent.color2 || '#4da6fb',
        notes: baseEvent.notes || '',
        location: baseEvent.location || '',
        isAvailability: baseEvent.isAvailability !== false,
        isValidated: baseEvent.isValidated !== false,
        recurring: true,
        recurrenceId: recurrenceId,
        isLastOccurrence: isLastOccurrence,
        recurrenceMetadata: {
          repeatValue: baseEvent.repeatValue || 'Every Day',
          endRepeatValue: baseEvent.endRepeatValue || 'After',
          endRepeatCount: baseEvent.endRepeatCount || 30,
          endRepeatDate: baseEvent.endRepeatDate ? new Date(baseEvent.endRepeatDate).toISOString() : null,
          weeklyDays: baseEvent.weeklyDays || null,
          monthlyType: baseEvent.monthlyType || null,
          monthlyDay: baseEvent.monthlyDay || null,
          monthlyWeek: baseEvent.monthlyWeek || null,
          monthlyDayOfWeek: baseEvent.monthlyDayOfWeek || null
        },
        // Additional fields
        locationCountry: baseEvent.canton || [],
        LocationArea: baseEvent.area || [],
        languages: baseEvent.languages || [],
        experience: baseEvent.experience || '',
        software: baseEvent.software || [],
        certifications: baseEvent.certifications || [],
        workAmount: baseEvent.workAmount || '',
        created: admin.firestore.FieldValue.serverTimestamp(),
        updated: admin.firestore.FieldValue.serverTimestamp()
      };

        const docRef = db.collection('events').doc();
        currentBatch.set(docRef, eventData);
        operationCount++;
        totalSaved++;

        if (operationCount === batchSize) {
          batches.push(currentBatch.commit());
          currentBatch = db.batch();
          operationCount = 0;
        }
      }

      if (operationCount > 0) {
        batches.push(currentBatch.commit());
      }

      if (batches.length === 0) {
        throw new HttpsError(
          'internal',
          'No valid occurrences to save'
        );
      }

      logger.info('Committing batches', {
        userId,
        totalBatches: batches.length,
        totalSaved,
        totalOccurrences: occurrences.length
      });

      await Promise.all(batches);
      logger.info('All batches committed successfully', {
        userId,
        totalBatches: batches.length,
        totalSaved
      });
    } catch (batchError) {
      logger.error('Error processing batches', {
        error: batchError.message,
        stack: batchError.stack,
        code: batchError.code,
        userId,
        batchesAttempted: batches.length,
        totalSaved,
        totalOccurrences: occurrences.length
      });
      throw new HttpsError(
        'internal',
        `Error saving recurring events: ${batchError.message || 'Unknown error'}`
      );
    }

    logger.info('Recurring events saved', {
      userId: userId,
      recurrenceId: recurrenceId,
      count: occurrences.length
    });

    return {
      success: true,
      recurrenceId: recurrenceId,
      count: occurrences.length
    };
  } catch (error) {
    logger.error('Error saving recurring events', {
      error: error.message,
      code: error.code,
      stack: error.stack
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      'internal',
      `Error saving recurring events: ${error.message || 'Unknown error'}`
    );
  }
});

/**
 * Helper function to generate recurring dates
 */
function generateRecurringDates(startDate, repeatValue, endRepeatValue, endRepeatCount, endRepeatDate, repeatConfig = {}) {
  const dates = [];
  const dateMap = new Set();
  
  // Determine end condition
  let maxOccurrences = 200; // Default safety limit
  if (endRepeatValue === 'After' && endRepeatCount) {
    maxOccurrences = Math.min(parseInt(endRepeatCount, 10) || 200, 200);
  }
  
  let endDate;
  if (endRepeatValue === 'On Date' && endRepeatDate) {
    endDate = new Date(endRepeatDate);
    endDate.setHours(23, 59, 59, 999);
  } else if (endRepeatDate) {
    // Use provided endRepeatDate (for 'Never' case where we set it to 2 years)
    endDate = new Date(endRepeatDate);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // Default to 1 year from start
    endDate = new Date(startDate.getTime() + (365 * 24 * 60 * 60 * 1000));
  }

  // First occurrence is always the start date
  dates.push(new Date(startDate));
  dateMap.add(startDate.toDateString());
  let count = 1;

  if (repeatValue === 'Every Week' && repeatConfig.weeklyDays && Array.isArray(repeatConfig.weeklyDays) && repeatConfig.weeklyDays.length > 0) {
    const weeklyDays = repeatConfig.weeklyDays;
    const selectedDays = weeklyDays.map((selected, index) => selected ? index : null).filter(v => v !== null);
    
    if (selectedDays.length === 0) {
      const startDayOfWeek = startDate.getDay();
      const mondayIndex = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
      selectedDays.push(mondayIndex);
    }

    const startDayOfWeek = startDate.getDay();
    const startMondayIndex = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    
    let currentWeek = 0;
    let dayIndex = 0;
    let foundStart = false;

    while (count < maxOccurrences) {
      const targetDayIndex = selectedDays[dayIndex];
      const checkDate = new Date(startDate);
      
      if (!foundStart) {
        if (targetDayIndex === startMondayIndex) {
          foundStart = true;
        } else if (targetDayIndex > startMondayIndex) {
          const daysToAdd = targetDayIndex - startMondayIndex;
          checkDate.setDate(startDate.getDate() + daysToAdd);
          foundStart = true;
        } else {
          dayIndex++;
          if (dayIndex >= selectedDays.length) {
            dayIndex = 0;
            currentWeek++;
          }
          continue;
        }
      } else {
        const daysFromStart = (currentWeek * 7) + (targetDayIndex - startMondayIndex);
        checkDate.setDate(startDate.getDate() + daysFromStart);
      }

      if (checkDate > endDate) break;
      if (checkDate < startDate) {
        dayIndex++;
        if (dayIndex >= selectedDays.length) {
          dayIndex = 0;
          currentWeek++;
        }
        continue;
      }

      const dateKey = checkDate.toDateString();
      if (!dateMap.has(dateKey)) {
        dateMap.add(dateKey);
        dates.push(new Date(checkDate));
        count++;
      }

      dayIndex++;
      if (dayIndex >= selectedDays.length) {
        dayIndex = 0;
        currentWeek++;
      }

      if (checkDate > endDate) break;
    }
  } else if (repeatValue === 'Every Month' && repeatConfig.monthlyType) {
    const monthlyType = repeatConfig.monthlyType || 'day';
    let monthOffset = 1;

    while (count < maxOccurrences) {
      const nextDate = new Date(startDate);
      nextDate.setMonth(startDate.getMonth() + monthOffset);

      if (monthlyType === 'day') {
        const day = repeatConfig.monthlyDay || startDate.getDate();
        const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(Math.min(day, lastDayOfMonth));
      } else if (monthlyType === 'weekday') {
        const week = repeatConfig.monthlyWeek || 'first';
        const dayOfWeek = repeatConfig.monthlyDayOfWeek !== undefined ? repeatConfig.monthlyDayOfWeek : (startDate.getDay() === 0 ? 6 : startDate.getDay() - 1);

        const firstDay = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
        const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

        let targetDate;
        if (week === 'last') {
          const lastDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0);
          let lastDayOfWeek = lastDay.getDay() === 0 ? 6 : lastDay.getDay() - 1;
          let daysBack = (lastDayOfWeek - dayOfWeek + 7) % 7;
          if (daysBack === 0) daysBack = 7;
          targetDate = new Date(lastDay);
          targetDate.setDate(lastDay.getDate() - daysBack + 7);
          if (targetDate.getMonth() !== nextDate.getMonth()) {
            targetDate.setDate(targetDate.getDate() - 7);
          }
        } else {
          const weekOffset = week === 'first' ? 0 : week === 'second' ? 1 : week === 'third' ? 2 : 3;
          let daysToAdd = (dayOfWeek - firstDayOfWeek + 7) % 7;
          if (daysToAdd === 0 && weekOffset > 0) daysToAdd = 7;
          daysToAdd += weekOffset * 7;
          targetDate = new Date(firstDay);
          targetDate.setDate(firstDay.getDate() + daysToAdd);
        }
        nextDate.setTime(targetDate.getTime());
      }

      if (nextDate > endDate) break;

      const dateKey = nextDate.toDateString();
      if (!dateMap.has(dateKey)) {
        dateMap.add(dateKey);
        dates.push(new Date(nextDate));
        count++;
      }

      monthOffset++;
    }
  } else {
    const currentDate = new Date(startDate);

    while (count < maxOccurrences && currentDate <= endDate) {
      // Advance to next occurrence
      switch (repeatValue) {
        case 'Every Day':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'Every Week':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'Every Month': {
          const currentMonth = currentDate.getMonth();
          currentDate.setMonth(currentMonth + 1);
          if (currentDate.getMonth() !== (currentMonth + 1) % 12) {
            currentDate.setDate(0);
          }
          break;
        }
        default:
          currentDate.setDate(currentDate.getDate() + 1);
          break;
      }

      if (currentDate > endDate) break;

      const dateKey = currentDate.toDateString();
      if (!dateMap.has(dateKey)) {
        dateMap.add(dateKey);
        dates.push(new Date(currentDate));
        count++;
      }
    }
  }

  // Log if no dates were generated (shouldn't happen since we always add startDate)
  if (dates.length === 0) {
    logger.warn('generateRecurringDates returned no dates', {
      startDate: startDate.toISOString(),
      repeatValue,
      endRepeatValue,
      endRepeatCount,
      endRepeatDate: endRepeatDate?.toISOString()
    });
  }

  return dates;
}

// Legacy calendar sync endpoint (keep for backward compatibility)
exports.calendarSync = onCall(async (request) => {
  // V2 compatibility shim
  const data = request.data;
  const context = { auth: request.auth };

  // Ensure user is authenticated
  if (!context.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to sync calendars'
    );
  }

  try {
    const { userId, calendarId, events } = data;

    // Ensure the caller can only sync their own calendar
    if (userId !== context.auth.uid) {
      throw new HttpsError(
        'permission-denied',
        'You can only sync your own calendar'
      );
    }

    // Log the sync request
    logger.info('Calendar sync request', { userId, calendarId, eventCount: events.length });

    // Get user's existing calendar data
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError(
        'not-found',
        'User not found'
      );
    }

    // Update calendar reference in user document
    await userRef.update({
      connectedCalendars: admin.firestore.FieldValue.arrayUnion(calendarId),
      lastCalendarSync: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      message: 'Calendar synced successfully'
    };
  } catch (error) {
    logger.error('Error syncing calendar', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      'internal',
      'Error syncing calendar'
    );
  }
});

// HTTP version for external services
exports.calendarWebhook = onRequest({ region: 'europe-west6', cors: true }, (req, res) => {
  return cors(req, res, async () => {
    try {
      // Only allow POST method
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const data = req.body;
      const { userId, calendarId, events, apiKey } = data;

      // Verify API key (should be securely stored and verified)
      const isValidApiKey = await verifyApiKey(apiKey);
      if (!isValidApiKey) {
        return res.status(403).json({ error: 'Invalid API key' });
      }

      // Implementation similar to the callable function above
      // ...

      return res.status(200).json({
        success: true,
        message: `Synced ${events.length} events for calendar ${calendarId}`
      });
    } catch (error) {
      logger.error('Error in calendar webhook', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// Utility function to verify API key
async function verifyApiKey(apiKey) {
  try {
    const apiKeysSnapshot = await admin.firestore()
      .collection('apiKeys')
      .where('key', '==', apiKey)
      .where('type', '==', 'calendar')
      .where('active', '==', true)
      .get();

    return !apiKeysSnapshot.empty;
  } catch (error) {
    logger.error('Error verifying API key', error);
    return false;
  }
}

/**
 * Check for conflicts and create event (comprehensive validation)
 * Updated to use onRequest with CORS for better compatibility
 */
exports.checkAndCreateEventHTTP = onRequest({ region: 'europe-west6', cors: true }, async (req, res) => {
  // Enable CORS
  cors(req, res, async () => {
    try {
      // Handle preflight OPTIONS request
      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }

      // Only accept POST requests
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      // Get the authorization token
      const authorization = req.headers.authorization;
      if (!authorization || !authorization.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Verify the token
      const token = authorization.split('Bearer ')[1];
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(token);
      } catch (error) {
        console.error('Token verification failed:', error);
        res.status(401).json({ error: 'Invalid token' });
        return;
      }

      const {
        workspaceContext,
        eventType,
        eventData,
        targetUserId,
        recurrenceSettings
      } = req.body;

      console.log('checkAndCreateEventHTTP called with:', {
        workspaceContext,
        eventType,
        eventData,
        targetUserId,
        recurrenceSettings,
        authUID: decodedToken.uid
      });

      // Validate inputs
      if (!workspaceContext || !eventType || !eventData || !targetUserId) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters'
        });
        return;
      }

      // Authorization: Verify user has permission to create this type of event
      if (targetUserId !== decodedToken.uid) {
        // Additional checks for managers creating events for employees
        if (workspaceContext.type === 'team' && workspaceContext.facilityProfileId) {
          const facilityDoc = await db.collection('facilityProfiles').doc(workspaceContext.facilityProfileId).get();
          if (!facilityDoc.exists) {
            res.status(404).json({
              success: false,
              error: 'Facility not found'
            });
            return;
          }

          const facilityData = facilityDoc.data();
          if (!facilityData.admin.includes(decodedToken.uid)) {
            res.status(403).json({
              success: false,
              error: 'Only facility admins can create events for employees'
            });
            return;
          }
        } else {
          res.status(403).json({
            success: false,
            error: 'You can only create events for yourself'
          });
          return;
        }
      }

      // Validate date format and logic
      const startDate = new Date(eventData.startTime);
      const endDate = new Date(eventData.endTime);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Invalid date format'
        });
        return;
      }

      if (startDate >= endDate) {
        res.status(400).json({
          success: false,
          error: 'End time must be after start time'
        });
        return;
      }

      console.log('Validation passed, creating event of type:', eventType);

      // CONFLICT DETECTION: ONLY for Workers (availability, contracts, timeOffRequests)
      // SKIP conflict detection for Facility positions (eventType === 'position')
      const conflicts = [];

      if (eventType !== 'position') {
        // 1. Check event conflicts (for professionals)
        const eventsQuery = await db.collection('events')
          .where('userId', '==', targetUserId)
          .where('from', '<=', endDate.toISOString())
          .get();

        eventsQuery.docs.forEach(doc => {
          const availData = doc.data();
          const existingStart = new Date(availData.from);
          const existingEnd = new Date(availData.to);

          // Check for overlap: (newStart < existingEnd) && (newEnd > existingStart)
          if (startDate < existingEnd && endDate > existingStart) {
            conflicts.push({
              type: 'availability',
              id: doc.id,
              summary: `Available: ${existingStart.toLocaleString()} - ${existingEnd.toLocaleString()}`
            });
          }
        });

        // 2. Check contract conflicts
        const contractsQuery = await db.collection('contracts')
          .where('workerId', '==', targetUserId)
          .where('status', '==', 'active')
          .get();

        contractsQuery.docs.forEach(doc => {
          const contractData = doc.data();
          const existingStart = new Date(contractData.from);
          const existingEnd = new Date(contractData.to);

          if (startDate < existingEnd && endDate > existingStart) {
            conflicts.push({
              type: 'contract',
              id: doc.id,
              summary: `Contract: ${contractData.title || 'Untitled'} (${existingStart.toLocaleString()} - ${existingEnd.toLocaleString()})`
            });
          }
        });

        // 3. Check time-off requests conflicts
        const timeOffQuery = await db.collection('timeOffRequests')
          .where('userId', '==', targetUserId)
          .where('status', 'in', ['approved', 'pending'])
          .get();

        timeOffQuery.docs.forEach(doc => {
          const timeOffData = doc.data();
          const existingStart = new Date(timeOffData.startTime);
          const existingEnd = new Date(timeOffData.endTime);

          if (startDate < existingEnd && endDate > existingStart) {
            conflicts.push({
              type: 'timeOff',
              id: doc.id,
              summary: `Time Off: ${timeOffData.type || 'Leave'} (${existingStart.toLocaleString()} - ${existingEnd.toLocaleString()})`
            });
          }
        });

        // 4. Check team schedule conflicts (if in team workspace)
        if (workspaceContext.type === 'team' && workspaceContext.facilityProfileId) {
          const schedulesQuery = await db.collectionGroup('shifts')
            .where('userId', '==', targetUserId)
            .get();

          schedulesQuery.docs.forEach(doc => {
            const shiftData = doc.data();
            const existingStart = new Date(shiftData.startTime);
            const existingEnd = new Date(shiftData.endTime);

            if (startDate < existingEnd && endDate > existingStart) {
              conflicts.push({
                type: 'teamShift',
                id: doc.id,
                summary: `Team Shift: ${shiftData.roleOrTask || 'Shift'} (${existingStart.toLocaleString()} - ${existingEnd.toLocaleString()})`
              });
            }
          });
        }
      } // End of if (eventType !== 'position')

      // If conflicts detected, return them
      if (conflicts.length > 0) {
        console.log('Conflicts detected:', conflicts);
        res.status(200).json({
          success: false,
          error: 'conflict',
          conflicts: conflicts
        });
        return;
      }

      // NO CONFLICTS: Proceed to create the event(s)
      let result;

      if (recurrenceSettings && recurrenceSettings.isRecurring) {
        // Create recurring events
        result = await createRecurringEvent(eventType, eventData, targetUserId, workspaceContext, recurrenceSettings);
      } else {
        // Create single event
        result = await createSingleEvent(eventType, eventData, targetUserId, workspaceContext);
      }

      console.log('Event creation result:', result);

      logger.info('Event created successfully', {
        eventType,
        targetUserId,
        workspaceContext,
        resultId: result.id || result.recurrenceId
      });

      res.status(200).json(result);

    } catch (error) {
      console.error('Error in checkAndCreateEventHTTP:', error);
      logger.error('Error in checkAndCreateEventHTTP', error);

      res.status(500).json({
        success: false,
        error: `Error creating event: ${error.message}`
      });
    }
  });
});

/**
 * Check for conflicts and create event (comprehensive validation)
 * @deprecated - Use checkAndCreateEventHTTP instead for better CORS support
 */
exports.checkAndCreateEvent = onCall(async (request) => {
  // V2 compatibility shim
  const data = request.data;
  const context = { auth: request.auth };

  // Ensure user is authenticated
  if (!context.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to create events'
    );
  }

  try {
    const {
      workspaceContext,
      eventType,
      eventData,
      targetUserId,
      recurrenceSettings
    } = data;

    console.log('checkAndCreateEvent called with:', {
      workspaceContext,
      eventType,
      eventData,
      targetUserId,
      recurrenceSettings,
      authUID: context.auth.uid
    });

    // Validate inputs
    if (!workspaceContext || !eventType || !eventData || !targetUserId) {
      throw new HttpsError(
        'invalid-argument',
        'Missing required parameters'
      );
    }

    // Authorization: Verify user has permission to create this type of event
    if (targetUserId !== context.auth.uid) {
      // Additional checks for managers creating events for employees
      if (workspaceContext.type === 'team' && workspaceContext.facilityProfileId) {
        const facilityDoc = await db.collection('facilityProfiles').doc(workspaceContext.facilityProfileId).get();
        if (!facilityDoc.exists) {
          throw new HttpsError('not-found', 'Facility not found');
        }

        const facilityData = facilityDoc.data();
        if (!facilityData.admin.includes(context.auth.uid)) {
          throw new HttpsError('permission-denied', 'Only facility admins can create events for employees');
        }
      } else {
        throw new HttpsError('permission-denied', 'You can only create events for yourself');
      }
    }

    // Validate date format and logic
    const startDate = new Date(eventData.startTime);
    const endDate = new Date(eventData.endTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new HttpsError('invalid-argument', 'Invalid date format');
    }

    if (startDate >= endDate) {
      throw new HttpsError('invalid-argument', 'End time must be after start time');
    }

    console.log('Validation passed, creating event of type:', eventType);

    // CONFLICT DETECTION: ONLY for Workers (availability, contracts, timeOffRequests)
    // SKIP conflict detection for Facility positions (eventType === 'position')
    const conflicts = [];

    if (eventType !== 'position') {
      // 1. Check availability conflicts (for professionals)
      const eventsQuery = await db.collection('events')
        .where('userId', '==', targetUserId)
        .where('from', '<=', endDate.toISOString())
        .get();

      eventsQuery.docs.forEach(doc => {
        const availData = doc.data();
        const existingStart = new Date(availData.from);
        const existingEnd = new Date(availData.to);

        // Check for overlap: (newStart < existingEnd) && (newEnd > existingStart)
        if (startDate < existingEnd && endDate > existingStart) {
          conflicts.push({
            type: 'availability',
            id: doc.id,
            summary: `Available: ${existingStart.toLocaleString()} - ${existingEnd.toLocaleString()}`
          });
        }
      });

      // 2. Check contract conflicts
      const contractsQuery = await db.collection('contracts')
        .where('workerId', '==', targetUserId)
        .where('status', '==', 'active')
        .get();

      contractsQuery.docs.forEach(doc => {
        const contractData = doc.data();
        const existingStart = new Date(contractData.from);
        const existingEnd = new Date(contractData.to);

        if (startDate < existingEnd && endDate > existingStart) {
          conflicts.push({
            type: 'contract',
            id: doc.id,
            summary: `Contract: ${contractData.title || 'Untitled'} (${existingStart.toLocaleString()} - ${existingEnd.toLocaleString()})`
          });
        }
      });

      // 3. Check time-off requests conflicts
      const timeOffQuery = await db.collection('timeOffRequests')
        .where('userId', '==', targetUserId)
        .where('status', 'in', ['approved', 'pending'])
        .get();

      timeOffQuery.docs.forEach(doc => {
        const timeOffData = doc.data();
        const existingStart = new Date(timeOffData.startTime);
        const existingEnd = new Date(timeOffData.endTime);

        if (startDate < existingEnd && endDate > existingStart) {
          conflicts.push({
            type: 'timeOff',
            id: doc.id,
            summary: `Time Off: ${timeOffData.type || 'Leave'} (${existingStart.toLocaleString()} - ${existingEnd.toLocaleString()})`
          });
        }
      });

      // 4. Check team schedule conflicts (if in team workspace)
      if (workspaceContext.type === 'team' && workspaceContext.facilityProfileId) {
        const schedulesQuery = await db.collectionGroup('shifts')
          .where('userId', '==', targetUserId)
          .get();

        schedulesQuery.docs.forEach(doc => {
          const shiftData = doc.data();
          const existingStart = new Date(shiftData.startTime);
          const existingEnd = new Date(shiftData.endTime);

          if (startDate < existingEnd && endDate > existingStart) {
            conflicts.push({
              type: 'teamShift',
              id: doc.id,
              summary: `Team Shift: ${shiftData.roleOrTask || 'Shift'} (${existingStart.toLocaleString()} - ${existingEnd.toLocaleString()})`
            });
          }
        });
      }
    } // End of if (eventType !== 'position')

    // If conflicts detected, return them
    if (conflicts.length > 0) {
      console.log('Conflicts detected:', conflicts);
      return {
        success: false,
        error: 'conflict',
        conflicts: conflicts
      };
    }

    // NO CONFLICTS: Proceed to create the event(s)
    let result;

    if (recurrenceSettings && recurrenceSettings.isRecurring) {
      // Create recurring events
      result = await createRecurringEvent(eventType, eventData, targetUserId, workspaceContext, recurrenceSettings);
    } else {
      // Create single event
      result = await createSingleEvent(eventType, eventData, targetUserId, workspaceContext);
    }

    console.log('Event creation result:', result);

    logger.info('Event created successfully', {
      eventType,
      targetUserId,
      workspaceContext,
      resultId: result.id || result.recurrenceId
    });

    return result;

  } catch (error) {
    console.error('Error in checkAndCreateEvent:', error);
    logger.error('Error in checkAndCreateEvent', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', `Error creating event: ${error.message}`);
  }
});

/**
 * Helper function to create a single event
 */
async function createSingleEvent(eventType, eventData, targetUserId, workspaceContext, recurrenceId = null) {
  let collection, docData;

  switch (eventType) {
    case 'availability':
      collection = 'events';
      docData = {
        userId: targetUserId,
        professionalProfileId: targetUserId, // Assuming profileId matches userId
        from: new Date(eventData.startTime).toISOString(), // Use 'from' field expected by frontend
        to: new Date(eventData.endTime).toISOString(),     // Use 'to' field expected by frontend
        title: eventData.title || 'Available',
        color: eventData.color || '#8c8c8c',
        color1: eventData.color1 || '#e6e6e6',
        color2: eventData.color2 || '#b3b3b3',
        notes: eventData.notes || '',
        location: eventData.location || '',
        isAvailability: true,
        isValidated: eventData.isValidated !== false, // Default to true
        recurring: !!recurrenceId,
        recurrenceId: recurrenceId || null,
        recurrenceMetadata: recurrenceId && eventData.recurrenceMetadata ? eventData.recurrenceMetadata : null,
        // Additional fields that frontend expects
        locationCountry: eventData.locationCountry || [],
        LocationArea: eventData.LocationArea || [],
        languages: eventData.languages || [],
        experience: eventData.experience || '',
        software: eventData.software || [],
        certifications: eventData.certifications || [],
        workAmount: eventData.workAmount || '',
        created: admin.firestore.FieldValue.serverTimestamp(),
        updated: admin.firestore.FieldValue.serverTimestamp()
      };
      break;

    case 'timeOffRequest':
      collection = 'timeOffRequests';
      docData = {
        facilityProfileId: workspaceContext.facilityProfileId,
        userId: targetUserId,
        startTime: admin.firestore.Timestamp.fromDate(new Date(eventData.startTime)),
        endTime: admin.firestore.Timestamp.fromDate(new Date(eventData.endTime)),
        type: eventData.type || 'vacation',
        reason: eventData.notes || '',
        status: workspaceContext.managerCreated ? 'approved' : 'pending',
        approvedByUserId: workspaceContext.managerCreated ? workspaceContext.managerId : null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      break;

    case 'position':
      collection = 'positions';
      docData = {
        facilityProfileId: workspaceContext.facilityProfileId,
        postedByUserId: targetUserId,
        status: 'open',
        jobTitle: eventData.title || 'Open Position',
        jobType: eventData.jobType || 'general',
        startTime: admin.firestore.Timestamp.fromDate(new Date(eventData.startTime)),
        endTime: admin.firestore.Timestamp.fromDate(new Date(eventData.endTime)),
        location: eventData.location || {},
        description: eventData.notes || '',
        compensation: eventData.compensation || {},
        created: admin.firestore.FieldValue.serverTimestamp(),
        updated: admin.firestore.FieldValue.serverTimestamp()
      };
      break;

    case 'teamShift':
      // For team shifts, we need to create in the appropriate schedule
      const scheduleId = `${workspaceContext.facilityProfileId}_${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const shiftRef = db.collection('teamSchedules').doc(scheduleId).collection('shifts').doc();

      docData = {
        userId: targetUserId,
        startTime: admin.firestore.Timestamp.fromDate(new Date(eventData.startTime)),
        endTime: admin.firestore.Timestamp.fromDate(new Date(eventData.endTime)),
        roleOrTask: eventData.roleOrTask || 'General Shift',
        notes: eventData.notes || '',
        isSublettable: false,
        subletStatus: 'none',
        created: admin.firestore.FieldValue.serverTimestamp()
      };

      await shiftRef.set(docData);
      return { success: true, id: shiftRef.id, collection: 'teamSchedules/shifts' };

    default:
      throw new HttpsError('invalid-argument', `Unsupported event type: ${eventType}`);
  }

  const docRef = await db.collection(collection).add(docData);

  // Handle side effects for certain event types
  if (eventType === 'timeOffRequest' && docData.status === 'approved') {
    // Create unavailable block in professional availability
    await createUnavailableBlock(targetUserId, eventData.startTime, eventData.endTime, 'timeOff');
  }

  return { success: true, id: docRef.id, collection };
}

/**
 * Helper function to create recurring events
 */
async function createRecurringEvent(eventType, eventData, targetUserId, workspaceContext, recurrenceSettings) {
  const recurrenceId = `${targetUserId}_${Date.now()}_recurrence`;
  const occurrences = generateRecurringDates(
    new Date(eventData.startTime),
    recurrenceSettings.repeatValue || 'Every Week',
    recurrenceSettings.endRepeatValue || 'On Date',
    recurrenceSettings.endRepeatCount || 30,
    recurrenceSettings.endRepeatDate ? new Date(recurrenceSettings.endRepeatDate) : null,
    {
      weeklyDays: recurrenceSettings.weeklyDays,
      monthlyType: recurrenceSettings.monthlyType,
      monthlyDay: recurrenceSettings.monthlyDay,
      monthlyWeek: recurrenceSettings.monthlyWeek,
      monthlyDayOfWeek: recurrenceSettings.monthlyDayOfWeek
    }
  );

  const duration = new Date(eventData.endTime).getTime() - new Date(eventData.startTime).getTime();
  const batch = db.batch();
  let count = 0;

  for (let i = 0; i < occurrences.length; i++) {
    const occurrence = occurrences[i];
    const occurrenceEnd = new Date(occurrence.getTime() + duration);
    const isLastOccurrence = i === occurrences.length - 1;

    const occurrenceData = {
      ...eventData,
      startTime: occurrence.toISOString(),
      endTime: occurrenceEnd.toISOString(),
      recurrenceMetadata: {
        repeatValue: recurrenceSettings.repeatValue || 'Every Week',
        endRepeatValue: recurrenceSettings.endRepeatValue || 'On Date',
        endRepeatCount: recurrenceSettings.endRepeatCount || 30,
        endRepeatDate: recurrenceSettings.endRepeatDate || null,
        weeklyDays: recurrenceSettings.weeklyDays || null,
        monthlyType: recurrenceSettings.monthlyType || null,
        monthlyDay: recurrenceSettings.monthlyDay || null,
        monthlyWeek: recurrenceSettings.monthlyWeek || null,
        monthlyDayOfWeek: recurrenceSettings.monthlyDayOfWeek || null
      }
    };

    // Create single occurrence with recurrenceId
    const singleResult = await createSingleEvent(eventType, occurrenceData, targetUserId, workspaceContext, recurrenceId);
    count++;

    if (count >= 500) break; // Firestore batch limit
  }

  return { success: true, recurrenceId, count };
}

/**
 * Helper function to create unavailable blocks
 */
async function createUnavailableBlock(userId, startTime, endTime, reason) {
  try {
    await db.collection('events').add({
      userId: userId,
      professionalProfileId: userId,
      from: new Date(startTime).toISOString(), // Use 'from' field expected by frontend
      to: new Date(endTime).toISOString(),     // Use 'to' field expected by frontend
      title: `Blocked - ${reason}`,
      color: '#808080', // Grey color for blocked time
      color1: '#e6e6e6',
      color2: '#b3b3b3',
      notes: `Automatically blocked due to ${reason}`,
      location: '',
      isAvailability: false, // This is a blocking event, not availability
      isValidated: true,
      recurring: false,
      // Additional fields
      locationCountry: [],
      LocationArea: [],
      languages: [],
      experience: '',
      software: [],
      certifications: [],
      workAmount: '',
      created: admin.firestore.FieldValue.serverTimestamp(),
      updated: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    logger.error('Error creating unavailable block', error);
  }
} 
