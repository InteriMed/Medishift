import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  arrayUnion
} from 'firebase/firestore';

const messagesService = {
  /**
   * Get all conversations for the current user
   */
  getConversations: async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      // Query conversations where the current user is a participant
      // Use new structure (participantIds) with backward compatibility
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('participantIds', 'array-contains', currentUser.uid),
        orderBy('lastMessageTimestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const conversations = [];

      // For each conversation, use participantInfo from the document
      for (const convDoc of snapshot.docs) {
        const convData = convDoc.data();
        
        // Use participantInfo if available (new structure), otherwise fetch from users collection
        let participantsDetails = [];
        
        if (convData.participantInfo && Array.isArray(convData.participantInfo)) {
          // New structure: use participantInfo directly
          participantsDetails = convData.participantInfo.filter(
            participant => participant.userId !== currentUser.uid
          );
        } else {
          // Backward compatibility: fetch participant details
          const participantIds = convData.participantIds || convData.participants || [];
          for (const participantId of participantIds) {
            if (participantId !== currentUser.uid) {
              const userDocRef = doc(db, 'users', participantId);
              const userDoc = await getDoc(userDocRef);
              if (userDoc.exists()) {
                participantsDetails.push({
                  userId: userDoc.id,
                  displayName: userDoc.data().displayName || 'Unknown User',
                  photoURL: userDoc.data().photoURL
                });
              }
            }
          }
        }

        conversations.push({
          id: convDoc.id,
          ...convData,
          participantInfo: convData.participantInfo || participantsDetails,
          lastUpdated: convData.lastMessageTimestamp?.toDate() || convData.updatedAt?.toDate() || new Date()
        });
      }

      return conversations;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  },

  /**
   * Get a single conversation by ID
   * @param {string} conversationId - Conversation ID
   */
  getConversation: async (conversationId) => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationDoc = await getDoc(conversationRef);

      if (!conversationDoc.exists()) {
        throw new Error('Conversation not found');
      }

      return {
        id: conversationDoc.id,
        ...conversationDoc.data()
      };
    } catch (error) {
      console.error(`Error fetching conversation ${conversationId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new conversation
   * @param {Object} conversationData - Conversation data
   */
  createConversation: async (conversationData) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      // SECURITY CHECK: Ensure user is in participantIds
      const participantIds = conversationData.participantIds || conversationData.participants || [];
      if (!participantIds.includes(currentUser.uid)) {
        throw new Error('You must be a participant in the conversation');
      }
      
      // Ensure participantIds array is unique
      const uniqueParticipantIds = [...new Set(participantIds)];
      
      // Prepare conversation data with new structure
      const newConversationData = {
        participantIds: uniqueParticipantIds,
        participantInfo: conversationData.participantInfo || [],
        contractId: conversationData.contractId || null,
        facilityProfileId: conversationData.facilityProfileId || null,
        professionalProfileId: conversationData.professionalProfileId || null,
        lastMessage: {
          text: '',
          senderId: '',
          timestamp: serverTimestamp()
        },
        lastMessageTimestamp: serverTimestamp(),
        unreadCounts: uniqueParticipantIds.reduce((acc, id) => {
          acc[id] = 0;
          return acc;
        }, {}),
        isArchivedBy: [],
        typingIndicator: uniqueParticipantIds.reduce((acc, id) => {
          acc[id] = false;
          return acc;
        }, {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentUser.uid
      };

      const conversationRef = collection(db, 'conversations');
      const docRef = await addDoc(conversationRef, newConversationData);

      // Get the newly created conversation
      const newConversation = await getDoc(docRef);
      return {
        id: docRef.id,
        ...newConversation.data()
      };
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  },

  /**
   * Get messages for a conversation
   * @param {string} conversationId - Conversation ID
   */
  getMessages: async (conversationId) => {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'));
      const snapshot = await getDocs(q);

      const messages = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        });
      });

      return messages;
    } catch (error) {
      console.error(`Error fetching messages for conversation ${conversationId}:`, error);
      throw error;
    }
  },

  /**
   * Send a message in a conversation
   * @param {string} conversationId - Conversation ID
   * @param {Object} messageData - Message data
   */
  sendMessage: async (conversationId, messageData) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      // Check if conversation exists
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationDoc = await getDoc(conversationRef);

      if (!conversationDoc.exists()) {
        throw new Error('Conversation not found');
      }

      // SECURITY CHECK: Verify user is a participant
      const conversationData = conversationDoc.data();
      const isParticipant = conversationData.participantIds?.includes(currentUser.uid) || 
                            conversationData.participants?.includes(currentUser.uid);
      
      if (!isParticipant) {
        throw new Error('Not authorized to send message to this conversation');
      }

      // Add message to the conversation
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const timestamp = Timestamp.now();
      
      const messageRef = await addDoc(messagesRef, {
        ...messageData,
        senderId: currentUser.uid,
        timestamp,
        read: false
      });

      // Update conversation with last message info
      const participantIds = conversationData.participantIds || conversationData.participants || [];
      const updateData = {
        lastMessage: {
          text: messageData.text,
          senderId: currentUser.uid,
          timestamp
        },
        lastMessageTimestamp: timestamp,
        updatedAt: serverTimestamp()
      };
      
      // Update unreadCounts (new structure)
      if (conversationData.unreadCounts) {
        const unreadCounts = { ...conversationData.unreadCounts };
        participantIds.forEach(id => {
          if (id !== currentUser.uid) {
            unreadCounts[id] = (unreadCounts[id] || 0) + 1;
          }
        });
        updateData.unreadCounts = unreadCounts;
      } else {
        // Backward compatibility with old structure
        updateData.unreadBy = arrayUnion(...participantIds.filter(id => id !== currentUser.uid));
      }
      
      await updateDoc(conversationRef, updateData);

      // Get the newly created message
      const newMessage = await getDoc(messageRef);
      return {
        id: messageRef.id,
        ...newMessage.data(),
        timestamp: newMessage.data().timestamp.toDate()
      };
    } catch (error) {
      console.error(`Error sending message in conversation ${conversationId}:`, error);
      throw error;
    }
  },

  /**
   * Mark messages as read
   * @param {string} conversationId - Conversation ID
   */
  markAsRead: async (conversationId) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      // Get the conversation
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationDoc = await getDoc(conversationRef);

      if (!conversationDoc.exists()) {
        throw new Error('Conversation not found');
      }

      const conversationData = conversationDoc.data();
      
      // SECURITY CHECK: Verify user is a participant
      const isParticipant = conversationData.participantIds?.includes(currentUser.uid) || 
                            conversationData.participants?.includes(currentUser.uid);
      
      if (!isParticipant) {
        throw new Error('Not authorized to access this conversation');
      }
      
      // Handle both old structure (unreadBy array) and new structure (unreadCounts object)
      if (conversationData.unreadCounts) {
        // New structure - set current user's unread count to 0
        const unreadCounts = { ...conversationData.unreadCounts };
        unreadCounts[currentUser.uid] = 0;
        await updateDoc(conversationRef, { unreadCounts });
      } else if (conversationData.unreadBy) {
        // Old structure - remove current user from unreadBy array
        const unreadBy = (conversationData.unreadBy || []).filter(id => id !== currentUser.uid);
        await updateDoc(conversationRef, { unreadBy });
      }

      return { success: true };
    } catch (error) {
      console.error(`Error marking conversation ${conversationId} as read:`, error);
      throw error;
    }
  }
};

export default messagesService; 