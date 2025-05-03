import React from 'react';
import { format } from 'date-fns';
import styles from './messageItem.module.css';

const MessageItem = ({ message, isOwnMessage }) => {
  const formattedTime = format(new Date(message.timestamp), 'h:mm a');
  
  return (
    <div className={`${styles.messageItem} ${isOwnMessage ? styles.ownMessage : ''}`}>
      {!isOwnMessage && (
        <div className={styles.avatar}>
          <img 
            src={message.sender?.profilePicture || '/default-avatar.png'} 
            alt={message.sender?.name || 'User'} 
          />
        </div>
      )}
      
      <div className={styles.messageContent}>
        {!isOwnMessage && (
          <div className={styles.sender}>{message.sender?.name || 'User'}</div>
        )}
        
        <div className={styles.bubble}>
          <div className={styles.text}>{message.content}</div>
          <div className={styles.timestamp}>{formattedTime}</div>
        </div>
      </div>
    </div>
  );
};

export default MessageItem; 