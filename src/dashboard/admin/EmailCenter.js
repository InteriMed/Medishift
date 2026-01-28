import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { httpsCallable } from 'firebase/functions';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { functions, db } from '../../services/firebase';
import { Mail, Send, Users, MessageSquare, Clock, CheckCircle, XCircle, ChevronDown, Inbox, ExternalLink } from 'lucide-react';
import PageHeader from '../components/PageHeader/PageHeader';
import Button from '../../components/colorPicker/Button';

const EMAIL_TEMPLATES = {
  support_response: {
    name: 'Support Response',
    icon: MessageSquare,
    fields: ['ticketId', 'recipientEmail', 'recipientName', 'subject', 'message', 'originalMessage']
  },
  team_invitation: {
    name: 'Team Invitation',
    icon: Users,
    fields: ['inviteEmail', 'inviteRole', 'customMessage']
  },
  general: {
    name: 'General Email',
    icon: Mail,
    fields: ['to', 'cc', 'subject', 'message']
  }
};

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrator' },
  { value: 'support', label: 'Support Staff' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'viewer', label: 'Viewer' }
];

const EmailCenter = () => {
  const { t } = useTranslation(['admin', 'common']);
  const [activeTab, setActiveTab] = useState('inbox');
  const [emailType, setEmailType] = useState('general');
  const [formData, setFormData] = useState({});
  const [sending, setSending] = useState(false);
  const [emailLogs, setEmailLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [inboxTickets, setInboxTickets] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [outlookMessages, setOutlookMessages] = useState([]);
  const [loadingOutlook, setLoadingOutlook] = useState(false);
  const [selectedOutlookMessage, setSelectedOutlookMessage] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (activeTab === 'history') {
      loadEmailLogs();
    } else if (activeTab === 'inbox') {
      loadSupportTickets();
    } else if (activeTab === 'outlook') {
      loadOutlookMessages();
    }
  }, [activeTab]);

  const loadEmailLogs = async () => {
    setLoadingLogs(true);
    try {
      const logsRef = collection(db, 'emailLogs');
      const q = query(logsRef, orderBy('sentAt', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmailLogs(logs);
    } catch (error) {
      console.error('Error loading email logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSend = async () => {
    setSending(true);
    setMessage({ type: '', text: '' });

    try {
      let functionName;
      let payload;

      if (emailType === 'support_response') {
        functionName = 'sendSupportResponse';
        payload = {
          ticketId: formData.ticketId,
          recipientEmail: formData.recipientEmail,
          recipientName: formData.recipientName,
          subject: formData.subject,
          message: formData.message,
          originalMessage: formData.originalMessage
        };
      } else if (emailType === 'team_invitation') {
        functionName = 'sendTeamInvitation';
        payload = {
          inviteEmail: formData.inviteEmail,
          inviteRole: formData.inviteRole,
          inviterName: formData.inviterName || 'MediShift Admin',
          customMessage: formData.customMessage,
          inviteToken: crypto.randomUUID(),
          inviteCode: Math.random().toString(36).substring(2, 10).toUpperCase()
        };
      } else {
        functionName = 'sendAdminEmail';
        payload = {
          to: formData.to?.split(',').map(e => e.trim()).filter(Boolean),
          cc: formData.cc?.split(',').map(e => e.trim()).filter(Boolean),
          subject: formData.subject,
          htmlBody: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">${formData.message?.replace(/\n/g, '<br>')}</div>`,
          emailType: 'general'
        };
      }

      const sendEmail = httpsCallable(functions, functionName);
      await sendEmail(payload);

      setMessage({ type: 'success', text: 'Email sent successfully!' });
      setFormData({});
    } catch (error) {
      console.error('Error sending email:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to send email' });
    } finally {
      setSending(false);
    }
  };

  const renderComposeForm = () => {
    return (
      <div className="space-y-6">
        <div className="flex gap-4 mb-6">
          {Object.entries(EMAIL_TEMPLATES).map(([key, value]) => {
            const Icon = value.icon;
            return (
              <button
                key={key}
                onClick={() => {
                  setEmailType(key);
                  setFormData({});
                }}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ${emailType === key
                  ? 'bg-primary text-white border-primary'
                  : 'bg-background border-border hover:border-primary/50'
                  }`}
              >
                <Icon size={18} />
                <span>{value.name}</span>
              </button>
            );
          })}
        </div>

        {emailType === 'general' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">To (comma separated)</label>
              <input
                type="text"
                value={formData.to || ''}
                onChange={(e) => handleInputChange('to', e.target.value)}
                placeholder="recipient@example.com, another@example.com"
                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">CC (optional)</label>
              <input
                type="text"
                value={formData.cc || ''}
                onChange={(e) => handleInputChange('cc', e.target.value)}
                placeholder="cc@example.com"
                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Subject</label>
              <input
                type="text"
                value={formData.subject || ''}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder="Email subject"
                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Message</label>
              <textarea
                value={formData.message || ''}
                onChange={(e) => handleInputChange('message', e.target.value)}
                placeholder="Write your message..."
                rows={8}
                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>
          </>
        )}

        {emailType === 'support_response' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Ticket ID</label>
                <input
                  type="text"
                  value={formData.ticketId || ''}
                  onChange={(e) => handleInputChange('ticketId', e.target.value)}
                  placeholder="TICKET-12345"
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Recipient Email</label>
                <input
                  type="email"
                  value={formData.recipientEmail || ''}
                  onChange={(e) => handleInputChange('recipientEmail', e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Recipient Name (optional)</label>
                <input
                  type="text"
                  value={formData.recipientName || ''}
                  onChange={(e) => handleInputChange('recipientName', e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Subject</label>
                <input
                  type="text"
                  value={formData.subject || ''}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  placeholder="Re: Your Support Request"
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Original Message (optional, for context)</label>
              <textarea
                value={formData.originalMessage || ''}
                onChange={(e) => handleInputChange('originalMessage', e.target.value)}
                placeholder="Paste the original message here..."
                rows={3}
                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none bg-muted/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Your Response</label>
              <textarea
                value={formData.message || ''}
                onChange={(e) => handleInputChange('message', e.target.value)}
                placeholder="Write your response..."
                rows={8}
                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>
          </>
        )}

        {emailType === 'team_invitation' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Invite Email</label>
                <input
                  type="email"
                  value={formData.inviteEmail || ''}
                  onChange={(e) => handleInputChange('inviteEmail', e.target.value)}
                  placeholder="newteammate@example.com"
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <select
                  value={formData.inviteRole || ''}
                  onChange={(e) => handleInputChange('inviteRole', e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                >
                  <option value="">{t('admin:email.selectRole', 'Select a role...')}</option>
                  {ROLE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Your Name (shown in invitation)</label>
              <input
                type="text"
                value={formData.inviterName || ''}
                onChange={(e) => handleInputChange('inviterName', e.target.value)}
                placeholder="Your Name"
                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Custom Message (optional)</label>
              <textarea
                value={formData.customMessage || ''}
                onChange={(e) => handleInputChange('customMessage', e.target.value)}
                placeholder="Add a personal message to the invitation..."
                rows={4}
                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>
          </>
        )}

        {message.text && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2"
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send size={18} />
                Send Email
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  const loadSupportTickets = async () => {
    setLoadingInbox(true);
    try {
      const ticketsRef = collection(db, 'support_tickets');
      const q = query(ticketsRef, orderBy('createdAt', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInboxTickets(tickets);
    } catch (error) {
      console.error('Error loading support tickets:', error);
    } finally {
      setLoadingInbox(false);
    }
  };

  const handleReplyToTicket = (ticket) => {
    setEmailType('support_response');
    setFormData({
      ticketId: ticket.id,
      recipientEmail: ticket.email,
      recipientName: ticket.name,
      subject: `Re: ${ticket.subject}`,
      originalMessage: ticket.message
    });
    setActiveTab('compose');
    setSelectedTicket(null);
  };

  const renderInbox = () => {
    if (selectedTicket) {
      return (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setSelectedTicket(null)}
              className="px-3 py-1 flex items-center gap-2 bg-transparent text-foreground hover:bg-muted border border-border"
            >
              <ChevronDown className="rotate-90" size={16} />
              {t('common:back', 'Back')}
            </Button>
            <h3 className="text-xl font-semibold truncate">{selectedTicket.subject}</h3>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex justify-between items-start mb-6 pb-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {selectedTicket.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-medium text-lg text-foreground">{selectedTicket.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedTicket.email}</p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/30 px-3 py-1 rounded-full">
                  <Clock size={14} />
                  {selectedTicket.createdAt?.toDate?.()?.toLocaleString() || 'Unknown Date'}
                </span>
                <span className={`mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${selectedTicket.status === 'new' ? 'bg-blue-100 text-blue-700' :
                  selectedTicket.status === 'closed' ? 'bg-gray-100 text-gray-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                  {selectedTicket.status?.toUpperCase() || 'NEW'}
                </span>
              </div>
            </div>

            <div className="prose prose-sm max-w-none mb-8 text-foreground/90 whitespace-pre-wrap">
              {selectedTicket.message}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                onClick={() => handleReplyToTicket(selectedTicket)}
                className="flex items-center gap-2"
              >
                <MessageSquare size={18} />
                {t('admin:email.reply', 'Reply')}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {loadingInbox ? (
          <div className="text-center py-12 text-muted-foreground animate-pulse">{t('common:loading', 'Loading tickets...')}</div>
        ) : inboxTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
              <Inbox size={32} />
            </div>
            <p className="text-lg font-medium">{t('admin:email.noTickets', 'No support tickets found')}</p>
            <p className="text-sm opacity-70 mt-1">{t('admin:email.noTicketsDesc', 'New support requests will appear here')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {inboxTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="group p-4 border border-border rounded-xl hover:border-primary/50 hover:bg-muted/10 transition-all cursor-pointer bg-card"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${ticket.status === 'new' ? 'bg-blue-500' : 'bg-transparent border border-muted-foreground icon-scale'}`} />
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors">{ticket.subject}</span>
                    <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full border border-border">
                      {ticket.type || 'Support'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {ticket.createdAt?.toDate?.()?.toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <p className="text-sm text-muted-foreground line-clamp-2 flex-1 pr-4">
                    {ticket.message}
                  </p>
                  <div className="text-xs font-medium text-muted-foreground bg-muted/20 px-2 py-1 rounded">
                    {ticket.name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const loadOutlookMessages = async () => {
    setLoadingOutlook(true);
    try {
      const getAdminInbox = httpsCallable(functions, 'getAdminInbox');
      const result = await getAdminInbox();
      setOutlookMessages(result.data.messages || []);
    } catch (error) {
      console.error('Error loading Outlook messages:', error);
      setMessage({ type: 'error', text: 'Failed to load Outlook messages' });
    } finally {
      setLoadingOutlook(false);
    }
  };

  const renderOutlookInbox = () => {
    if (selectedOutlookMessage) {
      return (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setSelectedOutlookMessage(null)}
              className="px-3 py-1 flex items-center gap-2 bg-transparent text-foreground hover:bg-muted border border-border"
            >
              <ChevronDown className="rotate-90" size={16} />
              {t('common:back', 'Back')}
            </Button>
            <h3 className="text-xl font-semibold truncate">{selectedOutlookMessage.subject}</h3>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex justify-between items-start mb-6 pb-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                  {selectedOutlookMessage.from?.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-medium text-lg text-foreground">{selectedOutlookMessage.from?.name || selectedOutlookMessage.from?.address}</p>
                  <p className="text-sm text-muted-foreground">{selectedOutlookMessage.from?.address}</p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/30 px-3 py-1 rounded-full">
                  <Clock size={14} />
                  {new Date(selectedOutlookMessage.receivedDateTime).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="prose prose-sm max-w-none mb-8 text-foreground/90 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: selectedOutlookMessage.body }} />

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                onClick={() => {
                  setEmailType('general');
                  setFormData({
                    to: selectedOutlookMessage.from?.address,
                    subject: `Re: ${selectedOutlookMessage.subject}`,
                    message: `\n\n----------------\nFrom: ${selectedOutlookMessage.from?.address}\nSent: ${new Date(selectedOutlookMessage.receivedDateTime).toLocaleString()}\nSubject: ${selectedOutlookMessage.subject}\n\n${selectedOutlookMessage.bodyPreview}`
                  });
                  setActiveTab('compose');
                  setSelectedOutlookMessage(null);
                }}
                className="flex items-center gap-2"
              >
                <MessageSquare size={18} />
                Reply
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {loadingOutlook ? (
          <div className="text-center py-12 text-muted-foreground animate-pulse">Loading Outlook messages...</div>
        ) : outlookMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <Mail size={32} className="text-blue-500" />
            </div>
            <p className="text-lg font-medium">No messages found</p>
            <p className="text-sm opacity-70 mt-1">Your detailed Outlook inbox is empty.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {outlookMessages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => setSelectedOutlookMessage(msg)}
                className={`group p-4 border border-border rounded-xl hover:border-blue-500/50 hover:bg-blue-50/10 transition-all cursor-pointer bg-card ${!msg.isRead ? 'border-l-4 border-l-blue-500' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="font-medium text-foreground group-hover:text-blue-600 transition-colors truncate">
                      {msg.from?.name || msg.from?.address}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {new Date(msg.receivedDateTime).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="text-sm font-semibold mb-1 truncate">{msg.subject}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {msg.bodyPreview}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderHistory = () => (
    <div className="space-y-4">
      {loadingLogs ? (
        <div className="text-center py-8 text-muted-foreground">{t('common:loading', 'Loading...')}</div>
      ) : emailLogs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">{t('admin:email.noEmailsYet', 'No emails sent yet')}</div>
      ) : (
        <div className="space-y-3">
          {emailLogs.map((log) => (
            <div
              key={log.id}
              className="p-4 border border-border rounded-lg hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {log.status === 'sent' ? (
                      <CheckCircle size={16} className="text-green-500" />
                    ) : (
                      <XCircle size={16} className="text-red-500" />
                    )}
                    <span className="font-medium">{log.subject}</span>
                    <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                      {log.emailType}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    To: {log.to?.join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock size={14} />
                  {log.sentAt?.toDate?.()?.toLocaleString() || 'Unknown'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        title={t('admin:emailCenter.title', 'Email Center')}
        subtitle={t('admin:emailCenter.subtitle', 'Send emails, respond to support requests, and manage team invitations')}
        variant="default"
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-4 mb-6 border-b border-border">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${activeTab === 'inbox'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              <div className="flex items-center gap-2">
                <Inbox size={18} />
                Inbox
                {inboxTickets.filter(t => t.status === 'new').length > 0 && (
                  <span className="bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                    {inboxTickets.filter(t => t.status === 'new').length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('outlook')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${activeTab === 'outlook'
                  ? 'border-[#0078D4] text-[#0078D4]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              <div className="flex items-center gap-2">
                <ExternalLink size={18} />
                Outlook
              </div>
            </button>
            <button
              onClick={() => setActiveTab('compose')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${activeTab === 'compose'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              <div className="flex items-center gap-2">
                <Mail size={18} />
                Compose
              </div>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              <div className="flex items-center gap-2">
                <Clock size={18} />
                History
              </div>
            </button>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            {activeTab === 'inbox' ? renderInbox() : activeTab === 'outlook' ? renderOutlookInbox() : activeTab === 'compose' ? renderComposeForm() : renderHistory()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailCenter;

