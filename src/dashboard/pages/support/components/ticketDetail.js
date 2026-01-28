import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiSend } from 'react-icons/fi';
import { useAuth } from '../../../../contexts/AuthContext';
import { useNotification } from '../../../../contexts/notificationContext';
import { useAction } from '../../../../services/actions/hook';
import LoadingSpinner from '../../../../components/LoadingSpinner/LoadingSpinner';
import Button from '../../../../components/BoxedInputFields/Button';
import TextareaField from '../../../../components/BoxedInputFields/TextareaField';
import { cn } from '../../../../utils/cn';

const TicketDetail = ({ ticketId, onBack }) => {
  const { t } = useTranslation(['support', 'messages']);
  const { currentUser } = useAuth();
  const { showError, showSuccess } = useNotification();
  const { execute, loading: actionLoading } = useAction();

  const [ticket, setTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      setIsLoading(true);
      const result = await execute('thread.fetch', {
        threadId: ticketId,
        collectionType: 'tickets',
        includeReplies: true
      });

      if (result.success) {
        setTicket({
          ...result.data.thread,
          replies: result.data.replies || []
        });
      } else {
        showError(t('support:errors.loadDetailFailed', 'Failed to load ticket'));
        onBack();
      }
    } catch (error) {
      console.error('Error loading ticket:', error);
      showError(t('support:errors.loadDetailFailed', 'Failed to load ticket'));
      onBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim()) return;

    try {
      const result = await execute('thread.reply', {
        threadId: ticketId,
        collectionType: 'tickets',
        content: replyContent
      });

      if (result.success) {
        showSuccess(t('support:success.replyAdded', 'Reply added successfully'));
        setReplyContent('');
        loadTicket();
      } else {
        showError(result.error || t('support:errors.replyFailed', 'Failed to add reply'));
      }
    } catch (error) {
      console.error('Error adding reply:', error);
      showError(t('support:errors.replyFailed', 'Failed to add reply'));
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-[1400px] mx-auto p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <FiArrowLeft className="w-5 h-5" />
        {t('common:back', 'Back')}
      </button>

      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-base font-bold border border-border">
              {(ticket.user_username || ticket.user_email || 'A').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-foreground text-lg">
                {ticket.user_username || 'Anonymous'}
              </div>
              <div className="text-sm text-muted-foreground">
                {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'Just now'}
              </div>
            </div>
          </div>

          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium",
            ticket.status === 'OPEN' ? "bg-blue-500/10 text-blue-500" :
            ticket.status === 'IN_PROGRESS' ? "bg-yellow-500/10 text-yellow-500" :
            "bg-green-500/10 text-green-500"
          )}>
            <span>{ticket.status || 'OPEN'}</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-4">{ticket.title || 'Untitled Ticket'}</h1>
        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {ticket.content}
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <h2 className="text-xl font-bold">
          {t('support:detail.replies', 'Replies')} ({ticket.replies?.length || 0})
        </h2>

        {ticket.replies && ticket.replies.length > 0 ? (
          ticket.replies.map((reply, index) => (
            <div
              key={index}
              className="bg-card rounded-xl border border-border p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold border border-border">
                  {(reply.user_username || reply.user_email || 'A').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    {reply.user_username || 'Anonymous'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {reply.created_at ? new Date(reply.created_at).toLocaleDateString() : 'Just now'}
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {reply.content}
              </p>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground text-center py-8">
            {t('support:detail.noReplies', 'No replies yet. Be the first to respond!')}
          </p>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="text-lg font-semibold mb-4">
          {t('support:detail.addReply', 'Add Reply')}
        </h3>

        <TextareaField
          placeholder={t('support:detail.replyPlaceholder', 'Write your reply...')}
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          rows={4}
          marginBottom="16px"
        />

        <div className="flex justify-end">
          <Button
            onClick={handleReply}
            variant="primary"
            disabled={actionLoading || !replyContent.trim()}
          >
            {actionLoading ? (
              <>
                <LoadingSpinner size="sm" />
                {t('common:sending', 'Sending...')}
              </>
            ) : (
              <>
                <FiSend className="w-4 h-4" />
                {t('support:detail.sendReply', 'Send Reply')}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;

