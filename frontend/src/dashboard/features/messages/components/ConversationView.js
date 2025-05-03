import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiPaperclip } from 'react-icons/fi';
import MessageItem from './MessageItem';
import styles from './conversationView.module.css';

const ConversationView = ({ conversation, messages, onSendMessage }) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSend = () => {
    if (!newMessage.trim()) return;
    
    onSendMessage(newMessage.trim());
    setNewMessage('');
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div className={styles.conversationView}>
      <div className={styles.header}>
        <h2 className={styles.conversationName}>{conversation.name}</h2>
        <div className={styles.participantsInfo}>
          {conversation.isGroup ? (
            <span>{conversation.participants.length} participants</span>
          ) : (
            <span>1-on-1 conversation</span>
          )}
        </div>
      </div>
      
      <div className={styles.messagesList}>
        {messages.length === 0 ? (
          <div className={styles.emptyMessages}>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map(message => (
            <MessageItem
              key={message.id}
              message={message}
              isOwnMessage={message.senderId === conversation.currentUserId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className={styles.messageInput}>
        <button className={styles.attachButton}>
          <FiPaperclip />
        </button>
        
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className={styles.messageTextarea}
        />
        
        <button 
          className={styles.sendButton}
          onClick={handleSend}
          disabled={!newMessage.trim()}
        >
          <FiSend />
        </button>
      </div>
    </div>
  );
};

export default ConversationView; 