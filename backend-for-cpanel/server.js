const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
const port = process.env.PORT || 3001;

// Initialize Firebase Admin with service account
// You'll need to add your service account key file
// admin.initializeApp({
//   credential: admin.credential.cert(require('./path-to-service-account-key.json')),
//   // Add other config if needed
// });

// Middleware
app.use(cors());
app.use(express.json());

// AUTHENTICATION MIDDLEWARE
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const idToken = req.body?.idToken || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null);
    
    if (!idToken) {
      return res.status(401).json({ error: "No authentication token provided" });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture
    };
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: "Invalid or expired authentication token" });
  }
};

// Health check endpoint
app.get('/healthCheck', (req, res) => {
  console.log("Health check requested");
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// PROFILE ENDPOINTS

// Get profile endpoint - requires authentication
app.post('/getProfile', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const userId = req.user.uid;
    
    // Fetch user document
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User profile not found" });
    }
    
    const userData = userDoc.data();
    
    // Determine role and fetch role-specific profile
    const role = userData.role || 'professional';
    const profileCollection = role === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
    const profileDoc = await db.collection(profileCollection).doc(userId).get();
    
    let profileData = { ...userData };
    if (profileDoc.exists) {
      profileData = { ...profileData, ...profileDoc.data() };
    }
    
    res.json({
      success: true,
      data: profileData
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: "Failed to fetch profile data" });
  }
});

// Update profile endpoint - requires authentication
app.post('/updateProfile', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const userId = req.user.uid;
    const updateData = req.body.data || req.body;
    
    if (!updateData || typeof updateData !== 'object') {
      return res.status(400).json({ error: "Profile data must be an object" });
    }
    
    // Separate user fields from profile fields
    const USER_COLLECTION_FIELDS = [
      'uid', 'email', 'emailVerified', 'role', 'profileType',
      'firstName', 'lastName', 'displayName', 'photoURL',
      'createdAt', 'updatedAt'
    ];
    
    const userFieldsToUpdate = {};
    const profileFieldsToUpdate = {};
    
    const currentUserDoc = await db.collection('users').doc(userId).get();
    const currentUserData = currentUserDoc.exists ? currentUserDoc.data() : {};
    const currentRole = updateData.role || currentUserData.role || 'professional';
    const currentProfileType = updateData.profileType || currentUserData.profileType || 'doctor';
    
    for (const [key, value] of Object.entries(updateData)) {
      if (USER_COLLECTION_FIELDS.includes(key)) {
        userFieldsToUpdate[key] = value;
      } else {
        profileFieldsToUpdate[key] = value;
      }
    }
    
    // Ensure role and profileType are in user fields
    userFieldsToUpdate.role = currentRole;
    userFieldsToUpdate.profileType = currentProfileType;
    userFieldsToUpdate.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    // Update user document
    if (Object.keys(userFieldsToUpdate).length > 0) {
      if (currentUserDoc.exists) {
        await db.collection('users').doc(userId).update(userFieldsToUpdate);
      } else {
        // Create user document if it doesn't exist
        userFieldsToUpdate.uid = userId;
        userFieldsToUpdate.email = req.user.email || '';
        userFieldsToUpdate.createdAt = admin.firestore.FieldValue.serverTimestamp();
        await db.collection('users').doc(userId).set(userFieldsToUpdate);
      }
    }
    
    // Update role-specific profile document
    if (Object.keys(profileFieldsToUpdate).length > 0) {
      const profileCollection = currentRole === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
      profileFieldsToUpdate.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      
      const profileDocRef = db.collection(profileCollection).doc(userId);
      const profileDoc = await profileDocRef.get();
      
      if (!profileDoc.exists) {
        profileFieldsToUpdate.userId = userId;
        profileFieldsToUpdate.createdAt = admin.firestore.FieldValue.serverTimestamp();
        await profileDocRef.set(profileFieldsToUpdate);
      } else {
        await profileDocRef.update(profileFieldsToUpdate);
      }
    }
    
    res.json({
      success: true,
      message: "Profile updated successfully"
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: "Failed to update profile data" });
  }
});

// CONTRACT ENDPOINTS

// Get contract endpoint - requires authentication
app.post('/getContract', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const userId = req.user.uid;
    const { contractId } = req.body;
    
    if (!contractId) {
      return res.status(400).json({ error: "Contract ID is required" });
    }
    
    const contractDoc = await db.collection('contracts').doc(contractId).get();
    
    if (!contractDoc.exists) {
      return res.status(404).json({ error: "Contract not found" });
    }
    
    const contract = contractDoc.data();
    
    // SECURITY CHECK: Verify user has permission to view this contract
    const isProfessional = contract.parties?.professional?.profileId === userId;
    const isEmployer = contract.parties?.employer?.profileId === userId;
    const isParticipant = contract.participants?.includes(userId);
    
    // Backward compatibility with old structure
    const isOldWorker = contract.workerId === userId;
    const isOldCompany = contract.companyId === userId;
    
    if (!isProfessional && !isEmployer && !isParticipant && !isOldWorker && !isOldCompany) {
      return res.status(403).json({ error: "You do not have permission to view this contract" });
    }
    
    res.json({
      success: true,
      contract: {
        id: contractDoc.id,
        ...contract
      }
    });
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ error: "Failed to fetch contract data" });
  }
});

