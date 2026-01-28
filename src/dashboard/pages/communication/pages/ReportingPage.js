import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAction } from '../../../../services/actions/hook';
import { useDashboard } from '../../../contexts/dashboardContext';
import { useNotification } from '../../../../contexts/notificationContext';
import FilterBar from '../../components/filterBar/filterBar';
import Modal from '../../../../components/modals/modal';
import InputField from '../../../../components/boxedInputFields/Personnalized-InputField';
import TextareaField from '../../../../components/boxedInputFields/textareaField';
import SimpleDropdown from '../../../../components/boxedInputFields/SimpleDropdown';
import BoxedSwitchField from '../../../../components/boxedInputFields/BoxedSwitchField';
import Button from '../../../../components/boxedInputFields/button';
import { cn } from '../../../../utils/cn';
import { FiMessageSquare, FiBarChart2, FiPlus, FiShield } from 'react-icons/fi';
import { buildDashboardUrl, getWorkspaceIdForUrl } from '../../../../config/routeUtils';

const CATEGORIES = {
  'Leave Request': 'Leave Request',
  'Sick Leave': 'Sick Leave',
  'Appointment': 'Appointment',
  'Meeting': 'Meeting',
  'Schedule': 'Schedule',
  'Other': 'Other'
};

const ReportingPage = ({ hideHeader }) => {
  const { t } = useTranslation(['messages']);
  const { showError, showSuccess } = useNotification();
  const { user, selectedWorkspace } = useDashboard();
  const { execute, loading } = useAction();
  const navigate = useNavigate();
  const location = useLocation();
  const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);

  const [reports, setReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: 'all',
    fromDate: '',
    toDate: ''
  });
  const [sortBy, setSortBy] = useState('date');
  const [viewMode, setViewMode] = useState('list');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    subject: '',
    message: '',
    category: 'Other',
    priority: 'MEDIUM',
    isAnonymous: true
  });

  const loadReports = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const result = await execute('thread.list', {
        collectionType: 'hr_reports',
        pagination: { limit: 50 },
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      setReports(result.threads || []);
    } catch (error) {
      console.error('Error loading reports:', error);
      showError(t('messages:errors.loadingReports', 'Failed to load reports'));
    }
  }, [user, execute, showError, t]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    const pathSegments = location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    setIsCreateOpen(lastSegment === 'new');
  }, [location.pathname]);

  const handleCreateReport = async () => {
    if (!createFormData.subject.trim() || !createFormData.message.trim()) {
      showError(t('messages:errors.requiredFields', 'Please fill in all required fields'));
      return;
    }

    try {
      await execute('thread.create', {
        collectionType: 'hr_reports',
        title: createFormData.subject,
        content: createFormData.message,
        category: createFormData.category,
        priority: createFormData.priority,
        isAnonymous: createFormData.isAnonymous
      });

      showSuccess(t('messages:success.reportCreated', 'Report submitted successfully'));
      setIsCreateOpen(false);
      setCreateFormData({
        subject: '',
        message: '',
        category: 'Other',
        priority: 'MEDIUM',
        isAnonymous: true
      });
      navigate(buildDashboardUrl('/communications/reporting', workspaceId));
      loadReports();
    } catch (error) {
      console.error('Error creating report:', error);
      showError(t('messages:errors.createReport', 'Failed to create report'));
    }
  };

  const filteredReports = useMemo(() => {
    let currentReports = reports;

    if (filters.category !== 'all') {
      currentReports = currentReports.filter(r => r.category === filters.category);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      currentReports = currentReports.filter(r =>
        r.title?.toLowerCase().includes(query) ||
        r.content?.toLowerCase().includes(query)
      );
    }

    if (filters.fromDate || filters.toDate) {
      currentReports = currentReports.filter(r => {
        const reportDate = r.createdAt?.toDate?.() || null;
        if (!reportDate) return false;
        if (filters.fromDate) {
          const fromDate = new Date(filters.fromDate);
          fromDate.setHours(0, 0, 0, 0);
          if (reportDate < fromDate) return false;
        }
        if (filters.toDate) {
          const toDate = new Date(filters.toDate);
          toDate.setHours(23, 59, 59, 999);
          if (reportDate > toDate) return false;
        }
        return true;
      });
    }

    if (sortBy === 'date') {
      currentReports.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
    } else if (sortBy === 'priority') {
      const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      currentReports.sort((a, b) => {
        const priorityA = priorityOrder[a.metadata?.priority] ?? 99;
        const priorityB = priorityOrder[b.metadata?.priority] ?? 99;
        return priorityA - priorityB;
      });
    }

    return currentReports;
  }, [reports, filters, searchQuery, sortBy]);

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
      <div className="flex-1 overflow-auto">
        <div className="w-full max-w-[1400px] mx-auto flex-1 flex flex-col pt-6 px-6">
          <div className="space-y-6">
            <FilterBar
              filters={filters}
              onFilterChange={(key, value) => {
                setFilters(prev => ({ ...prev, [key]: value }));
              }}
              onClearFilters={() => {
                setFilters({ category: 'all', fromDate: '', toDate: '' });
                setSearchQuery('');
              }}
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder={t('messages:searchReports', 'Search reports...')}
              dropdownFields={[
                {
                  key: 'category',
                  label: t('messages:category', 'Category'),
                  options: [
                    { value: 'all', label: t('messages:allCategories', 'All Categories') },
                    ...Object.keys(CATEGORIES).map(cat => ({
                      value: cat,
                      label: CATEGORIES[cat]
                    }))
                  ],
                  defaultValue: 'all'
                }
              ]}
              dateFields={[
                {
                  key: 'fromDate',
                  label: t('messages:fromDate', 'From Date'),
                  showClearButton: true
                },
                {
                  key: 'toDate',
                  label: t('messages:toDate', 'To Date'),
                  showClearButton: true
                }
              ]}
              sortOptions={[
                { value: 'date', label: t('messages:sort.date', 'Date') },
                { value: 'priority', label: t('messages:sort.priority', 'Priority') }
              ]}
              sortValue={sortBy}
              onSortChange={setSortBy}
              showViewToggle={true}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              title={t('messages:reporting.title', 'Anonymous Reports')}
              description={t('messages:reporting.description', 'Submit confidential reports')}
              onRefresh={loadReports}
              onAdd={() => navigate(buildDashboardUrl('/communications/reporting/new', workspaceId))}
              addLabel={t('messages:submitReport', 'Submit Report')}
              isLoading={loading}
              translationNamespace="messages"
            />

            <div>
              {loading && reports.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <FiShield className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {t('messages:noReports', 'No reports found')}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {t('messages:createFirstReport', 'Get started by submitting an anonymous report')}
                  </p>
                  <button
                    onClick={() => navigate(buildDashboardUrl('/communications/reporting/new', workspaceId))}
                    className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
                  >
                    <FiPlus className="w-5 h-5" />
                    {t('messages:submitReport', 'Submit Report')}
                  </button>
                </div>
              ) : (
                filteredReports.map(report => (
                  <div
                    key={report.id}
                    className="group bg-card hover:bg-card/80 border border-border/50 hover:border-primary/20 rounded-2xl p-6 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md mb-4"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold border border-border">
                          {report.isAnonymous ? 'A' : (report.createdBy || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            {report.isAnonymous ? t('messages:anonymous', 'Anonymous') : (report.createdBy || 'User')}
                            {report.isAnonymous && (
                              <span className="bg-blue-500/10 text-blue-600 text-[10px] px-2 py-0.5 rounded-full border border-blue-500/20 flex items-center gap-1">
                                <FiShield className="w-3 h-3" /> Anonymous
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {report.createdAt?.toDate ? new Date(report.createdAt.toDate()).toLocaleDateString() : 'Just now'} · {CATEGORIES[report.category] || report.category}
                          </div>
                        </div>
                      </div>
                    </div>

                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-1">{report.title}</h3>
                    <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed mb-4">{report.content}</p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                      <div className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/50",
                        report.metadata?.priority === 'URGENT' && "text-red-600 bg-red-500/10 border border-red-500/20",
                        report.metadata?.priority === 'HIGH' && "text-orange-500 bg-orange-500/10 border border-orange-500/20"
                      )}>
                        <FiBarChart2 className="w-3.5 h-3.5" />
                        <span>{report.metadata?.priority || 'MEDIUM'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/50">
                        <FiMessageSquare className="w-3.5 h-3.5" />
                        <span>0 responses</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CREATE REPORT MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          if (!loading) {
            setIsCreateOpen(false);
            setCreateFormData({
              subject: '',
              message: '',
              category: 'Other',
              priority: 'MEDIUM',
              isAnonymous: true
            });
            navigate(buildDashboardUrl('/communications/reporting', workspaceId));
          }
        }}
        title={t('messages:submitReport', 'Submit Anonymous Report')}
        size="small"
        closeOnBackdropClick={!loading}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                if (!loading) {
                  setIsCreateOpen(false);
                  navigate(buildDashboardUrl('/communications/reporting', workspaceId));
                }
              }}
              disabled={loading}
            >
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateReport}
              disabled={!createFormData.subject.trim() || !createFormData.message.trim() || loading}
            >
              {loading ? t('common:submitting', 'Submitting...') : t('messages:submit', 'Submit')}
            </Button>
          </>
        }
      >
        <div className="space-y-4 mt-4">
          <SimpleDropdown
            label={t('messages:priority', 'Priority')}
            options={[
              { value: 'LOW', label: t('messages:priority.low', 'Low') },
              { value: 'MEDIUM', label: t('messages:priority.medium', 'Medium') },
              { value: 'HIGH', label: t('messages:priority.high', 'High') },
              { value: 'URGENT', label: t('messages:priority.urgent', 'Urgent') }
            ]}
            value={createFormData.priority}
            onChange={(value) => setCreateFormData({ ...createFormData, priority: value })}
            disabled={loading}
          />

          <InputField
            label={t('messages:subject', 'Subject')}
            value={createFormData.subject}
            onChange={(e) => setCreateFormData({ ...createFormData, subject: e.target.value })}
            placeholder={t('messages:subjectPlaceholder', 'Enter report subject')}
            required
            disabled={loading}
            name="reportSubject"
          />

          <SimpleDropdown
            label={t('messages:category', 'Category')}
            options={Object.keys(CATEGORIES).map(cat => ({
              value: cat,
              label: CATEGORIES[cat]
            }))}
            value={createFormData.category}
            onChange={(value) => setCreateFormData({ ...createFormData, category: value })}
            disabled={loading}
          />

          <TextareaField
            label={t('messages:message', 'Message')}
            value={createFormData.message}
            onChange={(e) => setCreateFormData({ ...createFormData, message: e.target.value })}
            placeholder={t('messages:reportPlaceholder', 'Describe your issue or report')}
            rows={5}
            disabled={loading}
            name="reportMessage"
            required
          />

          <BoxedSwitchField
            label={t('messages:submitAsAnonymous', 'Submit as Anonymous Report')}
            checked={createFormData.isAnonymous}
            onChange={(checked) => setCreateFormData({ ...createFormData, isAnonymous: checked })}
            disabled={loading}
          />
        </div>
      </Modal>
    </div>
  );
};

export default ReportingPage;

