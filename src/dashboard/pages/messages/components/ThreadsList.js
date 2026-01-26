import React from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { format } from 'date-fns';
import { cn } from '../../../../utils/cn';
import { FiMessageSquare, FiHome, FiUsers } from 'react-icons/fi';

const ThreadItem = ({ thread, isSelected, onClick }) => {
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

  const displayName = thread.title || thread.displayName || t('messages:placeholders.unknownThread');
  const lastMessage = thread.lastMessage?.text || thread.description || t('messages:placeholders.noMessages');
  const date = formatDate(thread.lastMessageTimestamp || thread.updatedAt || thread.createdAt);
  const timeDisplay = getTimeDisplay(thread.lastMessageTimestamp || thread.updatedAt || thread.createdAt);
  const participantCount = thread.participantCount || thread.participantIds?.length || 0;

  return (
    <button
      onClick={() => onClick(thread.id)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 transition-all text-left border-b border-border/40 last:border-b-0 group",
        "hover:bg-muted/30",
        isSelected
          ? "bg-primary/5 border-l-4 border-l-primary"
          : "border-l-4 border-l-transparent hover:border-l-primary/30"
      )}
      style={{
        borderLeftColor: isSelected ? 'var(--primary-color)' : 'transparent'
      }}
    >
      <div className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors overflow-hidden border border-border/50",
        isSelected
          ? "bg-primary/10"
          : "bg-muted/30"
      )}>
        {thread.isGroupThread || participantCount > 2 ? (
          <div className="w-full h-full flex items-center justify-center">
            <FiUsers className="w-6 h-6" style={{ color: isSelected ? 'var(--primary-color)' : 'var(--text-light-color)' }} />
          </div>
        ) : (
          thread.photoURL ? (
            <img
              src={thread.photoURL}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-lg font-bold" style={{ color: isSelected ? 'var(--primary-color)' : 'var(--text-light-color)' }}>
              {displayName.charAt(0).toUpperCase()}
            </span>
          )
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className={cn(
            "text-sm font-semibold truncate flex-1",
            thread.unreadCount > 0 ? "text-foreground" : "text-muted-foreground"
          )} style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)', margin: 0 }}>
            {displayName}
          </h3>
          {timeDisplay && (
            <span className="text-[10px] font-medium shrink-0" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)', margin: 0 }}>
              {timeDisplay}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className={cn(
            "text-xs truncate flex-1",
            thread.unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"
          )} style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)', margin: 0 }}>
            {lastMessage}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {participantCount > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <FiUsers className="w-3 h-3" />
                <span>{participantCount}</span>
              </div>
            )}
            {thread.unreadCount > 0 && (
              <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

ThreadItem.propTypes = {
  thread: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string,
    displayName: PropTypes.string,
    description: PropTypes.string,
    lastMessage: PropTypes.shape({
      text: PropTypes.string
    }),
    lastMessageTimestamp: PropTypes.oneOfType([PropTypes.object, PropTypes.string, PropTypes.instanceOf(Date)]),
    updatedAt: PropTypes.oneOfType([PropTypes.object, PropTypes.string, PropTypes.instanceOf(Date)]),
    createdAt: PropTypes.oneOfType([PropTypes.object, PropTypes.string, PropTypes.instanceOf(Date)]),
    photoURL: PropTypes.string,
    unreadCount: PropTypes.number,
    participantCount: PropTypes.number,
    participantIds: PropTypes.array,
    isGroupThread: PropTypes.bool
  }).isRequired,
  isSelected: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired
};

const ThreadsList = ({
  threads,
  selectedThreadId,
  onSelectThread,
  currentUserId
}) => {
  const { t } = useTranslation(['messages']);
  if (!threads.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
        <p style={{ margin: 0 }}>{t('messages:empty.noThreadsFound', 'No threads found')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {threads.map((thread) => (
        <ThreadItem
          key={thread.id}
          thread={thread}
          isSelected={selectedThreadId === thread.id}
          onClick={onSelectThread}
        />
      ))}
    </div>
  );
};

ThreadsList.propTypes = {
  threads: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string,
    displayName: PropTypes.string,
    description: PropTypes.string,
    lastMessage: PropTypes.shape({
      text: PropTypes.string
    }),
    lastMessageTimestamp: PropTypes.oneOfType([PropTypes.object, PropTypes.string, PropTypes.instanceOf(Date)]),
    updatedAt: PropTypes.oneOfType([PropTypes.object, PropTypes.string, PropTypes.instanceOf(Date)]),
    createdAt: PropTypes.oneOfType([PropTypes.object, PropTypes.string, PropTypes.instanceOf(Date)]),
    photoURL: PropTypes.string,
    unreadCount: PropTypes.number,
    participantCount: PropTypes.number,
    participantIds: PropTypes.array,
    isGroupThread: PropTypes.bool
  })).isRequired,
  selectedThreadId: PropTypes.string,
  onSelectThread: PropTypes.func.isRequired,
  currentUserId: PropTypes.string
};

export default ThreadsList;

