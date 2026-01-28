import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { Bell, Send, Users, Calendar, MessageSquare } from 'lucide-react';
import ProtectedRoute from '../../components/protectedRoute';
import { PERMISSIONS } from '../../utils/rbac';
import Button from '../../../../components/colorPicker/button';
import '../../../../styles/variables.css';

const NotificationsCenter = () => {
  const { t } = useTranslation(['admin']);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'announcement',
    targetSegment: 'all',
    scheduledFor: null
  });

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const notificationsRef = collection(db, 'systemNotifications');
      const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(100));
      const snapshot = await getDocs(q);

      const notificationsList = [];
      snapshot.forEach((doc) => {
        notificationsList.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
        });
      });

      setNotifications(notificationsList);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotification = async () => {
    try {
      await addDoc(collection(db, 'systemNotifications'), {
        ...newNotification,
        status: 'pending',
        createdAt: serverTimestamp(),
        createdBy: 'admin'
      });

      setShowCreateModal(false);
      setNewNotification({
        title: '',
        message: '',
        type: 'announcement',
        targetSegment: 'all',
        scheduledFor: null
      });

      await loadNotifications();
    } catch (error) {
      console.error('Error creating notification:', error);
      alert('Error creating notification');
    }
  };

  const handleSendNow = async (notificationId) => {
    try {
      alert('Push notification would be sent now');
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Error sending notification');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading notifications...</div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.SEND_NOTIFICATIONS}>
      <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <div style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h1 style={{ fontSize: 'var(--font-size-xxxlarge)', fontWeight: 'var(--font-weight-bold)', color: 'var(--text-color)', marginBottom: 0, textAlign: 'center' }}>
            {t('admin:system.notifications.title', 'Notifications Center')}
          </h1>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--spacing-lg)' }}>
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              padding: 'var(--spacing-md) var(--spacing-lg)'
            }}
          >
            <Bell size={18} />
            {t('admin:system.notifications.create', 'Create Notification')}
          </Button>
        </div>

        <div style={{
          backgroundColor: 'var(--background-div-color)',
          borderRadius: 'var(--border-radius-md)',
          padding: 'var(--spacing-lg)',
          border: '1px solid var(--grey-2)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h2 className="text-xl font-semibold mb-4">
            {t('admin:system.notifications.recent', 'Recent Notifications')}
          </h2>
          {notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 bg-grey-1 rounded-lg border border-border"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{notification.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${notification.status === 'sent' ? 'bg-green-1 text-green-4' :
                        notification.status === 'pending' ? 'bg-yellow-1 text-yellow-4' :
                          'bg-grey-1 text-grey-4'
                      }`}>
                      {notification.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      {notification.targetSegment}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {notification.createdAt?.toLocaleDateString() || 'N/A'}
                    </span>
                    {notification.status === 'pending' && (
                      <button
                        onClick={() => handleSendNow(notification.id)}
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <Send size={14} />
                        {t('admin:system.notifications.sendNow', 'Send Now')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {t('admin:system.notifications.noNotifications', 'No notifications created yet')}
            </div>
          )}
        </div>

        {showCreateModal && (
          <CreateNotificationModal
            notification={newNotification}
            setNotification={setNewNotification}
            onClose={() => setShowCreateModal(false)}
            onSave={handleCreateNotification}
          />
        )}
      </div>
    </ProtectedRoute>
  );
};

const CreateNotificationModal = ({ notification, setNotification, onClose, onSave }) => {
  const { t } = useTranslation(['admin']);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">
          {t('admin:system.notifications.createNotification', 'Create System Notification')}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('admin:system.notifications.title', 'Title')} *
            </label>
            <input
              type="text"
              value={notification.title}
              onChange={(e) => setNotification({ ...notification, title: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="App Maintenance Tonight"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('admin:system.notifications.message', 'Message')} *
            </label>
            <textarea
              value={notification.message}
              onChange={(e) => setNotification({ ...notification, message: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="The app will be under maintenance from 2am to 4am..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('admin:system.notifications.targetSegment', 'Target Segment')}
            </label>
            <select
              value={notification.targetSegment}
              onChange={(e) => setNotification({ ...notification, targetSegment: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">{t('admin:system.notifications.allUsers', 'All Users')}</option>
              <option value="professionals">{t('admin:system.notifications.professionals', 'Professionals Only')}</option>
              <option value="facilities">{t('admin:system.notifications.facilities', 'Facilities Only')}</option>
              <option value="geneva">{t('admin:system.notifications.geneva', 'Geneva Region')}</option>
            </select>
          </div>
          <div className="flex gap-2 pt-4">
            <button
              onClick={onSave}
              disabled={!notification.title || !notification.message}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {t('admin:system.notifications.create', 'Create')}
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-grey-1"
            >
              {t('admin:system.notifications.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsCenter;

