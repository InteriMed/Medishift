import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useDashboard } from '../../contexts/DashboardContext';
import { useNotification } from '../../../contexts/NotificationContext';
import serviceRequestService from '../../../services/serviceRequestService';
import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';
import { FiPlus, FiList, FiX } from 'react-icons/fi';

const ServicesPage = () => {
  const { t } = useTranslation(['common']);
  const { user } = useDashboard();
  const { showError, showSuccess } = useNotification();
  const location = useLocation();

  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    title: '',
    description: '',
    serviceType: 'staffing',
    category: '',
    priority: 'medium'
  });
  const [isCreating, setIsCreating] = useState(false);
  const [availableServices] = useState(serviceRequestService.GET_AVAILABLE_SERVICES());

  const loadRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      if (user?.uid) {
        const data = await serviceRequestService.LIST_SERVICE_REQUESTS({ userId: user.uid });
        setRequests(data);
      }
    } catch (error) {
      console.error('Error loading service requests:', error);
      showError('Failed to load service requests');
    } finally {
      setIsLoading(false);
    }
  }, [user, showError]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('action') === 'create') {
      setIsCreateModalOpen(true);
    }

    const handleOpenModal = (event) => {
      if (event.detail?.action === 'create' || event.detail?.type === 'createServiceRequest') {
        setIsCreateModalOpen(true);
      }
    };

    window.addEventListener('openModal', handleOpenModal);
    return () => window.removeEventListener('openModal', handleOpenModal);
  }, [location.search]);

  const handleCreateRequest = async () => {
    if (!createFormData.title.trim() || !createFormData.description.trim()) {
      showError('Please fill in all required fields');
      return;
    }

    try {
      setIsCreating(true);
      await serviceRequestService.CREATE_SERVICE_REQUEST(createFormData, user);
      showSuccess('Service request created successfully');
      setIsCreateModalOpen(false);
      setCreateFormData({
        title: '',
        description: '',
        serviceType: 'staffing',
        category: '',
        priority: 'medium'
      });
      loadRequests();
    } catch (error) {
      console.error('Error creating service request:', error);
      showError('Failed to create service request');
    } finally {
      setIsCreating(false);
    }
  };

  const selectedService = availableServices.find(s => s.id === createFormData.serviceType);

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
      <div className="shrink-0 py-4 border-b border-border bg-card/30">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground">
              {t('services:title', 'Service Requests')}
            </h1>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
            >
              <FiPlus className="w-5 h-5" />
              {t('services:createRequest', 'Create Request')}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="w-full max-w-[1400px] mx-auto flex-1 flex flex-col p-4 md:p-6">
          {isLoading ? (
            <LoadingSpinner />
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <FiList className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t('services:noRequests', 'No service requests found')}
              </h3>
              <p className="text-muted-foreground mb-6">
                {t('services:getStarted', 'Get started by creating a new service request.')}
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
              >
                <FiPlus className="w-5 h-5" />
                {t('services:createRequest', 'Create Request')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map(request => (
                <div
                  key={request.id}
                  className="bg-card hover:bg-card/80 border border-border/50 hover:border-primary/20 rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-xl font-bold mb-2 text-foreground">{request.title}</h3>
                      <p className="text-muted-foreground text-sm mb-2">{request.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="capitalize">{request.serviceType}</span>
                        <span>•</span>
                        <span className="capitalize">{request.status}</span>
                        <span>•</span>
                        <span>{request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">
                {t('services:createRequest', 'Create Service Request')}
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('services:title', 'Title')} *
                </label>
                <input
                  type="text"
                  placeholder={t('services:titlePlaceholder', 'Enter request title')}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={createFormData.title}
                  onChange={e => setCreateFormData({ ...createFormData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('services:serviceType', 'Service Type')} *
                </label>
                <select
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={createFormData.serviceType}
                  onChange={e => setCreateFormData({ ...createFormData, serviceType: e.target.value, category: '' })}
                >
                  {availableServices.map(service => (
                    <option key={service.id} value={service.id}>{service.name}</option>
                  ))}
                </select>
              </div>

              {selectedService && selectedService.categories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('services:category', 'Category')}
                  </label>
                  <select
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={createFormData.category}
                    onChange={e => setCreateFormData({ ...createFormData, category: e.target.value })}
                  >
                    <option value="">{t('services:selectCategory', 'Select category')}</option>
                    {selectedService.categories.map(cat => (
                      <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('services:priority', 'Priority')}
                </label>
                <select
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={createFormData.priority}
                  onChange={e => setCreateFormData({ ...createFormData, priority: e.target.value })}
                >
                  <option value="low">{t('services:priorityLow', 'Low')}</option>
                  <option value="medium">{t('services:priorityMedium', 'Medium')}</option>
                  <option value="high">{t('services:priorityHigh', 'High')}</option>
                  <option value="urgent">{t('services:priorityUrgent', 'Urgent')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('services:description', 'Description')} *
                </label>
                <textarea
                  placeholder={t('services:descriptionPlaceholder', 'Describe your service request in detail...')}
                  rows={5}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={createFormData.description}
                  onChange={e => setCreateFormData({ ...createFormData, description: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t('common:cancel', 'Cancel')}
              </button>
              <button
                type="button"
                disabled={isCreating}
                onClick={handleCreateRequest}
                className="px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-logo-1)' }}
              >
                {isCreating ? t('common:creating', 'Creating...') : t('services:createRequest', 'Create Request')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesPage;