// List contracts endpoint - requires authentication
app.post('/listContracts', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const userId = req.user.uid;
    const { filters = {} } = req.body;
    
    // Query contracts where user is either professional or employer
    const professionalContracts = await db.collection('contracts')
      .where('parties.professional.profileId', '==', userId)
      .orderBy('statusLifecycle.timestamps.createdAt', 'desc')
      .get();
    
    const employerContracts = await db.collection('contracts')
      .where('parties.employer.profileId', '==', userId)
      .orderBy('statusLifecycle.timestamps.createdAt', 'desc')
      .get();
    
    // Also check participants array for backward compatibility
    const participantContracts = await db.collection('contracts')
      .where('participants', 'array-contains', userId)
      .get();
    
    // Combine and deduplicate contracts
    const contractMap = new Map();
    
    [professionalContracts, employerContracts, participantContracts].forEach(snapshot => {
      snapshot.forEach(doc => {
        if (!contractMap.has(doc.id)) {
          contractMap.set(doc.id, {
            id: doc.id,
            ...doc.data()
          });
        }
      });
    });
    
    let contracts = Array.from(contractMap.values());
    
    // Apply filters if provided
    if (filters.status && filters.status !== 'all') {
      contracts = contracts.filter(c => {
        const status = c.statusLifecycle?.currentStatus || c.status;
        return status === filters.status;
      });
    }
    
    res.json({
      success: true,
      contracts
    });
  } catch (error) {
    console.error('Error listing contracts:', error);
    res.status(500).json({ error: "Failed to list contracts" });
  }
});

// Create contract endpoint - requires authentication
app.post('/createContract', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const userId = req.user.uid;
    const contractData = req.body.data || req.body;
    
    if (!contractData || typeof contractData !== 'object') {
      return res.status(400).json({ error: "Contract data is required" });
    }
    
    // SECURITY CHECK: Ensure user is part of the contract
    const professionalId = contractData.parties?.professional?.profileId;
    const employerId = contractData.parties?.employer?.profileId;
    
    if (professionalId !== userId && employerId !== userId) {
      return res.status(403).json({ error: "You must be either the professional or employer in the contract" });
    }
    
    // Prepare contract data with metadata
    const newContract = {
      ...contractData,
      createdBy: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      statusLifecycle: {
        currentStatus: contractData.statusLifecycle?.currentStatus || 'draft',
        timestamps: {
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      },
      // Ensure participants array includes both parties
      participants: [
        ...new Set([
          ...(contractData.participants || []),
          professionalId,
          employerId,
          userId
        ].filter(Boolean))
      ]
    };
    
    const contractRef = await db.collection('contracts').add(newContract);
    
    res.json({
      success: true,
      contractId: contractRef.id
    });
  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(500).json({ error: "Failed to create contract" });
  }
});

// Update contract endpoint - requires authentication
app.post('/updateContract', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const userId = req.user.uid;
    const { contractId, data: contractData } = req.body;
    
    if (!contractId || !contractData) {
      return res.status(400).json({ error: "Contract ID and data are required" });
    }
    
    // SECURITY CHECK: Verify contract exists and user has permission
    const contractDoc = await db.collection('contracts').doc(contractId).get();
    
    if (!contractDoc.exists) {
      return res.status(404).json({ error: "Contract not found" });
    }
    
    const contract = contractDoc.data();
    const isProfessional = contract.parties?.professional?.profileId === userId;
    const isEmployer = contract.parties?.employer?.profileId === userId;
    const isParticipant = contract.participants?.includes(userId);
    
    // Backward compatibility
    const isOldWorker = contract.workerId === userId;
    const isOldCompany = contract.companyId === userId;
    
    if (!isProfessional && !isEmployer && !isParticipant && !isOldWorker && !isOldCompany) {
      return res.status(403).json({ error: "You do not have permission to update this contract" });
    }
    
    // Prepare update data
    const updateData = {
      ...contractData,
      updatedBy: userId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Update status lifecycle if status is being changed
    if (contractData.statusLifecycle?.currentStatus) {
      updateData['statusLifecycle.currentStatus'] = contractData.statusLifecycle.currentStatus;
      updateData['statusLifecycle.timestamps.updatedAt'] = admin.firestore.FieldValue.serverTimestamp();
      if (contractData.statusLifecycle.notes) {
        updateData['statusLifecycle.notes'] = contractData.statusLifecycle.notes;
      }
    }
    
    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.createdBy;
    
    await db.collection('contracts').doc(contractId).update(updateData);
    
    res.json({
      success: true,
      message: "Contract updated successfully"
    });
  } catch (error) {
    console.error('Error updating contract:', error);
    res.status(500).json({ error: "Failed to update contract" });
  }
});

