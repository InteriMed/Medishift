import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../context/DashboardContext';
import messagesService from '../../services/messagesService';
import { showNotification } from '../utils/notifications';

const useMessagesData = (conversationId = null) => {
  const { t } = useTranslation();
  const { userId, isLoading: isDashboardLoading } = useDashboard();
  
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const conversationsData = await messagesService.getConversations();
      setConversations(conversationsData);
      setError(null);
      
      // If conversationId is provided, set it as active
      if (conversationId) {
        const conversation = conversationsData.find(c => c.id === conversationId);
        if (conversation) {
          setActiveConversation(conversation);
        }
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError(err);
      showNotification(t('dashboard.messages.errorLoadingConversations'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [userId, conversationId, t]);
  
  // Load messages for active conversation
  const loadMessages = useCallback(async () => {
    if (!activeConversation) return;
    
    setIsLoading(true);
    try {
      const messagesData = await messagesService.getMessages(activeConversation.id);
      setMessages(messagesData);
      
      // Mark messages as read
      await messagesService.markAsRead(activeConversation.id);
      
      setError(null);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError(err);
      showNotification(t('dashboard.messages.errorLoadingMessages'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeConversation, t]);

  // Initial load of conversations
  useEffect(() => {
    if (!isDashboardLoading) {
      loadConversations();
    }
  }, [isDashboardLoading, loadConversations]);
  
  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      loadMessages();
    }
  }, [activeConversation, loadMessages]);
  
  // Send message
  const sendMessage = async (content) => {
    if (!activeConversation) return;
    
    try {
      const newMessage = await messagesService.sendMessage(activeConversation.id, {
        content,
        senderId: userId
      });
      
      setMessages(prev => [...prev, newMessage]);
      return newMessage;
    } catch (err) {
      console.error('Error sending message:', err);
      showNotification(t('dashboard.messages.errorSendingMessage'), 'error');
      throw err;
    }
  };
  
  // Create new conversation
  const createConversation = async (participants, initialMessage) => {
    try {
      const newConversation = await messagesService.createConversation({
        participants,
        initialMessage
      });
      
      setConversations(prev => [...prev, newConversation]);
      setActiveConversation(newConversation);
      setMessages([newConversation.lastMessage]);
      
      showNotification(t('dashboard.messages.conversationCreated'), 'success');
      return newConversation;
    } catch (err) {
      console.error('Error creating conversation:', err);
      showNotification(t('dashboard.messages.errorCreatingConversation'), 'error');
      throw err;
    }
  };
  
  // Set active conversation
  const setActiveConversationById = (id) => {
    const conversation = conversations.find(c => c.id === id);
    if (conversation) {
      setActiveConversation(conversation);
    }
  };
  
  return {
    conversations,
    activeConversation,
    messages,
    isLoading,
    error,
    loadConversations,
    loadMessages,
    sendMessage,
    createConversation,
    setActiveConversationById
  };
};

export default useMessagesData; 