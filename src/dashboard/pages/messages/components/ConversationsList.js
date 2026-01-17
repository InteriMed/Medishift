import React from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { format } from 'date-fns';
import { cn } from '../../../../utils/cn';
import { FiMessageSquare, FiChevronRight } from 'react-icons/fi';

/**
 * Conversation item matching contracts sidebar layout
 */
const ConversationItem = ({ conversation, isSelected, onClick }) => {
  const { t } = useTranslation(['messages']);
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      return '';
    }
  };

  const getTimeDisplay = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('messages:time.now');
    if (diffMins < 60) return `${diffMins}${t('messages:time.minutes')}`;
    if (diffHours < 24) return `${diffHours}${t('messages:time.hours')}`;
    if (diffDays < 7) return `${diffDays}${t('messages:time.days')}`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const displayName = conversation.displayName || t('messages:placeholders.unknown');
  const lastMessage = conversation.lastMessage?.text || t('messages:placeholders.noMessages');
  const date = formatDate(conversation.lastMessageTimestamp || conversation.createdAt);
  const timeDisplay = getTimeDisplay(conversation.lastMessageTimestamp);

  return (
    <button
      onClick={() => onClick(conversation.id)}
      className={cn(
        "w-full flex items-center gap-4 pl-8 py-3 pr-0 transition-all text-left border-b border-border/40 last:border-b-0",
        "hover:bg-muted/30",
        isSelected
          ? "bg-primary/5 border-l-4"
          : "border-l-4 border-l-transparent hover:border-l-primary/30"
      )}
      style={{
        borderLeftColor: isSelected ? 'var(--primary-color)' : 'transparent'
      }}
    >
      {/* Notification Badge - Left side, vertically centered - Only show when not selected */}
      {conversation.unreadCount > 0 && !isSelected && (
        <div className="flex items-center justify-center shrink-0">
          <div className="w-5 h-5 bg-destructive rounded-full flex items-center justify-center text-xs font-bold text-white">
            {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
          </div>
        </div>
      )}
      {/* Spacer when no badge to maintain alignment */}
      {(!conversation.unreadCount || isSelected) && (
        <div className="w-5 shrink-0"></div>
      )}

      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors overflow-hidden",
        isSelected
          ? "bg-primary/10"
          : "bg-muted/30"
      )}>
        {conversation.photoURL ? (
          <img
            src={conversation.photoURL}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <FiMessageSquare
            className="w-6 h-6"
            style={{ color: isSelected ? 'var(--primary-color)' : 'var(--text-light-color)' }}
          />
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className={cn(
            "text-sm font-semibold truncate flex-1",
            conversation.unreadCount > 0 ? "" : ""
          )} style={{ color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)', margin: 0 }}>
            {displayName}
          </h3>
          {timeDisplay && (
            <span className="text-xs shrink-0" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)', margin: 0 }}>
              {timeDisplay}
            </span>
          )}
        </div>

        {lastMessage && (
          <p className="text-xs truncate" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)', margin: 0 }}>
            {lastMessage}
          </p>
        )}

        {date && (
          <p className="text-xs" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)', margin: 0 }}>
            {date}
          </p>
        )}
      </div>

      <FiChevronRight
        className={cn(
          "w-5 h-5 shrink-0 transition-colors",
          isSelected ? "" : "opacity-0"
        )}
        style={{ color: 'var(--text-light-color)' }}
      />
    </button>
  );
};

ConversationItem.propTypes = {
  conversation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    displayName: PropTypes.string,
    lastMessage: PropTypes.shape({
      text: PropTypes.string
    }),
    lastMessageTimestamp: PropTypes.oneOfType([PropTypes.object, PropTypes.string, PropTypes.instanceOf(Date)]),
    createdAt: PropTypes.oneOfType([PropTypes.object, PropTypes.string, PropTypes.instanceOf(Date)]),
    photoURL: PropTypes.string,
    unreadCount: PropTypes.number
  }).isRequired,
  isSelected: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired
};

const ConversationsList = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  messageContext,
  currentUserId
}) => {
  const { t } = useTranslation(['messages']);
  if (!conversations.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
        <p style={{ margin: 0 }}>{t('messages:empty.noConversationsFound')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isSelected={selectedConversationId === conversation.id}
          onClick={onSelectConversation}
        />
      ))}
    </div>
  );
};

ConversationItem.propTypes = {
  conversation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    displayName: PropTypes.string,
    lastMessage: PropTypes.shape({
      text: PropTypes.string
    }),
    lastMessageTimestamp: PropTypes.oneOfType([PropTypes.object, PropTypes.string, PropTypes.instanceOf(Date)]),
    createdAt: PropTypes.oneOfType([PropTypes.object, PropTypes.string, PropTypes.instanceOf(Date)]),
    photoURL: PropTypes.string,
    unreadCount: PropTypes.number
  }).isRequired,
  isSelected: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired
};

ConversationsList.propTypes = {
  conversations: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    displayName: PropTypes.string,
    lastMessage: PropTypes.shape({
      text: PropTypes.string
    }),
    lastMessageTimestamp: PropTypes.oneOfType([PropTypes.object, PropTypes.string, PropTypes.instanceOf(Date)]),
    createdAt: PropTypes.oneOfType([PropTypes.object, PropTypes.string, PropTypes.instanceOf(Date)]),
    photoURL: PropTypes.string,
    unreadCount: PropTypes.number
  })).isRequired,
  selectedConversationId: PropTypes.string,
  onSelectConversation: PropTypes.func.isRequired,
  messageContext: PropTypes.string,
  currentUserId: PropTypes.string
};

export default ConversationsList;