// MESSAGE ENDPOINTS

// Get conversations endpoint - requires authentication
app.post('/getConversations', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const userId = req.user.uid;
    const { context = 'personal', facilityId = null } = req.body;
    
    let conversationsQuery;
    const conversationsRef = db.collection('conversations');
    
    if (context === 'personal') {
      // Personal messages: conversations where user is a participant
      conversationsQuery = conversationsRef
        .where('participantIds', 'array-contains', userId)
        .orderBy('lastMessageTimestamp', 'desc');
    } else if (context === 'facility' && facilityId) {
      // Facility messages: conversations linked to the current facility
      conversationsQuery = conversationsRef
        .where('facilityProfileId', '==', facilityId)
        .orderBy('lastMessageTimestamp', 'desc');
    } else {
      return res.status(400).json({ error: "Invalid context or missing facilityId" });
    }
    
    const snapshot = await conversationsQuery.get();
    const conversations = [];
    
    snapshot.forEach(doc => {
      conversations.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// Get messages endpoint - requires authentication
app.post('/getMessages', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const userId = req.user.uid;
    const { conversationId } = req.body;
    
    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID is required" });
    }
    
    // SECURITY CHECK: Verify user is a participant
    const conversationDoc = await db.collection('conversations').doc(conversationId).get();
    
    if (!conversationDoc.exists) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    const conversationData = conversationDoc.data();
    const isParticipant = conversationData.participantIds?.includes(userId) || 
                          conversationData.participants?.includes(userId);
    
    if (!isParticipant) {
      return res.status(403).json({ error: "You do not have permission to view this conversation" });
    }
    
    // Get messages from subcollection
    const messagesSnapshot = await db
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .get();
    
    const messages = [];
    messagesSnapshot.forEach(doc => {
      messages.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Send message endpoint - requires authentication
app.post('/sendMessage', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const userId = req.user.uid;
    const { conversationId, text, imageUrl = null, fileUrl = null, fileName = null, fileType = null } = req.body;
    
    if (!conversationId || !text) {
      return res.status(400).json({ error: "Conversation ID and message text are required" });
    }
    
    // SECURITY CHECK: Verify user is a participant
    const conversationRef = db.collection('conversations').doc(conversationId);
    const conversationDoc = await conversationRef.get();
    
    if (!conversationDoc.exists) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    const conversationData = conversationDoc.data();
    const isParticipant = conversationData.participantIds?.includes(userId) || 
                          conversationData.participants?.includes(userId);
    
    if (!isParticipant) {
      return res.status(403).json({ error: "You do not have permission to send messages to this conversation" });
    }
    
    // Add message to subcollection
    const messageData = {
      senderId: userId,
      text: text.trim(),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'sent',
      imageUrl,
      fileUrl,
      fileName,
      fileType,
      reactions: []
    };
    
    const messageRef = await db
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .add(messageData);
    
    // Update conversation's lastMessage and lastMessageTimestamp
    await conversationRef.update({
      lastMessage: {
        text: text.trim(),
        senderId: userId,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      },
      lastMessageTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      success: true,
      messageId: messageRef.id,
      message: "Message sent successfully"
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Create conversation endpoint - requires authentication
app.post('/createConversation', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const userId = req.user.uid;
    const { participantIds, participantInfo, contractId = null, facilityProfileId = null, professionalProfileId = null } = req.body;
    
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length < 2) {
      return res.status(400).json({ error: "At least 2 participant IDs are required" });
    }
    
    if (!participantInfo || !Array.isArray(participantInfo)) {
      return res.status(400).json({ error: "Participant info is required" });
    }
    
    // SECURITY CHECK: Ensure user is in participantIds
    if (!participantIds.includes(userId)) {
      return res.status(403).json({ error: "You must be a participant in the conversation" });
    }
    
    const conversationData = {
      participantIds,
      participantInfo,
      contractId,
      facilityProfileId,
      professionalProfileId,
      lastMessage: {
        text: '',
        senderId: '',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      },
      lastMessageTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      unreadCounts: participantIds.reduce((acc, id) => {
        acc[id] = 0;
        return acc;
      }, {}),
      isArchivedBy: [],
      typingIndicator: participantIds.reduce((acc, id) => {
        acc[id] = false;
        return acc;
      }, {}),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const conversationRef = await db.collection('conversations').add(conversationData);
    
    res.json({
      success: true,
      conversationId: conversationRef.id,
      message: "Conversation created successfully"
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

// Mark messages as read endpoint - requires authentication
app.post('/markMessagesAsRead', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const userId = req.user.uid;
    const { conversationId } = req.body;
    
    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID is required" });
    }
    
    // SECURITY CHECK: Verify user is a participant
    const conversationRef = db.collection('conversations').doc(conversationId);
    const conversationDoc = await conversationRef.get();
    
    if (!conversationDoc.exists) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    const conversationData = conversationDoc.data();
    const isParticipant = conversationData.participantIds?.includes(userId) || 
                          conversationData.participants?.includes(userId);
    
    if (!isParticipant) {
      return res.status(403).json({ error: "You do not have permission to access this conversation" });
    }
    
    // Update unreadCounts
    if (conversationData.unreadCounts) {
      const unreadCounts = { ...conversationData.unreadCounts };
      unreadCounts[userId] = 0;
      await conversationRef.update({ unreadCounts });
    } else if (conversationData.unreadBy) {
      // Backward compatibility with old structure
      const unreadBy = (conversationData.unreadBy || []).filter(id => id !== userId);
      await conversationRef.update({ unreadBy });
    }
    
    res.json({
      success: true,
      message: "Messages marked as read"
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: "Failed to mark messages as read" });
  }
});

// CALENDAR ENDPOINTS

// Save calendar event endpoint - requires authentication
app.post('/saveCalendarEvent', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const userId = req.user.uid;
    const { title, start, end, color, color1, color2, notes, location, isAvailability, isValidated, canton, area, languages, experience, software, certifications, workAmount } = req.body;
    
    // SECURITY CHECK: Ensure user can only save events for their own account
    if (req.body.userId && req.body.userId !== userId) {
      return res.status(403).json({ error: "You can only save events for your own account" });
    }
    
    // Validate required fields
    if (!start || !end) {
      return res.status(400).json({ error: "Start and end times are required" });
    }
    
    // Validate date format
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }
    
    if (startDate >= endDate) {
      return res.status(400).json({ error: "End time must be after start time" });
    }
    
    // Prepare event data for Firestore
    const eventData = {
      userId: userId,
      title: title || 'Available',
      from: startDate.toISOString(),
      to: endDate.toISOString(),
      color: color || '#0f54bc',
      color1: color1 || '#a8c1ff',
      color2: color2 || '#4da6fb',
      notes: notes || '',
      location: location || '',
      isAvailability: isAvailability !== false,
      isValidated: isValidated !== false,
      recurring: false,
      locationCountry: canton || [],
      LocationArea: area || [],
      languages: languages || [],
      experience: experience || '',
      software: software || [],
      certifications: certifications || [],
      workAmount: workAmount || '',
      created: admin.firestore.FieldValue.serverTimestamp(),
      updated: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Save to availability collection
    const docRef = await db.collection('availability').add(eventData);
    
    console.log('Calendar event saved', { 
      eventId: docRef.id, 
      userId: userId,
      start: start,
      end: end
    });
    
    res.json({
      success: true,
      id: docRef.id
    });
  } catch (error) {
    console.error('Error saving calendar event:', error);
    res.status(500).json({ error: "Failed to save calendar event" });
  }
});

// Update calendar event endpoint - requires authentication
app.put('/updateCalendarEvent', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const userId = req.user.uid;
    const { eventId, accountType, title, start, end, color, color1, color2, notes, location, isValidated, isRecurring, recurrenceId, canton, area, languages, experience, software, certifications, workAmount, isAvailability } = req.body;
    
    // SECURITY CHECK: Ensure user can only update events for their own account
    if (req.body.userId && req.body.userId !== userId) {
      return res.status(403).json({ error: "You can only update events for your own account" });
    }
    
    if (!eventId) {
      return res.status(400).json({ error: "Event ID is required" });
    }
    
    // Choose collection based on account type
    const collectionName = accountType === 'manager' ? 'jobs-listing' : 'availability';
    
    // Get the document reference
    const eventRef = db.collection(collectionName).doc(eventId);
    const eventDoc = await eventRef.get();
    
    if (!eventDoc.exists) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    const eventData = eventDoc.data();
    
    // SECURITY CHECK: Verify user owns this event
    const userField = collectionName === 'availability' ? 'userId' : 'user_id';
    if (eventData[userField] !== userId) {
      return res.status(403).json({ error: "You do not have permission to update this event" });
    }
    
    // Prepare update data
    const updateData = {
      updated: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (title !== undefined) updateData.title = title;
    if (start) {
      const startDate = new Date(start);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({ error: "Invalid start date" });
      }
      updateData.from = startDate.toISOString();
    }
    if (end) {
      const endDate = new Date(end);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({ error: "Invalid end date" });
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
    
    // Add availability-specific fields
    if (collectionName === 'availability') {
      if (canton !== undefined) updateData.locationCountry = canton;
      if (area !== undefined) updateData.LocationArea = area;
      if (languages !== undefined) updateData.languages = languages;
      if (experience !== undefined) updateData.experience = experience;
      if (software !== undefined) updateData.software = software;
      if (certifications !== undefined) updateData.certifications = certifications;
      if (workAmount !== undefined) updateData.workAmount = workAmount;
      if (isAvailability !== undefined) updateData.isAvailability = isAvailability;
    }
    
    // Validate date order if both dates are being updated
    if (updateData.from && updateData.to) {
      if (new Date(updateData.from) >= new Date(updateData.to)) {
        return res.status(400).json({ error: "End time must be after start time" });
      }
    }
    
    // Update the document
    await eventRef.update(updateData);
    
    console.log('Calendar event updated', { 
      eventId: eventId, 
      userId: userId,
      updateFields: Object.keys(updateData)
    });
    
    res.json({
      success: true
    });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    res.status(500).json({ error: "Failed to update calendar event" });
  }
});

// Delete calendar event endpoint - requires authentication
app.delete('/deleteCalendarEvent', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const userId = req.user.uid;
    const { eventId, accountType, deleteType, recurrenceId } = req.body;
    
    // SECURITY CHECK: Ensure user can only delete events for their own account
    if (req.body.userId && req.body.userId !== userId) {
      return res.status(403).json({ error: "You can only delete events for your own account" });
    }
    
    if (!eventId) {
      return res.status(400).json({ error: "Event ID is required" });
    }
    
    // Choose collection based on account type
    const collectionName = accountType === 'manager' ? 'jobs-listing' : 'availability';
    
    let deletedCount = 0;
    
    if (deleteType === 'single' || !recurrenceId) {
      // Delete single event
      const eventRef = db.collection(collectionName).doc(eventId);
      const eventDoc = await eventRef.get();
      
      if (!eventDoc.exists) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      const eventData = eventDoc.data();
      const userField = collectionName === 'availability' ? 'userId' : 'user_id';
      
      // SECURITY CHECK: Verify user owns this event
      if (eventData[userField] !== userId) {
        return res.status(403).json({ error: "You do not have permission to delete this event" });
      }
      
      await eventRef.delete();
      deletedCount = 1;
    } else if (deleteType === 'all' && recurrenceId) {
      // Delete all events in the series
      const seriesQuery = db.collection(collectionName)
        .where('recurrenceId', '==', recurrenceId)
        .where(collectionName === 'availability' ? 'userId' : 'user_id', '==', userId);
      
      const seriesSnapshot = await seriesQuery.get();
      
      if (seriesSnapshot.empty) {
        return res.status(404).json({ error: "No events found in the series" });
      }
      
      // Delete all events in batches
      const batch = db.batch();
      seriesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      deletedCount = seriesSnapshot.size;
    } else if (deleteType === 'future' && recurrenceId) {
      // Delete future events in the series
      const eventRef = db.collection(collectionName).doc(eventId);
      const eventDoc = await eventRef.get();
      
      if (!eventDoc.exists) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      const eventData = eventDoc.data();
      const currentEventDate = new Date(eventData.from);
      
      // Find all future events in the series
      const seriesQuery = db.collection(collectionName)
        .where('recurrenceId', '==', recurrenceId)
        .where(collectionName === 'availability' ? 'userId' : 'user_id', '==', userId);
      
      const seriesSnapshot = await seriesQuery.get();
      
      // Filter for future events and delete them
      const batch = db.batch();
      seriesSnapshot.docs.forEach(doc => {
        const docData = doc.data();
        const eventDate = new Date(docData.from);
        
        if (eventDate >= currentEventDate) {
          batch.delete(doc.ref);
          deletedCount++;
        }
      });
      
      if (deletedCount > 0) {
        await batch.commit();
      }
    }
    
    console.log('Calendar events deleted', { 
      eventId: eventId, 
      userId: userId,
      deleteType: deleteType,
      count: deletedCount
    });
    
    res.json({
      success: true,
      count: deletedCount
    });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    res.status(500).json({ error: "Failed to delete calendar event" });
  }
});

// Save recurring events endpoint - requires authentication
app.post('/saveRecurringEvents', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const userId = req.user.uid;
    const { baseEvent } = req.body;
    
    // SECURITY CHECK: Ensure user can only save events for their own account
    if (req.body.userId && req.body.userId !== userId) {
      return res.status(403).json({ error: "You can only save events for your own account" });
    }
    
    if (!baseEvent || !baseEvent.start || !baseEvent.end) {
      return res.status(400).json({ error: "Base event with start and end times is required" });
    }
    
    // Generate recurrence ID
    const recurrenceId = `${userId}_${Date.now()}_recurrence`;
    
    // Generate recurring dates
    const startDate = new Date(baseEvent.start);
    const endDate = new Date(baseEvent.end);
    const duration = endDate.getTime() - startDate.getTime();
    
    // Calculate end repeat date
    let endRepeatDate;
    if (baseEvent.endRepeatDate) {
      endRepeatDate = new Date(baseEvent.endRepeatDate);
    } else {
      // Default to 3 months from start if no end date provided
      endRepeatDate = new Date(startDate);
      endRepeatDate.setMonth(endRepeatDate.getMonth() + 3);
    }
    
    // Generate occurrence dates based on repeat pattern
    const occurrences = generateRecurringDates(
      startDate,
      baseEvent.repeatValue || 'Every Day',
      baseEvent.endRepeatValue || 'On Date',
      baseEvent.endRepeatCount || 30,
      endRepeatDate
    );
    
    // Save all occurrences in batches
    const batchSize = 500; // Firestore batch limit
    const batches = [];
    let currentBatch = db.batch();
    let operationCount = 0;
    
    for (let i = 0; i < occurrences.length; i++) {
      const occurrence = occurrences[i];
      const isLastOccurrence = i === occurrences.length - 1;
      
      const occurrenceEnd = new Date(occurrence.getTime() + duration);
      
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
      
      const docRef = db.collection('availability').doc();
      currentBatch.set(docRef, eventData);
      operationCount++;
      
      // If we've reached the batch limit, commit and start a new batch
      if (operationCount === batchSize) {
        batches.push(currentBatch.commit());
        currentBatch = db.batch();
        operationCount = 0;
      }
    }
    
    // Commit any remaining operations
    if (operationCount > 0) {
      batches.push(currentBatch.commit());
    }
    
    // Wait for all batches to complete
    await Promise.all(batches);
    
    console.log('Recurring events saved', { 
      userId: userId,
      recurrenceId: recurrenceId,
      count: occurrences.length
    });
    
    res.json({
      success: true,
      recurrenceId: recurrenceId,
      count: occurrences.length
    });
  } catch (error) {
    console.error('Error saving recurring events:', error);
    res.status(500).json({ error: "Failed to save recurring events" });
  }
});

// Helper function to generate recurring dates
function generateRecurringDates(startDate, repeatValue, endRepeatValue, endRepeatCount, endRepeatDate) {
  const dates = [];
  const currentDate = new Date(startDate);
  
  // Determine end condition
  const maxOccurrences = endRepeatValue === 'After' ? endRepeatCount : 200; // Safety limit
  const endDate = endRepeatValue === 'On Date' ? endRepeatDate : new Date(startDate.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year default
  
  let count = 0;
  
  while (count < maxOccurrences && currentDate <= endDate) {
    dates.push(new Date(currentDate));
    count++;
    
    // Advance to next occurrence
    switch (repeatValue) {
      case 'Every Day':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'Every Week':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'Every Month':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      default:
        // Default to daily if unknown repeat value
        currentDate.setDate(currentDate.getDate() + 1);
        break;
    }
  }
  
  return dates;
}

// Calendar sync endpoint - requires authentication
app.post('/calendarSync', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const userId = req.user.uid;
    const { calendarId, events } = req.body;
    
    // SECURITY CHECK: Ensure user can only sync their own calendar
    if (req.body.userId && req.body.userId !== userId) {
      return res.status(403).json({ error: "You can only sync your own calendar" });
    }
    
    console.log('Calendar sync request', { userId, calendarId, eventCount: events?.length || 0 });
    
    // Get user's existing calendar data
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Update calendar reference in user document
    await userRef.update({
      connectedCalendars: admin.firestore.FieldValue.arrayUnion(calendarId),
      lastCalendarSync: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      success: true,
      message: 'Calendar synced successfully'
    });
  } catch (error) {
    console.error('Error syncing calendar:', error);
    res.status(500).json({ error: "Failed to sync calendar" });
  }
});

