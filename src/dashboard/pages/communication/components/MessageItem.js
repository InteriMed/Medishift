import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import styles from './messageItem.module.css';

const MessageItem = ({ message, isCurrentUser, messageContext = 'personal' }) => {
  const getMessageTime = () => {
    if (!message.timestamp) return '';
    
    const timestamp = message.timestamp.toDate ? message.timestamp.toDate() : new Date(message.timestamp);
    return formatDistanceToNow(timestamp, { addSuffix: true });
  };

  const getSenderDisplayName = () => {
    if (isCurrentUser) {
      return 'You';
    }
    
    // In the new structure, sender info would come from conversation participantInfo
    return message.senderName || 'Unknown User';
  };

  const renderMessageContent = () => {
    // Handle different message types as per documented structure
    if (message.imageUrl) {
      return (
        <div className={styles.imageMessage}>
          <img src={message.imageUrl} alt="Shared image" className={styles.messageImage} />
          {message.text && <p className={styles.messageText}>{message.text}</p>}
        </div>
      );
    }
    
    if (message.fileUrl) {
      return (
        <div className={styles.fileMessage}>
          <a 
            href={message.fileUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.fileLink}
          >
            📎 {message.fileName || 'Download file'}
          </a>
          {message.text && <p className={styles.messageText}>{message.text}</p>}
        </div>
      );
    }
    
    // Regular text message - using 'text' field as per documented structure
    return (
      <div className={styles.messageText}>
        {message.text || message.content} {/* Fallback for backward compatibility */}
      </div>
    );
  };

  const renderReactions = () => {
    if (!message.reactions || message.reactions.length === 0) return null;
    
    return (
      <div className={styles.messageReactions}>
        {message.reactions.map((reaction, index) => (
          <span key={index} className={styles.reaction}>
            {reaction.emoji}
          </span>
        ))}
      </div>
    );
  };

  const getMessageStatus = () => {
    if (!isCurrentUser || !message.status) return null;
    
    const statusMap = {
      'sent': '✓',
      'delivered': '✓✓',
      'read': '✓✓',
      'failed': '✗'
    };
    
    return statusMap[message.status];
  };

  return (
    <div className={`${styles.messageItem} ${isCurrentUser ? styles.ownMessage : styles.otherMessage}`}>
      <div className={styles.messageContent}>
        <div className={styles.messageHeader}>
          <span className={styles.senderName}>
            {getSenderDisplayName()}
          </span>
          <span className={styles.messageTime}>
            {getMessageTime()}
            {getMessageStatus() && (
              <span className={styles.messageStatus}> {getMessageStatus()}</span>
            )}
          </span>
        </div>
        
        {renderMessageContent()}
        {renderReactions()}
        
        {messageContext === 'facility' && (
          <div className={styles.messageContext}>
            <small>Facility Message</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem; 