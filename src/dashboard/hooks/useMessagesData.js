import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../contexts/DashboardContext';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  and,
  or
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { WORKSPACE_TYPES } from '../../utils/sessionAuth';
import { useNotification } from '../../contexts/NotificationContext';

// Message context types - aligned with documented structure
const MESSAGE_CONTEXTS = {
  PERSONAL: 'personal',
  FACILITY: 'facility'
};

const useMessagesData = (conversationId = null) => {
  const { t } = useTranslation();
  const { user, selectedWorkspace } = useDashboard();
  const { showError, showSuccess } = useNotification();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messageContext, setMessageContext] = useState(MESSAGE_CONTEXTS.PERSONAL);

  // Get user role in current workspace
  const getUserRole = useCallback(() => {
    if (!selectedWorkspace || !user) return null;

    if (selectedWorkspace.type === WORKSPACE_TYPES.PERSONAL) {
      return 'personal';
    } else if (selectedWorkspace.type === WORKSPACE_TYPES.TEAM) {
      return selectedWorkspace.role || 'employee';
    }
    return null;
  }, [selectedWorkspace, user]);

  // Check if user can access facility messages
  const canAccessFacilityMessages = useCallback(() => {
    if (!selectedWorkspace || selectedWorkspace.type !== WORKSPACE_TYPES.TEAM) {
      return false;
    }

    const role = getUserRole();
    return role && role !== 'employee'; // Admins and managers can access facility messages
  }, [selectedWorkspace, getUserRole]);

  // Load conversations based on context and workspace - Updated to match documented structure
  const loadConversations = useCallback(async (context = MESSAGE_CONTEXTS.PERSONAL) => {
    if (!user || !selectedWorkspace) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let conversationsQuery;
      const conversationsRef = collection(db, 'conversations');

      if (context === MESSAGE_CONTEXTS.PERSONAL) {
        // Personal messages: conversations where user is a participant
        conversationsQuery = query(
          conversationsRef,
          where('participantIds', 'array-contains', user.uid),
          orderBy('lastMessageTimestamp', 'desc')
        );
      } else if (context === MESSAGE_CONTEXTS.FACILITY && canAccessFacilityMessages()) {
        // Facility messages: conversations linked to the current facility
        conversationsQuery = query(
          conversationsRef,
          where('facilityProfileId', '==', selectedWorkspace.facilityId),
          orderBy('lastMessageTimestamp', 'desc')
        );
      } else {
        // No access or invalid context
        setConversations([]);
        setIsLoading(false);
        return;
      }

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        conversationsQuery,
        async (snapshot) => {
          const conversationsList = [];

          // Process each conversation document
          for (const docChange of snapshot.docChanges()) {
            if (docChange.type === 'added' || docChange.type === 'modified') {
              const conversationData = docChange.doc.data();

              // Use the documented participantInfo structure
              let displayInfo = {};

              if (context === MESSAGE_CONTEXTS.PERSONAL) {
                // Find the other participant from participantInfo
                const otherParticipant = conversationData.participantInfo?.find(
                  participant => participant.userId !== user.uid
                );

                if (otherParticipant) {
                  displayInfo = {
                    displayName: otherParticipant.displayName,
                    photoURL: otherParticipant.photoURL,
                    role: otherParticipant.roleInConversation,
                    otherParticipant
                  };
                }
              } else if (context === MESSAGE_CONTEXTS.FACILITY) {
                // For facility messages, show professional or contract info
                const professionalParticipant = conversationData.participantInfo?.find(
                  participant => participant.roleInConversation === 'professional'
                );

                if (conversationData.type === 'internal_team' || conversationData.isTeamChat) {
                  displayInfo = {
                    displayName: 'Internal Team Chat',
                    photoURL: null,
                    role: 'internal_team',
                    isTeamChat: true
                  };
                } else if (professionalParticipant) {
                  displayInfo = {
                    displayName: `${professionalParticipant.displayName} (Professional)`,
                    photoURL: professionalParticipant.photoURL,
                    role: 'professional',
                    contractId: conversationData.contractId
                  };
                } else {
                  displayInfo = {
                    displayName: 'Facility Conversation',
                    photoURL: null,
                    role: 'facility',
                    contractId: conversationData.contractId
                  };
                }
              }

              conversationsList.push({
                id: docChange.doc.id,
                ...conversationData,
                ...displayInfo
              });
            }
          }

          // Sort conversations by last message timestamp
          conversationsList.sort((a, b) => {
            const aTime = a.lastMessageTimestamp?.toDate?.() || new Date(0);
            const bTime = b.lastMessageTimestamp?.toDate?.() || new Date(0);
            return bTime - aTime;
          });

          setConversations(conversationsList);
          setIsLoading(false);
        },
        (err) => {
          console.error('Error listening to conversations:', err);
          setError(err);
          showError(t('messages:errors.loadingConversations', 'Failed to load conversations'));
          setIsLoading(false);
        }
      );

      return unsubscribe;
    } catch (err) {
      console.error('Error setting up conversations listener:', err);
      setError(err);
      showError(t('messages:errors.loadingConversations', 'Failed to load conversations'));
      setIsLoading(false);
    }
  }, [user, selectedWorkspace, canAccessFacilityMessages, t, showError]);

  // Load messages for active conversation - Updated to use subcollection structure
  const loadMessages = useCallback(async () => {
    if (!activeConversation || !user) {
      setMessages([]);
      return;
    }

    try {
      // Messages are now a subcollection under conversations
      const messagesQuery = query(
        collection(db, 'conversations', activeConversation.id, 'messages'),
        orderBy('timestamp', 'asc')
      );

      const unsubscribe = onSnapshot(
        messagesQuery,
        (snapshot) => {
          const messagesList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setMessages(messagesList);
        },
        (err) => {
          console.error('Error loading messages:', err);
          setError(err);
          showError(t('messages:errors.loadingMessages', 'Failed to load messages'));
        }
      );

      return unsubscribe;
    } catch (err) {
      console.error('Error loading messages:', err);
      setError(err);
      showError(t('messages:errors.loadingMessages', 'Failed to load messages'));
    }
  }, [activeConversation, user, t, showError]);

  // Initial load of conversations based on workspace - Fixed infinite loop
  useEffect(() => {
    if (user && selectedWorkspace) {
      // Default to personal messages, unless only facility access is available
      const defaultContext = MESSAGE_CONTEXTS.PERSONAL;
      setMessageContext(defaultContext);
      loadConversations(defaultContext);
    }
  }, [user, selectedWorkspace]); // Removed loadConversations from dependency array

  // Load messages when active conversation changes - Fixed infinite loop
  useEffect(() => {
    if (activeConversation) {
      loadMessages();
    }
  }, [activeConversation]); // Removed loadMessages from dependency array

  // Send message - Updated to use subcollection structure
  const sendMessage = useCallback(async (content, context = messageContext) => {
    if (!activeConversation || !user) return;

    try {
      // Get sender info from participantInfo
      const senderInfo = activeConversation.participantInfo?.find(
        participant => participant.userId === user.uid
      );

      const messageData = {
        senderId: user.uid,
        text: content.trim(),
        timestamp: serverTimestamp(),
        status: 'sent',
        // Add file support as per documented structure
        imageUrl: null,
        fileUrl: null,
        fileName: null,
        fileType: null,
        reactions: []
      };

      // Add message to subcollection
      const newMessage = await addDoc(
        collection(db, 'conversations', activeConversation.id, 'messages'),
        messageData
      );

      // Update conversation's lastMessage and lastMessageTimestamp
      // This would typically be done by a Cloud Function, but for now we'll handle it client-side
      // In production, this should be handled by a Firestore trigger

      return newMessage;
    } catch (err) {
      console.error('Error sending message:', err);
      showError(t('messages:errors.sendingMessage', 'Failed to send message'));
      throw err;
    }
  }, [activeConversation, user, messageContext, t, showError]);

  // Create new conversation - Updated to match documented structure
  const createConversation = useCallback(async (
    participantIds,
    participantInfo,
    contractId = null,
    facilityProfileId = null,
    professionalProfileId = null
  ) => {
    if (!user) return;

    try {
      const conversationData = {
        participantIds,
        participantInfo,
        contractId,
        facilityProfileId,
        professionalProfileId,
        lastMessage: {
          text: '',
          senderId: '',
          timestamp: serverTimestamp()
        },
        lastMessageTimestamp: serverTimestamp(),
        unreadCounts: participantIds.reduce((acc, id) => {
          acc[id] = 0;
          return acc;
        }, {}),
        isArchivedBy: [],
        typingIndicator: participantIds.reduce((acc, id) => {
          acc[id] = false;
          return acc;
        }, {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const newConversation = await addDoc(collection(db, 'conversations'), conversationData);

      showSuccess(t('messages:conversationCreated', 'Conversation created successfully'));
      return newConversation;
    } catch (err) {
      console.error('Error creating conversation:', err);
      showError(t('messages:errorCreatingConversation', 'Failed to create conversation'));
      throw err;
    }
  }, [user, t, showError, showSuccess]);

  // Set active conversation
  const setActiveConversationById = useCallback((id) => {
    const conversation = conversations.find(c => c.id === id);
    if (conversation) {
      setActiveConversation(conversation);
    }
  }, [conversations]);

  // Switch message context (personal/facility)
  const switchMessageContext = useCallback((context) => {
    if (context === MESSAGE_CONTEXTS.FACILITY && !canAccessFacilityMessages()) {
      showError(t('messages:noFacilityAccess', 'You do not have access to facility messages'));
      return;
    }

    setMessageContext(context);
    setActiveConversation(null);
    setMessages([]);
    loadConversations(context);
  }, [canAccessFacilityMessages, loadConversations, t, showError]);

  return {
    conversations,
    activeConversation,
    messages,
    isLoading,
    error,
    messageContext,
    canAccessFacilityMessages: canAccessFacilityMessages(),
    loadConversations,
    loadMessages,
    sendMessage,
    createConversation,
    setActiveConversationById,
    switchMessageContext,
    MESSAGE_CONTEXTS
  };
};

export default useMessagesData; 