// MARKETPLACE ENDPOINTS

// List marketplace positions endpoint - requires authentication
app.post('/listMarketplacePositions', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const userId = req.user.uid;
    const { filters = {}, limit: queryLimit = 50 } = req.body;
    
    // Query positions with status 'open'
    let positionsQuery = db.collection('positions')
      .where('status', '==', 'open')
      .orderBy('created', 'desc')
      .limit(queryLimit);
    
    // Apply filters if provided
    if (filters.facilityProfileId) {
      positionsQuery = positionsQuery.where('facilityProfileId', '==', filters.facilityProfileId);
    }
    
    if (filters.jobType) {
      positionsQuery = positionsQuery.where('jobType', '==', filters.jobType);
    }
    
    const snapshot = await positionsQuery.get();
    const positions = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      positions.push({
        id: doc.id,
        ...data,
        createdAt: data.created?.toDate() || null,
        startTime: data.startTime?.toDate() || null,
        endTime: data.endTime?.toDate() || null
      });
    });
    
    res.json({
      success: true,
      positions
    });
  } catch (error) {
    console.error('Error listing marketplace positions:', error);
    res.status(500).json({ error: "Failed to list marketplace positions" });
  }
});

// List professional availabilities endpoint - requires authentication
app.post('/listProfessionalAvailabilities', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const userId = req.user.uid;
    const { filters = {}, limit: queryLimit = 50 } = req.body;
    
    // Query professional availabilities with status 'available'
    let availabilitiesQuery = db.collection('professionalAvailabilities')
      .where('status', '==', 'available')
      .orderBy('startTime', 'desc')
      .limit(queryLimit);
    
    // Apply filters if provided
    if (filters.professionalProfileId) {
      availabilitiesQuery = availabilitiesQuery.where('professionalProfileId', '==', filters.professionalProfileId);
    }
    
    if (filters.jobTypes && filters.jobTypes.length > 0) {
      // Note: Firestore doesn't support array-contains-any in all cases, so we filter client-side
      availabilitiesQuery = availabilitiesQuery.where('jobTypes', 'array-contains', filters.jobTypes[0]);
    }
    
    const snapshot = await availabilitiesQuery.get();
    const availabilities = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Apply additional filters client-side if needed
      if (filters.jobTypes && filters.jobTypes.length > 1) {
        const hasMatchingJobType = data.jobTypes && data.jobTypes.some(jt => filters.jobTypes.includes(jt));
        if (!hasMatchingJobType) return;
      }
      
      availabilities.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || null,
        startTime: data.startTime?.toDate() || null,
        endTime: data.endTime?.toDate() || null
      });
    });
    
    res.json({
      success: true,
      availabilities
    });
  } catch (error) {
    console.error('Error listing professional availabilities:', error);
    res.status(500).json({ error: "Failed to list professional availabilities" });
  }
});

