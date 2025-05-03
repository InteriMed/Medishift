import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import styles from './conversationsList.module.css';

const ConversationsList = ({ conversations, activeConversationId, onSelectConversation }) => {
  if (!conversations.length) {
    return (
      <div className={styles.emptyList}>
        <p>No conversations yet</p>
      </div>
    );
  }

  return (
    <div className={styles.conversationsList}>
      {conversations.map(conversation => (
        <div
          key={conversation.id}
          className={`${styles.conversationItem} ${
            conversation.id === activeConversationId ? styles.active : ''
          } ${conversation.unreadCount > 0 ? styles.unread : ''}`}
          onClick={() => onSelectConversation(conversation.id)}
        >
          <div className={styles.avatarContainer}>
            {conversation.isGroup ? (
              <div className={styles.groupAvatar}>
                {conversation.name.charAt(0)}
              </div>
            ) : (
              <img
                src={conversation.otherUser?.profilePicture || '/default-avatar.png'}
                alt={conversation.name}
                className={styles.avatar}
              />
            )}
          </div>
          
          <div className={styles.conversationInfo}>
            <div className={styles.conversationHeader}>
              <h3 className={styles.conversationName}>{conversation.name}</h3>
              <span className={styles.conversationTime}>
                {formatDistanceToNow(new Date(conversation.lastMessage?.timestamp), { addSuffix: true })}
              </span>
            </div>
            
            <div className={styles.messagePreview}>
              {conversation.lastMessage?.content}
            </div>
            
            {conversation.unreadCount > 0 && (
              <div className={styles.unreadBadge}>
                {conversation.unreadCount}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConversationsList; 