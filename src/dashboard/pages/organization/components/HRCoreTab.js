import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs, orderBy, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { useAuth } from '../../../../contexts/AuthContext';
import { useDashboard } from '../../../contexts/DashboardContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../../services/firebase';
import {
  FiCalendar,
  FiPlus,
  FiClock,
  FiUser,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiBriefcase,
  FiTrendingUp,
  FiUsers
} from 'react-icons/fi';
import { cn } from '../../../../utils/cn';

const HRCoreTab = () => {
  const { t } = useTranslation(['organization', 'common']);
  const { currentUser } = useAuth();
  const { selectedWorkspace } = useDashboard();
  const { showNotification } = useNotification();
  
  const [sickLeaveRequests, setSickLeaveRequests] = useState([]);
  const [vacancyRequests, setVacancyRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showJobModal, setShowJobModal] = useState(false);
  const [activeView, setActiveView] = useState('overview');
  
  const facilityProfileId = selectedWorkspace?.facilityId || currentUser?.uid;

  const fetchSickLeaveRequests = useCallback(async () => {
    if (!facilityProfileId) return;
    
    try {
      const requestsQuery = query(
        collection(db, 'timeOffRequests'),
        where('facilityProfileId', '==', facilityProfileId),
        orderBy('created', 'desc')
      );
      
      const snapshot = await getDocs(requestsQuery);
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setSickLeaveRequests(requests);
    } catch (error) {
      console.error('Error fetching sick leave requests:', error);
    }
  }, [facilityProfileId]);

  const fetchVacancyRequests = useCallback(async () => {
    if (!facilityProfileId) return;
    
    try {
      const requestsQuery = query(
        collection(db, 'employeeVacancyRequests'),
        where('facilityProfileId', '==', facilityProfileId),
        orderBy('created', 'desc')
      );
      
      const snapshot = await getDocs(requestsQuery);
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setVacancyRequests(requests);
    } catch (error) {
      console.error('Error fetching vacancy requests:', error);
    }
  }, [facilityProfileId]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchSickLeaveRequests(),
        fetchVacancyRequests()
      ]);
      setIsLoading(false);
    };
    
    loadData();
  }, [fetchSickLeaveRequests, fetchVacancyRequests]);

  const handleApproveRequest = async (requestId, requestType) => {
    try {
      const acceptFn = httpsCallable(functions, 'acceptEmployeeRequest');
      const result = await acceptFn({
        requestId,
        requestType,
        openInternally: true,
        openExternally: true
      });
      
      if (result.data.success) {
        showNotification(t('organization:hr.requestApproved', 'Request approved and postings created'), 'success');
        await fetchSickLeaveRequests();
        await fetchVacancyRequests();
      }
    } catch (error) {
      console.error('Error approving request:', error);
      showNotification(error.message || t('organization:hr.errorApproving', 'Error approving request'), 'error');
    }
  };

  const handleRejectRequest = async (requestId, requestType) => {
    try {
      const collectionName = requestType === 'vacancy_request' ? 'employeeVacancyRequests' : 'timeOffRequests';
      const requestRef = doc(db, collectionName, requestId);
      await updateDoc(requestRef, {
        status: 'rejected',
        rejectedAt: Timestamp.now(),
        rejectedBy: currentUser.uid
      });
      
      showNotification(t('organization:hr.requestRejected', 'Request rejected'), 'success');
      await fetchSickLeaveRequests();
      await fetchVacancyRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      showNotification(error.message || t('organization:hr.errorRejecting', 'Error rejecting request'), 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <FiCheck className="w-4 h-4" />;
      case 'rejected':
        return <FiX className="w-4 h-4" />;
      case 'pending':
        return <FiAlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const pendingSickLeave = sickLeaveRequests.filter(r => r.status === 'pending').length;
  const pendingVacancies = vacancyRequests.filter(r => r.status === 'pending').length;
  const totalPending = pendingSickLeave + pendingVacancies;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-logo-1)' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 w-full max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">
            {t('organization:hr.title', 'HR Core')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('organization:hr.subtitle', 'Manage sick leave, job opportunities, and employee requests')}
          </p>
        </div>
        <button
          onClick={() => setShowJobModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium text-sm transition-colors"
          style={{ backgroundColor: 'var(--color-logo-1)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-logo-1)'}
        >
          <FiPlus className="w-4 h-4" />
          {t('organization:hr.createJob', 'Create Job Opportunity')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-6 shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-red-100 text-red-600">
              <FiCalendar className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-700">
              {t('organization:hr.sickLeave', 'Sick Leave')}
            </h3>
          </div>
          <div className="text-3xl font-bold text-gray-800">{pendingSickLeave}</div>
          <p className="text-sm text-gray-500 mt-1">
            {t('organization:hr.pendingRequests', 'Pending requests')}
          </p>
        </div>

        <div className="bg-white rounded-xl border p-6 shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <FiBriefcase className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-700">
              {t('organization:hr.vacancies', 'Vacancies')}
            </h3>
          </div>
          <div className="text-3xl font-bold text-gray-800">{pendingVacancies}</div>
          <p className="text-sm text-gray-500 mt-1">
            {t('organization:hr.pendingRequests', 'Pending requests')}
          </p>
        </div>

        <div className="bg-white rounded-xl border p-6 shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
              <FiAlertCircle className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-700">
              {t('organization:hr.totalPending', 'Total Pending')}
            </h3>
          </div>
          <div className="text-3xl font-bold text-gray-800">{totalPending}</div>
          <p className="text-sm text-gray-500 mt-1">
            {t('organization:hr.requiresAction', 'Requires action')}
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b overflow-x-auto max-w-[1400px] mx-auto px-6">
        <button
            onClick={() => setActiveView('overview')}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeView === 'overview'
                ? "text-blue-600 border-blue-600"
                : "text-gray-500 border-transparent hover:text-gray-700"
            )}
          >
            {t('organization:hr.overview', 'Overview')}
          </button>
          <button
            onClick={() => setActiveView('sickLeave')}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeView === 'sickLeave'
                ? "text-blue-600 border-blue-600"
                : "text-gray-500 border-transparent hover:text-gray-700"
            )}
          >
            {t('organization:hr.sickLeave', 'Sick Leave')}
          </button>
          <button
            onClick={() => setActiveView('vacancies')}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeView === 'vacancies'
                ? "text-blue-600 border-blue-600"
                : "text-gray-500 border-transparent hover:text-gray-700"
            )}
          >
            {t('organization:hr.vacancies', 'Vacancies')}
          </button>
      </div>

      {activeView === 'overview' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-6 shadow-md">
            <h3 className="font-semibold text-gray-700 mb-4">
              {t('organization:hr.recentSickLeave', 'Recent Sick Leave Requests')}
            </h3>
            {sickLeaveRequests.slice(0, 5).length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {t('organization:hr.noSickLeave', 'No sick leave requests')}
              </p>
            ) : (
              <div className="space-y-3">
                {sickLeaveRequests.slice(0, 5).map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-gray-100">
                        <FiUser className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">
                          {request.userId}
                        </p>
                        <p className="text-sm text-gray-500">
                          {request.timeOffType || request.type || 'Sick Leave'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {request.from && new Date(request.from).toLocaleDateString()} - {request.to && new Date(request.to).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1", getStatusColor(request.status))}>
                        {getStatusIcon(request.status)}
                        {request.status}
                      </span>
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveRequest(request.id, 'sick_leave')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title={t('organization:hr.approve', 'Approve')}
                          >
                            <FiCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.id, 'sick_leave')}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={t('organization:hr.reject', 'Reject')}
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border p-6 shadow-md">
            <h3 className="font-semibold text-gray-700 mb-4">
              {t('organization:hr.recentVacancies', 'Recent Vacancy Requests')}
            </h3>
            {vacancyRequests.slice(0, 5).length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {t('organization:hr.noVacancies', 'No vacancy requests')}
              </p>
            ) : (
              <div className="space-y-3">
                {vacancyRequests.slice(0, 5).map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <FiBriefcase className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">
                          {request.title || 'Vacancy Request'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {request.vacancyType || 'Temporary'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {request.from && new Date(request.from).toLocaleDateString()} - {request.to && new Date(request.to).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1", getStatusColor(request.status))}>
                        {getStatusIcon(request.status)}
                        {request.status}
                      </span>
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveRequest(request.id, 'vacancy_request')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title={t('organization:hr.approve', 'Approve')}
                          >
                            <FiCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.id, 'vacancy_request')}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={t('organization:hr.reject', 'Reject')}
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeView === 'sickLeave' && (
        <div className="bg-white rounded-xl border p-6 shadow-md">
          <h3 className="font-semibold text-gray-700 mb-4">
            {t('organization:hr.allSickLeave', 'All Sick Leave Requests')}
          </h3>
          {sickLeaveRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {t('organization:hr.noSickLeave', 'No sick leave requests')}
            </p>
          ) : (
            <div className="space-y-3">
              {sickLeaveRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-gray-100">
                      <FiUser className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">
                        {request.userId}
                      </p>
                      <p className="text-sm text-gray-500">
                        {request.timeOffType || request.type || 'Sick Leave'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {request.from && new Date(request.from).toLocaleDateString()} - {request.to && new Date(request.to).toLocaleDateString()}
                      </p>
                      {request.reason && (
                        <p className="text-sm text-gray-600 mt-1">{request.reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn("px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1", getStatusColor(request.status))}>
                      {getStatusIcon(request.status)}
                      {request.status}
                    </span>
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveRequest(request.id, 'sick_leave')}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title={t('organization:hr.approve', 'Approve')}
                        >
                          <FiCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id, 'sick_leave')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('organization:hr.reject', 'Reject')}
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === 'vacancies' && (
        <div className="bg-white rounded-xl border p-6 shadow-md">
          <h3 className="font-semibold text-gray-700 mb-4">
            {t('organization:hr.allVacancies', 'All Vacancy Requests')}
          </h3>
          {vacancyRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {t('organization:hr.noVacancies', 'No vacancy requests')}
            </p>
          ) : (
            <div className="space-y-3">
              {vacancyRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <FiBriefcase className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">
                        {request.title || 'Vacancy Request'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {request.vacancyType || 'Temporary'} - {request.urgency || 'Medium'} urgency
                      </p>
                      <p className="text-xs text-gray-400">
                        {request.from && new Date(request.from).toLocaleDateString()} - {request.to && new Date(request.to).toLocaleDateString()}
                      </p>
                      {request.requestNotes && (
                        <p className="text-sm text-gray-600 mt-1">{request.requestNotes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn("px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1", getStatusColor(request.status))}>
                      {getStatusIcon(request.status)}
                      {request.status}
                    </span>
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveRequest(request.id, 'vacancy_request')}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title={t('organization:hr.approve', 'Approve')}
                        >
                          <FiCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id, 'vacancy_request')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('organization:hr.reject', 'Reject')}
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showJobModal && (
        <JobOpportunityModal
          isOpen={showJobModal}
          onClose={() => setShowJobModal(false)}
          facilityProfileId={facilityProfileId}
          onSuccess={() => {
            setShowJobModal(false);
            fetchVacancyRequests();
          }}
        />
      )}
    </div>
  );
};

const JobOpportunityModal = ({ isOpen, onClose, facilityProfileId, onSuccess }) => {
  const { t } = useTranslation(['organization', 'common']);
  const { currentUser } = useAuth();
  const { showNotification } = useNotification();
  const [formData, setFormData] = useState({
    title: '',
    start: '',
    end: '',
    vacancyType: 'temporary',
    urgency: 'medium',
    requiredSkills: [],
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const saveEventFn = httpsCallable(functions, 'saveCalendarEvent');
      await saveEventFn({
        userId: currentUser.uid,
        type: 'vacancy_request',
        facilityProfileId,
        title: formData.title,
        start: formData.start,
        end: formData.end,
        vacancyType: formData.vacancyType,
        urgency: formData.urgency,
        requiredSkills: formData.requiredSkills,
        notes: formData.notes,
        status: 'open',
        openInternally: true,
        openExternally: true
      });

      showNotification(t('organization:hr.jobCreated', 'Job opportunity created successfully'), 'success');
      onSuccess();
    } catch (error) {
      console.error('Error creating job opportunity:', error);
      showNotification(error.message || t('organization:hr.errorCreating', 'Error creating job opportunity'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-800">
            {t('organization:hr.createJob', 'Create Job Opportunity')}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('organization:hr.jobTitle', 'Job Title')}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('organization:hr.startDate', 'Start Date')}
              </label>
              <input
                type="datetime-local"
                value={formData.start}
                onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('organization:hr.endDate', 'End Date')}
              </label>
              <input
                type="datetime-local"
                value={formData.end}
                onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('organization:hr.vacancyType', 'Vacancy Type')}
              </label>
              <select
                value={formData.vacancyType}
                onChange={(e) => setFormData({ ...formData, vacancyType: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="temporary">{t('organization:hr.temporary', 'Temporary')}</option>
                <option value="permanent">{t('organization:hr.permanent', 'Permanent')}</option>
                <option value="replacement">{t('organization:hr.replacement', 'Replacement')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('organization:hr.urgency', 'Urgency')}
              </label>
              <select
                value={formData.urgency}
                onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">{t('organization:hr.low', 'Low')}</option>
                <option value="medium">{t('organization:hr.medium', 'Medium')}</option>
                <option value="high">{t('organization:hr.high', 'High')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('organization:hr.notes', 'Notes')}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {t('common:cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-logo-1)' }}
            >
              {isSubmitting ? t('common:saving', 'Saving...') : t('common:create', 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HRCoreTab;