// Get position details endpoint - requires authentication
app.post('/getPosition', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const userId = req.user.uid;
    const { positionId } = req.body;
    
    if (!positionId) {
      return res.status(400).json({ error: "Position ID is required" });
    }
    
    const positionDoc = await db.collection('positions').doc(positionId).get();
    
    if (!positionDoc.exists) {
      return res.status(404).json({ error: "Position not found" });
    }
    
    const position = positionDoc.data();
    
    // Get applications if user is the facility admin or the position poster
    let applications = [];
    if (position.postedByUserId === userId || position.facilityProfileId) {
      // Check if user is facility admin
      const facilityDoc = await db.collection('facilityProfiles').doc(position.facilityProfileId).get();
      if (facilityDoc.exists) {
        const facilityData = facilityDoc.data();
        if (facilityData.admin && facilityData.admin.includes(userId)) {
          const applicationsSnapshot = await db.collection('positions')
            .doc(positionId)
            .collection('applications')
            .get();
          
          applications = applicationsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            applicationTime: doc.data().applicationTime?.toDate() || null
          }));
        }
      }
    }
    
    res.json({
      success: true,
      position: {
        id: positionDoc.id,
        ...position,
        createdAt: position.created?.toDate() || null,
        startTime: position.startTime?.toDate() || null,
        endTime: position.endTime?.toDate() || null,
        applications
      }
    });
  } catch (error) {
    console.error('Error fetching position:', error);
    res.status(500).json({ error: "Failed to fetch position data" });
  }
});

