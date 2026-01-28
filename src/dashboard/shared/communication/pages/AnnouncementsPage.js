import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAction } from '../../../../services/actions/hook';
import { useDashboard } from '../../../contexts/dashboardContext';
import { useNotification } from '../../../../contexts/notificationContext';
import FilterBar from '../../components/filterBar/FilterBar';
import { AnnouncementDetail } from '../components/AnnouncementDetail';
import Modal from '../../../../components/modals/modal';
import BoxedSwitchField from '../../../../components/boxedInputFields/BoxedSwitchField';
import InputField from '../../../../components/boxedInputFields/personnalizedInputField';
import TextareaField from '../../../../components/boxedInputFields/textareaField';
import SimpleDropdown from '../../../../components/boxedInputFields/dropdownField';
import DateField from '../../../../components/boxedInputFields/DateField';
import Button from '../../../../components/boxedInputFields/button';
import { cn } from '../../../../utils/cn';
import { FiMessageSquare, FiBarChart2, FiHeart, FiPlus, FiX, FiBell } from 'react-icons/fi';
import { buildDashboardUrl, getWorkspaceIdForUrl } from '../../../../config/routeUtils';

const AnnouncementsPage = ({ hideHeader }) => {
  const { t } = useTranslation(['messages']);
  const { showError, showSuccess } = useNotification();
  const { user, selectedWorkspace } = useDashboard();
  const { execute, loading } = useAction();
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);

  const threadIdFromUrl = params.threadId || location.pathname.split('/').pop();
  const isThreadDetail = threadIdFromUrl && threadIdFromUrl !== 'announcements' && threadIdFromUrl !== 'new';

  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(isThreadDetail ? threadIdFromUrl : null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [viewMode, setViewMode] = useState('list');
  const [filters, setFilters] = useState({
    status: 'all',
    fromDate: '',
    toDate: ''
  });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    title: '',
    content: '',
    priority: 'MEDIUM',
    category: '',
    hasPoll: false,
    pollQuestion: '',
    pollOptions: ['', '']
  });

  const canAccessThreads = useMemo(() => {
    return user?.hasFacilityProfile === true;
  }, [user]);

  const loadThreads = useCallback(async () => {
    if (!user || !canAccessThreads) {
      setThreads([]);
      return;
    }

    try {
      const result = await execute('thread.list', {
        collectionType: 'announcements',
        pagination: { limit: 50 },
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      
      setThreads(result.threads || []);
    } catch (err) {
      console.error('Error loading announcements:', err);
      showError(t('messages:errors.loadingThreads', 'Failed to load announcements'));
    }
  }, [user, canAccessThreads, execute, showError, t]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    const pathSegments = location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    setIsCreateOpen(lastSegment === 'new');
  }, [location.pathname]);

  const handleCreateAnnouncement = async () => {
    if (!createFormData.title.trim() || !createFormData.content.trim()) {
      showError(t('messages:errors.title', 'Please fill in all fields'));
      return;
    }

    if (createFormData.hasPoll) {
      if (!createFormData.pollQuestion.trim()) {
        showError(t('messages:errors.pollQuestion', 'Please enter a poll question'));
        return;
      }
      const validOptions = createFormData.pollOptions.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        showError(t('messages:errors.pollOptions', 'Please add at least 2 poll options'));
        return;
      }
    }

    try {
      await execute('thread.create', {
        collectionType: 'announcements',
        title: createFormData.title,
        content: createFormData.content,
        priority: createFormData.priority,
        category: createFormData.category,
        allowComments: true,
        ...(createFormData.hasPoll && {
          pollData: {
            question: createFormData.pollQuestion,
            options: createFormData.pollOptions.filter(opt => opt.trim()),
            allowMultiple: false
          }
        })
      });

      showSuccess(t('messages:success.announcementCreated', 'Announcement created successfully'));
      setIsCreateOpen(false);
      setCreateFormData({
        title: '',
        content: '',
        priority: 'MEDIUM',
        category: '',
        hasPoll: false,
        pollQuestion: '',
        pollOptions: ['', '']
      });
      navigate(buildDashboardUrl('/communications/announcements', workspaceId));
      loadThreads();
    } catch (error) {
      console.error('Error creating announcement:', error);
      showError(t('messages:errors.createAnnouncement', 'Failed to create announcement'));
    }
  };

  const filteredThreads = useMemo(() => {
    let currentThreads = threads;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      currentThreads = currentThreads.filter(t =>
        t.title?.toLowerCase().includes(query) ||
        t.content?.toLowerCase().includes(query)
      );
    }

    if (filters.fromDate || filters.toDate) {
      currentThreads = currentThreads.filter(t => {
        const threadDate = t.createdAt?.toDate ? t.createdAt.toDate() : null;
        if (!threadDate) return false;
        if (filters.fromDate) {
          const fromDate = new Date(filters.fromDate);
          fromDate.setHours(0, 0, 0, 0);
          if (threadDate < fromDate) return false;
        }
        if (filters.toDate) {
          const toDate = new Date(filters.toDate);
          toDate.setHours(23, 59, 59, 999);
          if (threadDate > toDate) return false;
        }
        return true;
      });
    }

    if (sortBy === 'date') {
      currentThreads.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime - aTime;
      });
    } else if (sortBy === 'title') {
      currentThreads.sort((a, b) => {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        return titleA.localeCompare(titleB);
      });
    } else if (sortBy === 'priority') {
      const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      currentThreads.sort((a, b) => {
        const priorityA = priorityOrder[a.metadata?.priority] ?? 99;
        const priorityB = priorityOrder[b.metadata?.priority] ?? 99;
        return priorityA - priorityB;
      });
    }

    return currentThreads;
  }, [threads, filters, searchQuery, sortBy]);

  useEffect(() => {
    if (isThreadDetail && threadIdFromUrl) {
      setSelectedThreadId(threadIdFromUrl);
    } else if (!isThreadDetail) {
      setSelectedThreadId(null);
    }
  }, [isThreadDetail, threadIdFromUrl, location.pathname]);

  const handleThreadClick = (threadId) => {
    setSelectedThreadId(threadId);
    navigate(buildDashboardUrl(`/communications/announcements/${threadId}`, workspaceId));
  };

  const handleBack = () => {
    setSelectedThreadId(null);
    navigate(buildDashboardUrl('/communications/announcements', workspaceId));
  };

  if (selectedThreadId) {
    return (
      <AnnouncementDetail
        threadId={selectedThreadId}
        onBack={handleBack}
      />
    );
  }

  if (!canAccessThreads) {
    return (
      <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
        <div className="flex-1 overflow-auto">
          <div className="w-full max-w-[1400px] mx-auto flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <FiBell className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('messages:announcements.unavailable', 'Announcements unavailable')}
            </h3>
            <p className="text-muted-foreground">
              {t('messages:announcements.facilityOnly', 'Announcements are only available for users who belong to a facility')}
            </p>
          </div>
        </div>
      </div>
    );
  }

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
                setFilters({ status: 'all', fromDate: '', toDate: '' });
                setSearchQuery('');
              }}
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder={t('messages:searchPlaceholder', 'Search announcements...')}
              dropdownFields={[
                {
                  key: 'status',
                  label: t('messages:filters.status', 'Status'),
                  options: [
                    { value: 'all', label: t('messages:filters.all', 'All') }
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
                { value: 'title', label: t('messages:sort.title', 'Title') },
                { value: 'priority', label: t('messages:sort.priority', 'Priority') }
              ]}
              sortValue={sortBy}
              onSortChange={setSortBy}
              showViewToggle={true}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              title={t('messages:announcements.title', 'Announcements')}
              description={t('messages:announcements.description', 'Browse and search for announcements')}
              onRefresh={loadThreads}
              onAdd={() => navigate(buildDashboardUrl('/communications/announcements/new', workspaceId))}
              addLabel={t('messages:newAnnouncement', 'New Announcement')}
              isLoading={loading}
              translationNamespace="messages"
            />

            <div>
              {loading && threads.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <FiMessageSquare className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {t('messages:announcements.noResults', 'No announcements found')}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {t('messages:announcements.createFirst', 'Get started by creating a new announcement')}
                  </p>
                  <button
                    onClick={() => navigate(buildDashboardUrl('/communications/announcements/new', workspaceId))}
                    className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
                  >
                    <FiPlus className="w-5 h-5" />
                    {t('messages:createAnnouncement', 'Create Announcement')}
                  </button>
                </div>
              ) : (
                filteredThreads.map((thread, index) => (
                  <div
                    key={thread.id}
                    onClick={() => handleThreadClick(thread.id)}
                    className={cn(
                      "group bg-card hover:bg-card/80 border border-border hover:border-primary/20 rounded-xl px-6 pb-6 cursor-pointer transition-all duration-300 hover:shadow-md",
                      index === 0 ? "pt-6" : "pt-0"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold border border-border">
                          {(thread.publishedBy || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            {thread.publishedBy || 'Anonymous'}
                            {thread.metadata?.isPinned && (
                              <span className="bg-yellow-500/10 text-yellow-600 text-[10px] px-2 py-0.5 rounded-full border border-yellow-500/20 flex items-center gap-1">
                                <FiBarChart2 className="w-3 h-3 rotate-90" /> Pinned
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {thread.createdAt?.toDate ? new Date(thread.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-1">{thread.title}</h3>
                    <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed mb-4">{thread.content}</p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                      <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-border")}>
                        <FiHeart className="w-3.5 h-3.5" />
                        <span>{thread.metadata?.reactions?.love || 0} Reactions</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-border">
                        <FiMessageSquare className="w-3.5 h-3.5" />
                        <span>0 replies</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CREATE ANNOUNCEMENT MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          if (!loading) {
            setIsCreateOpen(false);
            setCreateFormData({
              title: '',
              content: '',
              priority: 'MEDIUM',
              category: '',
              hasPoll: false,
              pollQuestion: '',
              pollOptions: ['', '']
            });
            navigate(buildDashboardUrl('/communications/announcements', workspaceId));
          }
        }}
        title={t('messages:createAnnouncement', 'New Announcement')}
        size={createFormData.hasPoll ? "large" : "medium"}
        closeOnBackdropClick={!loading}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                if (!loading) {
                  setIsCreateOpen(false);
                  navigate(buildDashboardUrl('/communications/announcements', workspaceId));
                }
              }}
              disabled={loading}
            >
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateAnnouncement}
              disabled={!createFormData.title.trim() || !createFormData.content.trim() || loading}
            >
              {loading ? t('common:creating', 'Creating...') : t('messages:createAnnouncementButton', 'Create')}
            </Button>
          </>
        }
      >
        <div className={createFormData.hasPoll ? "grid grid-cols-2 gap-6" : "space-y-4"}>
          <div className="space-y-4">
            <div className="mt-4">
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
            </div>

            <InputField
              label={t('messages:announcementTitle', 'Title')}
              value={createFormData.title}
              onChange={(e) => setCreateFormData({ ...createFormData, title: e.target.value })}
              placeholder={t('messages:titlePlaceholder', 'Enter announcement title')}
              required
              disabled={loading}
              name="announcementTitle"
            />

            <TextareaField
              label={t('messages:content', 'Content')}
              value={createFormData.content}
              onChange={(e) => setCreateFormData({ ...createFormData, content: e.target.value })}
              placeholder={t('messages:contentPlaceholder', 'Enter announcement content')}
              rows={5}
              disabled={loading}
              name="announcementContent"
              required
            />

            <div className="border-t border-border my-4" />

            <BoxedSwitchField
              label={t('messages:includePoll', 'Include a poll')}
              checked={createFormData.hasPoll}
              onChange={(checked) => setCreateFormData({ ...createFormData, hasPoll: checked })}
              disabled={loading}
            />
          </div>

          {createFormData.hasPoll && (
            <div className="space-y-4 pt-4 border-l border-border pl-6">
              <InputField
                label={t('messages:pollQuestion', 'Poll Question')}
                value={createFormData.pollQuestion}
                onChange={(e) => setCreateFormData({ ...createFormData, pollQuestion: e.target.value })}
                placeholder={t('messages:pollQuestionPlaceholder', 'Enter poll question')}
                disabled={loading}
                name="pollQuestion"
              />

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('messages:pollOptions', 'Poll Options')}
                </label>
                <div className="space-y-2">
                  {createFormData.pollOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <InputField
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...createFormData.pollOptions];
                          newOptions[index] = e.target.value;
                          setCreateFormData({ ...createFormData, pollOptions: newOptions });
                        }}
                        placeholder={t('messages:optionPlaceholder', 'Option {{num}}', { num: index + 1 })}
                        disabled={loading}
                        name={`pollOption${index}`}
                        marginBottom={0}
                      />
                      {createFormData.pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newOptions = createFormData.pollOptions.filter((_, i) => i !== index);
                            setCreateFormData({ ...createFormData, pollOptions: newOptions });
                          }}
                          disabled={loading}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {createFormData.pollOptions.length < 10 && (
                    <button
                      type="button"
                      onClick={() => setCreateFormData({ ...createFormData, pollOptions: [...createFormData.pollOptions, ''] })}
                      disabled={loading}
                      className="w-full px-4 py-2 text-sm text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50"
                    >
                      + {t('messages:addOption', 'Add Option')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default AnnouncementsPage;



