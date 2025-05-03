import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiPlus, FiSearch } from 'react-icons/fi';
import useMessagesData from '../../hooks/useMessagesData';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage';
import ConversationsList from './components/ConversationsList';
import ConversationView from './components/ConversationView';
import styles from './messages.module.css';

const Messages = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const {
    conversations,
    activeConversation,
    messages,
    isLoading,
    error,
    sendMessage,
    setActiveConversationById,
    createConversation
  } = useMessagesData();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={t('dashboard.messages.errorLoadingMessages')} />;

  return (
    <div className={styles.messagesContainer}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.searchContainer}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t('dashboard.messages.searchConversations')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            className={styles.newConversationButton}
            onClick={() => {/* Show new conversation modal */}}
          >
            <FiPlus />
          </button>
        </div>
        
        <ConversationsList
          conversations={conversations.filter(conv => 
            conv.name.toLowerCase().includes(searchQuery.toLowerCase())
          )}
          activeConversationId={activeConversation?.id}
          onSelectConversation={setActiveConversationById}
        />
      </div>
      
      <div className={styles.mainContent}>
        {activeConversation ? (
          <ConversationView
            conversation={activeConversation}
            messages={messages}
            onSendMessage={sendMessage}
          />
        ) : (
          <div className={styles.emptyState}>
            <p>{t('dashboard.messages.selectConversation')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages; 