// Create position endpoint - requires authentication
app.post('/createPosition', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const userId = req.user.uid;
    const { facilityProfileId, jobTitle, jobType, startTime, endTime, location, description, compensation } = req.body;
    
    // Validate required fields
    if (!facilityProfileId || !jobTitle || !startTime || !endTime) {
      return res.status(400).json({ error: "Facility profile ID, job title, start time, and end time are required" });
    }
    
    // SECURITY CHECK: Verify user is admin of the facility
    const facilityDoc = await db.collection('facilityProfiles').doc(facilityProfileId).get();
    if (!facilityDoc.exists) {
      return res.status(404).json({ error: "Facility not found" });
    }
    
    const facilityData = facilityDoc.data();
    if (!facilityData.admin || !facilityData.admin.includes(userId)) {
      return res.status(403).json({ error: "Only facility admins can create positions" });
    }
    
    // Validate date format
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }
    
    if (startDate >= endDate) {
      return res.status(400).json({ error: "End time must be after start time" });
    }
    
    // Prepare position data
    const positionData = {
      facilityProfileId,
      postedByUserId: userId,
      status: 'open',
      jobTitle,
      jobType: jobType || 'general',
      startTime: admin.firestore.Timestamp.fromDate(startDate),
      endTime: admin.firestore.Timestamp.fromDate(endDate),
      location: location || {},
      description: description || '',
      compensation: compensation || {},
      created: admin.firestore.FieldValue.serverTimestamp(),
      updated: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Save to positions collection
    const docRef = await db.collection('positions').add(positionData);
    
    console.log('Position created', { 
      positionId: docRef.id, 
      facilityProfileId,
      jobTitle
    });
    
    res.json({
      success: true,
      positionId: docRef.id
    });
  } catch (error) {
    console.error('Error creating position:', error);
    res.status(500).json({ error: "Failed to create position" });
  }
});

