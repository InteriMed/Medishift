import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { httpsCallable } from 'firebase/functions';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { functions, db } from '../../../services/firebase';
import { Mail, Send, Users, MessageSquare, Clock, CheckCircle, XCircle, ChevronDown } from 'lucide-react';
import PageHeader from '../../components/PageHeader/PageHeader';
import Button from '../../../components/BoxedInputFields/Button';

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
  const [activeTab, setActiveTab] = useState('compose');
  const [emailType, setEmailType] = useState('general');
  const [formData, setFormData] = useState({});
  const [sending, setSending] = useState(false);
  const [emailLogs, setEmailLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (activeTab === 'history') {
      loadEmailLogs();
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
    const template = EMAIL_TEMPLATES[emailType];

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
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                  emailType === key
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
                  <option value="">Select a role...</option>
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

  const renderHistory = () => (
    <div className="space-y-4">
      {loadingLogs ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : emailLogs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No emails sent yet</div>
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
              onClick={() => setActiveTab('compose')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'compose'
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
              className={`px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'history'
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
            {activeTab === 'compose' ? renderComposeForm() : renderHistory()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailCenter;

