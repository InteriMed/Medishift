import React, { useState, useRef, useEffect } from 'react';
import { RiEmojiStickerLine } from "react-icons/ri";
import WorkerDetailCard from '../marketplace/components/detailed_card/worker';
import 'emoji-picker-element';
import './Messages.css';

const Messages = () => {
  const [activeContact, setActiveContact] = useState(1);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const messagesEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch contacts
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/contacts', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setContacts(data);
      } catch (error) {
        console.error('Error fetching contacts:', error);
      }
    };

    fetchContacts();
  }, []);

  // Get active contact data
  const activeContactData = contacts.find(contact => contact.id === activeContact);

  // Fetch messages for active conversation
  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeContact) return;
      
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:8000/api/messages/${activeContact}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setMessages(data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [activeContact]);

  // Scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle sending message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeContact) return;

    try {
      const response = await fetch('http://localhost:8000/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient_id: activeContact,
          message: messageInput.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newMessage = await response.json();
      setMessages(prev => [...prev, newMessage]);
      setMessageInput('');
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error sending message:', error);
      // Handle error (show notification, etc.)
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && messageInput.trim()) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Initialize emoji picker
  useEffect(() => {
    const picker = document.querySelector('emoji-picker');
    if (picker) {
      picker.addEventListener('emoji-click', event => {
        const input = inputRef.current;
        if (!input) return;

        const cursorPos = input.selectionStart || messageInput.length;
        const newMessage = 
          messageInput.slice(0, cursorPos) + 
          event.detail.unicode + 
          messageInput.slice(cursorPos);
        
        setMessageInput(newMessage);
        
        requestAnimationFrame(() => {
          const newCursorPos = cursorPos + event.detail.unicode.length;
          input.focus();
          input.setSelectionRange(newCursorPos, newCursorPos);
        });
        
        setShowEmojiPicker(false);
      });
    }
  }, [messageInput]);

  const handleProfileClick = (contact) => {
    setSelectedProfile({
      availability_id: contact.id, // Assuming this maps to your user ID
      preferred_location: contact.location,
      verified: contact.verified || false,
      // Add other required fields for WorkerDetailCard
    });
    setShowProfileModal(true);
  };

  return (
    <div className="messages-container">
      {/* Left Sidebar */}
      <div className="messages-sidebar">
        <div className="sidebar-header">
          <h2>Chats</h2>
          <div className="header-actions">
            <button className="icon-button">
              <i className="fas fa-plus"></i>
            </button>
          </div>
        </div>
        
        <div className="search-bar">
          <input type="text" placeholder="Search..." />
        </div>

        <div className="contacts-list">
          {contacts.map(contact => (
            <div 
              key={contact.id} 
              className={`contact-item ${activeContact === contact.id ? 'active' : ''}`}
              onClick={() => setActiveContact(contact.id)}
            >
              <div className="contact-avatar">
                <img 
                  src={contact.avatar} 
                  alt={contact.name} 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProfileClick(contact);
                  }}
                />
              </div>
              <div className="contact-info">
                <h4>{contact.name}</h4>
                <p className="last-message">
                  {contact.lastMessage}
                </p>
                <span className="message-time">• {contact.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-area">
        <div className="chat-header">
          <div className="chat-contact-info">
            <img 
              src={activeContactData?.avatar} 
              alt="Profile" 
              className="chat-profile-img"
              onClick={() => handleProfileClick(activeContactData)}
            />
            <div className="chat-contact-details">
              <h3>{activeContactData?.name}</h3>
            </div>
          </div>
          <div className="chat-actions">
            <button className="icon-button">
              <i className="fas fa-ellipsis-h"></i>
            </button>
          </div>
        </div>

        <div className="messages-list">
          {loading ? (
            <div className="loading-messages">Loading messages...</div>
          ) : (
            <>
              <div className="date-separator">TODAY</div>
              {messages.map(message => (
                <div key={message.id} className={`message ${message.isMe ? 'message-sent' : 'message-received'}`}>
                  <div className="message-content">
                    <p>{message.text}</p>
                    <span className="message-time">
                      {message.timestamp?.toDate().toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="message-input">
          <button 
            className="emoji-button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <RiEmojiStickerLine size={24} />
          </button>
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Write something.." 
            value={messageInput}
            onChange={(e) => {
              setMessageInput(e.target.value);
              // Maintain cursor position on regular typing
              const cursorPos = e.target.selectionStart;
              requestAnimationFrame(() => {
                e.target.setSelectionRange(cursorPos, cursorPos);
              });
            }}
            onKeyPress={handleKeyPress}
            autoFocus
          />
          <button 
            className="send-button"
            onClick={handleSendMessage}
          >
            <i className="fas fa-paper-plane"></i>
          </button>
          {showEmojiPicker && (
            <div className="emoji-picker-container" ref={emojiPickerRef}>
              <emoji-picker></emoji-picker>
            </div>
          )}
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && selectedProfile && (
        <div className="listing-detail-overlay visible">
          <WorkerDetailCard
            listing={selectedProfile}
            onClose={() => setShowProfileModal(false)}
          />
        </div>
      )}
    </div>
  );
};

export default Messages;