// Apply to position endpoint - requires authentication
app.post('/applyToPosition', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const userId = req.user.uid;
    const { positionId, professionalProfileId } = req.body;
    
    if (!positionId) {
      return res.status(400).json({ error: "Position ID is required" });
    }
    
    // Get user's professional profile ID if not provided
    let profileId = professionalProfileId;
    if (!profileId) {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData.role === 'professional') {
          profileId = userId; // professionalProfileId typically matches userId
        }
      }
    }
    
    if (!profileId) {
      return res.status(400).json({ error: "Professional profile ID is required" });
    }
    
    // Verify position exists
    const positionDoc = await db.collection('positions').doc(positionId).get();
    if (!positionDoc.exists) {
      return res.status(404).json({ error: "Position not found" });
    }
    
    const position = positionDoc.data();
    if (position.status !== 'open') {
      return res.status(400).json({ error: "Position is no longer open" });
    }
    
    // Check if already applied
    const existingApplication = await db.collection('positions')
      .doc(positionId)
      .collection('applications')
      .doc(profileId)
      .get();
    
    if (existingApplication.exists) {
      return res.status(400).json({ error: "You have already applied to this position" });
    }
    
    // Create application
    const applicationData = {
      professionalProfileId: profileId,
      userId: userId,
      applicationTime: admin.firestore.FieldValue.serverTimestamp(),
      status: 'submitted'
    };
    
    await db.collection('positions')
      .doc(positionId)
      .collection('applications')
      .doc(profileId)
      .set(applicationData);
    
    console.log('Application created', { 
      positionId,
      professionalProfileId: profileId,
      userId
    });
    
    res.json({
      success: true,
      applicationId: profileId
    });
  } catch (error) {
    console.error('Error applying to position:', error);
    res.status(500).json({ error: "Failed to apply to position" });
  }
});

