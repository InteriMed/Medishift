import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../services/services/firebase';
import { useNotification } from '../../../../contexts/notificationContext';
import PropTypes from 'prop-types';
import { cn } from '../../../../utils/cn';
import { FiSend, FiUser, FiX, FiCheck, FiMessageSquare } from 'react-icons/fi';
import formatMessageText from '../utils/formatMessageText';
import AddParticipantModal from './AddParticipantModal';
import StartNewCommunicationModal from './StartNewCommunicationModal';

/**
 * ConversationView - Complete redesign
 */
const ConversationView = ({
  conversation,
  currentUser,
  messageContext = 'personal',
  workspaceContext,
  isTutorial = false
}) => {
  const { t } = useTranslation(['messages']);
  const { showError } = useNotification();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showProfileImage, setShowProfileImage] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [showStartNewCommunication, setShowStartNewCommunication] = useState(false);
  const messagesContainerRef = useRef(null);
  const messagesListener = useRef(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getMockMessages = useCallback(() => {
    if (!isTutorial || !conversation) return [];

    const now = new Date();
    const mockMessages = [];

    if (conversation.id === 'tutorial-doctor-smith') {
      const otherUserId = 'tutorial-doctor';
      const otherUserName = t('messages:tutorial.doctorName');

      mockMessages.push(
        {
          id: 'mock-1',
          senderId: otherUserId,
          senderName: otherUserName,
          text: t('messages:tutorial.doctorMessage1', 'Hello! I wanted to discuss the temporary contract opportunity for February. Are you available for a quick call?'),
          timestamp: { toDate: () => new Date(now.getTime() - 2 * 60 * 60 * 1000) },
          status: 'read',
          reactions: []
        },
        {
          id: 'mock-2',
          senderId: currentUser?.uid || 'current-user',
          senderName: currentUser?.displayName || t('messages:status.you'),
          text: t('messages:tutorial.doctorMessage2', 'Yes, I\'m very interested! When would be a good time for you?'),
          timestamp: { toDate: () => new Date(now.getTime() - 1.5 * 60 * 60 * 1000) },
          status: 'read',
          reactions: []
        },
        {
          id: 'mock-3',
          senderId: otherUserId,
          senderName: otherUserName,
          text: t('messages:tutorial.doctorMessage3', 'Great! How about tomorrow at 2 PM? I can share more details about the position and answer any questions you might have.'),
          timestamp: { toDate: () => new Date(now.getTime() - 1 * 60 * 60 * 1000) },
          status: 'read',
          reactions: []
        }
      );
    } else if (conversation.id === 'tutorial-lausanne-clinic') {
      const otherUserId = 'tutorial-hospital';
      const otherUserName = t('messages:tutorial.hospitalName');

      mockMessages.push(
        {
          id: 'mock-4',
          senderId: otherUserId,
          senderName: otherUserName,
          text: t('messages:tutorial.hospitalMessage1', 'Your application has been reviewed and we\'re impressed with your qualifications. We\'d like to schedule an interview.'),
          timestamp: { toDate: () => new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          status: 'read',
          reactions: []
        },
        {
          id: 'mock-5',
          senderId: currentUser?.uid || 'current-user',
          senderName: currentUser?.displayName || t('messages:status.you'),
          text: t('messages:tutorial.hospitalMessage2', 'Thank you so much! I\'m very excited about this opportunity. I\'m available next week.'),
          timestamp: { toDate: () => new Date(now.getTime() - 23 * 60 * 60 * 1000) },
          status: 'read',
          reactions: []
        },
        {
          id: 'mock-6',
          senderId: otherUserId,
          senderName: otherUserName,
          text: t('messages:tutorial.hospitalMessage3', 'Perfect! I\'ll send you a calendar invite with available time slots. Looking forward to speaking with you.'),
          timestamp: { toDate: () => new Date(now.getTime() - 22 * 60 * 60 * 1000) },
          status: 'read',
          reactions: []
        }
      );
    }

    return mockMessages.sort((a, b) => a.timestamp.toDate() - b.timestamp.toDate());
  }, [isTutorial, conversation, currentUser, t]);

  useEffect(() => {
    if (isTutorial) {
      const mockMessages = getMockMessages();
      setMessages(mockMessages);
      setIsLoading(false);
      return;
    }

    if (!conversation || !currentUser) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const messagesQuery = query(
      collection(db, 'conversations', conversation.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    if (messagesListener.current) {
      messagesListener.current();
    }

    messagesListener.current = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messagesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMessages(messagesList);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching messages:', error);
        showError('Failed to load messages');
        setIsLoading(false);
      }
    );

    return () => {
      if (messagesListener.current) {
        messagesListener.current();
      }
    };
  }, [conversation, currentUser, showError, isTutorial, getMockMessages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || isSending) return;

    if (isTutorial) {
      const mockMessage = {
        id: `mock-${Date.now()}`,
        senderId: currentUser?.uid || 'current-user',
        senderName: currentUser?.displayName || t('messages:status.you'),
        text: newMessage.trim(),
        timestamp: { toDate: () => new Date() },
        status: 'sent',
        reactions: []
      };
      setMessages(prev => [...prev, mockMessage]);
      setNewMessage('');
      setTimeout(scrollToBottom, 100);
      return;
    }

    setIsSending(true);

    try {
      const messageData = {
        senderId: currentUser.uid,
        text: newMessage.trim(),
        timestamp: serverTimestamp(),
        status: 'sent',
        reactions: []
      };

      await addDoc(collection(db, 'conversations', conversation.id, 'messages'), messageData);

      setNewMessage('');
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      showError('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background/50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          <span className="text-sm text-muted-foreground">{t('messages:loading')}</span>
        </div>
      </div>
    );
  }

  // Header Logic for Team Chats
  const isTeamChat = conversation.isTeamChat || conversation.type === 'internal_team' || conversation.participantIds?.length > 2;

  return (
    <div className="h-full flex flex-col bg-background relative">
      <AddParticipantModal
        isOpen={showAddParticipant}
        onClose={() => setShowAddParticipant(false)}
        conversationId={conversation.id}
        currentParticipants={conversation.participantIds}
      />
      <StartNewCommunicationModal
        isOpen={showStartNewCommunication}
        onClose={() => setShowStartNewCommunication(false)}
        onSelectTeamMember={(member) => {
          console.log('Selected team member:', member);
        }}
      />

      {/* Profile Image Modal */}
      {
        showProfileImage && conversation.photoURL && (
          <div
            className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center transition-opacity duration-300"
            onClick={() => setShowProfileImage(false)}
          >
            <div
              className="relative flex items-center justify-center p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowProfileImage(false)}
                className="absolute -top-2 -right-2 z-10 h-8 w-8 flex items-center justify-center bg-background/90 hover:bg-background border border-border rounded-full transition-colors shadow-lg"
              >
                <FiX className="h-4 w-4" style={{ color: 'var(--text-color)' }} />
              </button>
              <div className="relative flex items-center justify-center">
                <img
                  src={conversation.photoURL}
                  alt={conversation.displayName || 'User'}
                  className="w-48 h-48 object-cover rounded-full border-4 border-background shadow-xl"
                />
              </div>
            </div>
          </div>
        )
      }

      {/* MESSAGES AREA - This scrolls, NOT the parent div */}
      <style>{`
        @keyframes textAppear {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .message-text-animate {
          animation: textAppear 0.4s ease-out forwards;
          opacity: 0;
        }
        .message-bubble-animate {
          animation: textAppear 0.3s ease-out forwards;
          opacity: 0;
        }
      `}</style>
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-muted/10"
        style={{ scrollbarGutter: 'stable' }}
      >
        <div className="w-full h-full px-6 py-6 flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <FiSend className="w-8 h-8 text-primary/60" />
              </div>
              <h4 className="text-base font-semibold text-foreground mb-2" style={{ margin: 0 }}>{t('messages:empty.noMessagesInChat')}</h4>
              <p className="text-sm text-muted-foreground max-w-xs mb-4" style={{ margin: 0 }}>
                {t('messages:empty.startChatting')}
              </p>
              <button
                onClick={() => setShowStartNewCommunication(true)}
                className="w-12 h-12 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center"
                style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}
                title={t('messages:startNewCommunication.button', 'Start New Communication')}
              >
                <FiMessageSquare className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => {
                const isCurrentUser = message.senderId === (currentUser?.uid || 'current-user');
                const showDateHeader = index === 0 ||
                  (new Date(message.timestamp?.toDate()).toDateString() !==
                    new Date(messages[index - 1].timestamp?.toDate()).toDateString());
                const isSameSender = index > 0 && messages[index - 1].senderId === message.senderId;

                return (
                  <React.Fragment key={message.id}>
                    {/* Date Header */}
                    {showDateHeader && message.timestamp && (
                      <div className="flex items-center justify-center py-4">
                        <div className="px-3 py-1 rounded-full bg-muted/60 text-xs font-medium text-muted-foreground">
                          {new Date(message.timestamp.toDate()).toLocaleDateString(undefined, {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div className={cn(
                      "flex gap-3 items-end w-full",
                      isCurrentUser ? "justify-end" : "justify-start",
                      !isSameSender && "mt-4"
                    )}>
                      {/* Avatar for recipient messages - Left side */}
                      {!isCurrentUser && (
                        <div className={cn(
                          "shrink-0 w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center",
                          isSameSender && "opacity-0"
                        )}>
                          <FiUser className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}

                      {/* Message content */}
                      <div className={cn(
                        "flex flex-col gap-1 max-w-[70%] message-bubble-animate",
                        isCurrentUser ? "items-end" : "items-start"
                      )} style={{ animationDelay: `${index * 0.05}s` }}>
                        {/* Sender name for recipient messages OR team chat self-messages */}
                        {(!isCurrentUser || isTeamChat) && !isSameSender && (
                          <span className="text-xs font-medium text-muted-foreground px-1 mb-0.5">
                            {message.senderName || (conversation.participantInfo?.find(p => p.userId === message.senderId)?.displayName) || t('messages:status.unknownUser')}
                          </span>
                        )}

                        <div className={cn(
                          "px-4 py-2.5 shadow-sm relative group",
                          isCurrentUser
                            ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
                            : "bg-card text-card-foreground border border-border/50 rounded-2xl rounded-tl-sm"
                        )}>
                          <div className={cn(
                            "text-sm leading-relaxed break-words message-text-animate whitespace-pre-wrap",
                            isCurrentUser ? "text-primary-foreground" : "text-foreground"
                          )} style={{ margin: 0, animationDelay: `${index * 0.05 + 0.1}s` }}>
                            {formatMessageText(message.text)}
                          </div>

                          {/* Timestamp & Status inside bubble for better look */}
                          <div className={cn(
                            "flex items-center gap-1 mt-1 select-none",
                            isCurrentUser ? "justify-end opacity-90" : "justify-end opacity-70"
                          )}>
                            <span className="text-[10px]">
                              {message.timestamp?.toDate
                                ? new Date(message.timestamp.toDate()).toLocaleTimeString(undefined, {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                                : t('messages:status.sending')}
                            </span>
                            {isCurrentUser && (
                              <span className="flex items-center">
                                {message.status === 'sent' && <FiCheck className="w-3 h-3" />}
                                {message.status === 'delivered' && (
                                  <div className="flex">
                                    <FiCheck className="w-3 h-3" />
                                    <FiCheck className="w-3 h-3 -ml-1.5" />
                                  </div>
                                )}
                                {message.status === 'read' && (
                                  <div className="flex text-blue-200">
                                    <FiCheck className="w-3 h-3" />
                                    <FiCheck className="w-3 h-3 -ml-1.5" />
                                  </div>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Avatar for current user messages - Right side */}
                      {isCurrentUser && (
                        <div className={cn(
                          "shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center",
                          isSameSender && "opacity-0"
                        )}>
                          <FiUser className="w-4 h-4 text-primary" />
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* INPUT AREA - Fixed at bottom, NOT scrolling */}
      <div className="shrink-0 px-4 py-3 border-t border-border bg-card/95 backdrop-blur-sm">
        <style>{`
          .message-textarea::-webkit-scrollbar {
            display: none;
          }
          .message-textarea {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
        <form onSubmit={handleSendMessage} className="w-full">
          <div className="flex items-start gap-2">
            {/* Text Input */}
            <div className="flex-1 relative">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('messages:placeholders.typeMessage')}
                rows={1}
                className="message-textarea w-full resize-none px-3 py-2 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all overflow-y-auto"
                disabled={isSending}
                style={{
                  height: '36px',
                  minHeight: '36px',
                  maxHeight: '120px',
                  fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
                  lineHeight: '1.5',
                  margin: 0
                }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  if (e.target.scrollHeight <= 36) {
                    e.target.style.height = '36px';
                  }
                }}
              />
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className={cn(
                "shrink-0 w-9 h-9 flex items-center justify-center rounded-lg transition-all",
                "bg-primary text-primary-foreground shadow-sm hover:shadow-md",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
                "hover:scale-105 active:scale-95"
              )}
              title={t('messages:conversation.sendMessage')}
              style={{ margin: 0, marginTop: '2px' }}
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <FiSend className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div >
  );
};

ConversationView.propTypes = {
  conversation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    photoURL: PropTypes.string,
    displayName: PropTypes.string,
    contractId: PropTypes.string
  }).isRequired,
  currentUser: PropTypes.shape({
    uid: PropTypes.string.isRequired
  }).isRequired,
  messageContext: PropTypes.string,
  workspaceContext: PropTypes.object,
  isTutorial: PropTypes.bool
};

export default ConversationView;