// Create professional availability endpoint - requires authentication
app.post('/createProfessionalAvailability', authenticateToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const userId = req.user.uid;
    const { professionalProfileId, startTime, endTime, jobTypes, locationPreference, hourlyRate, notes } = req.body;
    
    // Validate required fields
    if (!startTime || !endTime) {
      return res.status(400).json({ error: "Start time and end time are required" });
    }
    
    // Get user's professional profile ID if not provided
    let profileId = professionalProfileId;
    if (!profileId) {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData.role === 'professional') {
          profileId = userId;
        }
      }
    }
    
    if (!profileId) {
      return res.status(400).json({ error: "Professional profile ID is required" });
    }
    
    // SECURITY CHECK: Ensure user can only create availability for their own profile
    if (profileId !== userId) {
      return res.status(403).json({ error: "You can only create availability for your own profile" });
    }
    
    // Validate date format
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }
    
    if (startDate >= endDate) {
      return res.status(400).json({ error: "End time must be after start time" });
    }
    
    // Prepare availability data
    const availabilityData = {
      professionalProfileId: profileId,
      userId: userId,
      startTime: admin.firestore.Timestamp.fromDate(startDate),
      endTime: admin.firestore.Timestamp.fromDate(endDate),
      status: 'available',
      jobTypes: jobTypes || [],
      locationPreference: locationPreference || {},
      hourlyRate: hourlyRate || {},
      notes: notes || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Save to professionalAvailabilities collection
    const docRef = await db.collection('professionalAvailabilities').add(availabilityData);
    
    console.log('Professional availability created', { 
      availabilityId: docRef.id, 
      professionalProfileId: profileId
    });
    
    res.json({
      success: true,
      availabilityId: docRef.id
    });
  } catch (error) {
    console.error('Error creating professional availability:', error);
    res.status(500).json({ error: "Failed to create professional availability" });
  }
});

app.post('/checkAndCreateEvent', async (req, res) => {
  try {
    // Implement event checking and creation logic
    res.json({ success: true, message: "Event checked and created" });
  } catch (error) {
    console.error('Error checking and creating event:', error);
    res.status(500).json({ error: "Failed to check and create event" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 